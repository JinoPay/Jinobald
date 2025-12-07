using System.Threading.Tasks;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Dialogs;
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
        LastDialogResult = result != null
            ? $"오류 다이얼로그 닫힘 - 결과: {result.Result}"
            : "오류 다이얼로그 닫힘 - 결과 없음";
    }

    [RelayCommand]
    private async Task ShowConfirmDialog()
    {
        var parameters = new DialogParameters
        {
            { "Title", "확인" },
            { "Message", "이 작업을 계속하시겠습니까?" }
        };

        var result = await _dialogService.ShowDialogAsync<ConfirmDialogView>(parameters);

        if (result?.Result == ButtonResult.Yes)
        {
            LastDialogResult = "확인 다이얼로그 - '예' 선택됨";
        }
        else if (result?.Result == ButtonResult.No)
        {
            LastDialogResult = "확인 다이얼로그 - '아니오' 선택됨";
        }
        else
        {
            LastDialogResult = "확인 다이얼로그 닫힘 - 결과 없음";
        }
    }

    [RelayCommand]
    private async Task ShowNestedDialog()
    {
        // 첫 번째 다이얼로그 표시
        var parameters1 = new DialogParameters
        {
            { "Title", "첫 번째 다이얼로그" },
            { "Message", "이것은 첫 번째 다이얼로그입니다.\n이제 두 번째 다이얼로그를 열어볼까요?" },
            { "MessageType", "Info" }
        };

        LastDialogResult = "첫 번째 다이얼로그 열림...";
        var result1 = await _dialogService.ShowDialogAsync<MessageDialogView>(parameters1);

        if (result1?.Result == ButtonResult.OK)
        {
            // 두 번째 다이얼로그 표시 (중첩)
            var parameters2 = new DialogParameters
            {
                { "Title", "중첩된 다이얼로그" },
                { "Message", "이것은 중첩된 두 번째 다이얼로그입니다!\n첫 번째 다이얼로그 위에 표시됩니다." },
                { "MessageType", "Success" }
            };

            LastDialogResult = "두 번째 다이얼로그 열림 (중첩)...";
            var result2 = await _dialogService.ShowDialogAsync<MessageDialogView>(parameters2);

            LastDialogResult = $"중첩 다이얼로그 데모 완료!\n첫 번째: {result1.Result}, 두 번째: {result2?.Result}";
        }
        else
        {
            LastDialogResult = "첫 번째 다이얼로그에서 취소됨";
        }
    }

    [RelayCommand]
    private async Task ShowNestedTestDialog()
    {
        var parameters = new DialogParameters
        {
            { "Title", "중첩 테스트 다이얼로그" },
            { "Message", "이 다이얼로그 내부에서 새 다이얼로그를 계속 열 수 있습니다." },
            { "Level", 1 }
        };

        var result = await _dialogService.ShowDialogAsync<NestedTestDialogView>(parameters);
        LastDialogResult = "중첩 테스트 다이얼로그가 닫혔습니다.";
    }
}
