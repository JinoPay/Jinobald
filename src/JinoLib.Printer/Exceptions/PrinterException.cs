namespace JinoLib.Printer.Exceptions;

/// <summary>
/// 프린터 관련 기본 예외
/// </summary>
public class PrinterException : Exception
{
    /// <summary>
    /// 프린터 연결 정보
    /// </summary>
    public string? ConnectionInfo { get; }

    public PrinterException()
    {
    }

    public PrinterException(string message)
        : base(message)
    {
    }

    public PrinterException(string message, string? connectionInfo)
        : base(message)
    {
        ConnectionInfo = connectionInfo;
    }

    public PrinterException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public PrinterException(string message, string? connectionInfo, Exception innerException)
        : base(message, innerException)
    {
        ConnectionInfo = connectionInfo;
    }
}
