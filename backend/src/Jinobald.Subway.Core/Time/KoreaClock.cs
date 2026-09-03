namespace Jinobald.Subway.Core.Time;

/// <summary>
/// 현재 시각 공급자. 시뮬레이터·할당량 계산이 테스트에서 시각을 고정할 수 있도록 인터페이스로 둡니다.
/// </summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

/// <summary>
/// 시스템 시계.
/// </summary>
public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

/// <summary>
/// 한국 표준시 유틸리티. 지하철 운행일은 새벽 3시에 바뀌는 것으로 봅니다 —
/// 00:30 의 막차는 전날 시각표(24:30)에 속합니다.
/// </summary>
public static class KoreaClock
{
    /// <summary>
    /// 운행일 경계(시). 이 시각 이전은 전날 시각표로 봅니다.
    /// </summary>
    public const int ServiceDayBoundaryHour = 3;

    public static readonly TimeZoneInfo Zone = ResolveZone();

    private static TimeZoneInfo ResolveZone()
    {
        foreach (var id in new[] { "Asia/Seoul", "Korea Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
                // 다음 후보
            }
            catch (InvalidTimeZoneException)
            {
                // 다음 후보
            }
        }

        return TimeZoneInfo.CreateCustomTimeZone("KST", TimeSpan.FromHours(9), "KST", "KST");
    }

    /// <summary>
    /// UTC 시각을 한국 시각으로.
    /// </summary>
    public static DateTimeOffset ToKorea(DateTimeOffset utc) => TimeZoneInfo.ConvertTime(utc, Zone);

    /// <summary>
    /// 운행일과 그 운행일 기준 경과 초. 새벽 3시 이전이면 전날 + 24시간 이후로 계산합니다.
    /// </summary>
    public static (DateOnly ServiceDate, int SecondsSinceMidnight) ServiceTime(DateTimeOffset utc)
    {
        var local = ToKorea(utc);
        var seconds = (int)local.TimeOfDay.TotalSeconds;
        var date = DateOnly.FromDateTime(local.DateTime);
        if (local.Hour < ServiceDayBoundaryHour)
        {
            date = date.AddDays(-1);
            seconds += 24 * 3600;
        }

        return (date, seconds);
    }
}
