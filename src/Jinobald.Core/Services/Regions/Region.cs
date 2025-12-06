namespace Jinobald.Core.Services.Regions;

/// <summary>
///     기본 리전 구현체
///     뷰 컬렉션을 관리하고 활성화/비활성화를 처리합니다.
/// </summary>
public class Region : IRegion
{
    private readonly List<object> _viewsOrder = new(); // 순서 유지
    private readonly HashSet<object> _activeViews = new(); // O(1) 조회

    public Region(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Region name cannot be null or empty.", nameof(name));

        Name = name;
    }

    public string Name { get; }

    public object? RegionTarget { get; set; }

    public IEnumerable<object> Views => _viewsOrder;

    public IEnumerable<object> ActiveViews => _activeViews;

    public ViewSortHint SortHint { get; set; } = ViewSortHint.Default;

    public event EventHandler<object>? ViewAdded;
    public event EventHandler<object>? ViewRemoved;
    public event EventHandler<object>? ViewActivated;
    public event EventHandler<object>? ViewDeactivated;

    public object Add(object view)
    {
        if (view == null)
            throw new ArgumentNullException(nameof(view));

        if (_viewsOrder.Contains(view))
            return view;

        if (SortHint == ViewSortHint.Reverse)
            _viewsOrder.Insert(0, view);
        else
            _viewsOrder.Add(view);

        ViewAdded?.Invoke(this, view);

        return view;
    }

    public void Remove(object view)
    {
        if (view == null)
            throw new ArgumentNullException(nameof(view));

        if (!_viewsOrder.Contains(view))
            return;

        if (_activeViews.Contains(view))
            Deactivate(view);

        _viewsOrder.Remove(view);
        ViewRemoved?.Invoke(this, view);
    }

    public void RemoveAll()
    {
        var viewsToRemove = _viewsOrder.ToList();
        foreach (var view in viewsToRemove) Remove(view);
    }

    public void Activate(object view)
    {
        if (view == null)
            throw new ArgumentNullException(nameof(view));

        if (!_viewsOrder.Contains(view))
            throw new InvalidOperationException("Cannot activate a view that is not in the region.");

        if (!_activeViews.Add(view))
            return; // 이미 활성화된 경우

        ViewActivated?.Invoke(this, view);
    }

    public void Deactivate(object view)
    {
        if (view == null)
            throw new ArgumentNullException(nameof(view));

        if (!_activeViews.Remove(view))
            return; // 활성화되지 않은 경우

        ViewDeactivated?.Invoke(this, view);
    }

    public bool Contains(object view)
    {
        return _viewsOrder.Contains(view);
    }
}
