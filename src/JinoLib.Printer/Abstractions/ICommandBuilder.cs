namespace JinoLib.Printer.Abstractions;

/// <summary>
/// ESC/POS 명령 빌더 기본 인터페이스.
/// </summary>
public interface ICommandBuilder
{
    /// <summary>
    /// 현재까지 빌드된 명령을 바이트 배열로 반환
    /// </summary>
    byte[] Build();

    /// <summary>
    /// 버퍼를 ReadOnlyMemory로 빌드
    /// </summary>
    ReadOnlyMemory<byte> BuildAsMemory();

    /// <summary>
    /// 빌더 초기화 (버퍼 클리어)
    /// </summary>
    IReceiptBuilder Clear();

    /// <summary>
    /// 원시 바이트 추가
    /// </summary>
    IReceiptBuilder Raw(ReadOnlySpan<byte> data);

    /// <summary>
    /// 원시 바이트 추가
    /// </summary>
    IReceiptBuilder Raw(params byte[] data);

    /// <summary>
    /// 프린터 초기화 명령 (ESC @)
    /// </summary>
    IReceiptBuilder Initialize();
}
