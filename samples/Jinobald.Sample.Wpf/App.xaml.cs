using System;
using System.Threading.Tasks;
using System.Windows;
using Jinobald.Core.Application;
using Jinobald.Core.Ioc;
using Jinobald.Core.Services.Regions;
using Jinobald.Core.Services.Theme;
using Jinobald.Sample.Wpf.Settings;
using Jinobald.Sample.Wpf.Views;
using Jinobald.Sample.Wpf.Views.Dialogs;
using Jinobald.Sample.Wpf.Views.Regions;
using Jinobald.Wpf.Application;

namespace Jinobald.Sample.Wpf;

public partial class App : ApplicationBase<MainWindow, SplashScreenWindow>
{
    public override void RegisterTypes(IContainerRegistry containerRegistry)
    {
        // Strongly-Typed 설정 서비스 등록
        containerRegistry.RegisterSettings<AppSettings>();

        // MainWindow ViewModel 등록 (Window는 네비게이션이 아니므로 명시적 등록 필요)
        containerRegistry.RegisterSingleton<ViewModels.MainWindowViewModel>();

        // 네비게이션용 View 등록 (ViewModel은 ViewModelLocator가 자동 매핑)
        containerRegistry.RegisterForNavigation<HomeView>();
        containerRegistry.RegisterForNavigation<NavigationDemoView>();
        containerRegistry.RegisterForNavigation<DialogDemoView>();
        containerRegistry.RegisterForNavigation<ThemeDemoView>();
        containerRegistry.RegisterForNavigation<RegionDemoView>();
        containerRegistry.RegisterForNavigation<EventDemoView>();
        containerRegistry.RegisterForNavigation<ToastDemoView>();  // Toast 데모
        containerRegistry.RegisterForNavigation<AdvancedDemoView>();  // Advanced Features 데모

        // 다이얼로그 등록 (ViewModel은 ViewModelLocator가 자동 매핑)
        containerRegistry.RegisterDialog<MessageDialogView>();
        containerRegistry.RegisterDialog<ConfirmDialogView>();
        containerRegistry.RegisterDialog<NestedTestDialogView>();
        containerRegistry.RegisterDialog<UserSelectDialogView>();  // Generic IDialogResult<T> 데모용

        // Region Item View 등록
        containerRegistry.RegisterForNavigation<RedItemView>();
        containerRegistry.RegisterForNavigation<BlueItemView>();
        containerRegistry.RegisterForNavigation<GreenItemView>();
    }

    public override async Task OnInitializeAsync(IProgress<InitializationProgress> progress)
    {
        progress.Report(new("테마 로딩 중...", 30));

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

        progress.Report(new("테마 적용 중...", 70));

        // 저장된 테마 적용 (또는 기본 테마)
        themeService.ApplySavedTheme();

        await Task.Delay(2000);

        progress.Report(new("완료!", 100));
        
        await Task.Delay(1000);
    }

    public override void ConfigureRegions(IRegionManager regionManager)
    {
        // Region에 기본 View 등록
        regionManager.RegisterViewWithRegion<HomeView>("MainContentRegion");
    }
}
