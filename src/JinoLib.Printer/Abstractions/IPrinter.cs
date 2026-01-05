using JinoLib.Printer.Printer;

namespace JinoLib.Printer.Abstractions;

/// <summary>
/// ESC/POS 프린터 고수준 인터페이스.
/// </summary>
public interface IPrinter : IAsyncDisposable, IDisposable
{
    IPrinterConnector Connector { get; }
    bool IsConnected { get; }

    Task ConnectAsync(CancellationToken cancellationToken = default);
    Task DisconnectAsync(CancellationToken cancellationToken = default);
    Task<PrintResult> PrintAsync(Action<IReceiptBuilder> buildAction, CancellationToken cancellationToken = default);
    Task<PrintResult> PrintAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default);
    Task<PrinterStatus?> GetStatusAsync(CancellationToken cancellationToken = default);
    IReceiptBuilder CreateReceiptBuilder();
}
