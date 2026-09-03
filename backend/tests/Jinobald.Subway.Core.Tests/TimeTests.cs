using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Options;
using Jinobald.Subway.Core.Realtime;
using Jinobald.Subway.Core.Time;
using MsOptions = Microsoft.Extensions.Options.Options;

namespace Jinobald.Subway.Core.Tests;

internal sealed class FixedClock : IClock
{
    public FixedClock(DateTimeOffset utcNow)
    {
        UtcNow = utcNow;
    }

    public DateTimeOffset UtcNow { get; set; }
}

public sealed class TimeTests
{
    [Fact]
    public void ServiceTime_before_3am_belongs_to_previous_day()
    {
        // 2026-09-04 00:30 KST = 2026-09-03 15:30 UTC
        var (date, seconds) = KoreaClock.ServiceTime(new DateTimeOffset(2026, 9, 3, 15, 30, 0, TimeSpan.Zero));
        Assert.Equal(new DateOnly(2026, 9, 3), date);
        Assert.Equal(24 * 3600 + 1800, seconds);
    }

    [Fact]
    public void ServiceTime_daytime_is_same_day()
    {
        var (date, seconds) = KoreaClock.ServiceTime(new DateTimeOffset(2026, 9, 3, 0, 0, 0, TimeSpan.Zero)); // 09:00 KST
        Assert.Equal(new DateOnly(2026, 9, 3), date);
        Assert.Equal(9 * 3600, seconds);
    }

    [Fact]
    public void DayTypeResolver_uses_holidays_and_weekends()
    {
        var resolver = new DayTypeResolver(DayTypeResolver.DefaultHolidays2026);
        Assert.Equal(DayType.Weekday, resolver.Resolve(new DateOnly(2026, 9, 3)));   // 목
        Assert.Equal(DayType.Saturday, resolver.Resolve(new DateOnly(2026, 9, 5)));
        Assert.Equal(DayType.Holiday, resolver.Resolve(new DateOnly(2026, 9, 6)));
        Assert.Equal(DayType.Holiday, resolver.Resolve(new DateOnly(2026, 10, 9)));  // 한글날
    }

    [Fact]
    public void QuotaGuard_resets_at_korean_midnight()
    {
        var clock = new FixedClock(new DateTimeOffset(2026, 9, 3, 14, 0, 0, TimeSpan.Zero)); // 23:00 KST
        var guard = new QuotaGuard(clock, MsOptions.Create(new SeoulOpenApiOptions { SoftLimit = 2, DailyQuota = 3 }));
        Assert.True(guard.TryAcquire());
        Assert.True(guard.TryAcquire());
        Assert.False(guard.TryAcquire());
        Assert.Equal(2, guard.UsedToday);

        clock.UtcNow = new DateTimeOffset(2026, 9, 3, 15, 30, 0, TimeSpan.Zero); // 00:30 KST 다음 날
        Assert.Equal(0, guard.UsedToday);
        Assert.True(guard.TryAcquire());
    }
}
