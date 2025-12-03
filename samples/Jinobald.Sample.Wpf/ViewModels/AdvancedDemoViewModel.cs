using System;
using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Commands;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Dialog;
using Jinobald.Core.Services.Events;
using Jinobald.Core.Services.Regions;
using Jinobald.Sample.Wpf.Events;
using Jinobald.Sample.Wpf.Views.Dialogs;

namespace Jinobald.Sample.Wpf.ViewModels;

/// <summary>
///     Advanced Features 데모 ViewModel
///     새로 추가된 기능들을 시연합니다:
///     - ValidatableViewModelBase (INotifyDataErrorInfo)
///     - CompositeCommand
///     - Event Filter & Weak Event
///     - IConfirmNavigationRequest
///     - Generic IDialogResult{T}
///     - IRegionMemberLifetime
/// </summary>
public partial class AdvancedDemoViewModel : ValidatableViewModelBase,
    INavigationAware,
    IConfirmNavigationRequestAsync,
    IRegionMemberLifetime
{
    private readonly IDialogService _dialogService;
    private readonly IEventAggregator _eventAggregator;

    /// <summary>
    ///     속성 설정과 동시에 검증 수행
    /// </summary>
    private bool SetPropertyAndValidate<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
    {
        if (!SetProperty(ref field, value, propertyName))
            return false;

        if (!string.IsNullOrEmpty(propertyName))
            ValidateProperty(value, propertyName);

        return true;
    }

    #region Validation Demo Properties

    private string _email = string.Empty;
    private string _username = string.Empty;
    private int _age;

    [Required(ErrorMessage = "이메일은 필수입니다")]
    [EmailAddress(ErrorMessage = "올바른 이메일 형식이 아닙니다")]
    public string Email
    {
        get => _email;
        set => SetPropertyAndValidate(ref _email, value);
    }

    [Required(ErrorMessage = "사용자명은 필수입니다")]
    [StringLength(20, MinimumLength = 2, ErrorMessage = "사용자명은 2-20자 사이여야 합니다")]
    public string Username
    {
        get => _username;
        set => SetPropertyAndValidate(ref _username, value);
    }

    [Range(1, 150, ErrorMessage = "나이는 1-150 사이여야 합니다")]
    public int Age
    {
        get => _age;
        set => SetPropertyAndValidate(ref _age, value);
    }

    #endregion

    #region CompositeCommand Demo

    /// <summary>
    ///     여러 개의 SaveCommand를 하나로 조합
    /// </summary>
    public CompositeCommand SaveAllCommand { get; }

    /// <summary>
    ///     개별 저장 명령 1
    /// </summary>
    public ICommand SaveProfileCommand { get; }

    /// <summary>
    ///     개별 저장 명령 2
    /// </summary>
    public ICommand SaveSettingsCommand { get; }

    [ObservableProperty]
    private string _compositeCommandLog = string.Empty;

    #endregion

    #region Event Filter Demo

    [ObservableProperty]
    private ObservableCollection<string> _eventLog = new();

    private SubscriptionToken? _allEventsToken;
    private SubscriptionToken? _filteredEventsToken;

    #endregion

    #region IConfirmNavigationRequest Demo

    [ObservableProperty]
    private bool _hasUnsavedChanges;

    #endregion

    #region IRegionMemberLifetime Demo

    [ObservableProperty]
    private bool _keepAliveEnabled = true;

    /// <summary>
    ///     IRegionMemberLifetime - Region에서 View 유지 여부
    /// </summary>
    public bool KeepAlive => KeepAliveEnabled;

    #endregion

    #region Generic DialogResult Demo

    [ObservableProperty]
    private string _selectedUserInfo = "선택된 사용자 없음";

    #endregion

    public AdvancedDemoViewModel(
        IDialogService dialogService,
        IEventAggregator eventAggregator)
    {
        _dialogService = dialogService;
        _eventAggregator = eventAggregator;

        // CompositeCommand 설정
        SaveAllCommand = new CompositeCommand();

        SaveProfileCommand = new RelayCommand(
            () => CompositeCommandLog += $"[{DateTime.Now:HH:mm:ss}] Profile 저장됨\n",
            () => !HasErrors);

        SaveSettingsCommand = new RelayCommand(
            () => CompositeCommandLog += $"[{DateTime.Now:HH:mm:ss}] Settings 저장됨\n",
            () => true);

        // CompositeCommand에 개별 명령 등록
        SaveAllCommand.RegisterCommand(SaveProfileCommand);
        SaveAllCommand.RegisterCommand(SaveSettingsCommand);

        // Event 구독 설정 - Weak Event (메모리 누수 방지)
        SetupEventSubscriptions();
    }

    private void SetupEventSubscriptions()
    {
        // 1. 모든 이벤트 구독 (Weak Reference - keepSubscriberReferenceAlive: false)
        _allEventsToken = _eventAggregator.Subscribe<CounterChangedEvent>(
            handler: e => EventLog.Add($"[All/Weak] Counter: {e.Count} from {e.Source}"),
            threadOption: ThreadOption.UIThread,
            keepSubscriberReferenceAlive: false);  // Weak Reference!

        // 2. 필터된 이벤트 구독 - 짝수만
        _filteredEventsToken = _eventAggregator.Subscribe<CounterChangedEvent>(
            handler: e => EventLog.Add($"[Even Only] Counter: {e.Count}"),
            filter: e => e.Count % 2 == 0,  // 짝수만 필터
            threadOption: ThreadOption.UIThread);
    }

    #region Commands

    [RelayCommand]
    private void ValidateAllFields()
    {
        ValidateAllProperties();
        HasUnsavedChanges = true;
    }

    [RelayCommand]
    private void ClearValidation()
    {
        ClearAllCustomErrors();
        Email = string.Empty;
        Username = string.Empty;
        Age = 0;
        HasUnsavedChanges = false;
    }

    [RelayCommand]
    private void PublishEvent()
    {
        var count = EventLog.Count + 1;
        _eventAggregator.Publish(new CounterChangedEvent
        {
            Count = count,
            Source = "AdvancedDemo"
        });
    }

    [RelayCommand]
    private void ClearEventLog()
    {
        EventLog.Clear();
    }

    [RelayCommand]
    private async Task ShowTypedDialog()
    {
        // Generic IDialogResult<T> 사용
        var result = await _dialogService.ShowDialogAsync<UserSelectDialogView>();

        if (result != null)
        {
            if (result.IsSuccess())
            {
                // 강타입 데이터 가져오기
                var user = result.GetData<UserInfo>();
                if (user != null)
                {
                    SelectedUserInfo = $"선택: {user.Name} ({user.Email})";
                }
            }
            else if (result.IsCancelled())
            {
                SelectedUserInfo = "선택 취소됨";
            }
        }
    }

    [RelayCommand]
    private void MarkAsChanged()
    {
        HasUnsavedChanges = true;
    }

    [RelayCommand]
    private void SaveChanges()
    {
        HasUnsavedChanges = false;
        CompositeCommandLog += $"[{DateTime.Now:HH:mm:ss}] 변경사항 저장됨\n";
    }

    #endregion

    #region IConfirmNavigationRequestAsync

    public async Task<bool> ConfirmNavigationRequestAsync(NavigationContext context)
    {
        if (!HasUnsavedChanges)
            return true;

        var parameters = new DialogParameters
        {
            { "Title", "저장되지 않은 변경사항" },
            { "Message", "저장하지 않은 변경사항이 있습니다.\n페이지를 떠나시겠습니까?" }
        };

        var result = await _dialogService.ShowDialogAsync<ConfirmDialogView>(parameters);
        return result?.Result == ButtonResult.Yes;
    }

    #endregion

    #region INavigationAware

    public Task<bool> OnNavigatingToAsync(NavigationContext context) => Task.FromResult(true);

    public Task OnNavigatedToAsync(NavigationContext context)
    {
        EventLog.Add($"[Navigation] AdvancedDemo로 이동됨");
        return Task.CompletedTask;
    }

    public Task<bool> OnNavigatingFromAsync(NavigationContext context) => Task.FromResult(true);

    public Task OnNavigatedFromAsync(NavigationContext context)
    {
        EventLog.Add($"[Navigation] AdvancedDemo에서 나감");
        return Task.CompletedTask;
    }

    #endregion

    #region IDisposable (ViewModelBase)

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            // 이벤트 구독 해제
            if (_allEventsToken != null)
                _eventAggregator.Unsubscribe(_allEventsToken);

            if (_filteredEventsToken != null)
                _eventAggregator.Unsubscribe(_filteredEventsToken);

            // CompositeCommand 정리
            SaveAllCommand.UnregisterCommand(SaveProfileCommand);
            SaveAllCommand.UnregisterCommand(SaveSettingsCommand);
        }

        base.Dispose(disposing);
    }

    #endregion
}

/// <summary>
///     사용자 정보 (Generic DialogResult 데모용)
/// </summary>
public class UserInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
