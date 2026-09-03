using System.Text.Json;
using System.Text.Json.Serialization;
using Jinobald.Subway.Core.Commands;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Extensions;
using Jinobald.Subway.Core.Ingestion;
using Jinobald.Subway.Core.Queries;
using Jinobald.Subway.Core.Realtime;
using Jinobald.Subway.Core.Time;
using Jinobald.Subway.Data;
using Jinobald.Subway.Data.Extensions;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

// 사용법:
//   dotnet run --project backend/src/Jinobald.Subway.Ingest -- import --raw scripts/data/raw [--db backend/data/subway.db]
//   dotnet run --project backend/src/Jinobald.Subway.Ingest -- export-app-json --out src/data/generated
//   dotnet run --project backend/src/Jinobald.Subway.Ingest -- simulate --line 2 [--at 08:30]
var arguments = ParseArgs(args);
if (arguments.Command is null)
{
    Console.Error.WriteLine("명령이 필요합니다: import | export-app-json | simulate");
    return 2;
}

var host = Host.CreateDefaultBuilder()
    .ConfigureAppConfiguration(cfg =>
    {
        var overrides = new Dictionary<string, string?>();
        if (arguments.Options.TryGetValue("db", out var db))
        {
            overrides["Database:Path"] = db;
        }
        else
        {
            overrides["Database:Path"] = Path.Combine(FindRepoRoot(), "backend", "data", "subway.db");
        }

        cfg.AddInMemoryCollection(overrides);
    })
    .ConfigureLogging(l => l.SetMinimumLevel(LogLevel.Information).AddSimpleConsole(o => o.SingleLine = true))
    .ConfigureServices((ctx, services) =>
    {
        services.AddSubwayCore(ctx.Configuration);
        services.AddSubwayData(ctx.Configuration);
    })
    .Build();

await host.Services.GetRequiredService<MigrationRunner>().ApplyAsync();
var sender = host.Services.GetRequiredService<ISender>();

switch (arguments.Command)
{
    case "import":
    {
        var raw = arguments.Options.GetValueOrDefault("raw") ?? Path.Combine(FindRepoRoot(), "scripts", "data", "raw");
        var results = await sender.Send(new ImportRawDirectoryCommand(Path.GetFullPath(raw)));
        foreach (var r in results)
        {
            Console.WriteLine($"{r.Dataset,-18} {(r.Skipped ? "변경 없음" : $"{r.RowCount:N0}행 적재")}  {r.SourceName}");
            foreach (var w in r.Warnings.Take(10))
            {
                Console.WriteLine($"   ! {w}");
            }

            if (r.Warnings.Count > 10)
            {
                Console.WriteLine($"   ! … 경고 {r.Warnings.Count - 10}건 더");
            }
        }

        return 0;
    }

    case "export-app-json":
    {
        var outDir = arguments.Options.GetValueOrDefault("out") ?? Path.Combine(FindRepoRoot(), "src", "data", "generated");
        Directory.CreateDirectory(outDir);
        var guides = await sender.Send(new GetTransferGuidesQuery(null, null));
        var walks = await sender.Send(new GetTransferWalkTimesQuery());
        var segments = await sender.Send(new GetSegmentTimesQuery(null));
        var json = new JsonSerializerOptions { WriteIndented = true, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping, PropertyNamingPolicy = JsonNamingPolicy.CamelCase, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };
        await File.WriteAllTextAsync(Path.Combine(outDir, "backend-transfer-guides.json"), JsonSerializer.Serialize(guides, json));
        await File.WriteAllTextAsync(Path.Combine(outDir, "backend-transfer-walk-times.json"), JsonSerializer.Serialize(walks, json));
        await File.WriteAllTextAsync(Path.Combine(outDir, "backend-segment-times.json"), JsonSerializer.Serialize(segments, json));
        Console.WriteLine($"{outDir} 에 환승 가이드 {guides.Count}건, 환승 시간 {walks.Count}건, 구간 시간 {segments.Count}건을 썼습니다.");
        return 0;
    }

    case "simulate":
    {
        var line = arguments.Options.GetValueOrDefault("line") ?? "2";
        var subwayId = SubwayLines.SubwayIdOf(line) ?? line;
        var provider = host.Services.GetRequiredService<TimetableSimulatorProvider>();
        if (arguments.Options.TryGetValue("at", out var at) && DurationParser.ParseTimeOfDay(at) is { } seconds)
        {
            var today = KoreaClock.ToKorea(DateTimeOffset.UtcNow).Date;
            var fixedUtc = new DateTimeOffset(today, TimeSpan.FromHours(9)).AddSeconds(seconds).ToUniversalTime();
            provider = new TimetableSimulatorProvider(
                host.Services.GetRequiredService<Jinobald.Subway.Core.Repositories.ISubwayReadRepository>(),
                host.Services.GetRequiredService<Microsoft.Extensions.Caching.Memory.IMemoryCache>(),
                new FixedClock(fixedUtc),
                host.Services.GetRequiredService<DayTypeResolver>(),
                host.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<Jinobald.Subway.Core.Options.RealtimeOptions>>());
        }

        var result = await provider.GetPositionsAsync(subwayId);
        Console.WriteLine($"{SubwayLines.NameOf(subwayId) ?? subwayId} 열차 {result.Value.Count}대 ({result.Source}, {KoreaClock.ToKorea(result.FetchedAt):HH:mm:ss} KST)");
        foreach (var row in result.Value.OrderBy(r => r.UpdnLine).ThenBy(r => r.StatnNm))
        {
            var status = row.TrainSttus switch { "0" => "진입", "1" => "도착", "2" => "출발", "3" => "전역출발", _ => row.TrainSttus };
            Console.WriteLine($"  {(row.UpdnLine == "0" ? "상행/내선" : "하행/외선")}  {row.TrainNo,-6} {row.StatnNm,-10} {status,-5} → {row.StatnTnm}{(row.DirectAt == "1" ? " (급행)" : string.Empty)}");
        }

        return 0;
    }

    default:
        Console.Error.WriteLine($"알 수 없는 명령: {arguments.Command}");
        return 2;
}

static (string? Command, Dictionary<string, string> Options) ParseArgs(string[] args)
{
    string? command = null;
    var options = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    for (var i = 0; i < args.Length; i++)
    {
        if (args[i].StartsWith("--", StringComparison.Ordinal))
        {
            var key = args[i][2..];
            var value = i + 1 < args.Length && !args[i + 1].StartsWith("--", StringComparison.Ordinal) ? args[++i] : "true";
            options[key] = value;
        }
        else
        {
            command ??= args[i];
        }
    }

    return (command, options);
}

static string FindRepoRoot()
{
    var dir = new DirectoryInfo(AppContext.BaseDirectory);
    while (dir is not null)
    {
        if (File.Exists(Path.Combine(dir.FullName, "package.json")) && Directory.Exists(Path.Combine(dir.FullName, "backend")))
        {
            return dir.FullName;
        }

        dir = dir.Parent;
    }

    return Directory.GetCurrentDirectory();
}

/// <summary>
/// 시뮬레이터 스냅샷용 고정 시계.
/// </summary>
internal sealed class FixedClock : IClock
{
    public FixedClock(DateTimeOffset utcNow)
    {
        UtcNow = utcNow;
    }

    public DateTimeOffset UtcNow { get; }
}
