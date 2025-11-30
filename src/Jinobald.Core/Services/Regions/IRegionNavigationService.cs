namespace Jinobald.Core.Services.Regions;

/// <summary>
///     리전 내에서 네비게이션을 담당하는 서비스 인터페이스
///     특정 리전 내에서 뷰 간 전환을 관리합니다.
/// </summary>
public interface IRegionNavigationService
{
    /// <summary>
    ///     이 네비게이션 서비스가 속한 리전
    /// </summary>
    IRegion Region { get; }

    /// <summary>
    ///     현재 표시 중인 View
    /// </summary>
    object? CurrentView { get; }

    /// <summary>
    ///     현재 ViewModel
    /// </summary>
    object? CurrentViewModel { get; }

    /// <summary>
    ///     지정된 ViewModel 타입으로 네비게이션
    /// </summary>
    /// <typeparam name="TViewModel">ViewModel 타입</typeparam>
    /// <param name="cancellationToken">취소 토큰</param>
    /// <returns>네비게이션 성공 여부</returns>
    Task<bool> NavigateAsync<TViewModel>(CancellationToken cancellationToken = default)
        where TViewModel : class;

    /// <summary>
    ///     지정된 ViewModel 타입으로 네비게이션 (파라미터 포함)
    /// </summary>
    /// <typeparam name="TViewModel">ViewModel 타입</typeparam>
    /// <param name="parameter">네비게이션 파라미터</param>
    /// <param name="cancellationToken">취소 토큰</param>
    /// <returns>네비게이션 성공 여부</returns>
    Task<bool> NavigateAsync<TViewModel>(object? parameter, CancellationToken cancellationToken = default)
        where TViewModel : class;

    /// <summary>
    ///     현재 뷰를 리전에서 제거
    /// </summary>
    void ClearCurrentView();
}
