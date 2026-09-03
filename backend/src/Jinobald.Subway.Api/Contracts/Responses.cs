using Jinobald.Subway.Core.Domain;

namespace Jinobald.Subway.Api.Contracts;

/// <summary>
/// 오류 응답. <c>kind</c> 는 앱의 SubwayApiErrorKind 와 같은 어휘(validation·quota·auth·timeout·network·unknown).
/// </summary>
public sealed record ErrorResponse(string Kind, string Message);

/// <summary>
/// 실시간 응답 봉투. <c>source</c> 는 live·cached·stale·timetable·mock.
/// </summary>
public sealed record RealtimeResponse<T>(IReadOnlyList<T> Rows, DateTimeOffset FetchedAt, DataSource Source);

public sealed record HealthResponse(bool Ok, string RealtimeProvider, KeysResponse Keys, QuotaResponse Quota, IReadOnlyList<DatasetResponse> Datasets);

public sealed record KeysResponse(bool Seoul, bool DataGoKr);

public sealed record QuotaResponse(int UsedToday, int SoftLimit, int DailyLimit);

public sealed record DatasetResponse(string Dataset, string SourceName, string Checksum, int RowCount, DateTimeOffset ImportedAt)
{
    public static DatasetResponse From(ImportRun run) => new(run.Dataset.ToString(), run.SourceName, run.Checksum, run.RowCount, run.ImportedAt);
}

public sealed record DoorResponse(int Car, int Door, string Label)
{
    public static DoorResponse? From(DoorPosition? door) => door is null ? null : new(door.Car, door.Door, door.Label);
}

public sealed record TransferGuideResponse(
    string StationName,
    string NameKey,
    string StationCd,
    string FromLineNo,
    string FromDirectionStation,
    DoorResponse? Alight,
    string ToNextStationCd,
    string ToDirectionStation,
    DoorResponse? Board,
    int Seconds)
{
    public static TransferGuideResponse From(TransferGuide g) => new(
        g.StationName, g.NameKey, g.StationCd, g.FromLineNo, g.FromDirectionStation, DoorResponse.From(g.Alight),
        g.ToNextStationCd, g.ToDirectionStation, DoorResponse.From(g.Board), g.Seconds);
}

public sealed record TimetableResponse(string DayType, int AfterSeconds, IReadOnlyList<TimetableEntryResponse> Entries);

public sealed record TimetableEntryResponse(
    string LineNo,
    string StationCd,
    string StationName,
    string Direction,
    bool Express,
    string TrainNo,
    string? Arrive,
    string? Depart,
    int? ArriveSeconds,
    int? DepartSeconds,
    string OriginStation,
    string DestinationStation)
{
    public static TimetableEntryResponse From(TimetableEntry e) => new(
        e.LineNo, e.StationCd, e.StationName, e.Direction, e.Express, e.TrainNo,
        Clock(e.ArriveSeconds), Clock(e.DepartSeconds), e.ArriveSeconds, e.DepartSeconds, e.OriginStation, e.DestinationStation);

    private static string? Clock(int? seconds) =>
        seconds is null ? null : $"{seconds / 3600:00}:{seconds % 3600 / 60:00}:{seconds % 60:00}";
}

public sealed record FastExitResponse(string LineNo, string StationCd, string StationName, string DirectionLabel, DoorResponse Door, string FacilityKind, string FacilityLabel)
{
    public static FastExitResponse From(FastExit f) => new(f.LineNo, f.StationCd, f.StationName, f.DirectionLabel, DoorResponse.From(f.Door)!, f.FacilityKind, f.FacilityLabel);
}
