using Avalonia.Controls;
using Avalonia.Threading;
using Jinobald.Avalonia.Mvvm;
using Jinobald.Core.Ioc;
using Jinobald.Core.Services.Dialog;
using Microsoft.Extensions.DependencyInjection;
using Serilog;

namespace Jinobald.Avalonia.Services.Dialog;

/// <summary>
///     Avalonia 다이얼로그 서비스 구현
///     in-window overlay 방식으로 다이얼로그를 표시합니다.
///     View-First 방식으로 동작합니다.
/// </summary>
public class DialogService : IDialogService
{
    private readonly ILogger _logger;
    private IDialogHost? _dialogHost;
    private TaskCompletionSource<IDialogResult?>? _currentDialogTcs;

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
    public Task<IDialogResult?> ShowDialogAsync<TView>(IDialogParameters? parameters = null)
    {
        return ShowDialogAsync(typeof(TView), parameters);
    }

    /// <inheritdoc />
    public async Task<IDialogResult?> ShowDialogAsync(Type viewType, IDialogParameters? parameters = null)
    {
        _logger.Debug("다이얼로그 표시: {ViewType}", viewType.Name);

        // View 생성 (DI 우선, 없으면 ActivatorUtilities로 생성)
        var view = ResolveOrCreate(viewType);
        if (view == null)
        {
            _logger.Error("View를 생성할 수 없습니다: {ViewType}", viewType.Name);
            return null;
        }

        // ViewModel 타입 추론 (View-First)
        var viewModelType = ViewModelLocator.ResolveViewModelType(viewType);
        if (viewModelType == null)
        {
            _logger.Error("ViewModel 타입을 찾을 수 없습니다: {ViewType}", viewType.Name);
            return null;
        }

        // ViewModel 생성 (DI 우선, 없으면 ActivatorUtilities로 생성)
        var viewModel = ResolveOrCreate(viewModelType) as IDialogAware;
        if (viewModel == null)
        {
            _logger.Error("ViewModel을 생성할 수 없거나 IDialogAware를 구현하지 않았습니다: {ViewModelType}", viewModelType.Name);
            return null;
        }

        return await ShowDialogInternalAsync(view, viewModel, parameters);
    }

    private async Task<IDialogResult?> ShowDialogInternalAsync(object view, IDialogAware viewModel, IDialogParameters? parameters)
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
            CloseDialogInternal();
            await Task.Delay(100); // UI 업데이트 대기
        }

        // TaskCompletionSource 생성
        _currentDialogTcs = new TaskCompletionSource<IDialogResult?>();

        // ViewModel에 이벤트 연결
        viewModel.RequestClose += OnRequestClose;

        // ViewModel의 OnDialogOpened 호출 (전달받은 parameters 사용)
        viewModel.OnDialogOpened(parameters ?? new DialogParameters());

        // UI 쓰레드에서 다이얼로그 표시
        await Dispatcher.UIThread.InvokeAsync(() =>
        {
            if (view is Control control)
            {
                control.DataContext = viewModel;
            }

            _dialogHost.DialogContent = view;
            _dialogHost.IsDialogOpen = true;
        });

        // 다이얼로그가 닫힐 때까지 대기
        var result = await _currentDialogTcs.Task;
        return result;
    }

    private void OnRequestClose(IDialogResult result)
    {
        if (_dialogHost == null || _currentDialogTcs == null)
            return;

        // ViewModel의 CanCloseDialog 확인
        var viewModel = (_dialogHost.DialogContent as Control)?.DataContext as IDialogAware;
        if (viewModel != null && !viewModel.CanCloseDialog())
        {
            _logger.Debug("다이얼로그를 닫을 수 없습니다");
            return;
        }

        // 다이얼로그 닫기
        Dispatcher.UIThread.Post(() =>
        {
            viewModel?.OnDialogClosed();
            if (viewModel != null)
            {
                viewModel.RequestClose -= OnRequestClose;
            }

            _dialogHost.IsDialogOpen = false;
            _dialogHost.DialogContent = null;
            _currentDialogTcs.TrySetResult(result);
            _currentDialogTcs = null;
        });

        _logger.Debug("다이얼로그 닫힘");
    }

    private void CloseDialogInternal()
    {
        if (_dialogHost == null)
            return;

        var viewModel = (_dialogHost.DialogContent as Control)?.DataContext as IDialogAware;
        if (viewModel != null)
        {
            viewModel.OnDialogClosed();
            viewModel.RequestClose -= OnRequestClose;
        }

        Dispatcher.UIThread.Post(() =>
        {
            _dialogHost.IsDialogOpen = false;
            _dialogHost.DialogContent = null;
            _currentDialogTcs?.TrySetResult(null);
            _currentDialogTcs = null;
        });
    }

    /// <summary>
    ///     DI 컨테이너에서 먼저 resolve를 시도하고, 등록되지 않은 경우 ActivatorUtilities로 생성합니다.
    /// </summary>
    private static T? ResolveOrCreate<T>() where T : class
    {
        return ResolveOrCreate(typeof(T)) as T;
    }

    /// <summary>
    ///     DI 컨테이너에서 먼저 resolve를 시도하고, 등록되지 않은 경우 ActivatorUtilities로 생성합니다.
    /// </summary>
    private static object? ResolveOrCreate(Type type)
    {
        var serviceProvider = (IServiceProvider)ContainerLocator.Current.Instance;

        // DI에서 먼저 시도
        var service = serviceProvider.GetService(type);
        if (service != null)
            return service;

        // DI에 없으면 ActivatorUtilities로 생성 (생성자 의존성 주입 지원)
        return ActivatorUtilities.CreateInstance(serviceProvider, type);
    }
}
