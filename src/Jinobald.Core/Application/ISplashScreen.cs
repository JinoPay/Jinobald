namespace Jinobald.Core.Application;

/// <summary>
///     스플래시 화면 인터페이스
///     모든 애플리케이션은 시작 시 스플래시 화면을 표시해야 합니다.
/// </summary>
public interface ISplashScreen
{
    /// <summary>
    ///     스플래시 화면을 표시합니다.
    /// </summary>
    void Show();

    /// <summary>
    ///     스플래시 화면을 닫습니다.
    /// </summary>
    void Close();

    /// <summary>
    ///     스플래시 화면의 진행 상태를 업데이트합니다.
    /// </summary>
    /// <param name="message">표시할 메시지</param>
    /// <param name="progress">진행률 (0.0 ~ 1.0), null이면 진행률 표시 안 함</param>
    void UpdateProgress(string message, double? progress = null);

    /// <summary>
    ///     스플래시 화면이 현재 표시 중인지 여부
    /// </summary>
    bool IsVisible { get; }
}
