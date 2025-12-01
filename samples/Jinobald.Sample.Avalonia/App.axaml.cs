using Avalonia.Markup.Xaml;
using Jinobald.Avalonia.Application;
using Jinobald.Sample.Avalonia.ViewModels;
using Jinobald.Sample.Avalonia.ViewModels.Dialogs;
using Jinobald.Sample.Avalonia.ViewModels.Regions;
using Jinobald.Sample.Avalonia.Views;
using Microsoft.Extensions.DependencyInjection;

namespace Jinobald.Sample.Avalonia;

public partial class App : AvaloniaApplicationBase<MainWindow, SplashScreenWindow>
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        // ViewModels 등록
        services.AddTransient<HomeViewModel>();
        services.AddTransient<NavigationDemoViewModel>();
        services.AddTransient<DialogDemoViewModel>();
        services.AddTransient<ThemeDemoViewModel>();
        services.AddTransient<RegionDemoViewModel>();

        // Dialog ViewModels 등록
        services.AddTransient<MessageDialogViewModel>();

        // Region Item ViewModels 등록
        services.AddTransient<RedItemViewModel>();
        services.AddTransient<BlueItemViewModel>();
        services.AddTransient<GreenItemViewModel>();
    }
}