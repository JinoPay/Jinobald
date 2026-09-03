using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Options;
using Jinobald.Subway.Core.Realtime;
using Microsoft.Extensions.Caching.Memory;
using MsOptions = Microsoft.Extensions.Options.Options;
using NSubstitute;

namespace Jinobald.Subway.Core.Tests;

public sealed class RealtimeCacheTests
{
    private static RealtimeCache Create(FixedClock clock) =>
        new(new MemoryCache(new MemoryCacheOptions()), clock, MsOptions.Create(new RealtimeOptions()));

    [Fact]
    public async Task Second_call_inside_ttl_is_served_from_cache()
    {
        var clock = new FixedClock(DateTimeOffset.UtcNow);
        var cache = Create(clock);
        var calls = 0;
        Task<IReadOnlyList<string>?> Fetch(CancellationToken _)
        {
            calls++;
            return Task.FromResult<IReadOnlyList<string>?>(["a"]);
        }

        var first = await cache.GetOrFetchAsync("k", TimeSpan.FromSeconds(20), Fetch, DataSource.Live);
        var second = await cache.GetOrFetchAsync("k", TimeSpan.FromSeconds(20), Fetch, DataSource.Live);

        Assert.Equal(1, calls);
        Assert.Equal(DataSource.Live, first.Source);
        Assert.Equal(DataSource.Cached, second.Source);
    }

    [Fact]
    public async Task Quota_exhausted_returns_last_known_as_stale()
    {
        var clock = new FixedClock(DateTimeOffset.UtcNow);
        var cache = Create(clock);
        await cache.GetOrFetchAsync<IReadOnlyList<string>>("k", TimeSpan.FromMilliseconds(1), _ => Task.FromResult<IReadOnlyList<string>?>(["a"]), DataSource.Live);
        await Task.Delay(20);
        var stale = await cache.GetOrFetchAsync<IReadOnlyList<string>>("k", TimeSpan.FromMilliseconds(1), _ => Task.FromResult<IReadOnlyList<string>?>(null), DataSource.Live);
        Assert.Equal(DataSource.Stale, stale.Source);
        Assert.Equal(["a"], stale.Value);
    }

    [Fact]
    public async Task Quota_exhausted_without_history_throws_quota_error()
    {
        var cache = Create(new FixedClock(DateTimeOffset.UtcNow));
        var ex = await Assert.ThrowsAsync<SeoulApiException>(() =>
            cache.GetOrFetchAsync<IReadOnlyList<string>>("none", TimeSpan.FromSeconds(1), _ => Task.FromResult<IReadOnlyList<string>?>(null), DataSource.Live));
        Assert.Equal(SeoulApiErrorKind.Quota, ex.Kind);
    }

    [Fact]
    public async Task SeoulRealtimeProvider_uses_quota_and_cache()
    {
        var clock = new FixedClock(new DateTimeOffset(2026, 9, 3, 0, 0, 0, TimeSpan.Zero));
        var client = Substitute.For<ISeoulOpenApiClient>();
        client.GetArrivalsAsync("서울", Arg.Any<CancellationToken>()).Returns(Task.FromResult<IReadOnlyList<RawArrivalRow>>([]));
        var quota = new QuotaGuard(clock, MsOptions.Create(new SeoulOpenApiOptions { SoftLimit = 5 }));
        var fallback = new TimetableSimulatorProvider(
            Substitute.For<Core.Repositories.ISubwayReadRepository>(),
            new MemoryCache(new MemoryCacheOptions()),
            clock,
            new Core.Time.DayTypeResolver([]),
            MsOptions.Create(new RealtimeOptions()));
        var provider = new SeoulRealtimeProvider(client, Create(clock), quota, fallback);

        await provider.GetArrivalsAsync("서울");
        await provider.GetArrivalsAsync("서울");

        await client.Received(1).GetArrivalsAsync("서울", Arg.Any<CancellationToken>());
        Assert.Equal(1, quota.UsedToday);
    }
}
