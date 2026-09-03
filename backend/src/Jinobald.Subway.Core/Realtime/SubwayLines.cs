namespace Jinobald.Subway.Core.Realtime;

/// <summary>
/// 서울 API 의 subwayId ↔ 노선명 ↔ 시각표 호선번호. 앱의 lines.json 과 같은 값입니다.
/// </summary>
public static class SubwayLines
{
    private static readonly (string SubwayId, string Name, string LineNo)[] Table =
    [
        ("1001", "1호선", "1"),
        ("1002", "2호선", "2"),
        ("1003", "3호선", "3"),
        ("1004", "4호선", "4"),
        ("1005", "5호선", "5"),
        ("1006", "6호선", "6"),
        ("1007", "7호선", "7"),
        ("1008", "8호선", "8"),
        ("1009", "9호선", "9"),
        ("1063", "경의중앙선", "경의중앙선"),
        ("1065", "공항철도", "공항철도"),
        ("1067", "경춘선", "경춘선"),
        ("1075", "수인분당선", "수인분당선"),
        ("1077", "신분당선", "신분당선"),
        ("1092", "우이신설선", "우이신설선"),
        ("1093", "서해선", "서해선"),
        ("1081", "경강선", "경강선"),
        ("1032", "GTX-A", "GTX-A"),
    ];

    public static string? NameOf(string subwayId) => Table.FirstOrDefault(t => t.SubwayId == subwayId).Name;

    public static string? SubwayIdOf(string lineNoOrName) =>
        Table.FirstOrDefault(t => t.LineNo == lineNoOrName || t.Name == lineNoOrName).SubwayId;

    public static string? LineNoOf(string subwayId) => Table.FirstOrDefault(t => t.SubwayId == subwayId).LineNo;

    /// <summary>
    /// 시각표가 있는 노선 (1~9호선).
    /// </summary>
    public static bool HasTimetable(string lineNo) => lineNo.Length == 1 && char.IsDigit(lineNo[0]);

    /// <summary>
    /// 시각표 방향 코드(UP/DOWN/IN/OUT) → 서울 API updnLine 문자열.
    /// </summary>
    public static string UpdnLineLabel(string direction) => direction.ToUpperInvariant() switch
    {
        "UP" => "상행",
        "DOWN" => "하행",
        "IN" => "내선",
        "OUT" => "외선",
        _ => direction,
    };

    /// <summary>
    /// 시각표 방향 코드 → 열차 위치 API updnLine (0 상행/내선, 1 하행/외선).
    /// </summary>
    public static string UpdnLineCode(string direction) => direction.ToUpperInvariant() switch
    {
        "UP" or "IN" => "0",
        _ => "1",
    };
}
