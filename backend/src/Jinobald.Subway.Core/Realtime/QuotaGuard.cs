using Jinobald.Subway.Core.Options;
using Jinobald.Subway.Core.Time;
using Microsoft.Extensions.Options;

namespace Jinobald.Subway.Core.Realtime;

/// <summary>
/// 서울 API 일일 호출 한도 관리. 한국 시각 자정에 리셋되고, 소프트 한도를 넘으면 새 호출을 거절합니다.
/// 백엔드 사용자 전체가 키 하나를 나눠 쓰므로 여기서 막지 않으면 오후에 모두가 빈 화면을 봅니다.
/// </summary>
public sealed class QuotaGuard
{
    private readonly IClock _clock;
    private readonly SeoulOpenApiOptions _options;
    private readonly Lock _lock = new();
    private DateOnly _day;
    private int _used;

    public QuotaGuard(IClock clock, IOptions<SeoulOpenApiOptions> options)
    {
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _day = Today();
    }

    public int DailyQuota => _options.DailyQuota;

    public int SoftLimit => _options.SoftLimit;

    public int UsedToday
    {
        get
        {
            lock (_lock)
            {
                RollIfNeeded();
                return _used;
            }
        }
    }

    /// <summary>
    /// 호출 하나를 소비합니다. 소프트 한도에 닿았으면 false.
    /// </summary>
    public bool TryAcquire()
    {
        lock (_lock)
        {
            RollIfNeeded();
            if (_used >= _options.SoftLimit)
            {
                return false;
            }

            _used++;
            return true;
        }
    }

    private void RollIfNeeded()
    {
        var today = Today();
        if (today != _day)
        {
            _day = today;
            _used = 0;
        }
    }

    private DateOnly Today() => DateOnly.FromDateTime(KoreaClock.ToKorea(_clock.UtcNow).DateTime);
}
