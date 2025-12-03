using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Dialog;
using Jinobald.Sample.Wpf.ViewModels;

namespace Jinobald.Sample.Wpf.ViewModels.Dialogs;

/// <summary>
///     사용자 선택 다이얼로그 ViewModel
///     Generic IDialogResult{T}를 사용하여 강타입 결과를 반환합니다.
/// </summary>
public partial class UserSelectDialogViewModel : DialogViewModelBase
{
    [ObservableProperty]
    private ObservableCollection<UserInfo> _users = new();

    [ObservableProperty]
    private UserInfo? _selectedUser;

    public override void OnDialogOpened(IDialogParameters parameters)
    {
        // 샘플 사용자 데이터 로드
        Users = new ObservableCollection<UserInfo>
        {
            new() { Id = 1, Name = "홍길동", Email = "hong@example.com" },
            new() { Id = 2, Name = "김철수", Email = "kim@example.com" },
            new() { Id = 3, Name = "이영희", Email = "lee@example.com" },
            new() { Id = 4, Name = "박민수", Email = "park@example.com" },
            new() { Id = 5, Name = "정수진", Email = "jung@example.com" }
        };
    }

    [RelayCommand]
    private void Confirm()
    {
        if (SelectedUser != null)
        {
            // Parameters를 통해 선택된 사용자 전달
            var parameters = new DialogParameters();
            parameters.Add("SelectedUser", SelectedUser);
            CloseWithParameters(ButtonResult.OK, parameters);
        }
    }

    [RelayCommand]
    private void Cancel()
    {
        CloseWithButtonResult(ButtonResult.Cancel);
    }
}
