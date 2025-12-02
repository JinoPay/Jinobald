using Avalonia.Markup.Xaml;
using Jinobald.Avalonia.Application;
using Jinobald.Core.Ioc;
using Jinobald.Core.Services.Regions;
using Jinobald.Sample.Avalonia.ViewModels;
using Jinobald.Sample.Avalonia.ViewModels.Dialogs;
using Jinobald.Sample.Avalonia.ViewModels.Regions;
using Jinobald.Sample.Avalonia.Views;
using Jinobald.Sample.Avalonia.Views.Dialogs;
using Jinobald.Sample.Avalonia.Views.Regions;

namespace Jinobald.Sample.Avalonia;

public partial class App : AvaloniaApplicationBase<MainWindow, SplashScreenWindow>
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    protected override void RegisterTypes(IContainerRegistry containerRegistry)
    {
        // MainWindow ViewModel 등록
        containerRegistry.RegisterSingleton<MainWindowViewModel>();

        // 네비게이션용 View/ViewModel 등록
        containerRegistry.RegisterForNavigation<HomeView, HomeViewModel>();
        containerRegistry.RegisterForNavigation<NavigationDemoView, NavigationDemoViewModel>();
        containerRegistry.RegisterForNavigation<DialogDemoView, DialogDemoViewModel>();
        containerRegistry.RegisterForNavigation<ThemeDemoView, ThemeDemoViewModel>();
        containerRegistry.RegisterForNavigation<RegionDemoView, RegionDemoViewModel>();

        // 다이얼로그 등록
        containerRegistry.RegisterDialog<MessageDialogView, MessageDialogViewModel>();
        containerRegistry.RegisterDialog<ConfirmDialogView, ConfirmDialogViewModel>();

        // Region Item View/ViewModel 등록
        containerRegistry.RegisterForNavigation<RedItemView, RedItemViewModel>();
        containerRegistry.RegisterForNavigation<BlueItemView, BlueItemViewModel>();
        containerRegistry.RegisterForNavigation<GreenItemView, GreenItemViewModel>();
    }

    protected override void ConfigureRegions(IRegionManager regionManager)
    {
        // Region에 기본 View 등록
        regionManager.RegisterViewWithRegion<HomeView>("MainContentRegion");
    }
}
