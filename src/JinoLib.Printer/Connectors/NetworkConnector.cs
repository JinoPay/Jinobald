using System.Net.Sockets;
using JinoLib.Printer.Abstractions;
using JinoLib.Printer.Connectors.Options;
using Microsoft.Extensions.Logging;

namespace JinoLib.Printer.Connectors;

/// <summary>
/// 네트워크 TCP/IP 프린터 연결 (Port 9100)
/// </summary>
public class NetworkConnector : IPrinterConnector
{
    private readonly NetworkConnectorOptions _options;
    private readonly ILogger<NetworkConnector>? _logger;
    private TcpClient? _client;
    private NetworkStream? _stream;
    private bool _disposed;

    public bool IsConnected => _client?.Connected ?? false;
    public string ConnectionInfo => $"TCP://{_options.IpAddress}:{_options.Port}";

    public NetworkConnector(NetworkConnectorOptions options, ILogger<NetworkConnector>? logger = null)
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

        _logger?.LogInformation("네트워크 프린터에 연결 시도: {ConnectionInfo}", ConnectionInfo);

        try
        {
            _client = new TcpClient();

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(_options.ConnectTimeoutMs);

            await _client.ConnectAsync(_options.IpAddress, _options.Port, cts.Token);

            _stream = _client.GetStream();
            _stream.ReadTimeout = _options.ReadTimeoutMs;
            _stream.WriteTimeout = _options.WriteTimeoutMs;

            _logger?.LogInformation("네트워크 프린터 연결 성공: {ConnectionInfo}", ConnectionInfo);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"연결 타임아웃: {ConnectionInfo}");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "네트워크 프린터 연결 실패: {ConnectionInfo}", ConnectionInfo);
            await DisconnectAsync();
            throw;
        }
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        if (_stream != null)
        {
            _stream.Close();
            _stream = null;
        }

        if (_client != null)
        {
            _client.Close();
            _client = null;
        }

        _logger?.LogInformation("네트워크 프린터 연결 해제: {ConnectionInfo}", ConnectionInfo);

        return Task.CompletedTask;
    }

    public async Task WriteAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default)
    {
        if (!IsConnected || _stream == null)
        {
            throw new InvalidOperationException("프린터가 연결되어 있지 않습니다.");
        }

        _logger?.LogDebug("데이터 전송: {Length} bytes", data.Length);

        await _stream.WriteAsync(data, cancellationToken);
        await _stream.FlushAsync(cancellationToken);
    }

    public async Task<byte[]> ReadAsync(int length, CancellationToken cancellationToken = default)
    {
        if (!IsConnected || _stream == null)
        {
            throw new InvalidOperationException("프린터가 연결되어 있지 않습니다.");
        }

        var buffer = new byte[length];
        var bytesRead = await _stream.ReadAsync(buffer.AsMemory(0, length), cancellationToken);

        if (bytesRead < length)
        {
            Array.Resize(ref buffer, bytesRead);
        }

        _logger?.LogDebug("데이터 수신: {Length} bytes", bytesRead);

        return buffer;
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
            _stream?.Dispose();
            _client?.Dispose();
        }

        _disposed = true;
    }
}
