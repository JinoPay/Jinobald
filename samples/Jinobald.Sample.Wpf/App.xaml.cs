using System;
using System.Threading.Tasks;
using System.Windows;
using Jinobald.Core.Ioc;
using Jinobald.Core.Services.Regions;
using Jinobald.Core.Services.Theme;
using Jinobald.Sample.Wpf.ViewModels;
using Jinobald.Sample.Wpf.ViewModels.Dialogs;
using Jinobald.Sample.Wpf.ViewModels.Regions;
using Jinobald.Sample.Wpf.Views;
using Jinobald.Sample.Wpf.Views.Dialogs;
using Jinobald.Sample.Wpf.Views.Regions;
using Jinobald.Wpf.Application;

namespace Jinobald.Sample.Wpf;

public partial class App : WpfApplicationBase<MainWindow, SplashScreenWindow>
{
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

        // 다이얼로그 등록 (View만 등록 - ViewModel은 ViewModelLocator가 자동 매핑)
        containerRegistry.RegisterDialog<MessageDialogView>();
        containerRegistry.RegisterDialog<ConfirmDialogView>();
        containerRegistry.RegisterDialog<NestedTestDialogView>();

        // Region Item View/ViewModel 등록
        containerRegistry.RegisterForNavigation<RedItemView, RedItemViewModel>();
        containerRegistry.RegisterForNavigation<BlueItemView, BlueItemViewModel>();
        containerRegistry.RegisterForNavigation<GreenItemView, GreenItemViewModel>();
    }

    protected override Task OnInitializeAsync()
    {
        // 테마 서비스 가져오기
        var themeService = Container!.Resolve<IThemeService>();

        // 테마 리소스 등록
        themeService.RegisterTheme("Light", new ResourceDictionary
        {
            Source = new Uri("pack://application:,,,/Themes/LightTheme.xaml")
        });

        themeService.RegisterTheme("Dark", new ResourceDictionary
        {
            Source = new Uri("pack://application:,,,/Themes/DarkTheme.xaml")
        });

        // 저장된 테마 적용 (또는 기본 테마)
        themeService.ApplySavedTheme();

        return Task.CompletedTask;
    }

    protected override void ConfigureRegions(IRegionManager regionManager)
    {
        // Region에 기본 View 등록
        regionManager.RegisterViewWithRegion<HomeView>("MainContentRegion");
    }
}
