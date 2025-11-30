namespace Jinobald.Core.Services.Regions;

/// <summary>
///     ViewModel 타입에서 View를 생성하는 인터페이스
///     플랫폼별로 구현됩니다 (WPF, Avalonia).
/// </summary>
public interface IViewResolver
{
    /// <summary>
    ///     ViewModel 타입에서 View 타입을 추론합니다.
    /// </summary>
    /// <param name="viewModelType">ViewModel 타입</param>
    /// <returns>View 타입 (없으면 null)</returns>
    Type? ResolveViewType(Type viewModelType);

    /// <summary>
    ///     ViewModel에 대한 View를 생성하고 DataContext를 바인딩합니다.
    /// </summary>
    /// <param name="viewModelType">ViewModel 타입</param>
    /// <param name="viewModel">ViewModel 인스턴스</param>
    /// <returns>생성된 View</returns>
    object ResolveView(Type viewModelType, object viewModel);
}
