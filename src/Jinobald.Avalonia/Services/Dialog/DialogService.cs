using Avalonia.Threading;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Services.Dialog;
using Serilog;

namespace Jinobald.Avalonia.Services.Dialog;

/// <summary>
///     Avalonia 다이얼로그 서비스 구현
///     in-window overlay 방식으로 다이얼로그를 표시합니다.
/// </summary>
public class DialogService : IDialogService
{
    private readonly ILogger _logger;
    private IDialogHost? _dialogHost;
    private TaskCompletionSource<object?>? _currentDialogTcs;

    public DialogService(ILogger logger)
    {
        _logger = logger.ForContext<DialogService>();
    }

    /// <summary>
    ///     다이얼로그 호스트를 등록합니다.
    ///     MainWindow 또는 Shell에서 호출해야 합니다.
    /// </summary>
    public void RegisterHost(IDialogHost host)
    {
        _dialogHost = host ?? throw new ArgumentNullException(nameof(host));
        _logger.Information("다이얼로그 호스트 등록 완료");
    }

    /// <inheritdoc />
    public async Task ShowMessageAsync(string title, string message, DialogMessageType type = DialogMessageType.Info)
    {
        _logger.Debug("메시지 다이얼로그 표시: {Title}, Type={Type}", title, type);

        var viewModel = new MessageDialogViewModel(title, message, type);
        var view = new MessageDialogView { DataContext = viewModel };

        await ShowDialogInternalAsync(view, viewModel);
    }

    /// <inheritdoc />
    public async Task<bool> ShowConfirmAsync(
        string title,
        string message,
        string confirmText = "확인",
        string cancelText = "취소",
        bool isDestructive = false)
    {
        _logger.Debug("확인 다이얼로그 표시: {Title}", title);

        var viewModel = new ConfirmDialogViewModel(title, message, confirmText, cancelText, isDestructive);
        var view = new ConfirmDialogView { DataContext = viewModel };

        var result = await ShowDialogInternalAsync(view, viewModel);
        return result is bool boolResult && boolResult;
    }

    /// <inheritdoc />
    public async Task<T?> ShowSelectionAsync<T>(
        string title,
        string message,
        IEnumerable<T> options,
        Func<T, string> displaySelector) where T : class
    {
        _logger.Debug("선택 다이얼로그 표시: {Title}", title);

        var viewModel = new SelectionDialogViewModel<T>(title, message, options, displaySelector);
        var view = new SelectionDialogView { DataContext = viewModel };

        var result = await ShowDialogInternalAsync(view, viewModel);
        return result as T;
    }

    /// <inheritdoc />
    public async Task<TResult> ShowCustomAsync<TResult>(object view, IDialogViewModel<TResult> viewModel)
    {
        _logger.Debug("커스텀 다이얼로그 표시: {ViewType}", view.GetType().Name);

        var result = await ShowDialogInternalAsync(view, viewModel);
        return result is TResult typedResult ? typedResult : default!;
    }

    /// <inheritdoc />
    public void CloseDialog()
    {
        if (_dialogHost == null)
        {
            _logger.Warning("다이얼로그 호스트가 등록되지 않음");
            return;
        }

        Dispatcher.UIThread.Post(() =>
        {
            _dialogHost.IsDialogOpen = false;
            _dialogHost.DialogContent = null;
            _currentDialogTcs?.TrySetResult(null);
            _currentDialogTcs = null;
        });

        _logger.Debug("다이얼로그 닫힘");
    }

    /// <summary>
    ///     다이얼로그를 내부적으로 표시하고 결과를 대기합니다.
    /// </summary>
    private async Task<object?> ShowDialogInternalAsync<TResult>(object view, IDialogViewModel<TResult> viewModel)
    {
        if (_dialogHost == null)
        {
            _logger.Error("다이얼로그 호스트가 등록되지 않음");
            throw new InvalidOperationException("다이얼로그 호스트가 등록되지 않았습니다. RegisterHost()를 먼저 호출하세요.");
        }

        // 이미 열린 다이얼로그가 있으면 닫기
        if (_dialogHost.IsDialogOpen)
        {
            _logger.Warning("이미 열린 다이얼로그가 있어 닫습니다");
            CloseDialog();
            await Task.Delay(100); // UI 업데이트 대기
        }

        // TaskCompletionSource 생성
        _currentDialogTcs = new TaskCompletionSource<object?>();

        // ViewModel에 Close 액션 설정
        viewModel.CloseRequested = () =>
        {
            var result = viewModel.Result;
            CloseDialog();
            _currentDialogTcs.TrySetResult(result);
        };

        // UI 쓰레드에서 다이얼로그 표시
        await Dispatcher.UIThread.InvokeAsync(() =>
        {
            _dialogHost.DialogContent = view;
            _dialogHost.IsDialogOpen = true;
        });

        // 다이얼로그가 닫힐 때까지 대기
        var taskResult = await _currentDialogTcs.Task;
        return taskResult;
    }
}

/// <summary>
///     메시지 다이얼로그 ViewModel
/// </summary>
internal class MessageDialogViewModel : Core.Mvvm.DialogViewModelBase<bool>
{
    public string Title { get; }
    public string Message { get; }
    public DialogMessageType Type { get; }
    public IRelayCommand OnConfirmCommand { get; }

    public MessageDialogViewModel(string title, string message, DialogMessageType type)
    {
        Title = title;
        Message = message;
        Type = type;
        Result = true; // 확인 버튼만 있으므로 항상 true

        OnConfirmCommand = new RelayCommand(OnConfirm);
    }

    private void OnConfirm()
    {
        CloseWithResult(true);
    }
}

/// <summary>
///     확인/취소 다이얼로그 ViewModel
/// </summary>
internal class ConfirmDialogViewModel : Core.Mvvm.DialogViewModelBase<bool>
{
    public string Title { get; }
    public string Message { get; }
    public string ConfirmText { get; }
    public string CancelText { get; }
    public bool IsDestructive { get; }
    public IRelayCommand OnConfirmCommand { get; }
    public IRelayCommand OnCancelCommand { get; }

    public ConfirmDialogViewModel(
        string title,
        string message,
        string confirmText,
        string cancelText,
        bool isDestructive)
    {
        Title = title;
        Message = message;
        ConfirmText = confirmText;
        CancelText = cancelText;
        IsDestructive = isDestructive;

        OnConfirmCommand = new RelayCommand(OnConfirm);
        OnCancelCommand = new RelayCommand(OnCancel);
    }

    private void OnConfirm()
    {
        CloseWithResult(true);
    }

    private void OnCancel()
    {
        CloseWithResult(false);
    }
}

/// <summary>
///     선택 다이얼로그 ViewModel
/// </summary>
internal class SelectionDialogViewModel<T> : Core.Mvvm.DialogViewModelBase<T?> where T : class
{
    public string Title { get; }
    public string Message { get; }
    public IEnumerable<SelectionItem<T>> Items { get; }
    public IRelayCommand OnConfirmCommand { get; }
    public IRelayCommand OnCancelCommand { get; }

    private SelectionItem<T>? _selectedItem;
    public SelectionItem<T>? SelectedItem
    {
        get => _selectedItem;
        set => SetProperty(ref _selectedItem, value);
    }

    public SelectionDialogViewModel(
        string title,
        string message,
        IEnumerable<T> options,
        Func<T, string> displaySelector)
    {
        Title = title;
        Message = message;
        Items = options.Select(o => new SelectionItem<T>(o, displaySelector(o))).ToList();

        OnConfirmCommand = new RelayCommand(OnConfirm);
        OnCancelCommand = new RelayCommand(OnCancel);
    }

    private void OnConfirm()
    {
        CloseWithResult(SelectedItem?.Value);
    }

    private void OnCancel()
    {
        CloseWithResult(null);
    }
}

/// <summary>
///     선택 항목 래퍼
/// </summary>
internal class SelectionItem<T>
{
    public T Value { get; }
    public string DisplayText { get; }

    public SelectionItem(T value, string displayText)
    {
        Value = value;
        DisplayText = displayText;
    }
}
