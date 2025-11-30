using Jinobald.Avalonia.Application;
using Jinobald.Core.Application;
using Jinobald.Sample.Avalonia.Views;
using Microsoft.Extensions.DependencyInjection;

namespace Jinobald.Sample.Avalonia;

/// <summary>
///     Jinobald 샘플 애플리케이션
/// </summary>
public class SampleApp : AvaloniaApplicationHost<MainWindow>
{
    protected override ISplashScreen CreateSplashScreen()
    {
        return new SplashScreenWindow();
    }

    protected override void OnConfigureServices(IServiceCollection services)
    {
        // 샘플 앱의 ViewModels 등록
        services.AddTransient<ViewModels.HomeViewModel>();
        services.AddTransient<ViewModels.NavigationDemoViewModel>();
        services.AddTransient<ViewModels.DialogDemoViewModel>();
        services.AddTransient<ViewModels.ThemeDemoViewModel>();
    }
}
