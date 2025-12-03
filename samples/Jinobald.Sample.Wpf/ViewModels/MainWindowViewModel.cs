using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Services.Regions;
using Jinobald.Sample.Wpf.Views;

namespace Jinobald.Sample.Wpf.ViewModels;

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

    [RelayCommand]
    private async Task NavigateToEventDemo()
    {
        await _regionManager.NavigateAsync<EventDemoView>("MainContentRegion");
    }

    [RelayCommand]
    private async Task NavigateToAdvancedDemo()
    {
        await _regionManager.NavigateAsync<AdvancedDemoView>("MainContentRegion");
    }
}
