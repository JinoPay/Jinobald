namespace Jinobald.Subway.Core.Domain;

/// <summary>
/// 응답 데이터가 어디서 왔는지. 앱은 이 값을 화면에 그대로 표시합니다.
/// </summary>
public enum DataSource
{
    /// <summary>서울 API 를 방금 호출한 값.</summary>
    Live,
    /// <summary>TTL 안의 캐시.</summary>
    Cached,
    /// <summary>할당량 소진 등으로 TTL 이 지난 캐시를 그대로 내보낸 값.</summary>
    Stale,
    /// <summary>시각표로 합성한 값 (인증키 없을 때).</summary>
    Timetable,
    /// <summary>결정적 모의 값 (시각표도 없는 노선).</summary>
    Mock,
}

/// <summary>
/// 출처와 시각이 붙은 값.
/// </summary>
public sealed record Cached<T>(T Value, DateTimeOffset FetchedAt, DataSource Source);

/// <summary>
/// 서울 열린데이터광장 실시간 도착정보 한 행. 필드명은 API 응답 그대로 두어 앱의 mappers.ts 가 같은 매핑을 씁니다.
/// </summary>
public sealed record RawArrivalRow(
    string SubwayId,
    string UpdnLine,
    string TrainLineNm,
    string StatnNm,
    string BarvlDt,
    string BtrainSttus,
    string? BtrainNo,
    string ArvlMsg2,
    string ArvlMsg3,
    string ArvlCd,
    string BstatnNm,
    string RecptnDt);

/// <summary>
/// 서울 열린데이터광장 실시간 열차 위치 한 행. 필드명은 API 응답 그대로입니다.
/// <c>TrainSttus</c>: 0 진입, 1 도착, 2 출발, 3 전역출발. <c>UpdnLine</c>: 0 상행/내선, 1 하행/외선.
/// </summary>
public sealed record RawPositionRow(
    string SubwayId,
    string SubwayNm,
    string StatnId,
    string StatnNm,
    string TrainNo,
    string LastRecptnDt,
    string RecptnDt,
    string UpdnLine,
    string StatnTid,
    string StatnTnm,
    string TrainSttus,
    string DirectAt,
    string LstcarAt);
