using System.Windows;
using Jinobald.Core.Services.Settings;
using Jinobald.Core.Services.Theme;
using Serilog;

namespace Jinobald.Wpf.Services.Theme;

/// <summary>
///     WPF 테마 관리 서비스
///     SettingsService와 통합되어 테마 설정을 자동으로 저장/로드합니다.
/// </summary>
public sealed class ThemeService : IThemeService
{
    private const string ThemeSettingsKey = "App.Theme";
    private const string DefaultTheme = "Light";

    private readonly ILogger _logger;
    private readonly Dictionary<string, ResourceDictionary> _registeredThemes = new();
    private readonly ISettingsService _settingsService;

    public ThemeService(ISettingsService settingsService)
    {
        _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
        _logger = Log.ForContext<ThemeService>();

        // 기본 테마 등록
        RegisterDefaultThemes();

        // 저장된 테마 불러오기
        LoadTheme();
    }

    /// <summary>
    ///     현재 적용된 테마 이름
    /// </summary>
    public string CurrentTheme { get; private set; } = DefaultTheme;

    /// <summary>
    ///     등록된 테마 목록
    /// </summary>
    public IEnumerable<string> AvailableThemes => _registeredThemes.Keys;

    /// <summary>
    ///     테마 변경 이벤트
    /// </summary>
    public event Action<string>? ThemeChanged;

    /// <summary>
    ///     테마를 등록합니다.
    /// </summary>
    public void RegisterTheme(string themeName, object theme)
    {
        if (string.IsNullOrEmpty(themeName))
            throw new ArgumentException("테마 이름은 비어있을 수 없습니다.", nameof(themeName));

        if (theme is not ResourceDictionary resourceDictionary)
            throw new ArgumentException("WPF 테마는 ResourceDictionary여야 합니다.", nameof(theme));

        _registeredThemes[themeName] = resourceDictionary;
        _logger.Information("테마 등록됨: {ThemeName}", themeName);
    }

    /// <summary>
    ///     테마를 변경합니다.
    /// </summary>
    public void SetTheme(string themeName)
    {
        if (!_registeredThemes.TryGetValue(themeName, out var theme))
        {
            _logger.Warning("등록되지 않은 테마: {Theme}", themeName);
            return;
        }

        var app = System.Windows.Application.Current;
        if (app == null)
        {
            _logger.Error("Application.Current가 null입니다.");
            return;
        }

        try
        {
            // WPF 테마 변경 - MergedDictionaries에서 기존 테마 제거 후 새 테마 추가
            app.Resources.MergedDictionaries.Clear();
            app.Resources.MergedDictionaries.Add(theme);

            CurrentTheme = themeName;

            // SettingsService에 테마 설정 저장
            _settingsService.Set(ThemeSettingsKey, themeName);

            // 테마 변경 이벤트 발생
            ThemeChanged?.Invoke(themeName);

            _logger.Information("테마 변경됨: {Theme}", themeName);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "테마 변경 실패: {Theme}", themeName);
        }
    }

    /// <summary>
    ///     테마 색상을 가져옵니다.
    /// </summary>
    public object? GetThemeColor(string colorKey)
    {
        if (string.IsNullOrEmpty(colorKey))
            return null;

        var app = System.Windows.Application.Current;
        if (app == null)
            return null;

        // Application 리소스에서 색상 검색
        if (app.Resources.Contains(colorKey))
            return app.Resources[colorKey];

        _logger.Debug("테마 색상을 찾을 수 없음: {ColorKey}", colorKey);
        return null;
    }

    /// <summary>
    ///     테마 스타일 리소스를 가져옵니다.
    /// </summary>
    public object? GetThemeResource(string resourceKey)
    {
        if (string.IsNullOrEmpty(resourceKey))
            return null;

        var app = System.Windows.Application.Current;
        if (app == null)
            return null;

        // Application 리소스에서 리소스 검색
        if (app.Resources.Contains(resourceKey))
            return app.Resources[resourceKey];

        _logger.Debug("테마 리소스를 찾을 수 없음: {ResourceKey}", resourceKey);
        return null;
    }

    /// <summary>
    ///     기본 테마들을 등록합니다.
    /// </summary>
    private void RegisterDefaultThemes()
    {
        // Light 테마
        var lightTheme = new ResourceDictionary();
        // 기본 색상 정의 (예시)
        lightTheme["PrimaryColor"] = System.Windows.Media.Colors.Blue;
        lightTheme["BackgroundColor"] = System.Windows.Media.Colors.White;
        lightTheme["ForegroundColor"] = System.Windows.Media.Colors.Black;
        RegisterTheme("Light", lightTheme);

        // Dark 테마
        var darkTheme = new ResourceDictionary();
        darkTheme["PrimaryColor"] = System.Windows.Media.Colors.DodgerBlue;
        darkTheme["BackgroundColor"] = System.Windows.Media.Colors.Black;
        darkTheme["ForegroundColor"] = System.Windows.Media.Colors.White;
        RegisterTheme("Dark", darkTheme);

        _logger.Information("기본 테마 등록 완료");
    }

    /// <summary>
    ///     저장된 테마를 불러옵니다.
    /// </summary>
    private void LoadTheme()
    {
        var savedTheme = _settingsService.Get(ThemeSettingsKey, DefaultTheme);
        if (_registeredThemes.ContainsKey(savedTheme))
        {
            SetTheme(savedTheme);
        }
        else
        {
            _logger.Warning("저장된 테마를 찾을 수 없음: {Theme}, 기본 테마 사용", savedTheme);
            SetTheme(DefaultTheme);
        }
    }

    /// <summary>
    ///     저장된 테마 설정을 적용합니다.
    /// </summary>
    public void ApplySavedTheme()
    {
        LoadTheme();
    }
}
