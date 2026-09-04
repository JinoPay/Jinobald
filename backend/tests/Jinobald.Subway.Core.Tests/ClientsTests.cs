using Jinobald.Subway.Core.Realtime;

namespace Jinobald.Subway.Core.Tests;

public sealed class ClientsTests
{
    [Fact]
    public void Notice_id_is_stable_across_calls()
    {
        var at = new DateTimeOffset(2026, 9, 4, 8, 0, 0, TimeSpan.FromHours(9));
        var a = DataGoKrClient.StableNoticeId(at, "2호선 지연");
        var b = DataGoKrClient.StableNoticeId(at, "2호선 지연");
        Assert.Equal(a, b);
        Assert.Equal(16, a.Length);
        Assert.NotEqual(a, DataGoKrClient.StableNoticeId(at, "3호선 지연"));
    }

    [Fact]
    public void ParseDate_assumes_korea_time_when_no_offset()
    {
        var parsed = DataGoKrClient.ParseDate("2026-09-04 08:00:00");
        Assert.NotNull(parsed);
        Assert.Equal(TimeSpan.FromHours(9), parsed.Value.Offset);
        Assert.Equal(8, parsed.Value.Hour);
        Assert.Equal(new DateTimeOffset(2026, 9, 3, 23, 0, 0, TimeSpan.Zero), parsed.Value.ToUniversalTime());
    }

    [Fact]
    public void ParseDate_keeps_explicit_offset()
    {
        var parsed = DataGoKrClient.ParseDate("2026-09-04T08:00:00+09:00");
        Assert.Equal(new DateTimeOffset(2026, 9, 4, 8, 0, 0, TimeSpan.FromHours(9)), parsed);
        Assert.Null(DataGoKrClient.ParseDate(""));
        Assert.Null(DataGoKrClient.ParseDate("not a date"));
    }
}
