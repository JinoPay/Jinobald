using System.Runtime.InteropServices;

#if NETFRAMEWORK
using nint = System.IntPtr;
#endif

namespace JinoLib.Printer.Native;

/// <summary>
/// SetupAPI P/Invoke 정의 (USB 디바이스 열거)
/// </summary>
internal static partial class SetupApi
{
    public static readonly Guid GUID_DEVINTERFACE_USB_DEVICE = new("A5DCBF10-6530-11D2-901F-00C04FB951ED");
    public static readonly Guid GUID_DEVINTERFACE_USBPRINT = new("28D78FAD-5A12-11D1-AE5B-0000F803A8C2");

    public const int DIGCF_PRESENT = 0x00000002;
    public const int DIGCF_DEVICEINTERFACE = 0x00000010;

    public const int SPDRP_HARDWAREID = 0x00000001;
    public const int SPDRP_DEVICEDESC = 0x00000000;
    public const int SPDRP_FRIENDLYNAME = 0x0000000C;

    [StructLayout(LayoutKind.Sequential)]
    public struct SP_DEVINFO_DATA
    {
        public int cbSize;
        public Guid ClassGuid;
        public uint DevInst;
        public nint Reserved;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct SP_DEVICE_INTERFACE_DATA
    {
        public int cbSize;
        public Guid InterfaceClassGuid;
        public int Flags;
        public nint Reserved;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct SP_DEVICE_INTERFACE_DETAIL_DATA
    {
        public int cbSize;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)]
        public string DevicePath;
    }

#if NET7_0_OR_GREATER
    [LibraryImport("setupapi.dll", EntryPoint = "SetupDiGetClassDevsW", SetLastError = true)]
    public static partial nint SetupDiGetClassDevs(
        ref Guid ClassGuid,
        nint Enumerator,
        nint hwndParent,
        int Flags);

    [LibraryImport("setupapi.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool SetupDiEnumDeviceInterfaces(
        nint DeviceInfoSet,
        nint DeviceInfoData,
        ref Guid InterfaceClassGuid,
        uint MemberIndex,
        ref SP_DEVICE_INTERFACE_DATA DeviceInterfaceData);

    [LibraryImport("setupapi.dll", EntryPoint = "SetupDiGetDeviceInterfaceDetailW", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool SetupDiGetDeviceInterfaceDetail(
        nint DeviceInfoSet,
        ref SP_DEVICE_INTERFACE_DATA DeviceInterfaceData,
        ref SP_DEVICE_INTERFACE_DETAIL_DATA DeviceInterfaceDetailData,
        int DeviceInterfaceDetailDataSize,
        out int RequiredSize,
        ref SP_DEVINFO_DATA DeviceInfoData);

    [LibraryImport("setupapi.dll", EntryPoint = "SetupDiGetDeviceInterfaceDetailW", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool SetupDiGetDeviceInterfaceDetailSize(
        nint DeviceInfoSet,
        ref SP_DEVICE_INTERFACE_DATA DeviceInterfaceData,
        nint DeviceInterfaceDetailData,
        int DeviceInterfaceDetailDataSize,
        out int RequiredSize,
        nint DeviceInfoData);

    [LibraryImport("setupapi.dll", EntryPoint = "SetupDiGetDeviceRegistryPropertyW", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool SetupDiGetDeviceRegistryProperty(
        nint DeviceInfoSet,
        ref SP_DEVINFO_DATA DeviceInfoData,
        int Property,
        out int PropertyRegDataType,
        byte[]? PropertyBuffer,
        int PropertyBufferSize,
        out int RequiredSize);

    [LibraryImport("setupapi.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool SetupDiDestroyDeviceInfoList(nint DeviceInfoSet);

    [LibraryImport("setupapi.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool SetupDiEnumDeviceInfo(
        nint DeviceInfoSet,
        uint MemberIndex,
        ref SP_DEVINFO_DATA DeviceInfoData);
#else
    [DllImport("setupapi.dll", EntryPoint = "SetupDiGetClassDevsW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern nint SetupDiGetClassDevs(
        ref Guid ClassGuid,
        nint Enumerator,
        nint hwndParent,
        int Flags);

    [DllImport("setupapi.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetupDiEnumDeviceInterfaces(
        nint DeviceInfoSet,
        nint DeviceInfoData,
        ref Guid InterfaceClassGuid,
        uint MemberIndex,
        ref SP_DEVICE_INTERFACE_DATA DeviceInterfaceData);

    [DllImport("setupapi.dll", EntryPoint = "SetupDiGetDeviceInterfaceDetailW", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetupDiGetDeviceInterfaceDetail(
        nint DeviceInfoSet,
        ref SP_DEVICE_INTERFACE_DATA DeviceInterfaceData,
        ref SP_DEVICE_INTERFACE_DETAIL_DATA DeviceInterfaceDetailData,
        int DeviceInterfaceDetailDataSize,
        out int RequiredSize,
        ref SP_DEVINFO_DATA DeviceInfoData);

    [DllImport("setupapi.dll", EntryPoint = "SetupDiGetDeviceInterfaceDetailW", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetupDiGetDeviceInterfaceDetailSize(
        nint DeviceInfoSet,
        ref SP_DEVICE_INTERFACE_DATA DeviceInterfaceData,
        nint DeviceInterfaceDetailData,
        int DeviceInterfaceDetailDataSize,
        out int RequiredSize,
        nint DeviceInfoData);

    [DllImport("setupapi.dll", EntryPoint = "SetupDiGetDeviceRegistryPropertyW", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetupDiGetDeviceRegistryProperty(
        nint DeviceInfoSet,
        ref SP_DEVINFO_DATA DeviceInfoData,
        int Property,
        out int PropertyRegDataType,
        byte[]? PropertyBuffer,
        int PropertyBufferSize,
        out int RequiredSize);

    [DllImport("setupapi.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetupDiDestroyDeviceInfoList(nint DeviceInfoSet);

    [DllImport("setupapi.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetupDiEnumDeviceInfo(
        nint DeviceInfoSet,
        uint MemberIndex,
        ref SP_DEVINFO_DATA DeviceInfoData);
#endif
}
