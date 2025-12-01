using System;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Dialog;

namespace Jinobald.Sample.Avalonia.ViewModels.Dialogs;

/// <summary>
///     메시지 다이얼로그 ViewModel
///     간단한 메시지를 표시하고 확인 버튼으로 닫을 수 있습니다.
/// </summary>
public partial class MessageDialogViewModel : ViewModelBase, IDialogAware
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

    #region IDialogAware 구현

    public event Action<IDialogResult>? RequestClose;

    public void OnDialogOpened(IDialogParameters parameters)
    {
        // 파라미터로부터 Title, Message, MessageType을 가져옵니다
        Title = parameters.GetValue<string>("Title") ?? "알림";
        Message = parameters.GetValue<string>("Message") ?? "";
        MessageType = parameters.GetValue<string>("MessageType") ?? "Info";
    }

    public bool CanCloseDialog() => true;

    public void OnDialogClosed()
    {
        // 정리 작업이 필요한 경우 여기에 구현
    }

    #endregion

    [RelayCommand]
    private void Close()
    {
        var result = new DialogResult();
        RequestClose?.Invoke(result);
    }
}
