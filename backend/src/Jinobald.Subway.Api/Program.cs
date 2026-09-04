using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Jinobald.Subway.Api;
using Jinobald.Subway.Api.Contracts;
using Jinobald.Subway.Api.Filters;
using Jinobald.Subway.Core.Commands;
using Jinobald.Subway.Core.Cqrs;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Extensions;
using Jinobald.Subway.Core.Queries;
using Jinobald.Subway.Core.Realtime;
using Jinobald.Subway.Data;
using Jinobald.Subway.Data.Extensions;
using MediatR;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
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

// CORS 는 웹 빌드(react-native-web)를 다른 오리진에서 띄울 때만 필요합니다. 네이티브 앱은 오리진이 없습니다.
// 비워 두면 정책을 등록하지 않아 브라우저 요청이 막힙니다 — AllowAnyOrigin 을 기본으로 두지 않습니다.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (allowedOrigins.Length > 0)
{
    builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(allowedOrigins).AllowAnyHeader().WithMethods("GET")));
}

// 실시간 엔드포인트 요청 제한 — IP 당 분당 N회. QuotaGuard 가 서울 키를 지키듯 이건 서버 자체를 지킵니다.
// 허용량은 요청 시점에 설정에서 읽습니다 — 테스트 호스트가 설정을 나중에 덮어쓰기 때문입니다.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(new ErrorResponse("quota", "요청이 너무 잦습니다. 잠시 후 다시 시도하세요."), ct);
    };
    o.AddPolicy(RateLimitPolicies.Realtime, context =>
    {
        var permitPerMinute = context.RequestServices.GetRequiredService<IConfiguration>().GetValue("RateLimit:PermitPerMinute", 60);
        return RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            });
    });
});

// 리버스 프록시(TLS 종료) 뒤에서 원래 스킴·IP 를 읽습니다. 요청 제한의 IP 분할도 이걸 씁니다.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

app.UseForwardedHeaders();
// HTTPS 리디렉션은 TLS 프록시가 X-Forwarded-Proto 를 붙여 줄 때만 켭니다. 없는데 켜면 무한 리디렉션입니다.
if (app.Configuration.GetValue("Https:Redirect", false))
{
    app.UseHttpsRedirection();
}

if (allowedOrigins.Length > 0)
{
    app.UseCors();
}

app.UseRateLimiter();

// API 문서는 개발 중에만. 운영에서 관리 엔드포인트까지 자기 소개를 하게 두지 않습니다.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

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
    var body = new HealthResponse(
        report.Ok,
        report.RealtimeProvider,
        new KeysResponse(report.SeoulKeyConfigured, report.DataGoKrKeyConfigured),
        new QuotaResponse(report.QuotaUsedToday, report.QuotaSoftLimit, report.QuotaDailyLimit),
        report.Datasets.Select(DatasetResponse.From).ToList());
    // DB 를 못 읽거나 시각표가 비어 있으면 503 — 오케스트레이터의 readiness 프로브로 쓸 수 있습니다.
    return report.Ok ? Results.Ok(body) : Results.Json(body, statusCode: StatusCodes.Status503ServiceUnavailable);
});

api.MapGet("/realtime/arrivals/{stationName}", async (string stationName, ISender sender, HttpResponse response, CancellationToken ct) =>
{
    var result = await sender.Send(new GetArrivalsQuery(stationName), ct);
    response.Headers.CacheControl = "public, max-age=15";
    return Results.Ok(new RealtimeResponse<RawArrivalRow>(result.Value, result.FetchedAt, result.Source));
}).RequireRateLimiting(RateLimitPolicies.Realtime);

api.MapGet("/realtime/positions/{subwayId}", async (string subwayId, ISender sender, HttpResponse response, CancellationToken ct) =>
{
    var result = await sender.Send(new GetLinePositionsQuery(subwayId), ct);
    response.Headers.CacheControl = "public, max-age=20";
    return Results.Ok(new RealtimeResponse<RawPositionRow>(result.Value, result.FetchedAt, result.Source));
}).RequireRateLimiting(RateLimitPolicies.Realtime);

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

    var dayType = DayTypeCodes.Parse(day);
    if (day is not null && dayType is null)
    {
        return Results.BadRequest(new ErrorResponse("validation", "day 는 DAY, SAT, END 중 하나여야 합니다."));
    }

    var result = await sender.Send(new GetNextDeparturesQuery(lineNo, stationCd, dayType, direction, afterSeconds, limit ?? 5), ct);
    return Results.Ok(new TimetableResponse(result.DayType.ToCode(), result.AfterSeconds, result.Entries.Select(TimetableEntryResponse.From).ToList()));
}).RequireRateLimiting(RateLimitPolicies.Realtime);

// 막차. 방향을 주지 않으면 방향마다 하나씩 옵니다.
api.MapGet("/timetable/{lineNo}/{stationCd}/last", async (string lineNo, string stationCd, string? day, string? direction, ISender sender, CancellationToken ct) =>
{
    var dayType = DayTypeCodes.Parse(day);
    if (day is not null && dayType is null)
    {
        return Results.BadRequest(new ErrorResponse("validation", "day 는 DAY, SAT, END 중 하나여야 합니다."));
    }

    var result = await sender.Send(new GetLastDeparturesQuery(lineNo, stationCd, dayType, direction), ct);
    return Results.Ok(new TimetableResponse(result.DayType.ToCode(), result.AfterSeconds, result.Entries.Select(TimetableEntryResponse.From).ToList()));
}).RequireRateLimiting(RateLimitPolicies.Realtime);

api.MapGet("/fast-exit/{lineNo}/{stationCd}", async (string lineNo, string stationCd, string? station, ISender sender, CancellationToken ct) =>
{
    var result = await sender.Send(new GetFastExitsQuery(lineNo, stationCd, station), ct);
    return Results.Ok(new RealtimeResponse<FastExitResponse>(result.Value.Select(FastExitResponse.From).ToList(), result.FetchedAt, result.Source));
}).RequireRateLimiting(RateLimitPolicies.Realtime);

api.MapGet("/notices", async (bool? active, ISender sender, CancellationToken ct) =>
    Results.Ok(await sender.Send(new GetNoticesQuery(active ?? true), ct)));

api.MapGet("/datasets/manifest", async (ISender sender, CancellationToken ct) =>
{
    var runs = await sender.Send(new GetDatasetManifestQuery(), ct);
    return Results.Ok(runs.Select(DatasetResponse.From).ToList());
});

// 관리: 데이터셋 재적재. Admin:ApiKey 가 없으면 존재하지 않는 경로처럼 404, 있으면 X-Admin-Key 가 맞아야 합니다.
// 디렉터리는 항상 서버 설정(Datasets:RawDir)입니다 — 외부에서 경로를 지정하게 두지 않습니다.
api.MapPost("/admin/import", async (ISender sender, IConfiguration configuration, CancellationToken ct) =>
{
    var dir = configuration["Datasets:RawDir"];
    if (string.IsNullOrWhiteSpace(dir))
    {
        return Results.BadRequest(new ErrorResponse("validation", "Datasets:RawDir 가 설정되어 있지 않습니다."));
    }

    var results = await sender.Send(new ImportRawDirectoryCommand(dir), ct);
    return Results.Ok(results);
}).AddEndpointFilter<AdminKeyFilter>();

await app.Services.GetRequiredService<MigrationRunner>().ApplyAsync();
app.Run();

/// <summary>
/// WebApplicationFactory 가 진입점을 찾을 수 있도록 노출합니다 (Api.Tests).
/// </summary>
public partial class Program
{
}

/// <summary>
/// 요청 제한 정책 이름.
/// </summary>
public static class RateLimitPolicies
{
    public const string Realtime = "realtime";
}
