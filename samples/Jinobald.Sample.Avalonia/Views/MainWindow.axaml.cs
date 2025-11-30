using System.Threading.Tasks;
using Avalonia.Controls;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Services.Navigation;

namespace Jinobald.Sample.Avalonia.Views;

public partial class MainWindow : Window
{
    private readonly INavigationService? _navigationService;

    public MainWindow()
    {
        InitializeComponent();
    }

    public MainWindow(INavigationService navigationService) : this()
    {
        _navigationService = navigationService;
        DataContext = new MainWindowViewModel(navigationService);

        // CurrentView 변경 시 UI 업데이트
        _navigationService.CurrentViewChanged += view =>
        {
            if (DataContext is MainWindowViewModel vm)
            {
                vm.CurrentView = view;
            }
        };

        // 초기 페이지로 네비게이션
        _ = _navigationService.NavigateToAsync<ViewModels.HomeViewModel>();
    }
}

public partial class MainWindowViewModel : ObservableObject
{
    private readonly INavigationService _navigationService;

    [ObservableProperty]
    private object? _currentView;

    public MainWindowViewModel(INavigationService navigationService)
    {
        _navigationService = navigationService;
    }

    [RelayCommand]
    private async Task NavigateHome()
    {
        await _navigationService.NavigateToAsync<ViewModels.HomeViewModel>();
    }

    [RelayCommand]
    private async Task NavigateToNavigationDemo()
    {
        await _navigationService.NavigateToAsync<ViewModels.NavigationDemoViewModel>();
    }

    [RelayCommand]
    private async Task NavigateToDialogDemo()
    {
        await _navigationService.NavigateToAsync<ViewModels.DialogDemoViewModel>();
    }

    [RelayCommand]
    private async Task NavigateToThemeDemo()
    {
        await _navigationService.NavigateToAsync<ViewModels.ThemeDemoViewModel>();
    }
}
