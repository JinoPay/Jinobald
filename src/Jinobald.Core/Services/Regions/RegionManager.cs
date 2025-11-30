using Jinobald.Core.Ioc;

namespace Jinobald.Core.Services.Regions;

/// <summary>
///     리전 매니저 구현체
///     애플리케이션 내 모든 리전을 관리하고 리전 기반 네비게이션을 제공합니다.
/// </summary>
public class RegionManager : IRegionManager
{
    private readonly Dictionary<string, IRegion> _regions = new();
    private readonly Dictionary<string, IRegionNavigationService> _navigationServices = new();
    private readonly IViewResolver _viewResolver;

    public RegionManager(IViewResolver viewResolver)
    {
        _viewResolver = viewResolver ?? throw new ArgumentNullException(nameof(viewResolver));
    }

    public IEnumerable<IRegion> Regions => _regions.Values;

    public event EventHandler<IRegion>? RegionAdded;
    public event EventHandler<string>? RegionRemoved;

    public IRegion CreateOrGetRegion(string regionName)
    {
        if (string.IsNullOrWhiteSpace(regionName))
            throw new ArgumentException("Region name cannot be null or empty.", nameof(regionName));

        if (_regions.TryGetValue(regionName, out var existingRegion))
            return existingRegion;

        var region = new Region(regionName);
        RegisterRegion(region);

        return region;
    }

    public IRegion? GetRegion(string regionName)
    {
        if (string.IsNullOrWhiteSpace(regionName))
            return null;

        _regions.TryGetValue(regionName, out var region);
        return region;
    }

    public bool ContainsRegion(string regionName)
    {
        return !string.IsNullOrWhiteSpace(regionName) && _regions.ContainsKey(regionName);
    }

    public void RegisterRegion(IRegion region)
    {
        if (region == null)
            throw new ArgumentNullException(nameof(region));

        if (_regions.ContainsKey(region.Name))
            throw new InvalidOperationException($"Region '{region.Name}' is already registered.");

        _regions[region.Name] = region;

        // 각 리전에 대한 네비게이션 서비스 생성
        var navigationService = new RegionNavigationService(region, _viewResolver);
        _navigationServices[region.Name] = navigationService;

        RegionAdded?.Invoke(this, region);
    }

    public bool RemoveRegion(string regionName)
    {
        if (string.IsNullOrWhiteSpace(regionName))
            return false;

        if (!_regions.ContainsKey(regionName))
            return false;

        var region = _regions[regionName];
        region.RemoveAll();

        _regions.Remove(regionName);
        _navigationServices.Remove(regionName);

        RegionRemoved?.Invoke(this, regionName);

        return true;
    }

    public object AddToRegion(string regionName, object view)
    {
        if (view == null)
            throw new ArgumentNullException(nameof(view));

        var region = CreateOrGetRegion(regionName);
        return region.Add(view);
    }

    public object AddToRegion<TViewModel>(string regionName) where TViewModel : class
    {
        var region = CreateOrGetRegion(regionName);

        // ViewModel 생성
        var viewModel = ContainerLocator.Current.Resolve<TViewModel>();

        // View 생성
        var view = _viewResolver.ResolveView(typeof(TViewModel), viewModel);

        return region.Add(view);
    }

    public void RemoveFromRegion(string regionName, object view)
    {
        var region = GetRegion(regionName);
        region?.Remove(view);
    }

    public Task<bool> NavigateAsync<TViewModel>(string regionName, CancellationToken cancellationToken = default)
        where TViewModel : class
    {
        return NavigateAsync<TViewModel>(regionName, null, cancellationToken);
    }

    public async Task<bool> NavigateAsync<TViewModel>(string regionName, object? parameter,
        CancellationToken cancellationToken = default)
        where TViewModel : class
    {
        if (string.IsNullOrWhiteSpace(regionName))
            return false;

        if (!_navigationServices.TryGetValue(regionName, out var navigationService))
            return false;

        return await navigationService.NavigateAsync<TViewModel>(parameter, cancellationToken);
    }
}
