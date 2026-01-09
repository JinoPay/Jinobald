#if WINDOWS_BUILD
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using JinoLib.Printer.Abstractions;
using JinoLib.Printer.Connectors.Options;
using JinoLib.Printer.Native;
using Microsoft.Extensions.Logging;
using Microsoft.Win32.SafeHandles;

#if NETFRAMEWORK
using nint = System.IntPtr;
#endif

namespace JinoLib.Printer.Connectors;

/// <summary>
/// USB 직접 연결 (드라이버 없이 직접 쓰기)
/// </summary>
public partial class UsbDirectConnector : IPrinterConnector
{
    private readonly UsbDirectConnectorOptions _options;
    private readonly ILogger<UsbDirectConnector>? _logger;
    private SafeFileHandle? _deviceHandle;
    private string? _devicePath;
    private bool _disposed;

    public bool IsConnected => _deviceHandle is { IsInvalid: false, IsClosed: false };
    public string ConnectionType => "USB";
    public bool CanRead => true;
    public string ConnectionInfo => _devicePath ?? $"USB:VID_{_options.VendorId:X4}&PID_{_options.ProductId:X4}";

    public UsbDirectConnector(UsbDirectConnectorOptions options, ILogger<UsbDirectConnector>? logger = null)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _logger = logger;
    }

    public Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        if (IsConnected)
        {
            _logger?.LogDebug("이미 연결되어 있습니다: {ConnectionInfo}", ConnectionInfo);
            return Task.CompletedTask;
        }

        _logger?.LogInformation("USB 프린터에 연결 시도...");

        _devicePath = _options.DevicePath ?? FindDevicePath();

        if (string.IsNullOrEmpty(_devicePath))
        {
            throw new InvalidOperationException("USB 프린터를 찾을 수 없습니다.");
        }

        _logger?.LogDebug("디바이스 경로: {DevicePath}", _devicePath);

        _deviceHandle = Kernel32.CreateFile(
            _devicePath,
            Kernel32.GENERIC_WRITE | Kernel32.GENERIC_READ,
            Kernel32.FILE_SHARE_READ | Kernel32.FILE_SHARE_WRITE,
            nint.Zero,
            Kernel32.OPEN_EXISTING,
            0,
            nint.Zero);

        if (_deviceHandle.IsInvalid)
        {
            var error = Marshal.GetLastWin32Error();
            _logger?.LogError("USB 프린터 연결 실패: {DevicePath}, Error: {Error}", _devicePath, error);
            throw new Win32Exception(error, $"USB 프린터 '{_devicePath}'을(를) 열 수 없습니다.");
        }

        _logger?.LogInformation("USB 프린터 연결 성공: {ConnectionInfo}", ConnectionInfo);

        return Task.CompletedTask;
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        if (_deviceHandle != null)
        {
            _deviceHandle.Close();
            _deviceHandle = null;
        }

        _logger?.LogInformation("USB 프린터 연결 해제: {ConnectionInfo}", ConnectionInfo);

        return Task.CompletedTask;
    }

    public Task SendAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default)
    {
        if (!IsConnected || _deviceHandle == null)
        {
            throw new InvalidOperationException("프린터가 연결되어 있지 않습니다.");
        }

        _logger?.LogDebug("데이터 전송: {Length} bytes", data.Length);

        var buffer = data.ToArray();
        if (!Kernel32.WriteFile(_deviceHandle, buffer, (uint)buffer.Length, out var written, nint.Zero))
        {
            var error = Marshal.GetLastWin32Error();
            throw new Win32Exception(error, "USB 프린터에 데이터를 쓸 수 없습니다.");
        }

        if (written != buffer.Length)
        {
            _logger?.LogWarning("일부 데이터만 전송됨: {Written}/{Total} bytes", written, buffer.Length);
        }

        return Task.CompletedTask;
    }

    public Task<int> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        if (!IsConnected || _deviceHandle == null)
        {
            throw new InvalidOperationException("프린터가 연결되어 있지 않습니다.");
        }

        var tempBuffer = new byte[buffer.Length];
        if (!Kernel32.ReadFile(_deviceHandle, tempBuffer, (uint)buffer.Length, out var bytesRead, nint.Zero))
        {
            var error = Marshal.GetLastWin32Error();
            throw new Win32Exception(error, "USB 프린터에서 데이터를 읽을 수 없습니다.");
        }

        tempBuffer.AsSpan(0, (int)bytesRead).CopyTo(buffer.Span);

        _logger?.LogDebug("데이터 수신: {Length} bytes", bytesRead);

        return Task.FromResult((int)bytesRead);
    }

    private string? FindDevicePath()
    {
        var guid = SetupApi.GUID_DEVINTERFACE_USBPRINT;
        var deviceInfoSet = SetupApi.SetupDiGetClassDevs(
            ref guid,
            nint.Zero,
            nint.Zero,
            SetupApi.DIGCF_PRESENT | SetupApi.DIGCF_DEVICEINTERFACE);

        if (deviceInfoSet == nint.Zero - 1)
        {
            return null;
        }

        try
        {
            var matchingDevices = new List<string>();
            uint index = 0;

            while (true)
            {
                var interfaceData = new SetupApi.SP_DEVICE_INTERFACE_DATA
                {
                    cbSize = Marshal.SizeOf<SetupApi.SP_DEVICE_INTERFACE_DATA>()
                };

                if (!SetupApi.SetupDiEnumDeviceInterfaces(deviceInfoSet, nint.Zero, ref guid, index, ref interfaceData))
                {
                    break;
                }

                SetupApi.SetupDiGetDeviceInterfaceDetailSize(
                    deviceInfoSet,
                    ref interfaceData,
                    nint.Zero,
                    0,
                    out var requiredSize,
                    nint.Zero);

                var detailData = new SetupApi.SP_DEVICE_INTERFACE_DETAIL_DATA
                {
                    cbSize = nint.Size == 8 ? 8 : 6 // x64: 8, x86: 6
                };

                var deviceInfoData = new SetupApi.SP_DEVINFO_DATA
                {
                    cbSize = Marshal.SizeOf<SetupApi.SP_DEVINFO_DATA>()
                };

                if (SetupApi.SetupDiGetDeviceInterfaceDetail(
                    deviceInfoSet,
                    ref interfaceData,
                    ref detailData,
                    requiredSize,
                    out _,
                    ref deviceInfoData))
                {
                    var path = detailData.DevicePath;

                    if (_options.VendorId.HasValue && _options.ProductId.HasValue)
                    {
                        var vidPidMatch = VidPidRegex().Match(path.ToUpperInvariant());
                        if (vidPidMatch.Success)
                        {
                            var vid = Convert.ToUInt16(vidPidMatch.Groups["vid"].Value, 16);
                            var pid = Convert.ToUInt16(vidPidMatch.Groups["pid"].Value, 16);

                            if (vid == _options.VendorId && pid == _options.ProductId)
                            {
                                matchingDevices.Add(path);
                            }
                        }
                    }
                    else
                    {
                        matchingDevices.Add(path);
                    }
                }

                index++;
            }

            if (matchingDevices.Count > _options.DeviceIndex)
            {
                return matchingDevices[_options.DeviceIndex];
            }

            return matchingDevices.FirstOrDefault();
        }
        finally
        {
            SetupApi.SetupDiDestroyDeviceInfoList(deviceInfoSet);
        }
    }

    /// <summary>
    /// 연결된 USB 프린터 목록 조회
    /// </summary>
    public static IEnumerable<UsbPrinterInfo> EnumeratePrinters()
    {
        var guid = SetupApi.GUID_DEVINTERFACE_USBPRINT;
        var deviceInfoSet = SetupApi.SetupDiGetClassDevs(
            ref guid,
            nint.Zero,
            nint.Zero,
            SetupApi.DIGCF_PRESENT | SetupApi.DIGCF_DEVICEINTERFACE);

        if (deviceInfoSet == nint.Zero - 1)
        {
            yield break;
        }

        try
        {
            uint index = 0;

            while (true)
            {
                var interfaceData = new SetupApi.SP_DEVICE_INTERFACE_DATA
                {
                    cbSize = Marshal.SizeOf<SetupApi.SP_DEVICE_INTERFACE_DATA>()
                };

                if (!SetupApi.SetupDiEnumDeviceInterfaces(deviceInfoSet, nint.Zero, ref guid, index, ref interfaceData))
                {
                    break;
                }

                SetupApi.SetupDiGetDeviceInterfaceDetailSize(
                    deviceInfoSet,
                    ref interfaceData,
                    nint.Zero,
                    0,
                    out var requiredSize,
                    nint.Zero);

                var detailData = new SetupApi.SP_DEVICE_INTERFACE_DETAIL_DATA
                {
                    cbSize = nint.Size == 8 ? 8 : 6
                };

                var deviceInfoData = new SetupApi.SP_DEVINFO_DATA
                {
                    cbSize = Marshal.SizeOf<SetupApi.SP_DEVINFO_DATA>()
                };

                if (SetupApi.SetupDiGetDeviceInterfaceDetail(
                    deviceInfoSet,
                    ref interfaceData,
                    ref detailData,
                    requiredSize,
                    out _,
                    ref deviceInfoData))
                {
                    var path = detailData.DevicePath;
                    ushort? vid = null;
                    ushort? pid = null;

                    var match = VidPidRegex().Match(path.ToUpperInvariant());
                    if (match.Success)
                    {
                        vid = Convert.ToUInt16(match.Groups["vid"].Value, 16);
                        pid = Convert.ToUInt16(match.Groups["pid"].Value, 16);
                    }

                    var description = GetDeviceProperty(deviceInfoSet, ref deviceInfoData, SetupApi.SPDRP_DEVICEDESC);

                    yield return new UsbPrinterInfo(path, vid, pid, description);
                }

                index++;
            }
        }
        finally
        {
            SetupApi.SetupDiDestroyDeviceInfoList(deviceInfoSet);
        }
    }

    private static string? GetDeviceProperty(nint deviceInfoSet, ref SetupApi.SP_DEVINFO_DATA deviceInfoData, int property)
    {
        SetupApi.SetupDiGetDeviceRegistryProperty(
            deviceInfoSet,
            ref deviceInfoData,
            property,
            out _,
            null,
            0,
            out var requiredSize);

        if (requiredSize == 0) return null;

        var buffer = new byte[requiredSize];
        if (SetupApi.SetupDiGetDeviceRegistryProperty(
            deviceInfoSet,
            ref deviceInfoData,
            property,
            out _,
            buffer,
            requiredSize,
            out _))
        {
            return System.Text.Encoding.Unicode.GetString(buffer).TrimEnd('\0');
        }

        return null;
    }

#if NET7_0_OR_GREATER
    [GeneratedRegex(@"VID_(?<vid>[0-9A-F]{4})&PID_(?<pid>[0-9A-F]{4})", RegexOptions.IgnoreCase)]
    private static partial Regex VidPidRegex();
#else
    private static readonly Regex _vidPidRegex = new(
        @"VID_(?<vid>[0-9A-F]{4})&PID_(?<pid>[0-9A-F]{4})",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static Regex VidPidRegex() => _vidPidRegex;
#endif

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public async ValueTask DisposeAsync()
    {
        await DisconnectAsync();
        Dispose(false);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;

        if (disposing)
        {
            _deviceHandle?.Dispose();
        }

        _disposed = true;
    }
}

/// <summary>
/// USB 프린터 정보
/// </summary>
public record UsbPrinterInfo(string DevicePath, ushort? VendorId, ushort? ProductId, string? Description);
#endif
