using Jinobald.Subway.Core.Domain;

namespace Jinobald.Subway.Core.Realtime;

/// <summary>
/// 서울 API 를 캐시·할당량 보호를 거쳐 호출하는 공급자. 시각표가 있는 노선에서 서울 API 가 실패하면 시뮬레이터로 폴백합니다.
/// </summary>
public sealed class SeoulRealtimeProvider : IRealtimeProvider
{
    private readonly ISeoulOpenApiClient _client;
    private readonly RealtimeCache _cache;
    private readonly QuotaGuard _quota;
    private readonly TimetableSimulatorProvider _fallback;

    public SeoulRealtimeProvider(ISeoulOpenApiClient client, RealtimeCache cache, QuotaGuard quota, TimetableSimulatorProvider fallback)
    {
        _client = client ?? throw new ArgumentNullException(nameof(client));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _quota = quota ?? throw new ArgumentNullException(nameof(quota));
        _fallback = fallback ?? throw new ArgumentNullException(nameof(fallback));
    }

    public string Name => "seoul-open-api";

    public Task<Cached<IReadOnlyList<RawArrivalRow>>> GetArrivalsAsync(string stationName, CancellationToken cancellationToken = default) =>
        _cache.GetOrFetchAsync<IReadOnlyList<RawArrivalRow>>(
            $"arrivals:{stationName}",
            _cache.ArrivalsTtl,
            async ct => _quota.TryAcquire() ? await _client.GetArrivalsAsync(stationName, ct).ConfigureAwait(false) : null,
            DataSource.Live,
            cancellationToken);

    public async Task<Cached<IReadOnlyList<RawPositionRow>>> GetPositionsAsync(string subwayId, CancellationToken cancellationToken = default)
    {
        var lineName = SubwayLines.NameOf(subwayId);
        if (lineName is null)
        {
            return new Cached<IReadOnlyList<RawPositionRow>>([], DateTimeOffset.UtcNow, DataSource.Live);
        }

        try
        {
            return await _cache.GetOrFetchAsync<IReadOnlyList<RawPositionRow>>(
                $"positions:{subwayId}",
                _cache.PositionsTtl,
                async ct => _quota.TryAcquire() ? await _client.GetPositionsAsync(lineName, ct).ConfigureAwait(false) : null,
                DataSource.Live,
                cancellationToken).ConfigureAwait(false);
        }
        catch (SeoulApiException) when (SubwayLines.HasTimetable(SubwayLines.LineNoOf(subwayId) ?? string.Empty))
        {
            return await _fallback.GetPositionsAsync(subwayId, cancellationToken).ConfigureAwait(false);
        }
    }
}
