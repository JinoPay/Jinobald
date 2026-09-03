namespace Jinobald.Subway.Core.Domain;

/// <summary>
/// 적재 대상 데이터셋.
/// </summary>
public enum DatasetKind
{
    StationCodes,
    TransferGuides,
    TransferWalkTimes,
    SegmentTimes,
    Timetable,
}

/// <summary>
/// 적재 결과. 같은 체크섬을 이미 적재했으면 <c>Skipped</c> 입니다.
/// </summary>
public sealed record ImportResult(
    DatasetKind Dataset,
    string SourceName,
    string Checksum,
    int RowCount,
    bool Skipped,
    IReadOnlyList<string> Warnings)
{
    public static ImportResult SkippedUnchanged(DatasetKind dataset, string sourceName, string checksum, int rowCount) =>
        new(dataset, sourceName, checksum, rowCount, true, []);
}

/// <summary>
/// 적재 이력 한 건.
/// </summary>
public sealed record ImportRun(
    DatasetKind Dataset,
    string SourceName,
    string Checksum,
    int RowCount,
    DateTimeOffset ImportedAt);
