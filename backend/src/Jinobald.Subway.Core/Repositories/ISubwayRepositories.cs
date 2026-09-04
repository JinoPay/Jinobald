using Jinobald.Subway.Core.Domain;

namespace Jinobald.Subway.Core.Repositories;

/// <summary>
/// 읽기 전용 조회. 모든 조회는 정규화된 역명 키 또는 역코드로 합니다.
/// </summary>
public interface ISubwayReadRepository
{
    Task<IReadOnlyList<StationCode>> GetStationCodesAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TransferGuide>> FindTransferGuidesAsync(string? nameKey, string? fromLineNo, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TransferWalkTime>> GetTransferWalkTimesAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SegmentTime>> GetSegmentTimesAsync(string? lineNo, CancellationToken cancellationToken = default);

    /// <summary>
    /// 한 노선·요일의 시각표 전체 (시뮬레이터용). 열차코드·시각 순으로 정렬됩니다.
    /// </summary>
    Task<IReadOnlyList<TimetableEntry>> GetTimetableAsync(string lineNo, DayType dayType, CancellationToken cancellationToken = default);

    /// <summary>
    /// 한 역의 다음 출발 열차. <paramref name="afterSeconds"/> 이후 출발(또는 도착)하는 순서로 <paramref name="limit"/> 개.
    /// </summary>
    Task<IReadOnlyList<TimetableEntry>> GetNextDeparturesAsync(
        string lineNo,
        string stationCd,
        DayType dayType,
        string? direction,
        int afterSeconds,
        int limit,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 역명 키로 모든 노선의 다음 출발 열차 (실시간 도착 합성용).
    /// </summary>
    Task<IReadOnlyList<TimetableEntry>> GetNextDeparturesByNameAsync(
        string nameKey,
        DayType dayType,
        int afterSeconds,
        int windowSeconds,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 한 역의 막차. 방향을 주지 않으면 방향마다 하나씩.
    /// </summary>
    Task<IReadOnlyList<TimetableEntry>> GetLastDeparturesAsync(
        string lineNo,
        string stationCd,
        DayType dayType,
        string? direction,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FastExit>> GetFastExitsAsync(string lineNo, string stationCd, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DisruptionNotice>> GetNoticesAsync(DateTimeOffset? activeAt, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ImportRun>> GetImportRunsAsync(CancellationToken cancellationToken = default);

    Task<bool> HasImportRunAsync(DatasetKind dataset, string checksum, CancellationToken cancellationToken = default);

    /// <summary>
    /// DB 파일을 실제로 읽을 수 있는지 (SELECT 1). /health 가 씁니다.
    /// </summary>
    Task<bool> PingAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 시각표 행 수. 0 이면 적재가 안 된 것입니다.
    /// </summary>
    Task<long> CountTimetableAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// 쓰기. 데이터셋 교체는 한 트랜잭션에서 전체 삭제 후 삽입입니다 — 원본 파일이 곧 진실이므로 부분 갱신을 하지 않습니다.
/// </summary>
public interface ISubwayWriteRepository
{
    Task ReplaceStationCodesAsync(IReadOnlyList<StationCode> rows, CancellationToken cancellationToken = default);

    Task ReplaceTransferGuidesAsync(IReadOnlyList<TransferGuide> rows, CancellationToken cancellationToken = default);

    Task ReplaceTransferWalkTimesAsync(IReadOnlyList<TransferWalkTime> rows, CancellationToken cancellationToken = default);

    Task ReplaceSegmentTimesAsync(IReadOnlyList<SegmentTime> rows, CancellationToken cancellationToken = default);

    Task ReplaceTimetableAsync(IReadOnlyList<TimetableEntry> rows, CancellationToken cancellationToken = default);

    Task UpsertFastExitsAsync(IReadOnlyList<FastExit> rows, CancellationToken cancellationToken = default);

    Task UpsertNoticesAsync(IReadOnlyList<DisruptionNotice> rows, CancellationToken cancellationToken = default);

    Task RecordImportRunAsync(ImportRun run, CancellationToken cancellationToken = default);
}
