namespace JinoLib.Printer.Printer;

/// <summary>
/// 프린터 상태
/// </summary>
public record PrinterStatus
{
    /// <summary>
    /// 온라인 상태
    /// </summary>
    public bool IsOnline { get; init; }

    /// <summary>
    /// 용지 있음
    /// </summary>
    public bool HasPaper { get; init; }

    /// <summary>
    /// 용지 부족 경고
    /// </summary>
    public bool PaperNearEnd { get; init; }

    /// <summary>
    /// 커버 열림
    /// </summary>
    public bool CoverOpen { get; init; }

    /// <summary>
    /// 용지 걸림
    /// </summary>
    public bool PaperJam { get; init; }

    /// <summary>
    /// 오류 상태
    /// </summary>
    public bool HasError { get; init; }

    /// <summary>
    /// 커터 오류
    /// </summary>
    public bool CutterError { get; init; }

    /// <summary>
    /// 복구 불가능한 오류
    /// </summary>
    public bool UnrecoverableError { get; init; }

    /// <summary>
    /// 자동 복구 가능한 오류
    /// </summary>
    public bool AutoRecoverableError { get; init; }

    /// <summary>
    /// 캐시드로워 열림
    /// </summary>
    public bool DrawerOpen { get; init; }

    /// <summary>
    /// 원시 상태 바이트
    /// </summary>
    public byte[]? RawStatus { get; init; }

    /// <summary>
    /// DLE EOT 응답에서 상태 파싱
    /// </summary>
    public static PrinterStatus Parse(byte[] response)
    {
        if (response.Length < 4)
        {
            return new PrinterStatus
            {
                IsOnline = false,
                HasError = true
            };
        }

        // DLE EOT 응답 파싱
        // n=1: 프린터 상태
        // n=2: 오프라인 상태
        // n=3: 오류 상태
        // n=4: 용지 상태

        var printerStatus = response.Length > 0 ? response[0] : (byte)0;
        var offlineStatus = response.Length > 1 ? response[1] : (byte)0;
        var errorStatus = response.Length > 2 ? response[2] : (byte)0;
        var paperStatus = response.Length > 3 ? response[3] : (byte)0;

        return new PrinterStatus
        {
            IsOnline = (printerStatus & 0x08) == 0,
            DrawerOpen = (printerStatus & 0x04) != 0,
            CoverOpen = (offlineStatus & 0x04) != 0,
            HasPaper = (offlineStatus & 0x20) == 0,
            HasError = (offlineStatus & 0x40) != 0,
            CutterError = (errorStatus & 0x08) != 0,
            UnrecoverableError = (errorStatus & 0x20) != 0,
            AutoRecoverableError = (errorStatus & 0x40) != 0,
            PaperNearEnd = (paperStatus & 0x0C) != 0,
            PaperJam = (paperStatus & 0x01) != 0,
            RawStatus = response
        };
    }

    /// <summary>
    /// 정상 상태 여부
    /// </summary>
    public bool IsReady => IsOnline && HasPaper && !HasError && !CoverOpen && !PaperJam;
}
