using System.IO.Ports;

namespace JinoLib.Printer.Connectors.Options;

/// <summary>
/// 시리얼 COM 포트 연결 옵션
/// </summary>
public class SerialConnectorOptions
{
    /// <summary>
    /// COM 포트 이름 (예: "COM1", "COM3")
    /// </summary>
    public required string PortName { get; set; }

    /// <summary>
    /// 보드레이트 (기본값: 9600)
    /// </summary>
    public int BaudRate { get; set; } = 9600;

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
    /// 읽기 타임아웃 (밀리초)
    /// </summary>
    public int ReadTimeoutMs { get; set; } = 3000;

    /// <summary>
    /// 쓰기 타임아웃 (밀리초)
    /// </summary>
    public int WriteTimeoutMs { get; set; } = 3000;

    /// <summary>
    /// DTR (Data Terminal Ready) 활성화
    /// </summary>
    public bool DtrEnable { get; set; } = true;

    /// <summary>
    /// RTS (Request To Send) 활성화
    /// </summary>
    public bool RtsEnable { get; set; } = true;
}
