namespace Jinobald.Core.Services.Dialog;

/// <summary>
///     다이얼로그 표시 서비스
///     오버레이 기반의 인앱 다이얼로그를 표시합니다.
/// </summary>
public interface IDialogService
{
    /// <summary>
    ///     메시지 다이얼로그를 표시합니다. (확인 버튼만)
    /// </summary>
    Task ShowMessageAsync(string title, string message, DialogMessageType type = DialogMessageType.Info);

    /// <summary>
    ///     확인/취소 다이얼로그를 표시합니다.
    /// </summary>
    /// <param name="title">제목</param>
    /// <param name="message">메시지</param>
    /// <param name="confirmText">확인 버튼 텍스트 (기본: "확인")</param>
    /// <param name="cancelText">취소 버튼 텍스트 (기본: "취소")</param>
    /// <param name="isDestructive">위험한 작업 여부 (빨간색 강조)</param>
    /// <returns>확인 시 true, 취소 시 false</returns>
    Task<bool> ShowConfirmAsync(
        string title,
        string message,
        string confirmText = "확인",
        string cancelText = "취소",
        bool isDestructive = false);

    /// <summary>
    ///     선택 다이얼로그를 표시합니다.
    /// </summary>
    /// <typeparam name="T">선택 항목 타입</typeparam>
    /// <param name="title">제목</param>
    /// <param name="message">설명 메시지</param>
    /// <param name="options">선택 옵션들</param>
    /// <param name="displaySelector">표시 텍스트 선택자</param>
    /// <returns>선택된 항목 또는 null (취소 시)</returns>
    Task<T?> ShowSelectionAsync<T>(
        string title,
        string message,
        IEnumerable<T> options,
        Func<T, string> displaySelector) where T : class;

    /// <summary>
    ///     커스텀 다이얼로그를 표시합니다.
    /// </summary>
    /// <typeparam name="TResult">결과 타입</typeparam>
    /// <param name="view">다이얼로그 View</param>
    /// <param name="viewModel">다이얼로그 ViewModel</param>
    /// <returns>다이얼로그 결과</returns>
    Task<TResult> ShowCustomAsync<TResult>(object view, IDialogViewModel<TResult> viewModel);

    /// <summary>
    ///     현재 열린 다이얼로그를 닫습니다.
    /// </summary>
    void CloseDialog();
}

/// <summary>
///     메시지 다이얼로그 타입
/// </summary>
public enum DialogMessageType
{
    Info,
    Success,
    Warning,
    Error
}

/// <summary>
///     커스텀 다이얼로그 ViewModel 인터페이스
/// </summary>
public interface IDialogViewModel<TResult>
{
    /// <summary>
    ///     다이얼로그를 닫을 때 호출되는 액션
    ///     DialogService가 설정합니다.
    /// </summary>
    Action? CloseRequested { get; set; }

    /// <summary>
    ///     다이얼로그 결과
    /// </summary>
    TResult Result { get; }
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
