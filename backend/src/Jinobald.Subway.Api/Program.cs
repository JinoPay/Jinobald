using System.Text.Json;
using System.Text.Json.Serialization;
using Jinobald.Subway.Api;
using Jinobald.Subway.Api.Contracts;
using Jinobald.Subway.Core.Commands;
using Jinobald.Subway.Core.Cqrs;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Extensions;
using Jinobald.Subway.Core.Queries;
using Jinobald.Subway.Core.Realtime;
using Jinobald.Subway.Data;
using Jinobald.Subway.Data.Extensions;
using MediatR;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"));

builder.Services.AddSubwayCore(builder.Configuration);
builder.Services.AddSubwayData(builder.Configuration);
builder.Services.AddHostedService<StartupImportService>();
builder.Services.AddHostedService<NoticeRefreshService>();
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
});
builder.Services.AddOpenApi();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseCors();
app.MapOpenApi();
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
    var (status, kind, message) = feature?.Error switch
    {
        ValidationException v => (StatusCodes.Status400BadRequest, "validation", v.Message),
        SeoulApiException { Kind: SeoulApiErrorKind.Quota } s => (StatusCodes.Status429TooManyRequests, "quota", s.Message),
        SeoulApiException { Kind: SeoulApiErrorKind.Auth } s => (StatusCodes.Status502BadGateway, "auth", s.Message),
        SeoulApiException { Kind: SeoulApiErrorKind.Timeout } s => (StatusCodes.Status504GatewayTimeout, "timeout", s.Message),
        SeoulApiException s => (StatusCodes.Status502BadGateway, "network", s.Message),
        _ => (StatusCodes.Status500InternalServerError, "unknown", "서버 오류가 발생했습니다."),
    };
    context.Response.StatusCode = status;
    await context.Response.WriteAsJsonAsync(new ErrorResponse(kind, message));
}));

var api = app.MapGroup("/api/v1");

api.MapGet("/health", async (ISender sender, CancellationToken ct) =>
{
    var report = await sender.Send(new GetHealthQuery(), ct);
    return Results.Ok(new HealthResponse(
        report.Ok,
        report.RealtimeProvider,
        new KeysResponse(report.SeoulKeyConfigured, report.DataGoKrKeyConfigured),
        new QuotaResponse(report.QuotaUsedToday, report.QuotaSoftLimit, report.QuotaDailyLimit),
        report.Datasets.Select(DatasetResponse.From).ToList()));
});

api.MapGet("/realtime/arrivals/{stationName}", async (string stationName, ISender sender, HttpResponse response, CancellationToken ct) =>
{
    var result = await sender.Send(new GetArrivalsQuery(stationName), ct);
    response.Headers.CacheControl = "public, max-age=15";
    return Results.Ok(new RealtimeResponse<RawArrivalRow>(result.Value, result.FetchedAt, result.Source));
});

api.MapGet("/realtime/positions/{subwayId}", async (string subwayId, ISender sender, HttpResponse response, CancellationToken ct) =>
{
    var result = await sender.Send(new GetLinePositionsQuery(subwayId), ct);
    response.Headers.CacheControl = "public, max-age=20";
    return Results.Ok(new RealtimeResponse<RawPositionRow>(result.Value, result.FetchedAt, result.Source));
});

api.MapGet("/stations", async (ISender sender, CancellationToken ct) =>
    Results.Ok(await sender.Send(new GetStationCodesQuery(), ct)));

api.MapGet("/transfers/guides", async (string? station, string? from, ISender sender, CancellationToken ct) =>
{
    var guides = await sender.Send(new GetTransferGuidesQuery(station, from), ct);
    return Results.Ok(guides.Select(TransferGuideResponse.From).ToList());
});

api.MapGet("/transfers/walk-times", async (ISender sender, CancellationToken ct) =>
    Results.Ok(await sender.Send(new GetTransferWalkTimesQuery(), ct)));

api.MapGet("/segments/{lineNo}", async (string lineNo, ISender sender, CancellationToken ct) =>
    Results.Ok(await sender.Send(new GetSegmentTimesQuery(lineNo), ct)));

api.MapGet("/segments", async (ISender sender, CancellationToken ct) =>
    Results.Ok(await sender.Send(new GetSegmentTimesQuery(null), ct)));

api.MapGet("/timetable/{lineNo}/{stationCd}", async (string lineNo, string stationCd, string? day, string? direction, string? after, int? limit, ISender sender, CancellationToken ct) =>
{
    var afterSeconds = after is null ? null : Jinobald.Subway.Core.Ingestion.DurationParser.ParseTimeOfDay(after);
    if (after is not null && afterSeconds is null)
    {
        return Results.BadRequest(new ErrorResponse("validation", "after 는 HH:mm 또는 HH:mm:ss 형식이어야 합니다."));
    }

    var result = await sender.Send(new GetNextDeparturesQuery(lineNo, stationCd, DayTypeCodes.Parse(day), direction, afterSeconds, limit ?? 5), ct);
    return Results.Ok(new TimetableResponse(result.DayType.ToCode(), result.AfterSeconds, result.Entries.Select(TimetableEntryResponse.From).ToList()));
});

api.MapGet("/fast-exit/{lineNo}/{stationCd}", async (string lineNo, string stationCd, string? station, ISender sender, CancellationToken ct) =>
{
    var result = await sender.Send(new GetFastExitsQuery(lineNo, stationCd, station), ct);
    return Results.Ok(new RealtimeResponse<FastExitResponse>(result.Value.Select(FastExitResponse.From).ToList(), result.FetchedAt, result.Source));
});

api.MapGet("/notices", async (bool? active, ISender sender, CancellationToken ct) =>
    Results.Ok(await sender.Send(new GetNoticesQuery(active ?? true), ct)));

api.MapGet("/datasets/manifest", async (ISender sender, CancellationToken ct) =>
{
    var runs = await sender.Send(new GetDatasetManifestQuery(), ct);
    return Results.Ok(runs.Select(DatasetResponse.From).ToList());
});

api.MapPost("/admin/import", async (string? rawDir, ISender sender, IConfiguration configuration, CancellationToken ct) =>
{
    var dir = rawDir ?? configuration["Datasets:RawDir"];
    if (string.IsNullOrWhiteSpace(dir))
    {
        return Results.BadRequest(new ErrorResponse("validation", "rawDir 가 없습니다. 쿼리로 넘기거나 Datasets:RawDir 를 설정하세요."));
    }

    var results = await sender.Send(new ImportRawDirectoryCommand(dir), ct);
    return Results.Ok(results);
});

await app.Services.GetRequiredService<MigrationRunner>().ApplyAsync();
app.Run();
