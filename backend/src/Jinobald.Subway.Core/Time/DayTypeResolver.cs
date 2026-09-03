using Jinobald.Subway.Core.Domain;

namespace Jinobald.Subway.Core.Time;

/// <summary>
/// 날짜 → 시각표 요일 구분. 일요일과 공휴일은 <see cref="DayType.Holiday"/>(시각표의 END) 입니다.
/// 공휴일 목록은 설정(<c>Timetable:Holidays</c>)에서 옵니다 — 기본값은 2026년 법정공휴일입니다.
/// </summary>
public sealed class DayTypeResolver
{
    private readonly HashSet<DateOnly> _holidays;

    public DayTypeResolver(IEnumerable<DateOnly> holidays)
    {
        _holidays = [.. holidays];
    }

    /// <summary>
    /// 2026년 법정공휴일(대체공휴일 포함). 매년 갱신하거나 설정으로 덮어씁니다.
    /// </summary>
    public static IReadOnlyList<DateOnly> DefaultHolidays2026 { get; } =
    [
        new(2026, 1, 1),
        new(2026, 2, 16), new(2026, 2, 17), new(2026, 2, 18),
        new(2026, 3, 1), new(2026, 3, 2),
        new(2026, 5, 5), new(2026, 5, 24), new(2026, 5, 25),
        new(2026, 6, 3), new(2026, 6, 6),
        new(2026, 8, 15), new(2026, 8, 17),
        new(2026, 9, 24), new(2026, 9, 25), new(2026, 9, 26),
        new(2026, 10, 3), new(2026, 10, 5), new(2026, 10, 9),
        new(2026, 12, 25),
    ];

    public DayType Resolve(DateOnly date)
    {
        if (_holidays.Contains(date))
        {
            return DayType.Holiday;
        }

        return date.DayOfWeek switch
        {
            DayOfWeek.Saturday => DayType.Saturday,
            DayOfWeek.Sunday => DayType.Holiday,
            _ => DayType.Weekday,
        };
    }
}
