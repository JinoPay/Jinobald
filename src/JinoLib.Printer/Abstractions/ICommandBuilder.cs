namespace JinoLib.Printer.Abstractions;

/// <summary>
/// ESC/POS 명령 빌더 기본 인터페이스.
/// </summary>
public interface ICommandBuilder
{
    /// <summary>
    /// 현재까지 빌드된 명령을 바이트 배열로 반환
    /// </summary>
    ReadOnlyMemory<byte> Build();

    /// <summary>
    /// 빌더 초기화 (버퍼 클리어)
    /// </summary>
    ICommandBuilder Clear();

    /// <summary>
    /// 원시 바이트 추가
    /// </summary>
    ICommandBuilder Raw(ReadOnlySpan<byte> data);

    /// <summary>
    /// 프린터 초기화 명령 (ESC @)
    /// </summary>
    ICommandBuilder Initialize();
}
