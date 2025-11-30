using Avalonia.Markup.Xaml;
using Jinobald.Avalonia.Application;
using Jinobald.Core.Application;
using Jinobald.Sample.Avalonia.Views;
using Microsoft.Extensions.DependencyInjection;

namespace Jinobald.Sample.Avalonia;

public partial class App : AvaloniaApplicationBase<MainWindow, SplashScreenWindow>
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    protected override ISplashScreen CreateSplashScreen()
    {
        return new SplashScreenWindow();
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        // ViewModels 등록
        services.AddTransient<ViewModels.HomeViewModel>();
        services.AddTransient<ViewModels.NavigationDemoViewModel>();
        services.AddTransient<ViewModels.DialogDemoViewModel>();
        services.AddTransient<ViewModels.ThemeDemoViewModel>();
    }
}
