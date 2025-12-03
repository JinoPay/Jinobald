using System;
using System.Threading.Tasks;
using Avalonia.Markup.Xaml;
using Jinobald.Avalonia.Application;
using Jinobald.Core.Application;
using Jinobald.Core.Ioc;
using Jinobald.Core.Services.Regions;
using Jinobald.Sample.Avalonia.Settings;
using Jinobald.Sample.Avalonia.Views;
using Jinobald.Sample.Avalonia.Views.Dialogs;
using Jinobald.Sample.Avalonia.Views.Regions;

namespace Jinobald.Sample.Avalonia;

public partial class App : ApplicationBase<MainWindow, SplashScreenWindow>
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

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

    public override void ConfigureRegions(IRegionManager regionManager)
    {
        // Region에 기본 View 등록
        regionManager.RegisterViewWithRegion<HomeView>("MainContentRegion");
    }

    public override Task OnInitializeAsync(IProgress<InitializationProgress> progress)
    {
        progress.Report(new("초기화 중...", 50));

        // Avalonia는 테마가 ThemeVariant로 자동 처리됨 (별도 등록 불필요)

        progress.Report(new("완료!", 100));

        return Task.CompletedTask;
    }
}
