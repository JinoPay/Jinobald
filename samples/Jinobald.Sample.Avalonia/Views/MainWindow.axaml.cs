using System.Threading.Tasks;
using Avalonia.Controls;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Services.Regions;
using AvaloniaRegion = Jinobald.Avalonia.Services.Regions.Region;

namespace Jinobald.Sample.Avalonia.Views;

public partial class MainWindow : Window
{
    private readonly IRegionManager? _regionManager;

    public MainWindow()
    {
        InitializeComponent();
    }

    public MainWindow(IRegionManager regionManager) : this()
    {
        _regionManager = regionManager;
        DataContext = new MainWindowViewModel(regionManager);

        // RegionManager를 Window에 설정 (하위 Region들이 찾을 수 있도록)
        AvaloniaRegion.SetManager(this, regionManager);

        // 초기 페이지로 네비게이션 (View-first 패턴)
        _ = _regionManager.NavigateAsync<HomeView>("MainContentRegion");
    }
}

public partial class MainWindowViewModel : ObservableObject
{
    private readonly IRegionManager _regionManager;

    public MainWindowViewModel(IRegionManager regionManager)
    {
        _regionManager = regionManager;
    }

    [RelayCommand]
    private async Task NavigateHome()
    {
        await _regionManager.NavigateAsync<HomeView>("MainContentRegion");
    }

    [RelayCommand]
    private async Task NavigateToNavigationDemo()
    {
        await _regionManager.NavigateAsync<NavigationDemoView>("MainContentRegion");
    }

    [RelayCommand]
    private async Task NavigateToDialogDemo()
    {
        await _regionManager.NavigateAsync<DialogDemoView>("MainContentRegion");
    }

    [RelayCommand]
    private async Task NavigateToThemeDemo()
    {
        await _regionManager.NavigateAsync<ThemeDemoView>("MainContentRegion");
    }

    [RelayCommand]
    private async Task NavigateToRegionDemo()
    {
        await _regionManager.NavigateAsync<RegionDemoView>("MainContentRegion");
    }
}
