using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Dialogs;

namespace Jinobald.Sample.Wpf.ViewModels.Dialogs;

/// <summary>
///     확인 다이얼로그 ViewModel
///     Yes/No 선택을 제공하는 다이얼로그입니다.
///     중첩 다이얼로그 데모에도 사용됩니다.
/// </summary>
public partial class ConfirmDialogViewModel : DialogViewModelBase
{
    private string _title = "확인";
    private string _message = "계속하시겠습니까?";

    public string Title
    {
        get => _title;
        set => SetProperty(ref _title, value);
    }

    public string Message
    {
        get => _message;
        set => SetProperty(ref _message, value);
    }

    /// <summary>
    ///     다이얼로그가 열렸을 때 호출됩니다.
    ///     파라미터로부터 Title, Message를 가져옵니다.
    /// </summary>
    public override void OnDialogOpened(IDialogParameters parameters)
    {
        Title = parameters.GetValue<string>("Title") ?? "확인";
        Message = parameters.GetValue<string>("Message") ?? "계속하시겠습니까?";
    }

    [RelayCommand]
    private void Yes()
    {
        CloseWithButtonResult(ButtonResult.Yes);
    }

    [RelayCommand]
    private void No()
    {
        CloseWithButtonResult(ButtonResult.No);
    }
}
