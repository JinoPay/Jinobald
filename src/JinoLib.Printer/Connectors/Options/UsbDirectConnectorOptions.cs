namespace JinoLib.Printer.Connectors.Options;

/// <summary>
/// USB 직접 연결 옵션 (드라이버 없이 직접 쓰기)
/// </summary>
public class UsbDirectConnectorOptions
{
    /// <summary>
    /// USB 벤더 ID (VID)
    /// </summary>
    public ushort? VendorId { get; set; }

    /// <summary>
    /// USB 제품 ID (PID)
    /// </summary>
    public ushort? ProductId { get; set; }

    /// <summary>
    /// 디바이스 경로 (VID/PID 대신 직접 지정 가능)
    /// </summary>
    public string? DevicePath { get; set; }

    /// <summary>
    /// 쓰기 타임아웃 (밀리초)
    /// </summary>
    public int WriteTimeoutMs { get; set; } = 5000;

    /// <summary>
    /// 읽기 타임아웃 (밀리초)
    /// </summary>
    public int ReadTimeoutMs { get; set; } = 3000;

    /// <summary>
    /// 디바이스 인덱스 (같은 VID/PID 디바이스가 여러 개인 경우)
    /// </summary>
    public int DeviceIndex { get; set; } = 0;
}
