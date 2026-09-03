using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Jinobald.Subway.Core.Cqrs;

/// <summary>
/// 모든 요청의 소요시간을 기록합니다. 느린 요청(1초 이상)은 경고로 남깁니다.
/// </summary>
public sealed class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var started = Stopwatch.GetTimestamp();
        try
        {
            return await next().ConfigureAwait(false);
        }
        finally
        {
            var elapsed = Stopwatch.GetElapsedTime(started);
            if (elapsed > TimeSpan.FromSeconds(1))
            {
                _logger.LogWarning("{Request} 처리에 {ElapsedMs}ms 걸렸습니다.", typeof(TRequest).Name, elapsed.TotalMilliseconds);
            }
            else
            {
                _logger.LogDebug("{Request} {ElapsedMs}ms", typeof(TRequest).Name, elapsed.TotalMilliseconds);
            }
        }
    }
}
