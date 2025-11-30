using Jinobald.Core.Ioc;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Navigation;

namespace Jinobald.Core.Services.Regions;

/// <summary>
///     리전 내 네비게이션 서비스 구현체
///     특정 리전 내에서 뷰 간 전환을 관리하며, INavigationAware 생명주기를 지원합니다.
/// </summary>
public class RegionNavigationService : IRegionNavigationService
{
    private readonly IViewResolver _viewResolver;
    private readonly SemaphoreSlim _navigationLock = new(1, 1);

    public RegionNavigationService(IRegion region, IViewResolver viewResolver)
    {
        Region = region ?? throw new ArgumentNullException(nameof(region));
        _viewResolver = viewResolver ?? throw new ArgumentNullException(nameof(viewResolver));
    }

    public IRegion Region { get; }

    public object? CurrentView { get; private set; }

    public object? CurrentViewModel { get; private set; }

    public async Task<bool> NavigateAsync<TViewModel>(CancellationToken cancellationToken = default)
        where TViewModel : class
    {
        return await NavigateAsync<TViewModel>(null, cancellationToken);
    }

    public async Task<bool> NavigateAsync<TViewModel>(object? parameter,
        CancellationToken cancellationToken = default)
        where TViewModel : class
    {
        // 동시 네비게이션 방지
        if (!await _navigationLock.WaitAsync(TimeSpan.FromSeconds(5), cancellationToken))
            return false;

        object? newViewModel;
        NavigationContext? context;

        try
        {
            // ViewModel 생성
            var viewModelType = typeof(TViewModel);
            newViewModel = ContainerLocator.Current.Resolve(viewModelType);

            // 네비게이션 컨텍스트 생성
            context = new NavigationContext
            {
                Parameter = parameter,
                Direction = NavigationDirection.Forward,
                SourceType = CurrentViewModel?.GetType(),
                TargetType = viewModelType
            };

            // 1. 현재 ViewModel에서 나갈 수 있는지 확인 (Guard)
            if (CurrentViewModel is INavigationAware currentAware)
            {
                var canLeave = await currentAware.OnNavigatingFromAsync(context);
                if (!canLeave)
                    return false;
            }

            // 2. 새 ViewModel로 들어갈 수 있는지 확인 (Guard)
            if (newViewModel is INavigationAware newAware)
            {
                var canEnter = await newAware.OnNavigatingToAsync(context);
                if (!canEnter)
                    return false;
            }

            // 3. 현재 ViewModel 비활성화
            if (CurrentViewModel is IActivatable currentActivatable)
                await currentActivatable.DeactivateAsync(cancellationToken);

            // 4. 현재 ViewModel에서 나감 처리
            if (CurrentViewModel is INavigationAware currentNavAware)
                await currentNavAware.OnNavigatedFromAsync(context);

            // 5. 이전 View 비활성화 및 제거
            if (CurrentView != null)
            {
                Region.Deactivate(CurrentView);
                Region.Remove(CurrentView);

                // 이전 ViewModel 리소스 정리
                if (CurrentViewModel is IDestructible destructible)
                    destructible.Destroy();
            }

            // 6. View 생성
            var view = _viewResolver.ResolveView(viewModelType, newViewModel);

            // 7. 리전에 View 추가 및 활성화
            Region.Add(view);
            Region.Activate(view);

            // 8. 현재 상태 업데이트
            CurrentView = view;
            CurrentViewModel = newViewModel;
        }
        catch
        {
            return false;
        }
        finally
        {
            _navigationLock.Release();
        }

        // 9. 새 ViewModel 초기화 (lock 외부에서 실행 - 데드락 방지)
        try
        {
            if (newViewModel is IInitializableAsync initializable)
                await initializable.InitializeAsync(cancellationToken);

            // 10. 새 ViewModel로 들어감 처리
            if (newViewModel is INavigationAware newNavAware)
                await newNavAware.OnNavigatedToAsync(context);

            // 11. 새 ViewModel 활성화
            if (newViewModel is IActivatable newActivatable)
                await newActivatable.ActivateAsync(cancellationToken);
        }
        catch
        {
            // View는 이미 표시되었으므로 false를 반환하지 않음
        }

        return true;
    }

    public void ClearCurrentView()
    {
        if (CurrentView != null)
        {
            Region.Deactivate(CurrentView);
            Region.Remove(CurrentView);

            if (CurrentViewModel is IDestructible destructible)
                destructible.Destroy();

            CurrentView = null;
            CurrentViewModel = null;
        }
    }
}
