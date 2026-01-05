using System.IO.Ports;

namespace JinoLib.Printer.Connectors.Options;

/// <summary>
/// 블루투스 가상 COM 포트 연결 옵션
/// </summary>
public class BluetoothConnectorOptions
{
    /// <summary>
    /// 블루투스 가상 COM 포트 이름 (예: "COM5")
    /// </summary>
    public required string PortName { get; set; }

    /// <summary>
    /// 보드레이트 (기본값: 115200 - 블루투스에서 일반적으로 사용)
    /// </summary>
    public int BaudRate { get; set; } = 115200;

    /// <summary>
    /// 데이터 비트 (기본값: 8)
    /// </summary>
    public int DataBits { get; set; } = 8;

    /// <summary>
    /// 패리티 (기본값: None)
    /// </summary>
    public Parity Parity { get; set; } = Parity.None;

    /// <summary>
    /// 스톱 비트 (기본값: One)
    /// </summary>
    public StopBits StopBits { get; set; } = StopBits.One;

    /// <summary>
    /// 핸드셰이크 (기본값: None)
    /// </summary>
    public Handshake Handshake { get; set; } = Handshake.None;

    /// <summary>
    /// 읽기 타임아웃 (밀리초) - 블루투스는 더 긴 타임아웃 필요
    /// </summary>
    public int ReadTimeoutMs { get; set; } = 10000;

    /// <summary>
    /// 쓰기 타임아웃 (밀리초)
    /// </summary>
    public int WriteTimeoutMs { get; set; } = 5000;

    /// <summary>
    /// 연결 재시도 횟수
    /// </summary>
    public int RetryCount { get; set; } = 3;

    /// <summary>
    /// 재시도 간격 (밀리초)
    /// </summary>
    public int RetryDelayMs { get; set; } = 1000;
}
