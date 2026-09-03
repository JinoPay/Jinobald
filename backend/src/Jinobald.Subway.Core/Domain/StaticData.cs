namespace Jinobald.Subway.Core.Domain;

/// <summary>
/// 서울교통공사 역코드. <c>LineNo</c> 는 "1"~"9" 또는 광역철도 이름, <c>StationCd</c> 는 4자리 0 채움 코드입니다.
/// </summary>
public sealed record StationCode(
    string LineNo,
    string StationCd,
    string Name,
    string NameKey,
    string? ExternalCode,
    double? Lat,
    double? Lng);

/// <summary>
/// 환승역의 최단 환승 경로 한 건 (환승정보 CSV 한 행).
/// <c>FromDirectionStation</c>/<c>ToDirectionStation</c> 은 "… 방면" 에서 "방면" 을 뗀 역명입니다.
/// </summary>
public sealed record TransferGuide(
    string StationName,
    string NameKey,
    string StationCd,
    string FromLineNo,
    string FromDirectionStation,
    DoorPosition? Alight,
    string ToNextStationCd,
    string ToDirectionStation,
    DoorPosition? Board,
    int Seconds);

/// <summary>
/// 환승 통로 거리·도보 소요시간 (보행 1.2 m/s 기준).
/// </summary>
public sealed record TransferWalkTime(
    string LineNo,
    string StationName,
    string NameKey,
    string ToLineName,
    int DistanceMeters,
    int Seconds);

/// <summary>
/// 역간 표준 운행시간. <c>Seconds</c> 는 <c>FromStation</c> → <c>ToStation</c>.
/// </summary>
public sealed record SegmentTime(
    string LineNo,
    string FromStationName,
    string FromNameKey,
    string ToStationName,
    string ToNameKey,
    int Seconds,
    double DistanceKm);

/// <summary>
/// 시각표 한 행. 시각은 운행일 자정 기준 초(24시 이후는 86400 초과).
/// 시·종착역은 도착 또는 출발 중 하나가 null 입니다.
/// </summary>
public sealed record TimetableEntry(
    string LineNo,
    string StationCd,
    string StationName,
    string NameKey,
    DayType DayType,
    string Direction,
    bool Express,
    string TrainNo,
    int? ArriveSeconds,
    int? DepartSeconds,
    string OriginStation,
    string DestinationStation);

/// <summary>
/// 빠른하차 정보 한 건 (data.go.kr 15143840).
/// </summary>
public sealed record FastExit(
    string LineNo,
    string StationCd,
    string StationName,
    string DirectionLabel,
    DoorPosition Door,
    string FacilityKind,
    string FacilityLabel,
    DateTimeOffset FetchedAt);

/// <summary>
/// 운행 공지 (지연·사고·무정차 등).
/// </summary>
public sealed record DisruptionNotice(
    string Id,
    string? LineNo,
    string Title,
    string Content,
    string Category,
    DateTimeOffset StartsAt,
    DateTimeOffset? EndsAt,
    DateTimeOffset FetchedAt);
