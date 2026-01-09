using JinoLib.Printer.Abstractions;
using JinoLib.Printer.Connectors;
using JinoLib.Printer.Connectors.Options;
using Microsoft.Extensions.Logging;

namespace JinoLib.Printer.Printer;

/// <summary>
/// 프린터 팩토리 구현
/// </summary>
public class PrinterFactory : IPrinterFactory
{
    private readonly ILoggerFactory? _loggerFactory;

    public PrinterFactory(ILoggerFactory? loggerFactory = null)
    {
        _loggerFactory = loggerFactory;
    }

    /// <summary>
    /// 네트워크 프린터 생성
    /// </summary>
    public IPrinter CreateNetworkPrinter(string ipAddress, int port = 9100)
    {
        var options = new NetworkConnectorOptions
        {
            IpAddress = ipAddress,
            Port = port
        };

        var connector = new NetworkConnector(options, _loggerFactory?.CreateLogger<NetworkConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }

    /// <summary>
    /// 네트워크 프린터 생성 (옵션 사용)
    /// </summary>
    public IPrinter CreateNetworkPrinter(NetworkConnectorOptions options)
    {
        var connector = new NetworkConnector(options, _loggerFactory?.CreateLogger<NetworkConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }

    /// <summary>
    /// 시리얼 프린터 생성
    /// </summary>
    public IPrinter CreateSerialPrinter(string portName, int baudRate = 9600)
    {
        var options = new SerialConnectorOptions
        {
            PortName = portName,
            BaudRate = baudRate
        };

        var connector = new SerialConnector(options, _loggerFactory?.CreateLogger<SerialConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }

    /// <summary>
    /// 시리얼 프린터 생성 (옵션 사용)
    /// </summary>
    public IPrinter CreateSerialPrinter(SerialConnectorOptions options)
    {
        var connector = new SerialConnector(options, _loggerFactory?.CreateLogger<SerialConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }

    /// <summary>
    /// 블루투스 프린터 생성
    /// </summary>
    public IPrinter CreateBluetoothPrinter(string portName)
    {
        var options = new BluetoothConnectorOptions
        {
            PortName = portName
        };

        var connector = new BluetoothConnector(options, _loggerFactory?.CreateLogger<BluetoothConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }

    /// <summary>
    /// 블루투스 프린터 생성 (옵션 사용)
    /// </summary>
    public IPrinter CreateBluetoothPrinter(BluetoothConnectorOptions options)
    {
        var connector = new BluetoothConnector(options, _loggerFactory?.CreateLogger<BluetoothConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }

#if WINDOWS_BUILD
    /// <summary>
    /// 스풀러 프린터 생성 (드라이버 설치 필요)
    /// </summary>
    public IPrinter CreateSpoolerPrinter(string printerName)
    {
        var options = new SpoolerConnectorOptions
        {
            PrinterName = printerName
        };

        var connector = new SpoolerConnector(options, _loggerFactory?.CreateLogger<SpoolerConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }

    /// <summary>
    /// 스풀러 프린터 생성 (옵션 사용)
    /// </summary>
    public IPrinter CreateSpoolerPrinter(SpoolerConnectorOptions options)
    {
        var connector = new SpoolerConnector(options, _loggerFactory?.CreateLogger<SpoolerConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }

    /// <summary>
    /// USB 직접 연결 프린터 생성 (드라이버 없이)
    /// </summary>
    public IPrinter CreateUsbDirectPrinter(ushort vendorId, ushort productId)
    {
        var options = new UsbDirectConnectorOptions
        {
            VendorId = vendorId,
            ProductId = productId
        };

        var connector = new UsbDirectConnector(options, _loggerFactory?.CreateLogger<UsbDirectConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }

    /// <summary>
    /// USB 직접 연결 프린터 생성 (디바이스 경로 사용)
    /// </summary>
    public IPrinter CreateUsbDirectPrinter(string devicePath)
    {
        var options = new UsbDirectConnectorOptions
        {
            DevicePath = devicePath
        };

        var connector = new UsbDirectConnector(options, _loggerFactory?.CreateLogger<UsbDirectConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }

    /// <summary>
    /// USB 직접 연결 프린터 생성 (옵션 사용)
    /// </summary>
    public IPrinter CreateUsbDirectPrinter(UsbDirectConnectorOptions options)
    {
        var connector = new UsbDirectConnector(options, _loggerFactory?.CreateLogger<UsbDirectConnector>());
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }
#endif

    /// <summary>
    /// Connector를 사용하여 프린터 생성
    /// </summary>
    public IPrinter Create(IPrinterConnector connector)
    {
        return new EscPosPrinter(connector, _loggerFactory?.CreateLogger<EscPosPrinter>());
    }
}
