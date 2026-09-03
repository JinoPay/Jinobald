namespace Jinobald.Subway.Core.Domain;

/// <summary>
/// 열차 칸·문 위치 ("3-2" = 3번째 칸의 2번째 문). 환승정보 CSV 의 "All" 은 같은 승강장이라 아무 칸이나 되므로 null 로 다룹니다.
/// </summary>
public sealed record DoorPosition(int Car, int Door)
{
    /// <summary>
    /// 앱과 알림 문구에 쓰는 표기.
    /// </summary>
    public string Label => $"{Car}-{Door}";

    /// <summary>
    /// CSV 값 두 개에서 파싱. 둘 중 하나라도 숫자가 아니면(예: "All") null.
    /// </summary>
    public static DoorPosition? Parse(string? car, string? door)
    {
        if (int.TryParse(car?.Trim(), out var c) && int.TryParse(door?.Trim(), out var d) && c > 0 && d > 0)
        {
            return new DoorPosition(c, d);
        }

        return null;
    }
}
