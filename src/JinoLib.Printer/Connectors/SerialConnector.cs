using System.IO.Ports;
using JinoLib.Printer.Abstractions;
using JinoLib.Printer.Connectors.Options;
using Microsoft.Extensions.Logging;

namespace JinoLib.Printer.Connectors;

/// <summary>
/// 시리얼 COM 포트 프린터 연결
/// </summary>
public class SerialConnector : IPrinterConnector
{
    private readonly SerialConnectorOptions _options;
    private readonly ILogger<SerialConnector>? _logger;
    private SerialPort? _serialPort;
    private bool _disposed;

    public bool IsConnected => _serialPort?.IsOpen ?? false;
    public string ConnectionType => "Serial";
    public bool CanRead => true;
    public string ConnectionInfo => $"Serial:{_options.PortName}@{_options.BaudRate}";

    public SerialConnector(SerialConnectorOptions options, ILogger<SerialConnector>? logger = null)
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

        _logger?.LogInformation("시리얼 프린터에 연결 시도: {ConnectionInfo}", ConnectionInfo);

        try
        {
            _serialPort = new SerialPort
            {
                PortName = _options.PortName,
                BaudRate = _options.BaudRate,
                DataBits = _options.DataBits,
                Parity = _options.Parity,
                StopBits = _options.StopBits,
                Handshake = _options.Handshake,
                ReadTimeout = _options.ReadTimeoutMs,
                WriteTimeout = _options.WriteTimeoutMs,
                DtrEnable = _options.DtrEnable,
                RtsEnable = _options.RtsEnable
            };

            _serialPort.Open();

            _logger?.LogInformation("시리얼 프린터 연결 성공: {ConnectionInfo}", ConnectionInfo);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "시리얼 프린터 연결 실패: {ConnectionInfo}", ConnectionInfo);
            _serialPort?.Dispose();
            _serialPort = null;
            throw;
        }

        return Task.CompletedTask;
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        if (_serialPort != null)
        {
            if (_serialPort.IsOpen)
            {
                _serialPort.Close();
            }
            _serialPort.Dispose();
            _serialPort = null;
        }

        _logger?.LogInformation("시리얼 프린터 연결 해제: {ConnectionInfo}", ConnectionInfo);

        return Task.CompletedTask;
    }

    public Task SendAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default)
    {
        if (!IsConnected || _serialPort == null)
        {
            throw new InvalidOperationException("프린터가 연결되어 있지 않습니다.");
        }

        _logger?.LogDebug("데이터 전송: {Length} bytes", data.Length);

        // SerialPort.Write는 Span<byte>를 지원하지 않으므로 byte[] 사용
        var buffer = data.ToArray();
        _serialPort.Write(buffer, 0, buffer.Length);

        return Task.CompletedTask;
    }

    public Task<int> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        if (!IsConnected || _serialPort == null)
        {
            throw new InvalidOperationException("프린터가 연결되어 있지 않습니다.");
        }

        // SerialPort.Read는 Span<byte>를 지원하지 않으므로 byte[] 사용
        var tempBuffer = new byte[buffer.Length];
        var bytesRead = _serialPort.Read(tempBuffer, 0, buffer.Length);
        tempBuffer.AsSpan(0, bytesRead).CopyTo(buffer.Span);

        _logger?.LogDebug("데이터 수신: {Length} bytes", bytesRead);

        return Task.FromResult(bytesRead);
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
            _serialPort?.Dispose();
        }

        _disposed = true;
    }
}
