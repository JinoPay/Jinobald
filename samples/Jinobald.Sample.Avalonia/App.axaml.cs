using Avalonia.Markup.Xaml;
using Jinobald.Avalonia.Application;
using Jinobald.Sample.Avalonia.Views;
using Microsoft.Extensions.DependencyInjection;

namespace Jinobald.Sample.Avalonia;

public partial class App : AvaloniaApplicationBase<MainWindow, Views.SplashScreenWindow>
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
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
