using Jinobald.Core.Services.Dialog;

namespace Jinobald.Core.Mvvm;

/// <summary>
///     모든 다이얼로그 ViewModel의 기본 클래스
/// </summary>
/// <typeparam name="TResult">다이얼로그 결과 타입</typeparam>
public abstract class DialogViewModelBase<TResult> : ViewModelBase, IDialogViewModel<TResult>
{
    private TResult _result = default!;

    /// <summary>
    ///     다이얼로그를 닫을 때 호출되는 액션
    ///     DialogService가 설정합니다.
    /// </summary>
    public Action? CloseRequested { get; set; }

    /// <summary>
    ///     다이얼로그 결과
    /// </summary>
    public TResult Result
    {
        get => _result;
        protected set => SetProperty(ref _result, value);
    }

    /// <summary>
    ///     다이얼로그를 닫습니다.
    /// </summary>
    protected void Close()
    {
        CloseRequested?.Invoke();
    }

    /// <summary>
    ///     결과를 설정하고 다이얼로그를 닫습니다.
    /// </summary>
    /// <param name="result">다이얼로그 결과</param>
    protected void CloseWithResult(TResult result)
    {
        Result = result;
        Close();
    }
}
