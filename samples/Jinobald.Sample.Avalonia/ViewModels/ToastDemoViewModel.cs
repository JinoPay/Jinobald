using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Toast;

namespace Jinobald.Sample.Avalonia.ViewModels;

public partial class ToastDemoViewModel : ViewModelBase
{
    private readonly IToastService _toastService;
    private int _toastCounter;

    public string Title => "Toast Demo!";

    public ToastDemoViewModel(IToastService toastService)
    {
        _toastService = toastService;
    }

    [RelayCommand]
    private void ShowSuccessToast()
    {
        _toastCounter++;
        _toastService.ShowSuccess($"작업이 성공적으로 완료되었습니다! (#{_toastCounter})");
    }

    [RelayCommand]
    private void ShowInfoToast()
    {
        _toastCounter++;
        _toastService.ShowInfo($"이것은 정보 메시지입니다. (#{_toastCounter})");
    }

    [RelayCommand]
    private void ShowWarningToast()
    {
        _toastCounter++;
        _toastService.ShowWarning($"주의가 필요한 상황입니다. (#{_toastCounter})");
    }

    [RelayCommand]
    private void ShowErrorToast()
    {
        _toastCounter++;
        _toastService.ShowError($"예기치 않은 오류가 발생했습니다. (#{_toastCounter})");
    }

    [RelayCommand]
    private void ShowLongToast()
    {
        _toastCounter++;
        _toastService.ShowInfo(
            "이것은 긴 메시지를 가진 토스트입니다. 여러 줄에 걸쳐 표시될 수 있으며, " +
            "사용자에게 상세한 정보를 제공할 때 유용합니다. " +
            $"(#{_toastCounter})",
            "긴 메시지",
            5);
    }

    [RelayCommand]
    private void ShowMultipleToasts()
    {
        _toastService.ShowSuccess("첫 번째 토스트");
        _toastService.ShowInfo("두 번째 토스트");
        _toastService.ShowWarning("세 번째 토스트");
        _toastService.ShowError("네 번째 토스트");
    }

    [RelayCommand]
    private void ClearAllToasts()
    {
        _toastService.ClearAll();
        _toastCounter = 0;
    }
}
