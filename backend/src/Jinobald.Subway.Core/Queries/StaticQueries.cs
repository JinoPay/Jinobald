using Jinobald.Subway.Core.Cqrs;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Names;
using Jinobald.Subway.Core.Realtime;
using Jinobald.Subway.Core.Repositories;
using Jinobald.Subway.Core.Time;

namespace Jinobald.Subway.Core.Queries;

public sealed record GetStationCodesQuery : IQuery<IReadOnlyList<StationCode>>;

public sealed class GetStationCodesQueryHandler : IQueryHandler<GetStationCodesQuery, IReadOnlyList<StationCode>>
{
    private readonly ISubwayReadRepository _repository;

    public GetStationCodesQueryHandler(ISubwayReadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public Task<IReadOnlyList<StationCode>> Handle(GetStationCodesQuery request, CancellationToken cancellationToken) =>
        _repository.GetStationCodesAsync(cancellationToken);
}

/// <summary>
/// 환승 가이드. 역명은 정규화해서 찾고, 호선은 "1"~"9" 또는 광역철도 이름입니다. 둘 다 없으면 전체.
/// </summary>
public sealed record GetTransferGuidesQuery(string? StationName, string? FromLineNo) : IQuery<IReadOnlyList<TransferGuide>>;

public sealed class GetTransferGuidesQueryHandler : IQueryHandler<GetTransferGuidesQuery, IReadOnlyList<TransferGuide>>
{
    private readonly ISubwayReadRepository _repository;

    public GetTransferGuidesQueryHandler(ISubwayReadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public Task<IReadOnlyList<TransferGuide>> Handle(GetTransferGuidesQuery request, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(request.StationName) ? null : StationNameNormalizer.Normalize(request.StationName);
        var line = string.IsNullOrWhiteSpace(request.FromLineNo) ? null : request.FromLineNo.Trim();
        return _repository.FindTransferGuidesAsync(key, line, cancellationToken);
    }
}

public sealed record GetTransferWalkTimesQuery : IQuery<IReadOnlyList<TransferWalkTime>>;

public sealed class GetTransferWalkTimesQueryHandler : IQueryHandler<GetTransferWalkTimesQuery, IReadOnlyList<TransferWalkTime>>
{
    private readonly ISubwayReadRepository _repository;

    public GetTransferWalkTimesQueryHandler(ISubwayReadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public Task<IReadOnlyList<TransferWalkTime>> Handle(GetTransferWalkTimesQuery request, CancellationToken cancellationToken) =>
        _repository.GetTransferWalkTimesAsync(cancellationToken);
}

public sealed record GetSegmentTimesQuery(string? LineNo) : IQuery<IReadOnlyList<SegmentTime>>;

public sealed class GetSegmentTimesQueryHandler : IQueryHandler<GetSegmentTimesQuery, IReadOnlyList<SegmentTime>>
{
    private readonly ISubwayReadRepository _repository;

    public GetSegmentTimesQueryHandler(ISubwayReadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public Task<IReadOnlyList<SegmentTime>> Handle(GetSegmentTimesQuery request, CancellationToken cancellationToken) =>
        _repository.GetSegmentTimesAsync(string.IsNullOrWhiteSpace(request.LineNo) ? null : request.LineNo.Trim(), cancellationToken);
}

/// <summary>
/// 다음 출발 열차. <c>After</c> 가 null 이면 지금(한국 시각), <c>DayType</c> 이 null 이면 오늘.
/// </summary>
public sealed record GetNextDeparturesQuery(
    string LineNo,
    string StationCd,
    DayType? DayType,
    string? Direction,
    int? AfterSeconds,
    int Limit) : IQuery<NextDeparturesResult>, IValidatable
{
    public IEnumerable<string> Validate()
    {
        if (string.IsNullOrWhiteSpace(LineNo))
        {
            yield return "호선이 비어 있습니다.";
        }

        if (string.IsNullOrWhiteSpace(StationCd))
        {
            yield return "역코드가 비어 있습니다.";
        }

        if (Limit is < 1 or > 50)
        {
            yield return "limit 은 1~50 이어야 합니다.";
        }
    }
}

/// <summary>
/// 조회 기준(요일·시각)과 결과.
/// </summary>
public sealed record NextDeparturesResult(DayType DayType, int AfterSeconds, IReadOnlyList<TimetableEntry> Entries);

public sealed class GetNextDeparturesQueryHandler : IQueryHandler<GetNextDeparturesQuery, NextDeparturesResult>
{
    private readonly ISubwayReadRepository _repository;
    private readonly IClock _clock;
    private readonly DayTypeResolver _dayTypes;

    public GetNextDeparturesQueryHandler(ISubwayReadRepository repository, IClock clock, DayTypeResolver dayTypes)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _dayTypes = dayTypes ?? throw new ArgumentNullException(nameof(dayTypes));
    }

    public async Task<NextDeparturesResult> Handle(GetNextDeparturesQuery request, CancellationToken cancellationToken)
    {
        var (date, seconds) = KoreaClock.ServiceTime(_clock.UtcNow);
        var dayType = request.DayType ?? _dayTypes.Resolve(date);
        var after = request.AfterSeconds ?? seconds;
        var entries = await _repository.GetNextDeparturesAsync(request.LineNo.Trim(), request.StationCd.Trim().PadLeft(4, '0'), dayType, request.Direction, after, request.Limit, cancellationToken).ConfigureAwait(false);
        return new NextDeparturesResult(dayType, after, entries);
    }
}

/// <summary>
/// 빠른하차 정보. 저장된 값이 없고 키가 있으면 공공데이터포털에서 받아 저장합니다.
/// </summary>
public sealed record GetFastExitsQuery(string LineNo, string StationCd, string? StationName) : IQuery<Cached<IReadOnlyList<FastExit>>>;

public sealed class GetFastExitsQueryHandler : IQueryHandler<GetFastExitsQuery, Cached<IReadOnlyList<FastExit>>>
{
    private static readonly TimeSpan Ttl = TimeSpan.FromDays(7);
    private readonly ISubwayReadRepository _read;
    private readonly ISubwayWriteRepository _write;
    private readonly IDataGoKrClient _client;
    private readonly IClock _clock;

    public GetFastExitsQueryHandler(ISubwayReadRepository read, ISubwayWriteRepository write, IDataGoKrClient client, IClock clock)
    {
        _read = read ?? throw new ArgumentNullException(nameof(read));
        _write = write ?? throw new ArgumentNullException(nameof(write));
        _client = client ?? throw new ArgumentNullException(nameof(client));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public async Task<Cached<IReadOnlyList<FastExit>>> Handle(GetFastExitsQuery request, CancellationToken cancellationToken)
    {
        var stationCd = request.StationCd.Trim().PadLeft(4, '0');
        var stored = await _read.GetFastExitsAsync(request.LineNo, stationCd, cancellationToken).ConfigureAwait(false);
        var now = _clock.UtcNow;
        if (stored.Count > 0 && now - stored[0].FetchedAt < Ttl)
        {
            return new Cached<IReadOnlyList<FastExit>>(stored, stored[0].FetchedAt, DataSource.Cached);
        }

        if (!_client.IsConfigured)
        {
            return new Cached<IReadOnlyList<FastExit>>(stored, stored.Count > 0 ? stored[0].FetchedAt : now, stored.Count > 0 ? DataSource.Stale : DataSource.Mock);
        }

        var fetched = await _client.GetFastExitsAsync(request.LineNo, stationCd, request.StationName ?? string.Empty, cancellationToken).ConfigureAwait(false);
        if (fetched.Count > 0)
        {
            await _write.UpsertFastExitsAsync(fetched, cancellationToken).ConfigureAwait(false);
            return new Cached<IReadOnlyList<FastExit>>(fetched, now, DataSource.Live);
        }

        return new Cached<IReadOnlyList<FastExit>>(stored, now, stored.Count > 0 ? DataSource.Stale : DataSource.Live);
    }
}

public sealed record GetNoticesQuery(bool ActiveOnly) : IQuery<IReadOnlyList<DisruptionNotice>>;

public sealed class GetNoticesQueryHandler : IQueryHandler<GetNoticesQuery, IReadOnlyList<DisruptionNotice>>
{
    private readonly ISubwayReadRepository _repository;
    private readonly IClock _clock;

    public GetNoticesQueryHandler(ISubwayReadRepository repository, IClock clock)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public Task<IReadOnlyList<DisruptionNotice>> Handle(GetNoticesQuery request, CancellationToken cancellationToken) =>
        _repository.GetNoticesAsync(request.ActiveOnly ? _clock.UtcNow : null, cancellationToken);
}

/// <summary>
/// 적재된 데이터셋 목록 (체크섬·행수·시각).
/// </summary>
public sealed record GetDatasetManifestQuery : IQuery<IReadOnlyList<ImportRun>>;

public sealed class GetDatasetManifestQueryHandler : IQueryHandler<GetDatasetManifestQuery, IReadOnlyList<ImportRun>>
{
    private readonly ISubwayReadRepository _repository;

    public GetDatasetManifestQueryHandler(ISubwayReadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public Task<IReadOnlyList<ImportRun>> Handle(GetDatasetManifestQuery request, CancellationToken cancellationToken) =>
        _repository.GetImportRunsAsync(cancellationToken);
}

/// <summary>
/// 상태 요약.
/// </summary>
public sealed record GetHealthQuery : IQuery<HealthReport>;

public sealed record HealthReport(
    bool Ok,
    string RealtimeProvider,
    bool SeoulKeyConfigured,
    bool DataGoKrKeyConfigured,
    int QuotaUsedToday,
    int QuotaSoftLimit,
    int QuotaDailyLimit,
    IReadOnlyList<ImportRun> Datasets);

public sealed class GetHealthQueryHandler : IQueryHandler<GetHealthQuery, HealthReport>
{
    private readonly ISubwayReadRepository _repository;
    private readonly IRealtimeProvider _provider;
    private readonly QuotaGuard _quota;
    private readonly IDataGoKrClient _dataGoKr;
    private readonly Microsoft.Extensions.Options.IOptions<Options.SeoulOpenApiOptions> _seoul;

    public GetHealthQueryHandler(
        ISubwayReadRepository repository,
        IRealtimeProvider provider,
        QuotaGuard quota,
        IDataGoKrClient dataGoKr,
        Microsoft.Extensions.Options.IOptions<Options.SeoulOpenApiOptions> seoul)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _provider = provider ?? throw new ArgumentNullException(nameof(provider));
        _quota = quota ?? throw new ArgumentNullException(nameof(quota));
        _dataGoKr = dataGoKr ?? throw new ArgumentNullException(nameof(dataGoKr));
        _seoul = seoul ?? throw new ArgumentNullException(nameof(seoul));
    }

    public async Task<HealthReport> Handle(GetHealthQuery request, CancellationToken cancellationToken)
    {
        var runs = await _repository.GetImportRunsAsync(cancellationToken).ConfigureAwait(false);
        return new HealthReport(
            true,
            _provider.Name,
            _seoul.Value.IsConfigured,
            _dataGoKr.IsConfigured,
            _quota.UsedToday,
            _quota.SoftLimit,
            _quota.DailyQuota,
            runs);
    }
}
