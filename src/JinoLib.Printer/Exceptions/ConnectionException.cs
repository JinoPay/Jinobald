namespace JinoLib.Printer.Exceptions;

/// <summary>
/// 프린터 연결 관련 예외
/// </summary>
public class ConnectionException : PrinterException
{
    /// <summary>
    /// 연결 타입 (Network, Serial, USB 등)
    /// </summary>
    public string? ConnectionType { get; }

    public ConnectionException()
    {
    }

    public ConnectionException(string message)
        : base(message)
    {
    }

    public ConnectionException(string message, string? connectionInfo)
        : base(message, connectionInfo)
    {
    }

    public ConnectionException(string message, string? connectionInfo, string? connectionType)
        : base(message, connectionInfo)
    {
        ConnectionType = connectionType;
    }

    public ConnectionException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public ConnectionException(string message, string? connectionInfo, Exception innerException)
        : base(message, connectionInfo, innerException)
    {
    }

    public ConnectionException(string message, string? connectionInfo, string? connectionType, Exception innerException)
        : base(message, connectionInfo, innerException)
    {
        ConnectionType = connectionType;
    }
}
