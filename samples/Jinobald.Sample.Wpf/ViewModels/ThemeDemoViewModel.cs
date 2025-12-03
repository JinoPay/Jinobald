using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Theme;

namespace Jinobald.Sample.Wpf.ViewModels;

public partial class ThemeDemoViewModel : ViewModelBase
{
    private readonly IThemeService _themeService;
    private string _currentThemeName = "Unknown";

    public string Title => "Theme Demo";

    public string CurrentThemeName
    {
        get => _currentThemeName;
        set => SetProperty(ref _currentThemeName, value);
    }

    public ThemeDemoViewModel(IThemeService themeService)
    {
        _themeService = themeService;
        CurrentThemeName = _themeService.CurrentTheme;

        // 테마 변경 이벤트 구독
        _themeService.ThemeChanged += OnThemeChanged;
    }

    private void OnThemeChanged(string themeName)
    {
        CurrentThemeName = themeName;
    }

    [RelayCommand]
    private void SetLightTheme()
    {
        _themeService.SetTheme("Light");
    }

    [RelayCommand]
    private void SetDarkTheme()
    {
        _themeService.SetTheme("Dark");
    }

    protected override void OnDestroy()
    {
        _themeService.ThemeChanged -= OnThemeChanged;
        base.OnDestroy();
    }
}
