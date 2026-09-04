using System.Collections.Concurrent;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Options;
using Jinobald.Subway.Core.Time;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Jinobald.Subway.Core.Realtime;

/// <summary>
/// 짧은 TTL 캐시 + 키별 single-flight. 같은 역을 동시에 묻는 요청 100개가 서울 API 호출 1개로 합쳐집니다.
/// 할당량이 소진되면 TTL 이 지난 값을 <see cref="DataSource.Stale"/> 로 내보냅니다.
/// </summary>
public sealed class RealtimeCache
{
    private readonly IMemoryCache _cache;
    private readonly IClock _clock;
    private readonly RealtimeOptions _options;
    private readonly ILogger<RealtimeCache>? _logger;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();
    private readonly ConcurrentDictionary<string, (object Entry, DateTimeOffset At)> _lastKnown = new();

    /// <summary>
    /// 마지막으로 알던 값을 몇 개까지 기억할지. 역 이름은 유한하지만 아무 문자열이나 요청할 수 있으므로 상한을 둡니다.
    /// </summary>
    public const int MaxLastKnown = 512;

    public RealtimeCache(IMemoryCache cache, IClock clock, IOptions<RealtimeOptions> options, ILogger<RealtimeCache>? logger = null)
    {
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger;
    }

    public TimeSpan ArrivalsTtl => TimeSpan.FromSeconds(_options.ArrivalsTtlSeconds);

    public TimeSpan PositionsTtl => TimeSpan.FromSeconds(_options.PositionsTtlSeconds);

    /// <summary>
    /// 캐시에 있으면 그것을, 없으면 <paramref name="fetch"/> 를 한 번만 호출해 채웁니다.
    /// <paramref name="fetch"/> 가 null 을 돌려주면(할당량 소진) 마지막으로 알던 값을 Stale 로 냅니다.
    /// </summary>
    public async Task<Cached<T>> GetOrFetchAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<T?>> fetch,
        DataSource freshSource,
        CancellationToken cancellationToken = default)
        where T : class
    {
        if (_cache.TryGetValue(key, out Cached<T>? hit) && hit is not null)
        {
            return hit with { Source = hit.Source == DataSource.Live ? DataSource.Cached : hit.Source };
        }

        var gate = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_cache.TryGetValue(key, out hit) && hit is not null)
            {
                return hit with { Source = hit.Source == DataSource.Live ? DataSource.Cached : hit.Source };
            }

            var value = await fetch(cancellationToken).ConfigureAwait(false);
            var now = _clock.UtcNow;
            if (value is null)
            {
                if (_lastKnown.TryGetValue(key, out var last) && last.Entry is Cached<T> lastCached)
                {
                    _logger?.LogInformation("{Key}: 할당량 보호로 {Age}초 전 값을 냅니다.", key, (now - lastCached.FetchedAt).TotalSeconds);
                    return lastCached with { Source = DataSource.Stale };
                }

                throw new SeoulApiException(SeoulApiErrorKind.Quota, "ERROR-337", "오늘의 호출 한도를 다 써서 실시간 정보를 가져올 수 없습니다.");
            }

            var entry = new Cached<T>(value, now, freshSource);
            _cache.Set(key, entry, ttl);
            _lastKnown[key] = (entry, now);
            TrimLastKnown();
            return entry;
        }
        finally
        {
            gate.Release();
        }
    }

    /// <summary>
    /// 지금 기억하고 있는 키 수 (테스트·상태 확인용).
    /// </summary>
    public int LastKnownCount => _lastKnown.Count;

    /// <summary>
    /// 상한을 넘으면 가장 오래된 것부터 10% 를 버립니다. 캐시 삽입은 드물어 정렬 비용이 문제 되지 않습니다.
    /// </summary>
    private void TrimLastKnown()
    {
        if (_lastKnown.Count <= MaxLastKnown)
        {
            return;
        }

        var stale = _lastKnown.OrderBy(kv => kv.Value.At).Take(Math.Max(1, MaxLastKnown / 10)).Select(kv => kv.Key).ToList();
        foreach (var key in stale)
        {
            _lastKnown.TryRemove(key, out _);
            _locks.TryRemove(key, out _);
        }
    }
}
