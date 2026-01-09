using System.Runtime.InteropServices;

#if NETFRAMEWORK
using nint = System.IntPtr;
#endif

namespace JinoLib.Printer.Native;

/// <summary>
/// Winspool.drv P/Invoke 정의 (Windows Print Spooler)
/// </summary>
internal static partial class Winspool
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DOC_INFO_1
    {
        [MarshalAs(UnmanagedType.LPWStr)]
        public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)]
        public string? pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)]
        public string pDatatype;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct PRINTER_INFO_2
    {
        public string pServerName;
        public string pPrinterName;
        public string pShareName;
        public string pPortName;
        public string pDriverName;
        public string pComment;
        public string pLocation;
        public nint pDevMode;
        public string pSepFile;
        public string pPrintProcessor;
        public string pDatatype;
        public string pParameters;
        public nint pSecurityDescriptor;
        public uint Attributes;
        public uint Priority;
        public uint DefaultPriority;
        public uint StartTime;
        public uint UntilTime;
        public uint Status;
        public uint cJobs;
        public uint AveragePPM;
    }

    public const uint PRINTER_ENUM_LOCAL = 0x00000002;
    public const uint PRINTER_ENUM_CONNECTIONS = 0x00000004;

#if NET7_0_OR_GREATER
    [LibraryImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, StringMarshalling = StringMarshalling.Utf16)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool OpenPrinter(
        string pPrinterName,
        out nint phPrinter,
        nint pDefault);

    [LibraryImport("winspool.drv", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool ClosePrinter(nint hPrinter);

    [LibraryImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true)]
    public static partial int StartDocPrinter(
        nint hPrinter,
        int Level,
        ref DOC_INFO_1 pDocInfo);

    [LibraryImport("winspool.drv", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool EndDocPrinter(nint hPrinter);

    [LibraryImport("winspool.drv", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool StartPagePrinter(nint hPrinter);

    [LibraryImport("winspool.drv", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool EndPagePrinter(nint hPrinter);

    [LibraryImport("winspool.drv", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool WritePrinter(
        nint hPrinter,
        byte[] pBuf,
        int cbBuf,
        out int pcWritten);

    [LibraryImport("winspool.drv", EntryPoint = "EnumPrintersW", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool EnumPrinters(
        uint Flags,
        [MarshalAs(UnmanagedType.LPWStr)] string? Name,
        uint Level,
        nint pPrinterEnum,
        uint cbBuf,
        out uint pcbNeeded,
        out uint pcReturned);
#else
    [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool OpenPrinter(
        string pPrinterName,
        out nint phPrinter,
        nint pDefault);

    [DllImport("winspool.drv", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool ClosePrinter(nint hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern int StartDocPrinter(
        nint hPrinter,
        int Level,
        ref DOC_INFO_1 pDocInfo);

    [DllImport("winspool.drv", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EndDocPrinter(nint hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool StartPagePrinter(nint hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EndPagePrinter(nint hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool WritePrinter(
        nint hPrinter,
        byte[] pBuf,
        int cbBuf,
        out int pcWritten);

    [DllImport("winspool.drv", EntryPoint = "EnumPrintersW", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EnumPrinters(
        uint Flags,
        [MarshalAs(UnmanagedType.LPWStr)] string? Name,
        uint Level,
        nint pPrinterEnum,
        uint cbBuf,
        out uint pcbNeeded,
        out uint pcReturned);
#endif
}
