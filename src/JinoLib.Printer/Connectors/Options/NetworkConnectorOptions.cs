namespace JinoLib.Printer.Connectors.Options;

/// <summary>
/// 네트워크 TCP/IP 연결 옵션
/// </summary>
public class NetworkConnectorOptions
{
    /// <summary>
    /// 프린터 IP 주소
    /// </summary>
    public required string IpAddress { get; set; }

    /// <summary>
    /// 포트 번호 (기본값: 9100)
    /// </summary>
    public int Port { get; set; } = 9100;

    /// <summary>
    /// 연결 타임아웃 (밀리초)
    /// </summary>
    public int ConnectTimeoutMs { get; set; } = 5000;

    /// <summary>
    /// 읽기 타임아웃 (밀리초)
    /// </summary>
    public int ReadTimeoutMs { get; set; } = 3000;

    /// <summary>
    /// 쓰기 타임아웃 (밀리초)
    /// </summary>
    public int WriteTimeoutMs { get; set; } = 3000;
}
