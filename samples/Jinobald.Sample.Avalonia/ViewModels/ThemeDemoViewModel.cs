using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Settings;
using Jinobald.Theme;
using Jinobald.Sample.Avalonia.Settings;

namespace Jinobald.Sample.Avalonia.ViewModels;

public partial class ThemeDemoViewModel : ViewModelBase
{
    private readonly IThemeService? _themeService;
    // TODO: ITypedSettingsService 구현 필요
    // private readonly ITypedSettingsService<AppSettings> _settingsService;
    private string _currentThemeName = "Unknown";
    private string _userName = string.Empty;
    private bool _autoSave;

    public string Title => "Theme Demo";

    public string CurrentThemeName
    {
        get => _currentThemeName;
        set => SetProperty(ref _currentThemeName, value);
    }

    public string UserName
    {
        get => _userName;
        set => SetProperty(ref _userName, value);
    }

    public bool AutoSave
    {
        get => _autoSave;
        set => SetProperty(ref _autoSave, value);
    }

    public ThemeDemoViewModel(IThemeService? themeService = null)
    {
        _themeService = themeService;

        // 설정에서 초기값 로드
        if (_themeService != null)
        {
            CurrentThemeName = _themeService.CurrentTheme;
            // 테마 변경 이벤트 구독
            _themeService.ThemeChanged += OnThemeChanged;
        }
    }

    private void OnThemeChanged(string themeName)
    {
        CurrentThemeName = themeName;
    }

    [RelayCommand]
    private void SetLightTheme()
    {
        _themeService?.SetTheme("Light");
    }

    [RelayCommand]
    private void SetDarkTheme()
    {
        _themeService?.SetTheme("Dark");
    }

    [RelayCommand]
    private void SetSystemTheme()
    {
        _themeService?.SetTheme("System");
    }

    protected override void OnDestroy(bool disposing)
    {
        if (disposing && _themeService != null)
        {
            _themeService.ThemeChanged -= OnThemeChanged;
        }
        base.OnDestroy(disposing);
    }
}
