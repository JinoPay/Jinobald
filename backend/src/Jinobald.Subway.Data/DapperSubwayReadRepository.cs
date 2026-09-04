using Dapper;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Repositories;

namespace Jinobald.Subway.Data;

/// <summary>
/// Dapper 조회. 컬럼은 snake_case, 레코드 매핑은 행 DTO 를 거쳐 명시적으로 합니다 (enum·DateTimeOffset·DoorPosition 때문).
/// </summary>
public sealed class DapperSubwayReadRepository : ISubwayReadRepository
{
    private readonly IDbConnectionFactory _factory;

    public DapperSubwayReadRepository(IDbConnectionFactory factory)
    {
        _factory = factory ?? throw new ArgumentNullException(nameof(factory));
    }

    public async Task<IReadOnlyList<StationCode>> GetStationCodesAsync(CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        var rows = await c.QueryAsync<StationCodeRow>("SELECT line_no, station_cd, name, name_key, external_code, lat, lng FROM station_codes ORDER BY line_no, station_cd").ConfigureAwait(false);
        return rows.Select(r => new StationCode(r.line_no, r.station_cd, r.name, r.name_key, r.external_code, r.lat, r.lng)).ToList();
    }

    public async Task<IReadOnlyList<TransferGuide>> FindTransferGuidesAsync(string? nameKey, string? fromLineNo, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        var sql = "SELECT * FROM transfer_guides WHERE (@nameKey IS NULL OR name_key = @nameKey) AND (@fromLineNo IS NULL OR from_line_no = @fromLineNo) ORDER BY id";
        var rows = await c.QueryAsync<TransferGuideRow>(sql, new { nameKey, fromLineNo }).ConfigureAwait(false);
        return rows.Select(r => new TransferGuide(
            r.station_name, r.name_key, r.station_cd, r.from_line_no, r.from_direction_station,
            Door(r.alight_car, r.alight_door), r.to_next_station_cd, r.to_direction_station, Door(r.board_car, r.board_door), r.seconds)).ToList();
    }

    public async Task<IReadOnlyList<TransferWalkTime>> GetTransferWalkTimesAsync(CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        var rows = await c.QueryAsync<TransferWalkTimeRow>("SELECT * FROM transfer_walk_times ORDER BY line_no, name_key").ConfigureAwait(false);
        return rows.Select(r => new TransferWalkTime(r.line_no, r.station_name, r.name_key, r.to_line_name, r.distance_meters, r.seconds)).ToList();
    }

    public async Task<IReadOnlyList<SegmentTime>> GetSegmentTimesAsync(string? lineNo, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        var rows = await c.QueryAsync<SegmentTimeRow>("SELECT * FROM segment_times WHERE (@lineNo IS NULL OR line_no = @lineNo) ORDER BY rowid", new { lineNo }).ConfigureAwait(false);
        return rows.Select(r => new SegmentTime(r.line_no, r.from_station_name, r.from_name_key, r.to_station_name, r.to_name_key, r.seconds, r.distance_km)).ToList();
    }

    public async Task<IReadOnlyList<TimetableEntry>> GetTimetableAsync(string lineNo, DayType dayType, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        var rows = await c.QueryAsync<TimetableRow>(
            "SELECT * FROM timetable_entries WHERE line_no = @lineNo AND day_type = @dayType ORDER BY train_no, COALESCE(arrive_seconds, depart_seconds)",
            new { lineNo, dayType = dayType.ToCode() }).ConfigureAwait(false);
        return rows.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<TimetableEntry>> GetNextDeparturesAsync(string lineNo, string stationCd, DayType dayType, string? direction, int afterSeconds, int limit, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        var sql = @"SELECT * FROM timetable_entries
                    WHERE line_no = @lineNo AND station_cd = @stationCd AND day_type = @dayType
                      AND (@direction IS NULL OR direction = @direction)
                      AND COALESCE(depart_seconds, arrive_seconds) >= @afterSeconds
                    ORDER BY COALESCE(depart_seconds, arrive_seconds) LIMIT @limit";
        var rows = await c.QueryAsync<TimetableRow>(sql, new { lineNo, stationCd, dayType = dayType.ToCode(), direction = direction?.ToUpperInvariant(), afterSeconds, limit }).ConfigureAwait(false);
        return rows.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<TimetableEntry>> GetNextDeparturesByNameAsync(string nameKey, DayType dayType, int afterSeconds, int windowSeconds, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        var sql = @"SELECT * FROM timetable_entries
                    WHERE name_key = @nameKey AND day_type = @dayType
                      AND COALESCE(arrive_seconds, depart_seconds) BETWEEN @afterSeconds AND @until
                    ORDER BY COALESCE(arrive_seconds, depart_seconds) LIMIT 40";
        var rows = await c.QueryAsync<TimetableRow>(sql, new { nameKey, dayType = dayType.ToCode(), afterSeconds, until = afterSeconds + windowSeconds }).ConfigureAwait(false);
        return rows.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<TimetableEntry>> GetLastDeparturesAsync(string lineNo, string stationCd, DayType dayType, string? direction, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        // 방향마다 가장 늦은 출발(종착역이면 도착). ix_timetable_station 을 탑니다.
        var sql = @"SELECT t.* FROM timetable_entries t
                    WHERE t.line_no = @lineNo AND t.station_cd = @stationCd AND t.day_type = @dayType
                      AND (@direction IS NULL OR t.direction = @direction)
                      AND COALESCE(t.depart_seconds, t.arrive_seconds) = (
                        SELECT MAX(COALESCE(u.depart_seconds, u.arrive_seconds)) FROM timetable_entries u
                        WHERE u.line_no = t.line_no AND u.station_cd = t.station_cd AND u.day_type = t.day_type AND u.direction = t.direction)
                    ORDER BY t.direction";
        var rows = await c.QueryAsync<TimetableRow>(sql, new { lineNo, stationCd, dayType = dayType.ToCode(), direction = direction?.ToUpperInvariant() }).ConfigureAwait(false);
        return rows.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<FastExit>> GetFastExitsAsync(string lineNo, string stationCd, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        var rows = await c.QueryAsync<FastExitRow>("SELECT * FROM fast_exits WHERE line_no = @lineNo AND station_cd = @stationCd", new { lineNo, stationCd }).ConfigureAwait(false);
        return rows.Select(r => new FastExit(r.line_no, r.station_cd, r.station_name, r.direction_label, new DoorPosition(r.car, r.door), r.facility_kind, r.facility_label, Dto(r.fetched_at))).ToList();
    }

    public async Task<IReadOnlyList<DisruptionNotice>> GetNoticesAsync(DateTimeOffset? activeAt, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        var sql = "SELECT * FROM disruption_notices WHERE (@at IS NULL OR (starts_at <= @at AND (ends_at IS NULL OR ends_at >= @at))) ORDER BY starts_at DESC LIMIT 100";
        var rows = await c.QueryAsync<NoticeRow>(sql, new { at = activeAt?.ToUniversalTime().ToString("O") }).ConfigureAwait(false);
        return rows.Select(r => new DisruptionNotice(r.id, r.line_no, r.title, r.content, r.category, Dto(r.starts_at), r.ends_at is null ? null : Dto(r.ends_at), Dto(r.fetched_at))).ToList();
    }

    public async Task<IReadOnlyList<ImportRun>> GetImportRunsAsync(CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        // 데이터셋마다 가장 최근 적재 하나. 이력이 쌓여도 전체를 읽지 않습니다.
        var rows = await c.QueryAsync<ImportRunRow>(
            @"SELECT r.* FROM import_runs r
              WHERE r.imported_at = (SELECT MAX(imported_at) FROM import_runs WHERE dataset = r.dataset)
              ORDER BY r.dataset").ConfigureAwait(false);
        return rows.Select(r => new ImportRun(Enum.Parse<DatasetKind>(r.dataset), r.source_name, r.checksum, r.row_count, Dto(r.imported_at))).ToList();
    }

    public async Task<bool> HasImportRunAsync(DatasetKind dataset, string checksum, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        var count = await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM import_runs WHERE dataset = @dataset AND checksum = @checksum", new { dataset = dataset.ToString(), checksum }).ConfigureAwait(false);
        return count > 0;
    }

    public async Task<bool> PingAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
            return await c.ExecuteScalarAsync<int>("SELECT 1").ConfigureAwait(false) == 1;
        }
        catch (Exception ex) when (ex is Microsoft.Data.Sqlite.SqliteException or IOException or UnauthorizedAccessException)
        {
            return false;
        }
    }

    public async Task<long> CountTimetableAsync(CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        return await c.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM timetable_entries").ConfigureAwait(false);
    }

    private static TimetableEntry Map(TimetableRow r) => new(
        r.line_no, r.station_cd, r.station_name, r.name_key, DayTypeCodes.Parse(r.day_type) ?? DayType.Weekday,
        r.direction, r.express != 0, r.train_no, r.arrive_seconds, r.depart_seconds, r.origin_station, r.destination_station);

    private static DoorPosition? Door(int? car, int? door) => car is > 0 && door is > 0 ? new DoorPosition(car.Value, door.Value) : null;

    private static DateTimeOffset Dto(string text) => DateTimeOffset.Parse(text, System.Globalization.CultureInfo.InvariantCulture);

#pragma warning disable IDE1006, SA1300 // 행 DTO 는 컬럼명(snake_case) 그대로 둡니다.
    private sealed class StationCodeRow { public string line_no { get; set; } = ""; public string station_cd { get; set; } = ""; public string name { get; set; } = ""; public string name_key { get; set; } = ""; public string? external_code { get; set; } public double? lat { get; set; } public double? lng { get; set; } }
    private sealed class TransferGuideRow { public long id { get; set; } public string station_name { get; set; } = ""; public string name_key { get; set; } = ""; public string station_cd { get; set; } = ""; public string from_line_no { get; set; } = ""; public string from_direction_station { get; set; } = ""; public int? alight_car { get; set; } public int? alight_door { get; set; } public string to_next_station_cd { get; set; } = ""; public string to_direction_station { get; set; } = ""; public int? board_car { get; set; } public int? board_door { get; set; } public int seconds { get; set; } }
    private sealed class TransferWalkTimeRow { public string line_no { get; set; } = ""; public string station_name { get; set; } = ""; public string name_key { get; set; } = ""; public string to_line_name { get; set; } = ""; public int distance_meters { get; set; } public int seconds { get; set; } }
    private sealed class SegmentTimeRow { public string line_no { get; set; } = ""; public string from_station_name { get; set; } = ""; public string from_name_key { get; set; } = ""; public string to_station_name { get; set; } = ""; public string to_name_key { get; set; } = ""; public int seconds { get; set; } public double distance_km { get; set; } }
    private sealed class TimetableRow { public long id { get; set; } public string line_no { get; set; } = ""; public string station_cd { get; set; } = ""; public string station_name { get; set; } = ""; public string name_key { get; set; } = ""; public string day_type { get; set; } = ""; public string direction { get; set; } = ""; public int express { get; set; } public string train_no { get; set; } = ""; public int? arrive_seconds { get; set; } public int? depart_seconds { get; set; } public string origin_station { get; set; } = ""; public string destination_station { get; set; } = ""; }
    private sealed class FastExitRow { public string line_no { get; set; } = ""; public string station_cd { get; set; } = ""; public string station_name { get; set; } = ""; public string direction_label { get; set; } = ""; public int car { get; set; } public int door { get; set; } public string facility_kind { get; set; } = ""; public string facility_label { get; set; } = ""; public string fetched_at { get; set; } = ""; }
    private sealed class NoticeRow { public string id { get; set; } = ""; public string? line_no { get; set; } public string title { get; set; } = ""; public string content { get; set; } = ""; public string category { get; set; } = ""; public string starts_at { get; set; } = ""; public string? ends_at { get; set; } public string fetched_at { get; set; } = ""; }
    private sealed class ImportRunRow { public string dataset { get; set; } = ""; public string source_name { get; set; } = ""; public string checksum { get; set; } = ""; public int row_count { get; set; } public string imported_at { get; set; } = ""; }
#pragma warning restore IDE1006, SA1300
}
