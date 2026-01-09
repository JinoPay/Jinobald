namespace JinoLib.Printer;

/// <summary>
/// 플랫폼별 기능 지원 여부 확인
/// </summary>
public static class PlatformSupport
{
    /// <summary>
    /// Windows Print Spooler 지원 여부
    /// </summary>
    public static bool SupportsSpooler
    {
        get
        {
#if WINDOWS_BUILD
#if NETFRAMEWORK
            return true;
#else
            return OperatingSystem.IsWindows();
#endif
#else
            return false;
#endif
        }
    }

    /// <summary>
    /// USB 직접 연결 지원 여부
    /// </summary>
    public static bool SupportsUsbDirect
    {
        get
        {
#if WINDOWS_BUILD
#if NETFRAMEWORK
            return true;
#else
            return OperatingSystem.IsWindows();
#endif
#else
            return false;
#endif
        }
    }

    /// <summary>
    /// 네트워크 연결 지원 여부 (항상 true)
    /// </summary>
    public static bool SupportsNetwork => true;

    /// <summary>
    /// 시리얼 포트 지원 여부 (항상 true)
    /// </summary>
    public static bool SupportsSerial => true;

    /// <summary>
    /// 블루투스 연결 지원 여부 (항상 true - 시리얼 기반)
    /// </summary>
    public static bool SupportsBluetooth => true;

    /// <summary>
    /// 현재 플랫폼이 Windows인지 여부
    /// </summary>
    public static bool IsWindows
    {
        get
        {
#if NETFRAMEWORK
            return true;
#else
            return OperatingSystem.IsWindows();
#endif
        }
    }

    /// <summary>
    /// 현재 플랫폼이 macOS인지 여부
    /// </summary>
    public static bool IsMacOS
    {
        get
        {
#if NETFRAMEWORK
            return false;
#else
            return OperatingSystem.IsMacOS();
#endif
        }
    }

    /// <summary>
    /// 현재 플랫폼이 Linux인지 여부
    /// </summary>
    public static bool IsLinux
    {
        get
        {
#if NETFRAMEWORK
            return false;
#else
            return OperatingSystem.IsLinux();
#endif
        }
    }

    /// <summary>
    /// 현재 플랫폼 이름
    /// </summary>
    public static string PlatformName
    {
        get
        {
#if NETFRAMEWORK
            return $".NET Framework {Environment.Version}";
#else
            var os = OperatingSystem.IsWindows() ? "Windows" :
                     OperatingSystem.IsMacOS() ? "macOS" :
                     OperatingSystem.IsLinux() ? "Linux" : "Unknown";
            return $".NET {Environment.Version} on {os}";
#endif
        }
    }

    /// <summary>
    /// 현재 런타임 정보
    /// </summary>
    public static string RuntimeInfo
    {
        get
        {
#if NETFRAMEWORK
            return $".NET Framework {Environment.Version}";
#else
            return System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription;
#endif
        }
    }
}
