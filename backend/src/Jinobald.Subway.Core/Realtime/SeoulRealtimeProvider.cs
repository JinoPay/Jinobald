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

    /// <summary>
    /// 도착정보. 서울 API 가 실패하거나 할당량이 소진되어 마지막 값도 없으면 시각표 시뮬레이터로 폴백합니다 —
    /// 위치정보와 같은 규칙입니다. 시각표가 없는 역이면 시뮬레이터가 빈 목록을 냅니다.
    /// </summary>
    public async Task<Cached<IReadOnlyList<RawArrivalRow>>> GetArrivalsAsync(string stationName, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _cache.GetOrFetchAsync<IReadOnlyList<RawArrivalRow>>(
                $"arrivals:{stationName}",
                _cache.ArrivalsTtl,
                async ct => _quota.TryAcquire() ? await _client.GetArrivalsAsync(stationName, ct).ConfigureAwait(false) : null,
                DataSource.Live,
                cancellationToken).ConfigureAwait(false);
        }
        catch (SeoulApiException)
        {
            // 시각표가 없는 역(광역철도 등)은 시뮬레이터도 빈손입니다. 그때는 원래 오류(할당량·네트워크)를 그대로 냅니다.
            var simulated = await _fallback.GetArrivalsAsync(stationName, cancellationToken).ConfigureAwait(false);
            if (simulated.Value.Count == 0)
            {
                throw;
            }

            return simulated;
        }
    }

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
