using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Repositories;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Jinobald.Subway.Api.Tests;

/// <summary>
/// 임시 SQLite 파일로 API 를 통째로 띄웁니다. 시작 시 적재는 끄고 시각표 세 행만 심습니다.
/// </summary>
public class ApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AdminKey = "test-admin-key";

    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"jinobald-api-test-{Guid.NewGuid():N}.db");

    /// <summary>
    /// 분당 허용 요청. 요청 제한 테스트만 작게 둡니다 — TestServer 는 IP 가 없어 모든 요청이 한 파티션이기 때문입니다.
    /// </summary>
    protected virtual int PermitPerMinute => 10_000;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Path"] = _dbPath,
                ["Datasets:ImportOnStartup"] = "false",
                ["Datasets:RawDir"] = "",
                ["Admin:ApiKey"] = AdminKey,
                ["RateLimit:PermitPerMinute"] = PermitPerMinute.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["Seoul:ApiKey"] = "",
                ["DataGoKr:ServiceKey"] = "",
            });
        });
    }

    public async Task InitializeAsync()
    {
        // 서버를 띄우고 (마이그레이션 포함) 시각표를 심습니다.
        _ = Server;
        var write = Services.GetRequiredService<ISubwayWriteRepository>();
        await write.ReplaceTimetableAsync(
        [
            new TimetableEntry("2", "0222", "강남", "강남", DayType.Weekday, "IN", false, "2001", null, 5 * 3600 + 30 * 60, "성수", "성수"),
            new TimetableEntry("2", "0222", "강남", "강남", DayType.Weekday, "IN", false, "2099", null, 24 * 3600 + 20 * 60, "성수", "성수"),
            new TimetableEntry("2", "0222", "강남", "강남", DayType.Weekday, "OUT", false, "2098", null, 24 * 3600 + 5 * 60, "성수", "성수"),
        ]);
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        foreach (var suffix in new[] { "", "-wal", "-shm" })
        {
            File.Delete(_dbPath + suffix);
        }
    }
}

/// <summary>
/// 요청 제한이 빨리 걸리는 픽스처.
/// </summary>
public sealed class StrictRateLimitFixture : ApiFixture
{
    protected override int PermitPerMinute => 5;
}
