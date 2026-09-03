namespace Jinobald.Subway.Core.Domain;

/// <summary>
/// 시각표 요일 구분. CSV 의 DAY / SAT / END 에 대응합니다.
/// </summary>
public enum DayType
{
    Weekday,
    Saturday,
    Holiday,
}

/// <summary>
/// <see cref="DayType"/> 과 CSV 코드 사이의 변환.
/// </summary>
public static class DayTypeCodes
{
    public static string ToCode(this DayType dayType) => dayType switch
    {
        DayType.Weekday => "DAY",
        DayType.Saturday => "SAT",
        DayType.Holiday => "END",
        _ => throw new ArgumentOutOfRangeException(nameof(dayType), dayType, null),
    };

    public static DayType? Parse(string? code) => code?.Trim().ToUpperInvariant() switch
    {
        "DAY" => DayType.Weekday,
        "SAT" => DayType.Saturday,
        "END" => DayType.Holiday,
        _ => null,
    };
}
