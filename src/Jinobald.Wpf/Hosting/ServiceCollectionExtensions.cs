using Jinobald.Core.Services.Dialog;
using Jinobald.Core.Services.Events;
using Jinobald.Core.Services.Navigation;
using Jinobald.Core.Services.Settings;
using Jinobald.Core.Services.Theme;
using Jinobald.Wpf.Services.Dialog;
using Jinobald.Wpf.Services.Events;
using Jinobald.Wpf.Services.Navigation;
using Jinobald.Wpf.Services.Theme;
using Microsoft.Extensions.DependencyInjection;

namespace Jinobald.Wpf.Hosting;

/// <summary>
///     Jinobald WPF 서비스 등록 확장 메서드
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    ///     Jinobald WPF 핵심 서비스를 DI 컨테이너에 등록합니다.
    ///     NavigationService, EventAggregator, SettingsService 등이 자동으로 등록됩니다.
    /// </summary>
    /// <param name="services">서비스 컬렉션</param>
    /// <param name="settingsFilePath">설정 파일 경로 (null이면 기본 경로 사용)</param>
    /// <returns>서비스 컬렉션</returns>
    public static IServiceCollection AddJinobaldWpf(
        this IServiceCollection services,
        string? settingsFilePath = null)
    {
        // 핵심 서비스 등록
        services.AddSingleton<INavigationService, NavigationService>();
        services.AddSingleton<IEventAggregator, EventAggregator>();
        services.AddSingleton<ISettingsService>(sp => new JsonSettingsService(settingsFilePath));
        services.AddSingleton<IThemeService>(sp =>
            new ThemeService(sp.GetRequiredService<ISettingsService>()));
        services.AddSingleton<IDialogService, DialogService>();

        return services;
    }
}
