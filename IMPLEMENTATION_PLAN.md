# Jinobald Region 재설계 구현 계획

## 전체 개요

`REGION_REDESIGN.md`에 명시된 설계를 단계별로 구현합니다.

**목표**: NavigationService를 완전히 제거하고 Region 기반의 통합된 네비게이션 시스템 구축

**제약**: macOS 환경이므로 WPF는 빌드 없이 코드 수정만 진행

---

## Phase 1: 인터페이스 및 Core 수정

### 1.1 열거형 추가

**파일**: `src/Jinobald.Core/Services/Regions/RegionNavigationMode.cs` (신규)

```csharp
namespace Jinobald.Core.Services.Regions;

/// <summary>
///     리전의 네비게이션 모드
/// </summary>
public enum RegionNavigationMode
{
    /// <summary>
    ///     스택 기반 네비게이션 (Back/Forward 지원)
    ///     ContentControl에 적합
    /// </summary>
    Stack,

    /// <summary>
    ///     현재 뷰를 교체 (히스토리 없음)
    ///     ContentControl에 적합
    /// </summary>
    Replace,

    /// <summary>
    ///     뷰를 누적 (여러 뷰 동시 표시)
    ///     ItemsControl에 적합
    /// </summary>
    Accumulate
}
```

### 1.2 IRegionNavigationService 개선

**파일**: `src/Jinobald.Core/Services/Regions/IRegionNavigationService.cs`

**변경 사항**:
```csharp
public interface IRegionNavigationService
{
    IRegion Region { get; }
    object? CurrentView { get; }
    object? CurrentViewModel { get; }

    // ✅ View 기반 네비게이션 추가
    Task<bool> NavigateAsync(Type viewType, object? parameter = null,
        CancellationToken cancellationToken = default);

    // ✅ 제네릭 메서드 추가 (편의성)
    Task<bool> NavigateAsync<TView>(object? parameter = null,
        CancellationToken cancellationToken = default) where TView : class;

    // ✅ Back/Forward 추가
    bool CanGoBack { get; }
    bool CanGoForward { get; }
    Task<bool> GoBackAsync(CancellationToken cancellationToken = default);
    Task<bool> GoForwardAsync(CancellationToken cancellationToken = default);

    // ✅ 히스토리 관리
    int HistoryCount { get; }
    void ClearHistory();

    // ✅ Keep-Alive 관리
    bool KeepAlive { get; set; }
    void ClearCache();

    // ✅ 네비게이션 모드
    RegionNavigationMode NavigationMode { get; set; }

    // ✅ 이벤트
    event EventHandler<object?>? Navigated;

    // ❌ 제거: ViewModel 기반 메서드
    // Task<bool> NavigateAsync<TViewModel>(...) - 제거
}
```

### 1.3 IRegionManager 개선

**파일**: `src/Jinobald.Core/Services/Regions/IRegionManager.cs`

**변경 사항**:
```csharp
public interface IRegionManager
{
    // 기존 메서드 유지
    IEnumerable<IRegion> Regions { get; }
    IRegion CreateOrGetRegion(string regionName);
    IRegion? GetRegion(string regionName);
    bool ContainsRegion(string regionName);
    void RegisterRegion(IRegion region);
    bool RemoveRegion(string regionName);

    // ✅ View 기반 네비게이션 추가
    Task<bool> NavigateAsync(string regionName, Type viewType, object? parameter = null,
        CancellationToken cancellationToken = default);

    Task<bool> NavigateAsync<TView>(string regionName, object? parameter = null,
        CancellationToken cancellationToken = default) where TView : class;

    // ✅ Back/Forward 추가
    bool CanGoBack(string regionName);
    bool CanGoForward(string regionName);
    Task<bool> GoBackAsync(string regionName, CancellationToken cancellationToken = default);
    Task<bool> GoForwardAsync(string regionName, CancellationToken cancellationToken = default);

    // ✅ 네비게이션 서비스 접근
    IRegionNavigationService? GetNavigationService(string regionName);

    // ❌ 제거: ViewModel 기반 메서드
    // Task<bool> NavigateAsync<TViewModel>(string regionName, ...) - 제거
    // object AddToRegion<TViewModel>(string regionName) - 제거 또는 View 기반으로 변경

    // ✅ View 기반으로 변경
    object AddToRegion(string regionName, Type viewType);
    object AddToRegion<TView>(string regionName) where TView : class;

    // 기존 메서드 유지
    object AddToRegion(string regionName, object view);
    void RemoveFromRegion(string regionName, object view);

    event EventHandler<IRegion>? RegionAdded;
    event EventHandler<string>? RegionRemoved;
}
```

### 1.4 NavigationContext 개선

**파일**: `src/Jinobald.Core/Services/Navigation/NavigationContext.cs`

**변경 사항**:
```csharp
public class NavigationContext
{
    // ✅ View 타입 추가
    public Type? ViewType { get; set; }

    // 기존 속성 유지
    public object? Parameter { get; set; }
    public CancellationToken CancellationToken { get; set; }
}
```

### 1.5 IViewResolver 확인 및 개선

**파일**: `src/Jinobald.Core/Services/Regions/IViewResolver.cs`

**현재 상태 확인 필요**, 필요시 개선:
```csharp
public interface IViewResolver
{
    // View 타입에서 ViewModel 타입 추론
    Type? ResolveViewModelType(Type viewType);

    // ViewModel 타입에서 View 타입 추론
    Type? ResolveViewType(Type viewModelType);

    // ✅ View 생성 (ViewModel 자동 연결)
    object ResolveView(Type viewType);

    // ✅ View + ViewModel 생성
    object ResolveView(Type viewType, object viewModel);
}
```

---

## Phase 2: Core 구현체 수정

### 2.1 RegionNavigationService 개선

**파일**: `src/Jinobald.Core/Services/Regions/RegionNavigationService.cs`

**주요 변경**:
1. ViewModel 기반 → View 기반 네비게이션
2. Back/Forward 히스토리 스택 추가
3. Keep-Alive 캐시 추가
4. NavigationMode 지원

**구현 세부사항**:
```csharp
public class RegionNavigationService : IRegionNavigationService
{
    private readonly IViewResolver _viewResolver;
    private readonly SemaphoreSlim _navigationLock = new(1, 1);

    // ✅ 히스토리 스택
    private readonly Stack<NavigationEntry> _backStack = new();
    private readonly Stack<NavigationEntry> _forwardStack = new();

    // ✅ Keep-Alive 캐시
    private readonly Dictionary<Type, (object View, object ViewModel)> _viewCache = new();

    // ✅ 현재 네비게이션 엔트리
    private NavigationEntry? _currentEntry;

    public bool KeepAlive { get; set; }
    public RegionNavigationMode NavigationMode { get; set; } = RegionNavigationMode.Stack;

    // View 기반 네비게이션 구현
    public async Task<bool> NavigateAsync(Type viewType, object? parameter = null, ...)
    {
        // 1. Guard 단계: OnNavigatingFromAsync, OnNavigatingToAsync
        // 2. 이전 뷰 처리 (Deactivate 또는 Remove)
        // 3. 새 뷰 생성 또는 캐시에서 가져오기
        // 4. ViewModel 자동 생성 및 연결
        // 5. 히스토리 관리 (NavigationMode에 따라)
        // 6. Region에 추가 및 활성화
        // 7. 생명주기: OnNavigatedToAsync, ActivateAsync
    }

    // Back/Forward 구현
    public async Task<bool> GoBackAsync(...) { }
    public async Task<bool> GoForwardAsync(...) { }

    // Keep-Alive 관리
    public void ClearCache() { _viewCache.Clear(); }
}

internal class NavigationEntry
{
    public Type ViewType { get; set; }
    public object View { get; set; }
    public object? ViewModel { get; set; }
    public object? Parameter { get; set; }
}
```

### 2.2 RegionManager 개선

**파일**: `src/Jinobald.Core/Services/Regions/RegionManager.cs`

**주요 변경**:
1. View 기반 API 추가
2. Back/Forward 위임 메서드 추가
3. ViewModel 기반 메서드 제거

**구현**:
```csharp
public class RegionManager : IRegionManager
{
    // View 기반 네비게이션
    public Task<bool> NavigateAsync<TView>(string regionName, object? parameter = null, ...)
    {
        return NavigateAsync(regionName, typeof(TView), parameter, cancellationToken);
    }

    public async Task<bool> NavigateAsync(string regionName, Type viewType, ...)
    {
        var navService = GetNavigationService(regionName);
        if (navService == null) return false;

        return await navService.NavigateAsync(viewType, parameter, cancellationToken);
    }

    // Back/Forward 위임
    public bool CanGoBack(string regionName)
    {
        return GetNavigationService(regionName)?.CanGoBack ?? false;
    }

    public async Task<bool> GoBackAsync(string regionName, ...)
    {
        var navService = GetNavigationService(regionName);
        return navService != null && await navService.GoBackAsync(cancellationToken);
    }

    // View 기반 AddToRegion
    public object AddToRegion<TView>(string regionName)
    {
        return AddToRegion(regionName, typeof(TView));
    }

    public object AddToRegion(string regionName, Type viewType)
    {
        var region = CreateOrGetRegion(regionName);

        // View 생성
        var view = _viewResolver.ResolveView(viewType);

        return region.Add(view);
    }

    // ❌ 제거
    // public object AddToRegion<TViewModel>(string regionName) - 제거
    // public Task<bool> NavigateAsync<TViewModel>(...) - 제거
}
```

### 2.3 ViewResolver 개선

**파일**:
- `src/Jinobald.Avalonia/Services/Regions/AvaloniaViewResolver.cs`
- `src/Jinobald.Wpf/Services/Regions/WpfViewResolver.cs`

**주요 변경**:
```csharp
public class AvaloniaViewResolver : IViewResolver
{
    public object ResolveView(Type viewType)
    {
        // 1. View 인스턴스 생성 (DI)
        var view = ContainerLocator.Current.Resolve(viewType);

        // 2. ViewModel 타입 추론
        var viewModelType = ResolveViewModelType(viewType);
        if (viewModelType == null)
            return view;

        // 3. ViewModel 생성 (DI)
        var viewModel = ContainerLocator.Current.Resolve(viewModelType);

        // 4. DataContext 바인딩
        if (view is Control control)
        {
            control.DataContext = viewModel;
        }

        return view;
    }
}
```

---

## Phase 3: Avalonia 구현

### 3.1 Region Attached Property 생성

**파일**: `src/Jinobald.Avalonia/Services/Regions/Region.cs` (신규, RegionManagerExtensions 대체)

```csharp
namespace Jinobald.Avalonia.Services.Regions;

/// <summary>
///     Avalonia에서 리전을 정의하기 위한 Attached Property
///     xmlns:jino="http://jinobald.com/winfx/xaml/core"
/// </summary>
public static class Region
{
    // Name
    public static readonly AttachedProperty<string> NameProperty =
        AvaloniaProperty.RegisterAttached<Control, string>("Name", typeof(Region), string.Empty);

    // DefaultView
    public static readonly AttachedProperty<Type?> DefaultViewProperty =
        AvaloniaProperty.RegisterAttached<Control, Type?>("DefaultView", typeof(Region), null);

    // KeepAlive
    public static readonly AttachedProperty<bool> KeepAliveProperty =
        AvaloniaProperty.RegisterAttached<Control, bool>("KeepAlive", typeof(Region), false);

    // NavigationMode
    public static readonly AttachedProperty<RegionNavigationMode> NavigationModeProperty =
        AvaloniaProperty.RegisterAttached<Control, RegionNavigationMode>(
            "NavigationMode", typeof(Region), RegionNavigationMode.Stack);

    static Region()
    {
        NameProperty.Changed.AddClassHandler<Control>(OnRegionNameChanged);
        DefaultViewProperty.Changed.AddClassHandler<Control>(OnDefaultViewChanged);
        KeepAliveProperty.Changed.AddClassHandler<Control>(OnKeepAliveChanged);
        NavigationModeProperty.Changed.AddClassHandler<Control>(OnNavigationModeChanged);
    }

    // Getter/Setter
    public static string GetName(Control control) => control.GetValue(NameProperty);
    public static void SetName(Control control, string value) => control.SetValue(NameProperty, value);

    public static Type? GetDefaultView(Control control) => control.GetValue(DefaultViewProperty);
    public static void SetDefaultView(Control control, Type? value) => control.SetValue(DefaultViewProperty, value);

    // 이벤트 핸들러
    private static void OnRegionNameChanged(Control control, AvaloniaPropertyChangedEventArgs e)
    {
        if (e.NewValue is not string regionName || string.IsNullOrEmpty(regionName))
            return;

        var regionManager = ContainerLocator.Current.Resolve<IRegionManager>();
        var region = regionManager.CreateOrGetRegion(regionName);

        // Adapter 선택 및 연결
        var adapter = GetRegionAdapter(control);
        adapter?.Initialize(region, control);

        // DefaultView 자동 네비게이션
        var defaultViewType = GetDefaultView(control);
        if (defaultViewType != null)
        {
            _ = regionManager.NavigateAsync(regionName, defaultViewType);
        }
    }

    private static void OnDefaultViewChanged(...) { }
    private static void OnKeepAliveChanged(Control control, ...)
    {
        var regionName = GetName(control);
        if (string.IsNullOrEmpty(regionName)) return;

        var regionManager = ContainerLocator.Current.Resolve<IRegionManager>();
        var navService = regionManager.GetNavigationService(regionName);
        if (navService != null)
        {
            navService.KeepAlive = (bool)e.NewValue!;
        }
    }

    private static void OnNavigationModeChanged(...) { }

    // Adapter 팩토리
    private static IRegionAdapter? GetRegionAdapter(Control control)
    {
        return control switch
        {
            ContentControl => new ContentControlRegionAdapter(),
            ItemsControl => new ItemsControlRegionAdapter(),
            _ => null
        };
    }
}
```

### 3.2 xmlns 매핑 설정

**파일**: `src/Jinobald.Avalonia/Jinobald.Avalonia.csproj`

```xml
<ItemGroup>
  <AvaloniaXmlns Include="http://jinobald.com/winfx/xaml/core"
                 Namespace="Jinobald.Avalonia.Services.Regions" />
</ItemGroup>
```

또는

**파일**: `src/Jinobald.Avalonia/XmlnsDefinitions.cs` (신규)

```csharp
using Avalonia.Metadata;

[assembly: XmlnsDefinition("http://jinobald.com/winfx/xaml/core", "Jinobald.Avalonia.Services.Regions")]
```

### 3.3 샘플 프로젝트 업데이트

**파일**: `samples/Jinobald.Sample.Avalonia/Views/MainWindow.axaml`

```xml
<Window xmlns="https://github.com/avaloniaui"
        xmlns:jino="http://jinobald.com/winfx/xaml/core"
        xmlns:views="clr-namespace:Jinobald.Sample.Avalonia.Views">

    <Grid>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="200" />
            <ColumnDefinition Width="*" />
        </Grid.ColumnDefinitions>

        <!-- 사이드바 -->
        <Border Grid.Column="0">...</Border>

        <!-- 메인 콘텐츠 - Region -->
        <ContentControl Grid.Column="1"
                        jino:Region.Name="MainRegion"
                        jino:Region.DefaultView="views:HomeView"
                        jino:Region.KeepAlive="True" />
    </Grid>
</Window>
```

**파일**: `samples/Jinobald.Sample.Avalonia/Views/MainWindow.axaml.cs`

```csharp
public MainWindow(IRegionManager regionManager)
{
    _regionManager = regionManager;
    InitializeComponent();
    DataContext = new MainWindowViewModel(regionManager);

    // DefaultView가 설정되어 있으므로 자동 네비게이션됨
}
```

---

## Phase 4: WPF 구현

### 4.1 Region Attached Property 생성

**파일**: `src/Jinobald.Wpf/Services/Regions/Region.cs` (신규)

Avalonia와 동일한 구조, DependencyProperty 사용:

```csharp
public static class Region
{
    public static readonly DependencyProperty NameProperty =
        DependencyProperty.RegisterAttached("Name", typeof(string), typeof(Region),
            new PropertyMetadata(string.Empty, OnRegionNameChanged));

    // DefaultView, KeepAlive, NavigationMode도 동일...
}
```

### 4.2 xmlns 매핑

**파일**: `src/Jinobald.Wpf/XmlnsDefinitions.cs` (신규)

```csharp
using System.Windows.Markup;

[assembly: XmlnsDefinition("http://jinobald.com/winfx/xaml/core", "Jinobald.Wpf.Services.Regions")]
```

---

## Phase 5: NavigationService 제거

### 5.1 파일 제거

1. `src/Jinobald.Core/Services/Navigation/INavigationService.cs` 삭제
2. `src/Jinobald.Avalonia/Services/Navigation/NavigationService.cs` 삭제
3. `src/Jinobald.Wpf/Services/Navigation/NavigationService.cs` 삭제

### 5.2 서비스 등록 제거

**파일**: `src/Jinobald.Avalonia/Hosting/ServiceCollectionExtensions.cs`

```csharp
public static IServiceCollection AddJinobaldAvalonia(this IServiceCollection services)
{
    // ❌ 제거
    // services.AddSingleton<INavigationService, NavigationService>();

    // ✅ 유지
    services.AddSingleton<IRegionManager, RegionManager>();
    services.AddSingleton<IViewResolver, AvaloniaViewResolver>();
    // ...
}
```

**파일**: `src/Jinobald.Wpf/Hosting/ServiceCollectionExtensions.cs` (동일)

### 5.3 의존성 업데이트

모든 `INavigationService` 사용처를 `IRegionManager`로 변경:

**검색 패턴**:
```bash
grep -r "INavigationService" src/ samples/
```

**주요 변경 위치**:
- ViewModel들 (생성자 주입)
- 샘플 프로젝트

---

## Phase 6: 테스트 및 문서화

### 6.1 Avalonia 샘플 동작 확인

1. 빌드 테스트
2. 네비게이션 테스트
3. Back/Forward 테스트
4. Keep-Alive 동작 확인
5. DefaultView 자동 네비게이션 확인

### 6.2 WPF 샘플 코드 수정

빌드는 불가하지만 코드 동기화

### 6.3 문서 업데이트

**파일**: `CLAUDE.md`

- NavigationService 제거 명시
- Region 기반 네비게이션 가이드 추가
- View 기반 네비게이션 설명
- xmlns 사용법 업데이트

**파일**: `README.md`

- 주요 기능 업데이트
- 코드 예제 업데이트

---

## 체크리스트

### Phase 1: 인터페이스 및 Core 수정
- [ ] `RegionNavigationMode` 열거형 추가
- [ ] `IRegionNavigationService` 개선
- [ ] `IRegionManager` 개선
- [ ] `NavigationContext` 개선
- [ ] `IViewResolver` 확인 및 개선

### Phase 2: Core 구현체 수정
- [ ] `RegionNavigationService` 완전 재작성
- [ ] `RegionManager` 개선
- [ ] `AvaloniaViewResolver` 개선
- [ ] `WpfViewResolver` 개선

### Phase 3: Avalonia 구현
- [ ] `Region` Attached Property 생성
- [ ] xmlns 매핑 설정
- [ ] RegionManagerExtensions 제거
- [ ] 샘플 프로젝트 업데이트 (XAML)
- [ ] 샘플 프로젝트 업데이트 (C#)

### Phase 4: WPF 구현
- [ ] `Region` Attached Property 생성
- [ ] xmlns 매핑 설정
- [ ] RegionManagerExtensions 제거

### Phase 5: NavigationService 제거
- [ ] 파일 삭제
- [ ] 서비스 등록 제거
- [ ] 모든 의존성 업데이트

### Phase 6: 테스트 및 문서화
- [ ] Avalonia 샘플 빌드 및 동작 확인
- [ ] WPF 코드 동기화
- [ ] CLAUDE.md 업데이트
- [ ] README.md 업데이트

---

## 예상 소요 시간

- Phase 1: 1시간
- Phase 2: 3시간 (RegionNavigationService 재작성이 복잡)
- Phase 3: 2시간
- Phase 4: 1시간
- Phase 5: 1시간
- Phase 6: 1시간

**총 예상 시간**: 9시간

---

## 리스크 및 고려사항

### 리스크
1. **RegionNavigationService 복잡도**: Back/Forward + Keep-Alive + 생명주기 모두 고려해야 함
2. **기존 코드 호환성**: 샘플 프로젝트가 깨질 수 있음
3. **WPF 검증 불가**: macOS에서 빌드 불가

### 대응 방안
1. 단계별로 신중하게 진행, 각 Phase마다 빌드 테스트
2. 샘플 프로젝트는 마지막에 일괄 수정
3. WPF는 Avalonia 코드를 참고하여 동일하게 작성

---

## 다음 단계

사용자 승인 후 Phase 1부터 순차적으로 구현 시작합니다.

승인하시겠습니까? (Y/N)
