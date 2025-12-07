namespace Jinobald.Abstractions.Ioc;

/// <summary>
///     전역 컨테이너 로케이터
///     애플리케이션 전체에서 DI 컨테이너에 접근할 수 있습니다.
/// </summary>
public static class ContainerLocator
{
    private static IContainerExtension? _current;

    /// <summary>
    ///     컨테이너가 설정되었는지 여부
    /// </summary>
    public static bool IsSet => _current != null;

    /// <summary>
    ///     현재 컨테이너 인스턴스
    /// </summary>
    /// <exception cref="InvalidOperationException">컨테이너가 설정되지 않은 경우</exception>
    public static IContainerExtension Current
    {
        get => _current ?? throw new InvalidOperationException(
            "ContainerLocator.SetContainerExtension()을 먼저 호출하여 컨테이너를 설정해야 합니다.");
        private set => _current = value;
    }

    /// <summary>
    ///     컨테이너 확장을 설정합니다.
    /// </summary>
    /// <param name="containerExtension">설정할 컨테이너 확장</param>
    public static void SetContainerExtension(IContainerExtension containerExtension)
    {
        Current = containerExtension;
    }

    /// <summary>
    ///     컨테이너를 초기화합니다 (주로 테스트용)
    /// </summary>
    public static void ResetContainer()
    {
        _current = null;
    }
}
