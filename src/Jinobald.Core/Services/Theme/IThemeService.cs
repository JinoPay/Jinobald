namespace Jinobald.Core.Services.Theme;

/// <summary>
///     테마 관리 서비스
/// </summary>
public interface IThemeService
{
    /// <summary>
    ///     현재 테마
    /// </summary>
    string CurrentTheme { get; }

    /// <summary>
    ///     테마 변경 이벤트
    /// </summary>
    event Action<string>? ThemeChanged;

    /// <summary>
    ///     저장된 테마 설정을 적용합니다.
    /// </summary>
    void ApplySavedTheme();

    /// <summary>
    ///     테마를 변경합니다.
    /// </summary>
    /// <param name="theme">Light, Dark, System</param>
    void SetTheme(string theme);
}
