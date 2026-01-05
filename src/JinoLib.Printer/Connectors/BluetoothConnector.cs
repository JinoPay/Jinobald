using System.IO.Ports;
using JinoLib.Printer.Abstractions;
using JinoLib.Printer.Connectors.Options;
using Microsoft.Extensions.Logging;

namespace JinoLib.Printer.Connectors;

/// <summary>
/// 블루투스 가상 COM 포트 프린터 연결
/// </summary>
public class BluetoothConnector : IPrinterConnector
{
    private readonly BluetoothConnectorOptions _options;
    private readonly ILogger<BluetoothConnector>? _logger;
    private SerialPort? _serialPort;
    private bool _disposed;

    public bool IsConnected => _serialPort?.IsOpen ?? false;
    public string ConnectionInfo => $"Bluetooth:{_options.PortName}@{_options.BaudRate}";

    public BluetoothConnector(BluetoothConnectorOptions options, ILogger<BluetoothConnector>? logger = null)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _logger = logger;
    }

    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        if (IsConnected)
        {
            _logger?.LogDebug("이미 연결되어 있습니다: {ConnectionInfo}", ConnectionInfo);
            return;
        }

        _logger?.LogInformation("블루투스 프린터에 연결 시도: {ConnectionInfo}", ConnectionInfo);

        Exception? lastException = null;

        for (var attempt = 0; attempt <= _options.RetryCount; attempt++)
        {
            if (attempt > 0)
            {
                _logger?.LogDebug("재시도 {Attempt}/{MaxRetry}", attempt, _options.RetryCount);
                await Task.Delay(_options.RetryDelayMs, cancellationToken);
            }

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
                    WriteTimeout = _options.WriteTimeoutMs
                };

                _serialPort.Open();

                _logger?.LogInformation("블루투스 프린터 연결 성공: {ConnectionInfo}", ConnectionInfo);
                return;
            }
            catch (Exception ex)
            {
                lastException = ex;
                _logger?.LogWarning(ex, "블루투스 프린터 연결 시도 실패 ({Attempt}/{MaxRetry}): {ConnectionInfo}",
                    attempt + 1, _options.RetryCount + 1, ConnectionInfo);

                _serialPort?.Dispose();
                _serialPort = null;
            }
        }

        _logger?.LogError(lastException, "블루투스 프린터 연결 최종 실패: {ConnectionInfo}", ConnectionInfo);
        throw lastException ?? new InvalidOperationException("블루투스 연결에 실패했습니다.");
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

        _logger?.LogInformation("블루투스 프린터 연결 해제: {ConnectionInfo}", ConnectionInfo);

        return Task.CompletedTask;
    }

    public Task WriteAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default)
    {
        if (!IsConnected || _serialPort == null)
        {
            throw new InvalidOperationException("프린터가 연결되어 있지 않습니다.");
        }

        _logger?.LogDebug("데이터 전송: {Length} bytes", data.Length);

        _serialPort.Write(data.ToArray(), 0, data.Length);

        return Task.CompletedTask;
    }

    public Task<byte[]> ReadAsync(int length, CancellationToken cancellationToken = default)
    {
        if (!IsConnected || _serialPort == null)
        {
            throw new InvalidOperationException("프린터가 연결되어 있지 않습니다.");
        }

        var buffer = new byte[length];
        var bytesRead = _serialPort.Read(buffer, 0, length);

        if (bytesRead < length)
        {
            Array.Resize(ref buffer, bytesRead);
        }

        _logger?.LogDebug("데이터 수신: {Length} bytes", bytesRead);

        return Task.FromResult(buffer);
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
