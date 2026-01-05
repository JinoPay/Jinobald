namespace JinoLib.Printer.Printer;

/// <summary>
/// 인쇄 결과
/// </summary>
public record PrintResult
{
    /// <summary>
    /// 성공 여부
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// 전송된 바이트 수
    /// </summary>
    public int BytesSent { get; init; }

    /// <summary>
    /// 오류 메시지 (실패 시)
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// 예외 (실패 시)
    /// </summary>
    public Exception? Exception { get; init; }

    /// <summary>
    /// 인쇄 시작 시간
    /// </summary>
    public DateTime StartTime { get; init; }

    /// <summary>
    /// 인쇄 완료 시간
    /// </summary>
    public DateTime EndTime { get; init; }

    /// <summary>
    /// 소요 시간
    /// </summary>
    public TimeSpan Duration => EndTime - StartTime;

    /// <summary>
    /// 성공 결과 생성
    /// </summary>
    public static PrintResult Succeeded(int bytesSent, DateTime startTime)
    {
        return new PrintResult
        {
            Success = true,
            BytesSent = bytesSent,
            StartTime = startTime,
            EndTime = DateTime.UtcNow
        };
    }

    /// <summary>
    /// 실패 결과 생성
    /// </summary>
    public static PrintResult Failed(string errorMessage, DateTime startTime, Exception? exception = null)
    {
        return new PrintResult
        {
            Success = false,
            ErrorMessage = errorMessage,
            Exception = exception,
            StartTime = startTime,
            EndTime = DateTime.UtcNow
        };
    }
}
