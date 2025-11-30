namespace Jinobald.Core.Services.Regions;

/// <summary>
///     애플리케이션 내 리전들을 관리하는 매니저 인터페이스
///     여러 리전을 생성하고 관리하며, 리전 기반 네비게이션을 지원합니다.
/// </summary>
public interface IRegionManager
{
    /// <summary>
    ///     등록된 모든 리전의 컬렉션
    /// </summary>
    IEnumerable<IRegion> Regions { get; }

    /// <summary>
    ///     지정된 이름의 리전을 생성하거나 가져옵니다.
    /// </summary>
    /// <param name="regionName">리전 이름</param>
    /// <returns>생성되거나 존재하는 리전</returns>
    IRegion CreateOrGetRegion(string regionName);

    /// <summary>
    ///     지정된 이름의 리전을 가져옵니다.
    /// </summary>
    /// <param name="regionName">리전 이름</param>
    /// <returns>리전 (없으면 null)</returns>
    IRegion? GetRegion(string regionName);

    /// <summary>
    ///     리전이 존재하는지 확인합니다.
    /// </summary>
    /// <param name="regionName">리전 이름</param>
    /// <returns>리전 존재 여부</returns>
    bool ContainsRegion(string regionName);

    /// <summary>
    ///     리전을 등록합니다.
    /// </summary>
    /// <param name="region">등록할 리전</param>
    void RegisterRegion(IRegion region);

    /// <summary>
    ///     리전을 제거합니다.
    /// </summary>
    /// <param name="regionName">제거할 리전 이름</param>
    /// <returns>제거 성공 여부</returns>
    bool RemoveRegion(string regionName);

    /// <summary>
    ///     지정된 리전에 뷰를 추가합니다.
    /// </summary>
    /// <param name="regionName">리전 이름</param>
    /// <param name="view">추가할 뷰</param>
    /// <returns>추가된 뷰</returns>
    object AddToRegion(string regionName, object view);

    /// <summary>
    ///     지정된 리전에 ViewModel 타입으로 뷰를 추가합니다.
    /// </summary>
    /// <param name="regionName">리전 이름</param>
    /// <typeparam name="TViewModel">ViewModel 타입</typeparam>
    /// <returns>추가된 뷰</returns>
    object AddToRegion<TViewModel>(string regionName) where TViewModel : class;

    /// <summary>
    ///     지정된 리전에서 뷰를 제거합니다.
    /// </summary>
    /// <param name="regionName">리전 이름</param>
    /// <param name="view">제거할 뷰</param>
    void RemoveFromRegion(string regionName, object view);

    /// <summary>
    ///     지정된 리전으로 네비게이션합니다.
    /// </summary>
    /// <param name="regionName">리전 이름</param>
    /// <typeparam name="TViewModel">네비게이션할 ViewModel 타입</typeparam>
    /// <param name="cancellationToken">취소 토큰</param>
    /// <returns>네비게이션 성공 여부</returns>
    Task<bool> NavigateAsync<TViewModel>(string regionName, CancellationToken cancellationToken = default)
        where TViewModel : class;

    /// <summary>
    ///     지정된 리전으로 네비게이션합니다 (파라미터 포함).
    /// </summary>
    /// <param name="regionName">리전 이름</param>
    /// <param name="parameter">네비게이션 파라미터</param>
    /// <typeparam name="TViewModel">네비게이션할 ViewModel 타입</typeparam>
    /// <param name="cancellationToken">취소 토큰</param>
    /// <returns>네비게이션 성공 여부</returns>
    Task<bool> NavigateAsync<TViewModel>(string regionName, object? parameter,
        CancellationToken cancellationToken = default)
        where TViewModel : class;

    /// <summary>
    ///     리전이 추가되었을 때 발생하는 이벤트
    /// </summary>
    event EventHandler<IRegion>? RegionAdded;

    /// <summary>
    ///     리전이 제거되었을 때 발생하는 이벤트
    /// </summary>
    event EventHandler<string>? RegionRemoved;
}
