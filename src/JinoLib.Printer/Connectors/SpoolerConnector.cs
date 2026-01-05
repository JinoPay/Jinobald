using System.ComponentModel;
using System.Runtime.InteropServices;
using JinoLib.Printer.Abstractions;
using JinoLib.Printer.Connectors.Options;
using JinoLib.Printer.Native;
using Microsoft.Extensions.Logging;

namespace JinoLib.Printer.Connectors;

/// <summary>
/// Windows Print Spooler 프린터 연결 (드라이버 설치 필요)
/// </summary>
public class SpoolerConnector : IPrinterConnector
{
    private readonly SpoolerConnectorOptions _options;
    private readonly ILogger<SpoolerConnector>? _logger;
    private nint _printerHandle;
    private bool _documentStarted;
    private bool _pageStarted;
    private bool _disposed;

    public bool IsConnected => _printerHandle != nint.Zero;
    public string ConnectionInfo => $"Spooler:{_options.PrinterName}";

    public SpoolerConnector(SpoolerConnectorOptions options, ILogger<SpoolerConnector>? logger = null)
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

        _logger?.LogInformation("스풀러 프린터에 연결 시도: {ConnectionInfo}", ConnectionInfo);

        if (!Winspool.OpenPrinter(_options.PrinterName, out _printerHandle, nint.Zero))
        {
            var error = Marshal.GetLastWin32Error();
            _logger?.LogError("스풀러 프린터 연결 실패: {ConnectionInfo}, Error: {Error}", ConnectionInfo, error);
            throw new Win32Exception(error, $"프린터 '{_options.PrinterName}'을(를) 열 수 없습니다.");
        }

        _logger?.LogInformation("스풀러 프린터 연결 성공: {ConnectionInfo}", ConnectionInfo);

        return Task.CompletedTask;
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        if (_pageStarted)
        {
            Winspool.EndPagePrinter(_printerHandle);
            _pageStarted = false;
        }

        if (_documentStarted)
        {
            Winspool.EndDocPrinter(_printerHandle);
            _documentStarted = false;
        }

        if (_printerHandle != nint.Zero)
        {
            Winspool.ClosePrinter(_printerHandle);
            _printerHandle = nint.Zero;
        }

        _logger?.LogInformation("스풀러 프린터 연결 해제: {ConnectionInfo}", ConnectionInfo);

        return Task.CompletedTask;
    }

    public Task WriteAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default)
    {
        if (!IsConnected)
        {
            throw new InvalidOperationException("프린터가 연결되어 있지 않습니다.");
        }

        EnsureDocumentStarted();

        _logger?.LogDebug("데이터 전송: {Length} bytes", data.Length);

        var buffer = data.ToArray();
        if (!Winspool.WritePrinter(_printerHandle, buffer, buffer.Length, out var written))
        {
            var error = Marshal.GetLastWin32Error();
            throw new Win32Exception(error, "프린터에 데이터를 쓸 수 없습니다.");
        }

        if (written != buffer.Length)
        {
            _logger?.LogWarning("일부 데이터만 전송됨: {Written}/{Total} bytes", written, buffer.Length);
        }

        return Task.CompletedTask;
    }

    public Task<byte[]> ReadAsync(int length, CancellationToken cancellationToken = default)
    {
        // Windows Print Spooler는 양방향 통신을 지원하지 않음
        throw new NotSupportedException("스풀러 연결은 읽기를 지원하지 않습니다.");
    }

    private void EnsureDocumentStarted()
    {
        if (_documentStarted) return;

        var docInfo = new Winspool.DOC_INFO_1
        {
            pDocName = _options.DocumentName,
            pOutputFile = null,
            pDatatype = _options.DataType
        };

        var jobId = Winspool.StartDocPrinter(_printerHandle, 1, ref docInfo);
        if (jobId == 0)
        {
            var error = Marshal.GetLastWin32Error();
            throw new Win32Exception(error, "문서를 시작할 수 없습니다.");
        }

        _documentStarted = true;

        if (!Winspool.StartPagePrinter(_printerHandle))
        {
            var error = Marshal.GetLastWin32Error();
            throw new Win32Exception(error, "페이지를 시작할 수 없습니다.");
        }

        _pageStarted = true;
    }

    /// <summary>
    /// 설치된 프린터 목록 조회
    /// </summary>
    public static IEnumerable<string> EnumeratePrinters()
    {
        const uint flags = Winspool.PRINTER_ENUM_LOCAL | Winspool.PRINTER_ENUM_CONNECTIONS;

        Winspool.EnumPrinters(flags, null, 2, nint.Zero, 0, out var needed, out _);

        if (needed == 0) yield break;

        var buffer = Marshal.AllocHGlobal((int)needed);
        try
        {
            if (Winspool.EnumPrinters(flags, null, 2, buffer, needed, out _, out var returned))
            {
                var offset = 0;
                for (var i = 0; i < returned; i++)
                {
                    var info = Marshal.PtrToStructure<Winspool.PRINTER_INFO_2>(buffer + offset);
                    yield return info.pPrinterName;
                    offset += Marshal.SizeOf<Winspool.PRINTER_INFO_2>();
                }
            }
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

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
            DisconnectAsync().GetAwaiter().GetResult();
        }

        _disposed = true;
    }
}
