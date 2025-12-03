using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Settings;
using Jinobald.Core.Services.Theme;
using Jinobald.Sample.Avalonia.Settings;

namespace Jinobald.Sample.Avalonia.ViewModels;

public partial class ThemeDemoViewModel : ViewModelBase
{
    private readonly IThemeService _themeService;
    private readonly ITypedSettingsService<AppSettings> _settingsService;
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
        set
        {
            if (SetProperty(ref _userName, value))
            {
                // Strongly-Typed 설정 업데이트
                _settingsService.Update(s => s.User.Name = value);
            }
        }
    }

    public bool AutoSave
    {
        get => _autoSave;
        set
        {
            if (SetProperty(ref _autoSave, value))
            {
                _settingsService.Update(s => s.User.AutoSave = value);
            }
        }
    }

    public ThemeDemoViewModel(
        IThemeService themeService,
        ITypedSettingsService<AppSettings> settingsService)
    {
        _themeService = themeService;
        _settingsService = settingsService;

        // 설정에서 초기값 로드
        CurrentThemeName = _themeService.CurrentTheme;
        _userName = _settingsService.Value.User.Name;
        _autoSave = _settingsService.Value.User.AutoSave;

        // 테마 변경 이벤트 구독
        _themeService.ThemeChanged += OnThemeChanged;
        _settingsService.SettingsChanged += OnSettingsChanged;
    }

    private void OnThemeChanged(string themeName)
    {
        CurrentThemeName = themeName;
        // 테마 변경 시 설정에 저장
        _settingsService.Update(s => s.Theme = themeName);
    }

    private void OnSettingsChanged(AppSettings settings)
    {
        // 설정 변경 시 UI 업데이트 (외부에서 변경된 경우)
        if (_userName != settings.User.Name)
            _userName = settings.User.Name;

        if (_autoSave != settings.User.AutoSave)
            _autoSave = settings.User.AutoSave;
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

    [RelayCommand]
    private void SetSystemTheme()
    {
        _themeService.SetTheme("System");
    }

    protected override void OnDestroy(bool disposing)
    {
        if (disposing)
        {
            _themeService.ThemeChanged -= OnThemeChanged;
            _settingsService.SettingsChanged -= OnSettingsChanged;
        }
        base.OnDestroy(disposing);
    }
}
