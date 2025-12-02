using Jinobald.Core.Services.Dialog;

namespace Jinobald.Core.Mvvm;

/// <summary>
///     모든 다이얼로그 ViewModel의 기본 클래스
/// </summary>
/// <typeparam name="TResult">다이얼로그 결과 타입</typeparam>
public abstract class DialogViewModelBase<TResult> : ViewModelBase, IDialogAware
{
    private TResult _result = default!;

    /// <summary>
    ///     다이얼로그 결과
    /// </summary>
    public TResult Result
    {
        get => _result;
        protected set => SetProperty(ref _result, value);
    }

    #region IDialogAware 구현

    /// <summary>
    ///     다이얼로그 닫기 요청 이벤트
    /// </summary>
    public event Action<IDialogResult>? RequestClose;

    /// <summary>
    ///     다이얼로그가 열렸을 때 호출됩니다.
    ///     파생 클래스에서 파라미터를 처리하려면 이 메서드를 오버라이드하세요.
    /// </summary>
    /// <param name="parameters">전달된 파라미터</param>
    public virtual void OnDialogOpened(IDialogParameters parameters)
    {
    }

    /// <summary>
    ///     다이얼로그를 닫을 수 있는지 확인합니다.
    ///     파생 클래스에서 닫기 조건을 추가하려면 이 메서드를 오버라이드하세요.
    /// </summary>
    public virtual bool CanCloseDialog() => true;

    /// <summary>
    ///     다이얼로그가 닫혔을 때 호출됩니다.
    ///     파생 클래스에서 정리 작업이 필요하면 이 메서드를 오버라이드하세요.
    /// </summary>
    public virtual void OnDialogClosed()
    {
    }

    #endregion

    /// <summary>
    ///     다이얼로그를 닫습니다.
    /// </summary>
    protected void Close()
    {
        CloseWithButtonResult(ButtonResult.None);
    }

    /// <summary>
    ///     버튼 결과와 함께 다이얼로그를 닫습니다.
    /// </summary>
    /// <param name="buttonResult">버튼 결과 (OK, Cancel 등)</param>
    protected void CloseWithButtonResult(ButtonResult buttonResult)
    {
        if (CanCloseDialog())
        {
            var dialogResult = new DialogResult(buttonResult);
            RequestClose?.Invoke(dialogResult);
        }
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

    /// <summary>
    ///     지정된 파라미터와 함께 다이얼로그를 닫습니다.
    /// </summary>
    /// <param name="buttonResult">버튼 결과</param>
    /// <param name="parameters">다이얼로그 결과 파라미터</param>
    protected void CloseWithParameters(ButtonResult buttonResult, IDialogParameters parameters)
    {
        if (CanCloseDialog())
        {
            var dialogResult = new DialogResult(buttonResult, parameters);
            RequestClose?.Invoke(dialogResult);
        }
    }

    /// <summary>
    ///     지정된 파라미터와 함께 다이얼로그를 닫습니다. (ButtonResult.None 사용)
    /// </summary>
    /// <param name="parameters">다이얼로그 결과 파라미터</param>
    protected void CloseWithParameters(IDialogParameters parameters)
    {
        CloseWithParameters(ButtonResult.None, parameters);
    }
}
