using JinoLib.Printer.Connectors.Options;

namespace JinoLib.Printer.Abstractions;

/// <summary>
/// 프린터 인스턴스 생성 팩토리.
/// </summary>
public interface IPrinterFactory
{
    IPrinter CreateNetworkPrinter(string ipAddress, int port = 9100);
    IPrinter CreateNetworkPrinter(NetworkConnectorOptions options);
    IPrinter CreateSerialPrinter(string portName, int baudRate = 9600);
    IPrinter CreateSerialPrinter(SerialConnectorOptions options);
    IPrinter CreateBluetoothPrinter(string portName);
    IPrinter CreateBluetoothPrinter(BluetoothConnectorOptions options);

#if WINDOWS_BUILD
    IPrinter CreateSpoolerPrinter(string printerName);
    IPrinter CreateSpoolerPrinter(SpoolerConnectorOptions options);
    IPrinter CreateUsbDirectPrinter(ushort vendorId, ushort productId);
    IPrinter CreateUsbDirectPrinter(string devicePath);
    IPrinter CreateUsbDirectPrinter(UsbDirectConnectorOptions options);
#endif

    IPrinter Create(IPrinterConnector connector);
}
