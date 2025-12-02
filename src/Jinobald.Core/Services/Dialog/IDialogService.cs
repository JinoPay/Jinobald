namespace Jinobald.Core.Services.Dialog;

/// <summary>
///     다이얼로그 표시 서비스
///     오버레이 기반의 in-window 다이얼로그를 표시합니다.
///     View-First 방식으로 동작합니다.
/// </summary>
public interface IDialogService
{
    /// <summary>
    ///     다이얼로그를 표시합니다. (View-First)
    ///     ViewModel은 ViewModelLocator를 통해 자동으로 resolve됩니다.
    /// </summary>
    /// <typeparam name="TView">다이얼로그 View 타입</typeparam>
    /// <param name="parameters">다이얼로그에 전달할 파라미터</param>
    /// <returns>다이얼로그 결과</returns>
    Task<IDialogResult?> ShowDialogAsync<TView>(IDialogParameters? parameters = null);

    /// <summary>
    ///     다이얼로그를 표시합니다. (View 타입으로)
    /// </summary>
    /// <param name="viewType">다이얼로그 View 타입</param>
    /// <param name="parameters">다이얼로그에 전달할 파라미터</param>
    /// <returns>다이얼로그 결과</returns>
    Task<IDialogResult?> ShowDialogAsync(Type viewType, IDialogParameters? parameters = null);
}

/// <summary>
///     다이얼로그 ViewModel 인터페이스
/// </summary>
public interface IDialogAware
{
    /// <summary>
    ///     다이얼로그가 열렸을 때 호출됩니다.
    /// </summary>
    /// <param name="parameters">전달된 파라미터</param>
    void OnDialogOpened(IDialogParameters parameters);

    /// <summary>
    ///     다이얼로그를 닫을 수 있는지 확인합니다.
    /// </summary>
    bool CanCloseDialog();

    /// <summary>
    ///     다이얼로그가 닫혔을 때 호출됩니다.
    /// </summary>
    void OnDialogClosed();

    /// <summary>
    ///     다이얼로그 닫기 요청 이벤트
    /// </summary>
    event Action<IDialogResult>? RequestClose;
}

/// <summary>
///     다이얼로그 파라미터
/// </summary>
public interface IDialogParameters
{
    void Add(string key, object value);
    T? GetValue<T>(string key);
    bool ContainsKey(string key);
}

/// <summary>
///     다이얼로그 결과
/// </summary>
public interface IDialogResult
{
    IDialogParameters Parameters { get; }
}

/// <summary>
///     다이얼로그 호스트 인터페이스
///     DialogService가 다이얼로그를 표시할 컨테이너
/// </summary>
public interface IDialogHost
{
    bool IsDialogOpen { get; set; }
    object? DialogContent { get; set; }
}
