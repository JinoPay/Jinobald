namespace JinoLib.Printer.Connectors.Options;

/// <summary>
/// Windows Print Spooler 연결 옵션 (드라이버 설치 필요)
/// </summary>
public class SpoolerConnectorOptions
{
    /// <summary>
    /// 프린터 이름 (Windows에 설치된 프린터 이름)
    /// </summary>
    public required string PrinterName { get; set; }

    /// <summary>
    /// 문서 이름 (스풀러에 표시될 문서 이름)
    /// </summary>
    public string DocumentName { get; set; } = "ESC/POS Document";

    /// <summary>
    /// 데이터 타입 (기본값: RAW)
    /// </summary>
    public string DataType { get; set; } = "RAW";

    /// <summary>
    /// 작업 타임아웃 (밀리초)
    /// </summary>
    public int JobTimeoutMs { get; set; } = 30000;
}
