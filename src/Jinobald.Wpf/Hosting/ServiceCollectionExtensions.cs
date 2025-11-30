using Jinobald.Wpf.Services.Events;
using Jinobald.Core.Services.Events;
using Microsoft.Extensions.DependencyInjection;

namespace Jinobald.Wpf.Hosting;

/// <summary>
///     Jinobald WPF 서비스 등록 확장 메서드
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    ///     Jinobald WPF 핵심 서비스를 DI 컨테이너에 등록합니다.
    /// </summary>
    public static IServiceCollection AddJinobaldWpf(this IServiceCollection services)
    {
        // 핵심 서비스
        services.AddSingleton<IEventAggregator, EventAggregator>();

        return services;
    }
}
