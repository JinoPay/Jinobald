using JinoLib.Printer.Abstractions;
using JinoLib.Printer.Builders;
using JinoLib.Printer.Commands;
using Microsoft.Extensions.Logging;

namespace JinoLib.Printer.Printer;

/// <summary>
/// ESC/POS 프린터 메인 클래스
/// </summary>
public class EscPosPrinter : IPrinter
{
    private readonly IPrinterConnector _connector;
    private readonly ILogger<EscPosPrinter>? _logger;
    private readonly SemaphoreSlim _printLock = new(1, 1);
    private bool _disposed;

    public bool IsConnected => _connector.IsConnected;
    public string ConnectionInfo => $"{_connector.ConnectionType}";

    public EscPosPrinter(IPrinterConnector connector, ILogger<EscPosPrinter>? logger = null)
    {
        _connector = connector ?? throw new ArgumentNullException(nameof(connector));
        _logger = logger;
    }

    /// <summary>
    /// 프린터에 연결
    /// </summary>
    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        _logger?.LogInformation("프린터 연결 시도: {ConnectionInfo}", ConnectionInfo);
        await _connector.ConnectAsync(cancellationToken);
        _logger?.LogInformation("프린터 연결 성공: {ConnectionInfo}", ConnectionInfo);
    }

    /// <summary>
    /// 프린터 연결 해제
    /// </summary>
    public async Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        _logger?.LogInformation("프린터 연결 해제: {ConnectionInfo}", ConnectionInfo);
        await _connector.DisconnectAsync(cancellationToken);
    }

    /// <summary>
    /// 원시 데이터 전송
    /// </summary>
    public async Task<PrintResult> SendAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default)
    {
        var startTime = DateTime.UtcNow;

        await _printLock.WaitAsync(cancellationToken);
        try
        {
            if (!IsConnected)
            {
                return PrintResult.Failed("프린터가 연결되어 있지 않습니다.", startTime);
            }

            _logger?.LogDebug("데이터 전송: {Length} bytes", data.Length);

            await _connector.SendAsync(data, cancellationToken);

            return PrintResult.Succeeded(data.Length, startTime);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "데이터 전송 실패");
            return PrintResult.Failed(ex.Message, startTime, ex);
        }
        finally
        {
            _printLock.Release();
        }
    }

    /// <summary>
    /// ReceiptBuilder를 사용하여 인쇄
    /// </summary>
    public async Task<PrintResult> PrintAsync(Action<IReceiptBuilder> buildReceipt, CancellationToken cancellationToken = default)
    {
        var builder = new ReceiptBuilder();
        buildReceipt(builder);
        return await SendAsync(builder.BuildAsMemory(), cancellationToken);
    }

    /// <summary>
    /// ReceiptBuilder를 사용하여 인쇄 (비동기 빌드)
    /// </summary>
    public async Task<PrintResult> PrintAsync(Func<IReceiptBuilder, Task> buildReceipt, CancellationToken cancellationToken = default)
    {
        var builder = new ReceiptBuilder();
        await buildReceipt(builder);
        return await SendAsync(builder.BuildAsMemory(), cancellationToken);
    }

    /// <summary>
    /// 프린터 초기화 명령 전송
    /// </summary>
    public async Task<PrintResult> InitializeAsync(CancellationToken cancellationToken = default)
    {
#if NET5_0_OR_GREATER
        return await SendAsync(EscPosCommands.Initialize.ToArray(), cancellationToken);
#else
        return await SendAsync(EscPosCommands.Initialize, cancellationToken);
#endif
    }

    /// <summary>
    /// 프린터 상태 조회
    /// </summary>
    public async Task<PrinterStatus?> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        await _printLock.WaitAsync(cancellationToken);
        try
        {
            if (!IsConnected)
            {
                _logger?.LogWarning("프린터가 연결되어 있지 않아 상태를 조회할 수 없습니다.");
                return null;
            }

            if (!_connector.CanRead)
            {
                _logger?.LogWarning("이 커넥터는 상태 조회를 지원하지 않습니다.");
                return null;
            }

            var response = new List<byte>();

            // 각 상태 조회 명령 전송 및 응답 수집
#if NET5_0_OR_GREATER
            var statusCommands = new[]
            {
                EscPosCommands.Status.TransmitPrinterStatus.ToArray(),
                EscPosCommands.Status.TransmitOfflineStatus.ToArray(),
                EscPosCommands.Status.TransmitErrorStatus.ToArray(),
                EscPosCommands.Status.TransmitPaperStatus.ToArray()
            };
#else
            var statusCommands = new[]
            {
                EscPosCommands.Status.TransmitPrinterStatus,
                EscPosCommands.Status.TransmitOfflineStatus,
                EscPosCommands.Status.TransmitErrorStatus,
                EscPosCommands.Status.TransmitPaperStatus
            };
#endif

            foreach (var command in statusCommands)
            {
                await _connector.SendAsync(command, cancellationToken);

                try
                {
                    var buffer = new byte[1];
                    var bytesRead = await _connector.ReceiveAsync(buffer, cancellationToken);
                    if (bytesRead > 0)
                    {
                        response.Add(buffer[0]);
                    }
                }
                catch (TimeoutException)
                {
                    _logger?.LogWarning("상태 응답 타임아웃");
                    response.Add(0);
                }
            }

            if (response.Count == 0)
            {
                return null;
            }

            return PrinterStatus.Parse(response.ToArray());
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "프린터 상태 조회 실패");
            return null;
        }
        finally
        {
            _printLock.Release();
        }
    }

    /// <summary>
    /// 캐시드로워 열기
    /// </summary>
    public async Task<PrintResult> OpenCashDrawerAsync(Commands.Enums.CashDrawerPin pin = Commands.Enums.CashDrawerPin.Pin2, CancellationToken cancellationToken = default)
    {
        return await SendAsync(EscPosCommands.OpenCashDrawer((byte)pin), cancellationToken);
    }

    /// <summary>
    /// 비프음 출력
    /// </summary>
    public async Task<PrintResult> BeepAsync(int count = 1, int duration = 3, CancellationToken cancellationToken = default)
    {
        return await SendAsync(EscPosCommands.Beep((byte)count, (byte)duration), cancellationToken);
    }

    /// <summary>
    /// 용지 절단
    /// </summary>
    public async Task<PrintResult> CutAsync(Commands.Enums.CutType cutType = Commands.Enums.CutType.Full, CancellationToken cancellationToken = default)
    {
#if NET5_0_OR_GREATER
        var command = cutType == Commands.Enums.CutType.Partial
            ? EscPosCommands.CutPartial.ToArray()
            : EscPosCommands.CutFull.ToArray();
#else
        var command = cutType == Commands.Enums.CutType.Partial
            ? EscPosCommands.CutPartial
            : EscPosCommands.CutFull;
#endif
        return await SendAsync(command, cancellationToken);
    }

    /// <summary>
    /// 용지 피드 후 절단
    /// </summary>
    public async Task<PrintResult> FeedAndCutAsync(int lines = 3, Commands.Enums.CutType cutType = Commands.Enums.CutType.Full, CancellationToken cancellationToken = default)
    {
        var builder = new ReceiptBuilder();
        builder.Feed(lines).Cut(cutType);
        return await SendAsync(builder.BuildAsMemory(), cancellationToken);
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public async ValueTask DisposeAsync()
    {
        if (!_disposed)
        {
            await DisconnectAsync();
            _printLock.Dispose();
            _disposed = true;
        }
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;

        if (disposing)
        {
            DisconnectAsync().GetAwaiter().GetResult();
            _printLock.Dispose();
        }

        _disposed = true;
    }
}
