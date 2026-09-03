using System.Text.RegularExpressions;

namespace Jinobald.Subway.Core.Names;

/// <summary>
/// 역명 정규화 — 앱의 <c>src/services/routing/graph.ts</c> 의 <c>normalizeStationKey</c> 와 **같은 규칙**입니다.
/// 괄호 접미(총신대입구(이수) → 총신대입구), 모든 공백, 끝의 "역"(서울역 → 서울)을 제거합니다.
/// 두 구현이 어긋나면 데이터셋 조인이 조용히 깨지므로 테스트가 같은 픽스처로 둘을 고정합니다.
/// </summary>
public static partial class StationNameNormalizer
{
    [GeneratedRegex(@"\(.*?\)")]
    private static partial Regex Parenthetical();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    /// <summary>
    /// 정규화된 키. 빈 문자열이면 유효한 역명이 아닙니다.
    /// </summary>
    public static string Normalize(string name)
    {
        ArgumentNullException.ThrowIfNull(name);
        var value = Parenthetical().Replace(name, string.Empty);
        value = Whitespace().Replace(value, string.Empty);
        if (value.EndsWith('역'))
        {
            value = value[..^1];
        }

        return value.Trim();
    }
}
