using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Names;
using Jinobald.Subway.Core.Options;
using Jinobald.Subway.Core.Repositories;
using Jinobald.Subway.Core.Time;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Jinobald.Subway.Core.Realtime;

/// <summary>
/// 인증키 없이도 앱 전체를 검증할 수 있도록 **실제 시각표**로 열차 위치와 도착정보를 합성합니다.
///
/// 열차마다 시각표의 (역, 도착, 출발) 열을 따라가며 현재 시각이 어느 구간에 있는지 봅니다.
/// 정차 중이면 그 역 "도착", 구간 주행 중이면 진행률에 따라 이전 역 "출발" → 다음 역 "전역출발" → 다음 역 "진입" 으로 표현합니다.
/// 시각표가 없는 노선은 빈 목록을 냅니다 (앱이 자체 모의로 대체).
/// </summary>
public sealed class TimetableSimulatorProvider : IRealtimeProvider
{
    private readonly ISubwayReadRepository _repository;
    private readonly IMemoryCache _cache;
    private readonly IClock _clock;
    private readonly DayTypeResolver _dayTypes;
    private readonly RealtimeOptions _options;

    public TimetableSimulatorProvider(
        ISubwayReadRepository repository,
        IMemoryCache cache,
        IClock clock,
        DayTypeResolver dayTypes,
        IOptions<RealtimeOptions> options)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _dayTypes = dayTypes ?? throw new ArgumentNullException(nameof(dayTypes));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
    }

    public string Name => "timetable-simulator";

    public async Task<Cached<IReadOnlyList<RawArrivalRow>>> GetArrivalsAsync(string stationName, CancellationToken cancellationToken = default)
    {
        var now = _clock.UtcNow;
        var (date, seconds) = KoreaClock.ServiceTime(now);
        var dayType = _dayTypes.Resolve(date);
        var nameKey = StationNameNormalizer.Normalize(stationName);
        var entries = await _repository.GetNextDeparturesByNameAsync(nameKey, dayType, seconds, _options.SimulatedArrivalWindowSeconds, cancellationToken).ConfigureAwait(false);
        var recptn = KoreaClock.ToKorea(now).ToString("yyyy-MM-dd HH:mm:ss");
        var rows = new List<RawArrivalRow>();
        foreach (var e in entries)
        {
            var at = e.ArriveSeconds ?? e.DepartSeconds ?? seconds;
            var remaining = Math.Max(0, at - seconds);
            var subwayId = SubwayLines.SubwayIdOf(e.LineNo) ?? e.LineNo;
            var minutes = remaining / 60;
            var status = remaining <= 30 ? "진입" : remaining <= 90 ? "곧 도착" : $"{minutes}분 후";
            rows.Add(new RawArrivalRow(
                SubwayId: subwayId,
                UpdnLine: SubwayLines.UpdnLineLabel(e.Direction),
                TrainLineNm: $"{e.DestinationStation}행 - {e.DestinationStation}방면",
                StatnNm: e.StationName,
                BarvlDt: remaining.ToString(),
                BtrainSttus: e.Express ? "급행" : "일반",
                BtrainNo: e.TrainNo,
                ArvlMsg2: remaining <= 30 ? $"{e.StationName} 진입" : $"{minutes}분 {remaining % 60}초 후 ({e.StationName})",
                ArvlMsg3: e.StationName,
                ArvlCd: remaining <= 30 ? "0" : "99",
                BstatnNm: e.DestinationStation,
                RecptnDt: recptn));
        }

        return new Cached<IReadOnlyList<RawArrivalRow>>(rows, now, DataSource.Timetable);
    }

    public async Task<Cached<IReadOnlyList<RawPositionRow>>> GetPositionsAsync(string subwayId, CancellationToken cancellationToken = default)
    {
        var now = _clock.UtcNow;
        var lineNo = SubwayLines.LineNoOf(subwayId);
        if (lineNo is null || !SubwayLines.HasTimetable(lineNo))
        {
            return new Cached<IReadOnlyList<RawPositionRow>>([], now, DataSource.Mock);
        }

        var (date, seconds) = KoreaClock.ServiceTime(now);
        var dayType = _dayTypes.Resolve(date);
        var trains = await LoadTrainsAsync(lineNo, dayType, cancellationToken).ConfigureAwait(false);
        var rows = Snapshot(trains, seconds, subwayId, SubwayLines.NameOf(subwayId) ?? lineNo, KoreaClock.ToKorea(now).ToString("yyyy-MM-dd HH:mm:ss"));
        return new Cached<IReadOnlyList<RawPositionRow>>(rows, now, DataSource.Timetable);
    }

    /// <summary>
    /// 순수 계산 — 테스트에서 고정 시각으로 검증합니다.
    /// </summary>
    public static IReadOnlyList<RawPositionRow> Snapshot(IReadOnlyList<SimTrain> trains, int nowSeconds, string subwayId, string lineName, string recptnDt)
    {
        var rows = new List<RawPositionRow>();
        foreach (var train in trains)
        {
            var stops = train.Stops;
            if (stops.Count == 0)
            {
                continue;
            }

            var first = stops[0].Depart ?? stops[0].Arrive ?? 0;
            var last = stops[^1].Arrive ?? stops[^1].Depart ?? 0;
            if (nowSeconds < first || nowSeconds > last)
            {
                continue;
            }

            string? statnNm = null;
            string? statnCd = null;
            string status = "1";
            for (var i = 0; i < stops.Count; i++)
            {
                var stop = stops[i];
                var arrive = stop.Arrive ?? stop.Depart ?? 0;
                var depart = stop.Depart ?? stop.Arrive ?? 0;
                if (nowSeconds >= arrive && nowSeconds <= depart)
                {
                    statnNm = stop.StationName;
                    statnCd = stop.StationCd;
                    status = "1";
                    break;
                }

                if (i + 1 < stops.Count)
                {
                    var next = stops[i + 1];
                    var nextArrive = next.Arrive ?? next.Depart ?? depart;
                    if (nowSeconds > depart && nowSeconds < nextArrive)
                    {
                        var span = Math.Max(1, nextArrive - depart);
                        var progress = (nowSeconds - depart) / (double)span;
                        if (progress < 0.2)
                        {
                            statnNm = stop.StationName;
                            statnCd = stop.StationCd;
                            status = "2";
                        }
                        else if (progress < 0.8)
                        {
                            statnNm = next.StationName;
                            statnCd = next.StationCd;
                            status = "3";
                        }
                        else
                        {
                            statnNm = next.StationName;
                            statnCd = next.StationCd;
                            status = "0";
                        }

                        break;
                    }
                }
            }

            if (statnNm is null)
            {
                continue;
            }

            var lastStop = stops[^1];
            rows.Add(new RawPositionRow(
                SubwayId: subwayId,
                SubwayNm: lineName,
                StatnId: statnCd ?? string.Empty,
                StatnNm: statnNm,
                TrainNo: train.TrainNo,
                LastRecptnDt: recptnDt,
                RecptnDt: recptnDt,
                UpdnLine: SubwayLines.UpdnLineCode(train.Direction),
                StatnTid: lastStop.StationCd,
                StatnTnm: train.Destination,
                TrainSttus: status,
                DirectAt: train.Express ? "1" : "0",
                LstcarAt: "0"));
        }

        return rows;
    }

    private async Task<IReadOnlyList<SimTrain>> LoadTrainsAsync(string lineNo, DayType dayType, CancellationToken cancellationToken)
    {
        var key = $"sim-trains:{lineNo}:{dayType}";
        if (_cache.TryGetValue(key, out IReadOnlyList<SimTrain>? cached) && cached is not null)
        {
            return cached;
        }

        var entries = await _repository.GetTimetableAsync(lineNo, dayType, cancellationToken).ConfigureAwait(false);
        var trains = BuildTrains(entries);
        _cache.Set(key, trains, TimeSpan.FromHours(6));
        return trains;
    }

    /// <summary>
    /// 시각표 행 → 열차별 정차 목록. 같은 열차코드가 하루에 두 번 운행하면(순환선) 시각이 크게 끊기는 지점에서 나눕니다.
    /// </summary>
    public static IReadOnlyList<SimTrain> BuildTrains(IReadOnlyList<TimetableEntry> entries)
    {
        var trains = new List<SimTrain>();
        foreach (var group in entries.GroupBy(e => e.TrainNo))
        {
            var ordered = group
                .Select(e => new SimStop(e.StationCd, e.StationName, e.ArriveSeconds, e.DepartSeconds))
                .OrderBy(s => s.Arrive ?? s.Depart ?? 0)
                .ToList();
            var template = group.First();
            var current = new List<SimStop>();
            SimStop? prev = null;
            foreach (var stop in ordered)
            {
                var t = stop.Arrive ?? stop.Depart ?? 0;
                var prevT = prev?.Depart ?? prev?.Arrive ?? t;
                if (prev is not null && t - prevT > 40 * 60)
                {
                    trains.Add(new SimTrain(template.TrainNo, template.Direction, template.Express, template.DestinationStation, current));
                    current = [];
                }

                current.Add(stop);
                prev = stop;
            }

            if (current.Count > 0)
            {
                trains.Add(new SimTrain(template.TrainNo, template.Direction, template.Express, template.DestinationStation, current));
            }
        }

        return trains;
    }
}

/// <summary>
/// 시뮬레이터가 쓰는 열차 한 대의 정차 목록.
/// </summary>
public sealed record SimTrain(string TrainNo, string Direction, bool Express, string Destination, IReadOnlyList<SimStop> Stops);

/// <summary>
/// 한 역 정차. 시·종착은 도착 또는 출발이 null 입니다.
/// </summary>
public sealed record SimStop(string StationCd, string StationName, int? Arrive, int? Depart);
