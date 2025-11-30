using Avalonia.Controls;
using Avalonia.Threading;
using Jinobald.Avalonia.Mvvm;
using Jinobald.Core.Ioc;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Navigation;

namespace Jinobald.Avalonia.Services.Navigation;

/// <summary>
///     네비게이션 히스토리 엔트리
/// </summary>
internal sealed class NavigationEntry
{
    public object? Parameter { get; init; }
    public required Type ViewModelType { get; init; }
    public required Type ViewType { get; init; }
}

/// <summary>
///     DI 기반 네비게이션 서비스 구현
///     비동기 네비게이션, 히스토리, Guard, 생명주기 관리 지원
///     ContainerLocator를 통해 뷰와 뷰모델을 해결합니다.
/// </summary>
public sealed class NavigationService : INavigationService
{
    private readonly Stack<NavigationEntry> _backStack = new();
    private readonly Stack<NavigationEntry> _forwardStack = new();
    private readonly SemaphoreSlim _navigationLock = new(1, 1);
    private NavigationEntry? _currentEntry;

    private object? _currentView;

    #region 유틸리티

    public void ClearHistory()
    {
        _backStack.Clear();
        _forwardStack.Clear();
    }

    #endregion

    #region INavigationService Properties

    public object? CurrentView
    {
        get => _currentView;
        private set
        {
            if (_currentView != value)
            {
                _currentView = value;
                CurrentViewChanged?.Invoke(value);
            }
        }
    }

    public object? CurrentViewModel { get; private set; }

    public event Action<object?>? CurrentViewChanged;

    public bool IsNavigating { get; private set; }

    public bool CanGoBack => _backStack.Count > 0;
    public bool CanGoForward => _forwardStack.Count > 0;
    public int HistoryCount => _backStack.Count;

    #endregion

    #region 비동기 네비게이션

    public Task<bool> NavigateToAsync<TViewModel>(CancellationToken cancellationToken = default)
        where TViewModel : class
    {
        return NavigateToAsync<TViewModel>(null, cancellationToken);
    }

    public async Task<bool> NavigateToAsync<TViewModel>(object? parameter,
        CancellationToken cancellationToken = default)
        where TViewModel : class
    {
        return await NavigateInternalAsync(
            typeof(TViewModel),
            parameter,
            NavigationDirection.Forward,
            cancellationToken);
    }

    public async Task<bool> GoBackAsync(CancellationToken cancellationToken = default)
    {
        if (!CanGoBack) return false;

        var entry = _backStack.Peek();
        var success = await NavigateToEntryAsync(entry, NavigationDirection.Back, cancellationToken);

        if (success)
        {
            _backStack.Pop();
            if (_currentEntry != null) _forwardStack.Push(_currentEntry);
        }

        return success;
    }

    public async Task<bool> GoForwardAsync(CancellationToken cancellationToken = default)
    {
        if (!CanGoForward) return false;

        var entry = _forwardStack.Peek();
        var success = await NavigateToEntryAsync(entry, NavigationDirection.Forward, cancellationToken);

        if (success)
        {
            _forwardStack.Pop();
            if (_currentEntry != null) _backStack.Push(_currentEntry);
        }

        return success;
    }

    #endregion

    #region 레거시 동기 메서드

    [Obsolete("Use NavigateToAsync instead")]
    public void NavigateTo<TViewModel>() where TViewModel : class
    {
        _ = NavigateToAsync<TViewModel>();
    }

    [Obsolete("Use NavigateToAsync instead")]
    public void NavigateTo<TViewModel>(object parameter) where TViewModel : class
    {
        _ = NavigateToAsync<TViewModel>(parameter);
    }

    #endregion

    #region Private Methods

    private async Task<bool> NavigateInternalAsync(
        Type viewModelType,
        object? parameter,
        NavigationDirection direction,
        CancellationToken cancellationToken)
    {
        // 동시 네비게이션 방지
        if (!await _navigationLock.WaitAsync(TimeSpan.FromSeconds(5), cancellationToken))
        {
            return false;
        }

        // lock 외부에서도 사용할 변수들
        object? newViewModel;
        NavigationContext? context;

        try
        {
            IsNavigating = true;

            // View 타입 추론
            var viewType = ViewModelLocator.ResolveViewType(viewModelType);
            if (viewType == null)
            {
                return false;
            }

            // 새 ViewModel 생성 (ContainerLocator 사용)
            newViewModel = ContainerLocator.Current.Resolve(viewModelType);

            // 네비게이션 컨텍스트 생성
            context = new NavigationContext
            {
                Parameter = parameter,
                Direction = direction,
                SourceType = CurrentViewModel?.GetType(),
                TargetType = viewModelType
            };

            // 1. 현재 ViewModel에서 나갈 수 있는지 확인 (Guard)
            if (CurrentViewModel is INavigationAware currentAware)
            {
                var canLeave = await currentAware.OnNavigatingFromAsync(context);
                if (!canLeave)
                {
                    return false;
                }
            }

            // 2. 새 ViewModel로 들어갈 수 있는지 확인 (Guard)
            if (newViewModel is INavigationAware newAware)
            {
                var canEnter = await newAware.OnNavigatingToAsync(context);
                if (!canEnter)
                {
                    return false;
                }
            }

            // 3. 현재 ViewModel 비활성화
            if (CurrentViewModel is IActivatable currentActivatable)
                await currentActivatable.DeactivateAsync(cancellationToken);

            // 4. 현재 ViewModel에서 나감 처리
            if (CurrentViewModel is INavigationAware currentNavAware)
                await currentNavAware.OnNavigatedFromAsync(context);

            // 5. 이전 ViewModel 리소스 정리
            if (CurrentViewModel is IDestructible destructible)
                destructible.Destroy();

            // 6. 히스토리에 현재 엔트리 추가 (Forward 네비게이션인 경우)
            if (direction == NavigationDirection.Forward && _currentEntry != null)
            {
                _backStack.Push(_currentEntry);
                _forwardStack.Clear(); // 새로운 네비게이션 시 Forward 스택 클리어
            }

            // 7. View 생성 및 ViewModel 바인딩 (UI 스레드에서)
            Control view = null!;
            await Dispatcher.UIThread.InvokeAsync(() =>
            {
                view = (Control)Activator.CreateInstance(viewType)!;
                view.DataContext = newViewModel;
            });

            // 8. 현재 상태 업데이트 및 View 표시 (InitializeAsync 전에 먼저 표시)
            _currentEntry = new NavigationEntry
            {
                ViewModelType = viewModelType,
                ViewType = viewType,
                Parameter = parameter
            };

            CurrentViewModel = newViewModel;
            CurrentView = view;
        }
        catch
        {
            return false;
        }
        finally
        {
            IsNavigating = false;
            _navigationLock.Release();
        }

        // 9. 새 ViewModel 초기화 (lock 외부에서 실행 - 데드락 방지)
        try
        {
            if (newViewModel is IInitializableAsync initializable)
                await initializable.InitializeAsync(cancellationToken);

            // 10. 새 ViewModel로 들어감 처리
            if (newViewModel is INavigationAware newNavAware) await newNavAware.OnNavigatedToAsync(context);

            // 11. 새 ViewModel 활성화
            if (newViewModel is IActivatable newActivatable) await newActivatable.ActivateAsync(cancellationToken);
        }
        catch
        {
            // View는 이미 표시되었으므로 false를 반환하지 않음
        }

        return true;
    }

    private async Task<bool> NavigateToEntryAsync(
        NavigationEntry entry,
        NavigationDirection direction,
        CancellationToken cancellationToken)
    {
        return await NavigateInternalAsync(
            entry.ViewModelType,
            entry.Parameter,
            direction,
            cancellationToken);
    }

    #endregion
}
