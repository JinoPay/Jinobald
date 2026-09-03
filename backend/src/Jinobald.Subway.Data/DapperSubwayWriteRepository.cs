using Dapper;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Repositories;
using Microsoft.Data.Sqlite;

namespace Jinobald.Subway.Data;

/// <summary>
/// Dapper 쓰기. 데이터셋 교체는 한 트랜잭션 안에서 DELETE 후 INSERT. 시각표(43만 행)는 파라미터를 재사용하는 준비된 명령으로 넣습니다.
/// </summary>
public sealed class DapperSubwayWriteRepository : ISubwayWriteRepository
{
    private readonly IDbConnectionFactory _factory;

    public DapperSubwayWriteRepository(IDbConnectionFactory factory)
    {
        _factory = factory ?? throw new ArgumentNullException(nameof(factory));
    }

    public Task ReplaceStationCodesAsync(IReadOnlyList<StationCode> rows, CancellationToken cancellationToken = default) =>
        ReplaceAsync("station_codes",
            "INSERT OR REPLACE INTO station_codes (line_no, station_cd, name, name_key, external_code, lat, lng) VALUES (@LineNo, @StationCd, @Name, @NameKey, @ExternalCode, @Lat, @Lng)",
            rows, cancellationToken);

    public Task ReplaceTransferGuidesAsync(IReadOnlyList<TransferGuide> rows, CancellationToken cancellationToken = default) =>
        ReplaceAsync("transfer_guides",
            @"INSERT INTO transfer_guides (station_name, name_key, station_cd, from_line_no, from_direction_station, alight_car, alight_door, to_next_station_cd, to_direction_station, board_car, board_door, seconds)
              VALUES (@StationName, @NameKey, @StationCd, @FromLineNo, @FromDirectionStation, @AlightCar, @AlightDoor, @ToNextStationCd, @ToDirectionStation, @BoardCar, @BoardDoor, @Seconds)",
            rows.Select(r => new
            {
                r.StationName, r.NameKey, r.StationCd, r.FromLineNo, r.FromDirectionStation,
                AlightCar = r.Alight?.Car, AlightDoor = r.Alight?.Door, r.ToNextStationCd, r.ToDirectionStation,
                BoardCar = r.Board?.Car, BoardDoor = r.Board?.Door, r.Seconds,
            }).ToList(), cancellationToken);

    public Task ReplaceTransferWalkTimesAsync(IReadOnlyList<TransferWalkTime> rows, CancellationToken cancellationToken = default) =>
        ReplaceAsync("transfer_walk_times",
            "INSERT OR REPLACE INTO transfer_walk_times (line_no, station_name, name_key, to_line_name, distance_meters, seconds) VALUES (@LineNo, @StationName, @NameKey, @ToLineName, @DistanceMeters, @Seconds)",
            rows, cancellationToken);

    public Task ReplaceSegmentTimesAsync(IReadOnlyList<SegmentTime> rows, CancellationToken cancellationToken = default) =>
        ReplaceAsync("segment_times",
            "INSERT OR REPLACE INTO segment_times (line_no, from_station_name, from_name_key, to_station_name, to_name_key, seconds, distance_km) VALUES (@LineNo, @FromStationName, @FromNameKey, @ToStationName, @ToNameKey, @Seconds, @DistanceKm)",
            rows, cancellationToken);

    public async Task ReplaceTimetableAsync(IReadOnlyList<TimetableEntry> rows, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        await using var tx = await c.BeginTransactionAsync(cancellationToken).ConfigureAwait(false);
        await c.ExecuteAsync("DELETE FROM timetable_entries", transaction: tx).ConfigureAwait(false);

        await using var cmd = c.CreateCommand();
        cmd.Transaction = (SqliteTransaction)tx;
        cmd.CommandText = @"INSERT INTO timetable_entries (line_no, station_cd, station_name, name_key, day_type, direction, express, train_no, arrive_seconds, depart_seconds, origin_station, destination_station)
                            VALUES ($line, $cd, $name, $key, $day, $dir, $express, $train, $arrive, $depart, $origin, $dest)";
        var p = new[] { "$line", "$cd", "$name", "$key", "$day", "$dir", "$express", "$train", "$arrive", "$depart", "$origin", "$dest" }
            .Select(n => cmd.Parameters.Add(n, n is "$express" or "$arrive" or "$depart" ? SqliteType.Integer : SqliteType.Text)).ToArray();
        await cmd.PrepareAsync(cancellationToken).ConfigureAwait(false);
        foreach (var r in rows)
        {
            p[0].Value = r.LineNo;
            p[1].Value = r.StationCd;
            p[2].Value = r.StationName;
            p[3].Value = r.NameKey;
            p[4].Value = r.DayType.ToCode();
            p[5].Value = r.Direction;
            p[6].Value = r.Express ? 1 : 0;
            p[7].Value = r.TrainNo;
            p[8].Value = (object?)r.ArriveSeconds ?? DBNull.Value;
            p[9].Value = (object?)r.DepartSeconds ?? DBNull.Value;
            p[10].Value = r.OriginStation;
            p[11].Value = r.DestinationStation;
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }

        await tx.CommitAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task UpsertFastExitsAsync(IReadOnlyList<FastExit> rows, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        await using var tx = await c.BeginTransactionAsync(cancellationToken).ConfigureAwait(false);
        await c.ExecuteAsync(
            @"INSERT INTO fast_exits (line_no, station_cd, station_name, direction_label, car, door, facility_kind, facility_label, fetched_at)
              VALUES (@LineNo, @StationCd, @StationName, @DirectionLabel, @Car, @Door, @FacilityKind, @FacilityLabel, @FetchedAt)
              ON CONFLICT (line_no, station_cd, direction_label, facility_kind, facility_label, car, door) DO UPDATE SET station_name = excluded.station_name, fetched_at = excluded.fetched_at",
            rows.Select(r => new { r.LineNo, r.StationCd, r.StationName, r.DirectionLabel, r.Door.Car, r.Door.Door, r.FacilityKind, r.FacilityLabel, FetchedAt = Iso(r.FetchedAt) }).ToList(),
            tx).ConfigureAwait(false);
        await tx.CommitAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task UpsertNoticesAsync(IReadOnlyList<DisruptionNotice> rows, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        await using var tx = await c.BeginTransactionAsync(cancellationToken).ConfigureAwait(false);
        await c.ExecuteAsync(
            @"INSERT INTO disruption_notices (id, line_no, title, content, category, starts_at, ends_at, fetched_at)
              VALUES (@Id, @LineNo, @Title, @Content, @Category, @StartsAt, @EndsAt, @FetchedAt)
              ON CONFLICT (id) DO UPDATE SET line_no = excluded.line_no, title = excluded.title, content = excluded.content, category = excluded.category, starts_at = excluded.starts_at, ends_at = excluded.ends_at, fetched_at = excluded.fetched_at",
            rows.Select(r => new { r.Id, r.LineNo, r.Title, r.Content, r.Category, StartsAt = Iso(r.StartsAt), EndsAt = r.EndsAt is null ? null : Iso(r.EndsAt.Value), FetchedAt = Iso(r.FetchedAt) }).ToList(),
            tx).ConfigureAwait(false);
        await tx.CommitAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task RecordImportRunAsync(ImportRun run, CancellationToken cancellationToken = default)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        await c.ExecuteAsync(
            "INSERT OR REPLACE INTO import_runs (dataset, source_name, checksum, row_count, imported_at) VALUES (@Dataset, @SourceName, @Checksum, @RowCount, @ImportedAt)",
            new { Dataset = run.Dataset.ToString(), run.SourceName, run.Checksum, run.RowCount, ImportedAt = Iso(run.ImportedAt) }).ConfigureAwait(false);
    }

    private async Task ReplaceAsync<T>(string table, string insertSql, IReadOnlyList<T> rows, CancellationToken cancellationToken)
    {
        await using var c = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        await using var tx = await c.BeginTransactionAsync(cancellationToken).ConfigureAwait(false);
        await c.ExecuteAsync($"DELETE FROM {table}", transaction: tx).ConfigureAwait(false);
        await c.ExecuteAsync(insertSql, rows, tx).ConfigureAwait(false);
        await tx.CommitAsync(cancellationToken).ConfigureAwait(false);
    }

    private static string Iso(DateTimeOffset value) => value.ToUniversalTime().ToString("O");
}
