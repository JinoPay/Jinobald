namespace Jinobald.Subway.Core.Ingestion;

/// <summary>
/// 공공데이터의 시간 표기를 초로. "mm:ss", "HH:mm:ss", "H:mm" 을 받고 24시 이후("25:10:00")도 허용합니다.
/// </summary>
public static class DurationParser
{
    /// <summary>
    /// "mm:ss" 또는 "HH:mm:ss" → 초. 비어 있거나 형식이 다르면 null.
    /// </summary>
    public static int? ParseClock(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var parts = text.Trim().Split(':');
        if (parts.Length is < 2 or > 3)
        {
            return null;
        }

        var numbers = new int[parts.Length];
        for (var i = 0; i < parts.Length; i++)
        {
            if (!int.TryParse(parts[i], out numbers[i]) || numbers[i] < 0)
            {
                return null;
            }
        }

        return parts.Length == 2
            ? numbers[0] * 60 + numbers[1]
            : numbers[0] * 3600 + numbers[1] * 60 + numbers[2];
    }

    /// <summary>
    /// "mm:ss" 형식의 소요시간. 세 토막이면 시:분:초로 봅니다.
    /// </summary>
    public static int? ParseDuration(string? text) => ParseClock(text);

    /// <summary>
    /// 하루 중 시각. "HH:mm" 또는 "HH:mm:ss" → 자정 기준 초. 두 토막을 시:분으로 보는 점이 <see cref="ParseClock"/> 와 다릅니다.
    /// </summary>
    public static int? ParseTimeOfDay(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var parts = text.Trim().Split(':');
        return parts.Length == 2 ? ParseClock(text + ":00") : ParseClock(text);
    }
}
