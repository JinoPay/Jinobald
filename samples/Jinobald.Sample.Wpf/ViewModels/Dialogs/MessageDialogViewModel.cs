using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Dialog;

namespace Jinobald.Sample.Wpf.ViewModels.Dialogs;

/// <summary>
///     메시지 다이얼로그 ViewModel
///     간단한 메시지를 표시하고 확인 버튼으로 닫을 수 있습니다.
/// </summary>
public partial class MessageDialogViewModel : DialogViewModelBase
{
    private string _title = "알림";
    private string _message = "";
    private string _messageType = "Info"; // Info, Success, Warning, Error

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

    public string MessageType
    {
        get => _messageType;
        set => SetProperty(ref _messageType, value);
    }

    /// <summary>
    ///     다이얼로그가 열렸을 때 호출됩니다.
    ///     파라미터로부터 Title, Message, MessageType을 가져옵니다.
    /// </summary>
    public override void OnDialogOpened(IDialogParameters parameters)
    {
        Title = parameters.GetValue<string>("Title") ?? "알림";
        Message = parameters.GetValue<string>("Message") ?? "";
        MessageType = parameters.GetValue<string>("MessageType") ?? "Info";
    }

    [RelayCommand]
    private void Ok()
    {
        CloseWithButtonResult(ButtonResult.OK);
    }

    [RelayCommand]
    private void Cancel()
    {
        CloseWithButtonResult(ButtonResult.Cancel);
    }
}
