namespace Jinobald.Core.Services.Navigation;

/// <summary>
///     애플리케이션 내 화면 전환을 담당하는 네비게이션 서비스 인터페이스
///     비동기 네비게이션, 히스토리, Guard 기능 지원
/// </summary>
public interface INavigationService
{
    #region 유틸리티

    /// <summary>
    ///     네비게이션 히스토리 초기화
    /// </summary>
    void ClearHistory();

    #endregion

    #region 현재 상태

    /// <summary>
    ///     현재 표시 중인 View
    /// </summary>
    object? CurrentView { get; }

    /// <summary>
    ///     현재 ViewModel
    /// </summary>
    object? CurrentViewModel { get; }

    /// <summary>
    ///     현재 View 변경 이벤트
    /// </summary>
    event Action<object?>? CurrentViewChanged;

    /// <summary>
    ///     네비게이션 진행 중 여부
    /// </summary>
    bool IsNavigating { get; }

    #endregion

    #region 히스토리

    /// <summary>
    ///     뒤로 갈 수 있는지 여부
    /// </summary>
    bool CanGoBack { get; }

    /// <summary>
    ///     앞으로 갈 수 있는지 여부
    /// </summary>
    bool CanGoForward { get; }

    /// <summary>
    ///     네비게이션 히스토리 개수
    /// </summary>
    int HistoryCount { get; }

    #endregion

    #region 비동기 네비게이션

    /// <summary>
    ///     지정된 ViewModel 타입으로 비동기 화면 전환
    /// </summary>
    /// <returns>네비게이션 성공 여부</returns>
    Task<bool> NavigateToAsync<TViewModel>(CancellationToken cancellationToken = default)
        where TViewModel : class;

    /// <summary>
    ///     지정된 ViewModel 타입으로 비동기 화면 전환 (파라미터 포함)
    /// </summary>
    /// <returns>네비게이션 성공 여부</returns>
    Task<bool> NavigateToAsync<TViewModel>(object? parameter, CancellationToken cancellationToken = default)
        where TViewModel : class;

    /// <summary>
    ///     이전 화면으로 이동
    /// </summary>
    /// <returns>네비게이션 성공 여부</returns>
    Task<bool> GoBackAsync(CancellationToken cancellationToken = default);

    /// <summary>
    ///     다음 화면으로 이동 (뒤로 간 후 앞으로)
    /// </summary>
    /// <returns>네비게이션 성공 여부</returns>
    Task<bool> GoForwardAsync(CancellationToken cancellationToken = default);

    #endregion

    #region 레거시 동기 메서드 (호환성)

    /// <summary>
    ///     [레거시] 동기 네비게이션
    /// </summary>
    [Obsolete("Use NavigateToAsync instead")]
    void NavigateTo<TViewModel>() where TViewModel : class;

    /// <summary>
    ///     [레거시] 동기 네비게이션 (파라미터 포함)
    /// </summary>
    [Obsolete("Use NavigateToAsync instead")]
    void NavigateTo<TViewModel>(object parameter) where TViewModel : class;

    #endregion
}
