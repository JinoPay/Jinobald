-- 지노발드 지하철 백엔드 초기 스키마. SQLite 기본, Postgres 이식 가능한 표준 SQL 만 씁니다.

CREATE TABLE IF NOT EXISTS station_codes (
    line_no        TEXT NOT NULL,
    station_cd     TEXT NOT NULL,
    name           TEXT NOT NULL,
    name_key       TEXT NOT NULL,
    external_code  TEXT,
    lat            REAL,
    lng            REAL,
    PRIMARY KEY (line_no, station_cd)
);
CREATE INDEX IF NOT EXISTS ix_station_codes_name_key ON station_codes (name_key);

CREATE TABLE IF NOT EXISTS transfer_guides (
    id                     INTEGER PRIMARY KEY,
    station_name           TEXT NOT NULL,
    name_key               TEXT NOT NULL,
    station_cd             TEXT NOT NULL,
    from_line_no           TEXT NOT NULL,
    from_direction_station TEXT NOT NULL,
    alight_car             INTEGER,
    alight_door            INTEGER,
    to_next_station_cd     TEXT NOT NULL,
    to_direction_station   TEXT NOT NULL,
    board_car              INTEGER,
    board_door             INTEGER,
    seconds                INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_transfer_guides_name_key ON transfer_guides (name_key, from_line_no);

CREATE TABLE IF NOT EXISTS transfer_walk_times (
    line_no          TEXT NOT NULL,
    station_name     TEXT NOT NULL,
    name_key         TEXT NOT NULL,
    to_line_name     TEXT NOT NULL,
    distance_meters  INTEGER NOT NULL,
    seconds          INTEGER NOT NULL,
    PRIMARY KEY (line_no, name_key, to_line_name)
);

CREATE TABLE IF NOT EXISTS segment_times (
    line_no            TEXT NOT NULL,
    from_station_name  TEXT NOT NULL,
    from_name_key      TEXT NOT NULL,
    to_station_name    TEXT NOT NULL,
    to_name_key        TEXT NOT NULL,
    seconds            INTEGER NOT NULL,
    distance_km        REAL NOT NULL,
    PRIMARY KEY (line_no, from_name_key, to_name_key)
);

CREATE TABLE IF NOT EXISTS timetable_entries (
    id                  INTEGER PRIMARY KEY,
    line_no             TEXT NOT NULL,
    station_cd          TEXT NOT NULL,
    station_name        TEXT NOT NULL,
    name_key            TEXT NOT NULL,
    day_type            TEXT NOT NULL,
    direction           TEXT NOT NULL,
    express             INTEGER NOT NULL,
    train_no            TEXT NOT NULL,
    arrive_seconds      INTEGER,
    depart_seconds      INTEGER,
    origin_station      TEXT NOT NULL,
    destination_station TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_timetable_station ON timetable_entries (line_no, station_cd, day_type, direction, depart_seconds);
CREATE INDEX IF NOT EXISTS ix_timetable_name_key ON timetable_entries (name_key, day_type, depart_seconds);
CREATE INDEX IF NOT EXISTS ix_timetable_line_day ON timetable_entries (line_no, day_type, train_no);

CREATE TABLE IF NOT EXISTS fast_exits (
    line_no          TEXT NOT NULL,
    station_cd       TEXT NOT NULL,
    station_name     TEXT NOT NULL,
    direction_label  TEXT NOT NULL,
    car              INTEGER NOT NULL,
    door             INTEGER NOT NULL,
    facility_kind    TEXT NOT NULL,
    facility_label   TEXT NOT NULL,
    fetched_at       TEXT NOT NULL,
    PRIMARY KEY (line_no, station_cd, direction_label, facility_kind, facility_label, car, door)
);

CREATE TABLE IF NOT EXISTS disruption_notices (
    id          TEXT PRIMARY KEY,
    line_no     TEXT,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    category    TEXT NOT NULL,
    starts_at   TEXT NOT NULL,
    ends_at     TEXT,
    fetched_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_runs (
    dataset      TEXT NOT NULL,
    source_name  TEXT NOT NULL,
    checksum     TEXT NOT NULL,
    row_count    INTEGER NOT NULL,
    imported_at  TEXT NOT NULL,
    PRIMARY KEY (dataset, checksum)
);
