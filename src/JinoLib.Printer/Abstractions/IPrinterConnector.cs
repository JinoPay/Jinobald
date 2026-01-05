namespace JinoLib.Printer.Abstractions;

/// <summary>
/// 프린터 연결 추상화 인터페이스.
/// Connector 패턴을 채택하여 연결과 명령을 완전히 분리.
/// </summary>
public interface IPrinterConnector : IAsyncDisposable, IDisposable
{
    /// <summary>
    /// 연결 상태
    /// </summary>
    bool IsConnected { get; }

    /// <summary>
    /// 연결 타입 식별자 (예: "Network", "Serial", "USB")
    /// </summary>
    string ConnectionType { get; }

    /// <summary>
    /// 비동기 연결
    /// </summary>
    Task ConnectAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 비동기 연결 해제
    /// </summary>
    Task DisconnectAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 데이터 전송
    /// </summary>
    Task SendAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default);

    /// <summary>
    /// 데이터 수신 (상태 조회용)
    /// </summary>
    Task<int> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken = default);

    /// <summary>
    /// 읽기 가능 여부 (양방향 통신 지원 여부)
    /// </summary>
    bool CanRead { get; }
}
