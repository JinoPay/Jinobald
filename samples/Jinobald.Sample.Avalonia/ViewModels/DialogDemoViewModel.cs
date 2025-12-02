using System.Threading.Tasks;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Dialog;
using Jinobald.Sample.Avalonia.Views.Dialogs;

namespace Jinobald.Sample.Avalonia.ViewModels;

public partial class DialogDemoViewModel : ViewModelBase
{
    private readonly IDialogService _dialogService;
    private string _lastDialogResult = "다이얼로그를 열어보세요!";

    public string Title => "Dialog Demo!";

    public string LastDialogResult
    {
        get => _lastDialogResult;
        set => SetProperty(ref _lastDialogResult, value);
    }

    public DialogDemoViewModel(IDialogService dialogService)
    {
        _dialogService = dialogService;
    }

    [RelayCommand]
    private async Task ShowInfoDialog()
    {
        var parameters = new DialogParameters
        {
            { "Title", "정보" },
            { "Message", "이것은 정보 메시지 다이얼로그입니다." },
            { "MessageType", "Info" }
        };

        var result = await _dialogService.ShowDialogAsync<MessageDialogView>(parameters);
        LastDialogResult = "정보 다이얼로그가 닫혔습니다.";
    }

    [RelayCommand]
    private async Task ShowSuccessDialog()
    {
        var parameters = new DialogParameters
        {
            { "Title", "성공" },
            { "Message", "작업이 성공적으로 완료되었습니다!" },
            { "MessageType", "Success" }
        };

        var result = await _dialogService.ShowDialogAsync<MessageDialogView>(parameters);
        LastDialogResult = "성공 다이얼로그가 닫혔습니다.";
    }

    [RelayCommand]
    private async Task ShowWarningDialog()
    {
        var parameters = new DialogParameters
        {
            { "Title", "경고" },
            { "Message", "주의가 필요한 상황입니다. 계속하시겠습니까?" },
            { "MessageType", "Warning" }
        };

        var result = await _dialogService.ShowDialogAsync<MessageDialogView>(parameters);
        LastDialogResult = "경고 다이얼로그가 닫혔습니다.";
    }

    [RelayCommand]
    private async Task ShowErrorDialog()
    {
        var parameters = new DialogParameters
        {
            { "Title", "오류" },
            { "Message", "예기치 않은 오류가 발생했습니다. 나중에 다시 시도해주세요." },
            { "MessageType", "Error" }
        };

        var result = await _dialogService.ShowDialogAsync<MessageDialogView>(parameters);
        LastDialogResult = "오류 다이얼로그가 닫혔습니다.";
    }
}
