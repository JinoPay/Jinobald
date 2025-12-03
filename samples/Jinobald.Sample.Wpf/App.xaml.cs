using System;
using System.Threading.Tasks;
using System.Windows;
using Jinobald.Core.Ioc;
using Jinobald.Core.Services.Regions;
using Jinobald.Core.Services.Theme;
using Jinobald.Sample.Wpf.Settings;
using Jinobald.Sample.Wpf.Views;
using Jinobald.Sample.Wpf.Views.Dialogs;
using Jinobald.Sample.Wpf.Views.Regions;
using Jinobald.Wpf.Application;

namespace Jinobald.Sample.Wpf;

public partial class App : WpfApplicationBase<MainWindow, SplashScreenWindow>
{
    protected override void RegisterTypes(IContainerRegistry containerRegistry)
    {
        // Strongly-Typed 설정 서비스 등록
        containerRegistry.RegisterSettings<AppSettings>();

        // 네비게이션용 View 등록 (ViewModel은 ViewModelLocator가 자동 매핑)
        containerRegistry.RegisterForNavigation<HomeView>();
        containerRegistry.RegisterForNavigation<NavigationDemoView>();
        containerRegistry.RegisterForNavigation<DialogDemoView>();
        containerRegistry.RegisterForNavigation<ThemeDemoView>();
        containerRegistry.RegisterForNavigation<RegionDemoView>();
        containerRegistry.RegisterForNavigation<EventDemoView>();

        // 다이얼로그 등록 (ViewModel은 ViewModelLocator가 자동 매핑)
        containerRegistry.RegisterDialog<MessageDialogView>();
        containerRegistry.RegisterDialog<ConfirmDialogView>();
        containerRegistry.RegisterDialog<NestedTestDialogView>();

        // Region Item View 등록
        containerRegistry.RegisterForNavigation<RedItemView>();
        containerRegistry.RegisterForNavigation<BlueItemView>();
        containerRegistry.RegisterForNavigation<GreenItemView>();
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
