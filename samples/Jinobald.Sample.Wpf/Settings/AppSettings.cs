namespace Jinobald.Sample.Wpf.Settings;

/// <summary>
///     애플리케이션 설정 클래스.
///     Strongly-Typed 설정 패턴을 사용하여 컴파일 타임 타입 안전성을 보장합니다.
/// </summary>
public class AppSettings
{
    /// <summary>
    ///     현재 테마 (Light, Dark)
    /// </summary>
    public string Theme { get; set; } = "Light";

    /// <summary>
    ///     언어 설정
    /// </summary>
    public string Language { get; set; } = "ko-KR";

    /// <summary>
    ///     윈도우 설정
    /// </summary>
    public WindowSettings Window { get; set; } = new();

    /// <summary>
    ///     사용자 설정
    /// </summary>
    public UserSettings User { get; set; } = new();
}

/// <summary>
///     윈도우 관련 설정
/// </summary>
public class WindowSettings
{
    /// <summary>
    ///     윈도우 너비
    /// </summary>
    public double Width { get; set; } = 1024;

    /// <summary>
    ///     윈도우 높이
    /// </summary>
    public double Height { get; set; } = 768;

    /// <summary>
    ///     최대화 상태
    /// </summary>
    public bool IsMaximized { get; set; }
}

/// <summary>
///     사용자 관련 설정
/// </summary>
public class UserSettings
{
    /// <summary>
    ///     사용자 이름
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    ///     자동 저장 활성화
    /// </summary>
    public bool AutoSave { get; set; } = true;

    /// <summary>
    ///     최근 파일 최대 개수
    /// </summary>
    public int MaxRecentFiles { get; set; } = 10;
}
