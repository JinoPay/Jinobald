using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Names;

namespace Jinobald.Subway.Core.Ingestion;

/// <summary>
/// CSV 한 종류를 도메인 레코드로 바꾸는 파서. 파싱 불가 행은 <see cref="ParseOutcome{T}.Warnings"/> 에 남기고 건너뜁니다.
/// </summary>
public interface IDatasetParser<T>
{
    DatasetKind Kind { get; }

    Task<ParseOutcome<T>> ParseAsync(Stream csv, CancellationToken cancellationToken = default);
}

/// <summary>
/// 파싱 결과. 경고는 원본 행 번호와 이유를 담습니다.
/// </summary>
public sealed record ParseOutcome<T>(IReadOnlyList<T> Rows, IReadOnlyList<string> Warnings);

/// <summary>
/// 환승정보 CSV (data.go.kr 15098252). "… 방면" 은 접미를 떼어 역명만 남깁니다.
/// </summary>
public sealed class TransferGuideParser : IDatasetParser<TransferGuide>
{
    public DatasetKind Kind => DatasetKind.TransferGuides;

    public async Task<ParseOutcome<TransferGuide>> ParseAsync(Stream csv, CancellationToken cancellationToken = default)
    {
        var rows = new List<TransferGuide>();
        var warnings = new List<string>();
        var line = 1;
        await foreach (var r in CsvReader.ReadRecordsAsync(csv, cancellationToken).ConfigureAwait(false))
        {
            line++;
            var station = r.Get("환승시작역");
            var seconds = DurationParser.ParseDuration(r.Get("소요시간"));
            if (station.Length == 0 || seconds is null)
            {
                warnings.Add($"{line}행: 역명 또는 소요시간이 비어 있어 건너뜁니다.");
                continue;
            }

            rows.Add(new TransferGuide(
                StationName: station,
                NameKey: StationNameNormalizer.Normalize(station),
                StationCd: r.Get("환승시작 코드"),
                FromLineNo: r.Get("환승시작 호선"),
                FromDirectionStation: StripBound(r.Get("하차 열차 방면")),
                Alight: DoorPosition.Parse(r.Get("하차위치(호차)"), r.Get("하차위치(문)")),
                ToNextStationCd: r.Get("환승종료역"),
                ToDirectionStation: StripBound(r.Get("환승 열차 방면")),
                Board: DoorPosition.Parse(r.Get("환승 승차위치(호차)"), r.Get("환승 승차위치(문)")),
                Seconds: seconds.Value));
        }

        return new ParseOutcome<TransferGuide>(rows, warnings);
    }

    /// <summary>
    /// "숙대입구 방면" → "숙대입구".
    /// </summary>
    public static string StripBound(string text)
    {
        var value = text.Trim();
        if (value.EndsWith("방면", StringComparison.Ordinal))
        {
            value = value[..^2].Trim();
        }

        return value;
    }
}

/// <summary>
/// 환승역거리 소요시간 CSV (data.go.kr 15044419).
/// </summary>
public sealed class TransferWalkTimeParser : IDatasetParser<TransferWalkTime>
{
    public DatasetKind Kind => DatasetKind.TransferWalkTimes;

    public async Task<ParseOutcome<TransferWalkTime>> ParseAsync(Stream csv, CancellationToken cancellationToken = default)
    {
        var rows = new List<TransferWalkTime>();
        var warnings = new List<string>();
        var line = 1;
        await foreach (var r in CsvReader.ReadRecordsAsync(csv, cancellationToken).ConfigureAwait(false))
        {
            line++;
            var station = r.Get("환승역명");
            var seconds = DurationParser.ParseDuration(r.Get("환승소요시간"));
            if (station.Length == 0 || seconds is null || !int.TryParse(r.Get("환승거리"), out var meters))
            {
                warnings.Add($"{line}행: 값이 비어 있어 건너뜁니다.");
                continue;
            }

            rows.Add(new TransferWalkTime(
                LineNo: r.Get("호선"),
                StationName: station,
                NameKey: StationNameNormalizer.Normalize(station),
                ToLineName: r.Get("환승노선"),
                DistanceMeters: meters,
                Seconds: seconds.Value));
        }

        return new ParseOutcome<TransferWalkTime>(rows, warnings);
    }
}

/// <summary>
/// 역간거리 및 소요시간 CSV (서울 열린데이터광장 OA-12034). 각 행은 "직전 역 → 이 역" 이므로 호선별로 앞 행과 짝지어 구간을 만듭니다.
/// </summary>
public sealed class SegmentTimeParser : IDatasetParser<SegmentTime>
{
    public DatasetKind Kind => DatasetKind.SegmentTimes;

    public async Task<ParseOutcome<SegmentTime>> ParseAsync(Stream csv, CancellationToken cancellationToken = default)
    {
        var rows = new List<SegmentTime>();
        var warnings = new List<string>();
        string? prevLine = null;
        string? prevStation = null;
        var line = 1;
        await foreach (var r in CsvReader.ReadRecordsAsync(csv, cancellationToken).ConfigureAwait(false))
        {
            line++;
            var lineNo = r.Get("호선");
            var station = r.Get("역명");
            var seconds = DurationParser.ParseDuration(r.Get("소요시간"));
            double.TryParse(r.Get("역간거리(km)"), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var km);
            if (station.Length == 0 || seconds is null)
            {
                warnings.Add($"{line}행: 역명 또는 소요시간이 비어 있어 건너뜁니다.");
                prevLine = null;
                continue;
            }

            if (prevLine == lineNo && prevStation is not null && seconds > 0)
            {
                rows.Add(new SegmentTime(
                    lineNo,
                    prevStation,
                    StationNameNormalizer.Normalize(prevStation),
                    station,
                    StationNameNormalizer.Normalize(station),
                    seconds.Value,
                    km));
            }

            prevLine = lineNo;
            prevStation = station;
        }

        return new ParseOutcome<SegmentTime>(rows, warnings);
    }
}

/// <summary>
/// 열차운행시각표 CSV (data.go.kr 15098251). 43만 행이라 스트리밍으로 읽습니다.
/// </summary>
public sealed class TimetableParser : IDatasetParser<TimetableEntry>
{
    public DatasetKind Kind => DatasetKind.Timetable;

    public async Task<ParseOutcome<TimetableEntry>> ParseAsync(Stream csv, CancellationToken cancellationToken = default)
    {
        var rows = new List<TimetableEntry>(450_000);
        var warnings = new List<string>();
        var line = 1;
        await foreach (var r in CsvReader.ReadRecordsAsync(csv, cancellationToken).ConfigureAwait(false))
        {
            line++;
            var dayType = DayTypeCodes.Parse(r.Get("주중주말"));
            var station = r.Get("역사명");
            var arrive = DurationParser.ParseClock(r.Get("열차도착시간"));
            var depart = DurationParser.ParseClock(r.Get("열차출발시간"));
            if (dayType is null || station.Length == 0 || (arrive is null && depart is null))
            {
                if (warnings.Count < 50)
                {
                    warnings.Add($"{line}행: 요일·역명·시각이 비어 있어 건너뜁니다.");
                }

                continue;
            }

            rows.Add(new TimetableEntry(
                LineNo: r.Get("호선"),
                StationCd: r.Get("역사코드"),
                StationName: station,
                NameKey: StationNameNormalizer.Normalize(station),
                DayType: dayType.Value,
                Direction: r.Get("방향"),
                Express: r.Get("급행여부") == "1",
                TrainNo: r.Get("열차코드"),
                ArriveSeconds: arrive,
                DepartSeconds: depart,
                OriginStation: r.Get("출발역"),
                DestinationStation: r.Get("도착역")));
        }

        return new ParseOutcome<TimetableEntry>(rows, warnings);
    }
}

/// <summary>
/// 역코드 CSV (<c>scripts/data/station_code.raw.csv</c>). 헤더에 공백이 섞여 있어 정리해서 읽습니다.
/// </summary>
public sealed class StationCodeParser : IDatasetParser<StationCode>
{
    public DatasetKind Kind => DatasetKind.StationCodes;

    public async Task<ParseOutcome<StationCode>> ParseAsync(Stream csv, CancellationToken cancellationToken = default)
    {
        var rows = new List<StationCode>();
        var warnings = new List<string>();
        var line = 1;
        await foreach (var r in CsvReader.ReadRecordsAsync(csv, cancellationToken).ConfigureAwait(false))
        {
            line++;
            var name = r.Get("station_name(kor)");
            var code = r.Get("seoulmetro_code");
            if (name.Length == 0 || code.Length == 0)
            {
                warnings.Add($"{line}행: 역명 또는 코드가 비어 있어 건너뜁니다.");
                continue;
            }

            var external = r.Get("external_code");
            rows.Add(new StationCode(
                LineNo: LineNoFromCode(code, external),
                StationCd: code.PadLeft(4, '0'),
                Name: name,
                NameKey: StationNameNormalizer.Normalize(name),
                ExternalCode: external.Length > 0 ? external : null,
                Lat: ParseDouble(r.Get("lat")),
                Lng: ParseDouble(r.Get("lng"))));
        }

        return new ParseOutcome<StationCode>(rows, warnings);
    }

    private static double? ParseDouble(string text) =>
        double.TryParse(text, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : null;

    /// <summary>
    /// 서울교통공사 코드 체계: 1xx=1호선, 2xx=2호선, 3xx, 4xx, 25xx=5호선, 26xx=6, 27xx=7, 28xx=8, 41xx=9호선.
    /// 외부코드 접두(K 경의중앙, P 수인분당, A 공항, D 신분당, S 서해, B 경춘, U 우이신설, I 인천, G 경강 …)로 광역철도를 구분합니다.
    /// </summary>
    public static string LineNoFromCode(string code, string externalCode)
    {
        var padded = code.PadLeft(4, '0');
        if (externalCode.Length > 0 && !char.IsDigit(externalCode[0]))
        {
            return externalCode[0] switch
            {
                'K' => "경의중앙선",
                'P' => "수인분당선",
                'A' => "공항철도",
                'D' => "신분당선",
                'S' => "서해선",
                'B' => "경춘선",
                'U' => "우이신설선",
                'I' => "인천1호선",
                'G' => "경강선",
                'Y' => "용인에버라인",
                'E' => "의정부경전철",
                _ => externalCode[..1],
            };
        }

        return padded[..2] switch
        {
            "01" => "1",
            "02" => "2",
            "03" => "3",
            "04" => "4",
            "25" => "5",
            "26" => "6",
            "27" => "7",
            "28" => "8",
            "41" => "9",
            _ => padded[..1].TrimStart('0') is { Length: > 0 } d ? d : padded[..2],
        };
    }
}

internal static class RecordExtensions
{
    public static string Get(this IReadOnlyDictionary<string, string> record, string key) =>
        record.TryGetValue(key, out var v) ? v.Trim() : string.Empty;
}
