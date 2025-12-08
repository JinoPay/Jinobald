using Jinobald.Abstractions.Ioc;

namespace Jinobald.Settings;

/// <summary>
///     IContainerRegistry 확장 메서드 - Settings 관련
/// </summary>
public static class ContainerRegistryExtensions
{
    /// <summary>
    ///     Strongly-Typed 설정 서비스를 싱글톤으로 등록합니다.
    ///     기본 경로(%AppData%/Jinobald/{typename}.json)에 저장됩니다.
    /// </summary>
    /// <typeparam name="TSettings">설정 POCO 클래스 타입</typeparam>
    /// <param name="containerRegistry">컨테이너 레지스트리</param>
    /// <returns>현재 레지스트리</returns>
    public static IContainerRegistry RegisterSettings<TSettings>(this IContainerRegistry containerRegistry)
        where TSettings : class, new()
    {
        containerRegistry.RegisterSingleton<ITypedSettingsService<TSettings>, JsonTypedSettingsService<TSettings>>();
        return containerRegistry;
    }

    /// <summary>
    ///     Strongly-Typed 설정 서비스를 사용자 지정 파일 경로로 싱글톤 등록합니다.
    ///     인스턴스를 직접 생성하여 등록합니다.
    /// </summary>
    /// <typeparam name="TSettings">설정 POCO 클래스 타입</typeparam>
    /// <param name="containerRegistry">컨테이너 레지스트리</param>
    /// <param name="filePath">설정 파일 경로</param>
    /// <returns>현재 레지스트리</returns>
    public static IContainerRegistry RegisterSettings<TSettings>(this IContainerRegistry containerRegistry, string filePath)
        where TSettings : class, new()
    {
        var instance = new JsonTypedSettingsService<TSettings>(filePath);
        containerRegistry.RegisterInstance<ITypedSettingsService<TSettings>>(instance);
        return containerRegistry;
    }
}
