using System.Text;
using Jinobald.Subway.Core.Commands;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Extensions;
using Jinobald.Subway.Core.Queries;
using Jinobald.Subway.Data;
using Jinobald.Subway.Data.Extensions;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Jinobald.Subway.Core.Tests;

/// <summary>
/// 임시 SQLite 파일로 적재 → 조회 → 시뮬레이터까지 한 번에 돌립니다.
/// </summary>
public sealed class IntegrationTests : IAsyncLifetime
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"jinobald-test-{Guid.NewGuid():N}.db");
    private ServiceProvider _services = null!;

    public async Task InitializeAsync()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Database:Path"] = _dbPath,
        }).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSubwayCore(config);
        services.AddSubwayData(config);
        _services = services.BuildServiceProvider();
        await _services.GetRequiredService<MigrationRunner>().ApplyAsync();
    }

    public async Task DisposeAsync()
    {
        await _services.DisposeAsync();
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        foreach (var suffix in new[] { "", "-wal", "-shm" })
        {
            File.Delete(_dbPath + suffix);
        }
    }

    [Fact]
    public async Task Import_query_and_simulate_round_trip()
    {
        var sender = _services.GetRequiredService<ISender>();
        const string timetable = "\"고유번호\",\"호선\",\"역사코드\",\"역사명\",\"주중주말\",\"방향\",\"급행여부\",\"열차코드\",\"열차도착시간\",\"열차출발시간\",\"출발역\",\"도착역\"\n" +
                                 "1,\"1\",\"0150\",서울역,DAY,UP,\"0\",K1,,\"09:00:00\",서울역,청량리\n" +
                                 "2,\"1\",\"0151\",시청,DAY,UP,\"0\",K1,\"09:02:00\",\"09:02:30\",서울역,청량리\n" +
                                 "3,\"1\",\"0152\",종각,DAY,UP,\"0\",K1,\"09:04:00\",,서울역,청량리\n" +
                                 "4,\"1\",\"0150\",서울역,SAT,UP,\"0\",K1,,\"09:00:00\",서울역,청량리\n";
        var first = await sender.Send(new ImportDatasetCommand(DatasetKind.Timetable, new MemoryStream(Encoding.UTF8.GetBytes(timetable)), "tt.csv"));
        Assert.False(first.Skipped);
        Assert.Equal(4, first.RowCount);

        var second = await sender.Send(new ImportDatasetCommand(DatasetKind.Timetable, new MemoryStream(Encoding.UTF8.GetBytes(timetable)), "tt.csv"));
        Assert.True(second.Skipped);

        var next = await sender.Send(new GetNextDeparturesQuery("1", "150", DayType.Weekday, "UP", 9 * 3600 + 60, 5));
        Assert.Empty(next.Entries); // 09:01 이후 서울역 출발은 없음
        next = await sender.Send(new GetNextDeparturesQuery("1", "0151", DayType.Weekday, null, 9 * 3600, 5));
        Assert.Single(next.Entries);
        Assert.Equal("K1", next.Entries[0].TrainNo);

        var manifest = await sender.Send(new GetDatasetManifestQuery());
        Assert.Contains(manifest, r => r.Dataset == DatasetKind.Timetable && r.RowCount == 4);

        // 시뮬레이터: 평일 09:03 KST 에 K1 은 시청→종각 구간
        var repo = _services.GetRequiredService<Core.Repositories.ISubwayReadRepository>();
        var sim = new Core.Realtime.TimetableSimulatorProvider(
            repo,
            new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions()),
            new FixedClock(new DateTimeOffset(2026, 9, 3, 0, 3, 0, TimeSpan.Zero)),
            new Core.Time.DayTypeResolver([]),
            Microsoft.Extensions.Options.Options.Create(new Core.Options.RealtimeOptions()));
        var positions = await sim.GetPositionsAsync("1001");
        Assert.Equal(DataSource.Timetable, positions.Source);
        var row = Assert.Single(positions.Value);
        Assert.Equal("K1", row.TrainNo);
        Assert.Equal("종각", row.StatnNm);

        var arrivals = await sim.GetArrivalsAsync("종각역");
        var arrival = Assert.Single(arrivals.Value);
        Assert.Equal("K1", arrival.BtrainNo);
        Assert.Equal("60", arrival.BarvlDt);
    }
}
