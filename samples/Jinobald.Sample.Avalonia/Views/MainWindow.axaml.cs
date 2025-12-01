using System.Threading.Tasks;
using Avalonia.Controls;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Services.Regions;

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

        // 초기 페이지로 네비게이션
        _ = _regionManager.NavigateAsync<ViewModels.HomeViewModel>("MainContentRegion");
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
        await _regionManager.NavigateAsync<ViewModels.HomeViewModel>("MainContentRegion");
    }

    [RelayCommand]
    private async Task NavigateToNavigationDemo()
    {
        await _regionManager.NavigateAsync<ViewModels.NavigationDemoViewModel>("MainContentRegion");
    }

    [RelayCommand]
    private async Task NavigateToDialogDemo()
    {
        await _regionManager.NavigateAsync<ViewModels.DialogDemoViewModel>("MainContentRegion");
    }

    [RelayCommand]
    private async Task NavigateToThemeDemo()
    {
        await _regionManager.NavigateAsync<ViewModels.ThemeDemoViewModel>("MainContentRegion");
    }

    [RelayCommand]
    private async Task NavigateToRegionDemo()
    {
        await _regionManager.NavigateAsync<ViewModels.RegionDemoViewModel>("MainContentRegion");
    }
}
