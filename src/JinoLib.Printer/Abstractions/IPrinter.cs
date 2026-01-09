using JinoLib.Printer.Printer;

namespace JinoLib.Printer.Abstractions;

/// <summary>
/// ESC/POS 프린터 고수준 인터페이스.
/// </summary>
public interface IPrinter : IAsyncDisposable, IDisposable
{
    bool IsConnected { get; }
    string ConnectionInfo { get; }

    Task ConnectAsync(CancellationToken cancellationToken = default);
    Task DisconnectAsync(CancellationToken cancellationToken = default);
    Task<PrintResult> SendAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default);
    Task<PrintResult> PrintAsync(Action<IReceiptBuilder> buildAction, CancellationToken cancellationToken = default);
    Task<PrintResult> PrintAsync(Func<IReceiptBuilder, Task> buildAction, CancellationToken cancellationToken = default);
    Task<PrinterStatus?> GetStatusAsync(CancellationToken cancellationToken = default);
    Task<PrintResult> InitializeAsync(CancellationToken cancellationToken = default);
    Task<PrintResult> OpenCashDrawerAsync(Commands.Enums.CashDrawerPin pin = Commands.Enums.CashDrawerPin.Pin2, CancellationToken cancellationToken = default);
    Task<PrintResult> BeepAsync(int count = 1, int duration = 3, CancellationToken cancellationToken = default);
    Task<PrintResult> CutAsync(Commands.Enums.CutType cutType = Commands.Enums.CutType.Full, CancellationToken cancellationToken = default);
    Task<PrintResult> FeedAndCutAsync(int lines = 3, Commands.Enums.CutType cutType = Commands.Enums.CutType.Full, CancellationToken cancellationToken = default);
}
