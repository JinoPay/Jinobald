using Jinobald.Subway.Core.Domain;

namespace Jinobald.Subway.Core.Realtime;

/// <summary>
/// 실시간 도착·위치 공급자. 서울 API(키 있음) 또는 시각표 시뮬레이터(키 없음).
/// </summary>
public interface IRealtimeProvider
{
    /// <summary>
    /// 사람이 읽는 이름 — /health 에 노출됩니다.
    /// </summary>
    string Name { get; }

    Task<Cached<IReadOnlyList<RawArrivalRow>>> GetArrivalsAsync(string stationName, CancellationToken cancellationToken = default);

    /// <summary>
    /// 한 노선의 열차 위치. <paramref name="subwayId"/> 는 "1002" 같은 서울 API 노선 id.
    /// </summary>
    Task<Cached<IReadOnlyList<RawPositionRow>>> GetPositionsAsync(string subwayId, CancellationToken cancellationToken = default);
}
