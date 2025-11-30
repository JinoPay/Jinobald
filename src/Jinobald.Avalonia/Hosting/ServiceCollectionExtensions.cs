using Jinobald.Avalonia.Services.Events;
using Jinobald.Avalonia.Services.Navigation;
using Jinobald.Core.Services.Events;
using Jinobald.Core.Services.Navigation;
using Microsoft.Extensions.DependencyInjection;

namespace Jinobald.Avalonia.Hosting;

/// <summary>
///     Jinobald Avalonia 서비스 등록 확장 메서드
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    ///     Jinobald 핵심 서비스를 DI 컨테이너에 등록합니다.
    /// </summary>
    public static IServiceCollection AddJinobaldAvalonia(this IServiceCollection services)
    {
        // 핵심 서비스
        services.AddSingleton<INavigationService, NavigationService>();
        services.AddSingleton<IEventAggregator, EventAggregator>();

        return services;
    }
}
