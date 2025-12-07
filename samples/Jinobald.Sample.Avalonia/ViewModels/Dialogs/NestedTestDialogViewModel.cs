using System.Threading.Tasks;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Dialogs;
using Jinobald.Sample.Avalonia.Views.Dialogs;

namespace Jinobald.Sample.Avalonia.ViewModels.Dialogs;

/// <summary>
///     중첩 다이얼로그 테스트용 ViewModel
///     다이얼로그 내부에서 다른 다이얼로그를 호출할 수 있습니다.
/// </summary>
public partial class NestedTestDialogViewModel : DialogViewModelBase
{
    private readonly IDialogService _dialogService;
    private string _title = "중첩 다이얼로그 테스트";
    private string _message = "이 다이얼로그에서 새 다이얼로그를 열 수 있습니다.";
    private int _level = 1;

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

    public int Level
    {
        get => _level;
        set => SetProperty(ref _level, value);
    }

    public NestedTestDialogViewModel(IDialogService dialogService)
    {
        _dialogService = dialogService;
    }

    /// <summary>
    ///     다이얼로그가 열렸을 때 호출됩니다.
    /// </summary>
    public override void OnDialogOpened(IDialogParameters parameters)
    {
        Title = parameters.GetValue<string>("Title") ?? "중첩 다이얼로그 테스트";
        Message = parameters.GetValue<string>("Message") ?? "이 다이얼로그에서 새 다이얼로그를 열 수 있습니다.";
        Level = parameters.GetValue<int>("Level");

        if (Level == 0)
            Level = 1;
    }

    [RelayCommand]
    private async Task OpenNestedDialog()
    {
        var parameters = new DialogParameters
        {
            { "Title", $"중첩 레벨 {Level + 1}" },
            { "Message", $"이것은 {Level + 1}번째 레벨 다이얼로그입니다.\n계속 중첩해서 열 수 있습니다." },
            { "Level", Level + 1 }
        };

        await _dialogService.ShowDialogAsync<NestedTestDialogView>(parameters);
    }

    [RelayCommand]
    private void CloseDialog()
    {
        CloseWithButtonResult(ButtonResult.OK);
    }
}
