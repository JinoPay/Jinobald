# Jinobald Region 시스템 재설계

## 현재 문제점

### 1. NavigationService와 Region의 혼재
- `INavigationService`: 글로벌 네비게이션 (단일 뷰 전환)
- `IRegionManager`: 리전 기반 네비게이션
- **문제**: 두 시스템이 중복되고 혼란스러움

### 2. ViewModel 기준 네비게이션
```csharp
// 현재
await navigationService.NavigateToAsync<HomeViewModel>();
await regionManager.NavigateAsync<HomeViewModel>("MainRegion");
```
- **문제**: ViewModel을 직접 참조하는 것은 View-First 패턴과 맞지 않음

### 3. Region 선언의 불편함
```xml
<!-- 현재 -->
<ContentControl regions:RegionManagerExtensions.RegionName="MainRegion" />
```
- **문제**:
  - `RegionManagerExtensions` 이름이 너무 길고 직관적이지 않음
  - 기본 뷰 설정 불가능
  - Keep-Alive 같은 추가 옵션 설정 불가능

### 4. 부족한 네비게이션 기능
- Back/Forward 히스토리가 RegionNavigationService에 없음
- Keep-Alive 지원 부재
- 기본 뷰 설정 불가능

---

## 새로운 설계

### 1. 단일 네비게이션 시스템: Region Only

#### 제거할 것
- ✅ `INavigationService` 완전 제거
- ✅ `NavigationService` 구현체 제거 (Avalonia, WPF)
- ✅ 모든 Navigation 관련 파일 제거

#### 남길 것
- ✅ `IRegionManager` - 리전 생성 및 관리
- ✅ `IRegion` - 개별 리전 (뷰 컨테이너)
- ✅ `IRegionNavigationService` - 리전 내 네비게이션 (개선 필요)

---

### 2. View 기준 네비게이션

#### 새로운 API
```csharp
// View 타입으로 네비게이션
await regionManager.NavigateAsync("MainRegion", typeof(HomeView));
await regionManager.NavigateAsync<HomeView>("MainRegion");

// 파라미터 전달
await regionManager.NavigateAsync<HomeView>("MainRegion", new { Id = 123 });

// Back/Forward
await regionManager.GoBackAsync("MainRegion");
await regionManager.GoForwardAsync("MainRegion");

// 상태 확인
bool canGoBack = regionManager.CanGoBack("MainRegion");
bool canGoForward = regionManager.CanGoForward("MainRegion");
```

#### ViewModel 자동 연결
- `ViewModelLocator`가 View 타입에서 ViewModel 타입 추론
- DI 컨테이너에서 ViewModel 인스턴스 생성
- View.DataContext에 자동 바인딩

---

### 3. 개선된 Region XAML 선언

#### xmlns 변경
```xml
<!-- 현재 -->
xmlns:regions="clr-namespace:Jinobald.Avalonia.Services.Regions;assembly=Jinobald.Avalonia"

<!-- 변경 -->
xmlns:jino="http://jinobald.com/winfx/xaml/core"
```

#### Attached Property 개선
```xml
<!-- 기본 사용 -->
<ContentControl jino:Region.Name="MainRegion" />

<!-- 기본 뷰 설정 -->
<ContentControl jino:Region.Name="MainRegion"
                jino:Region.DefaultView="views:HomeView" />

<!-- Keep-Alive 설정 (뷰 재사용) -->
<ContentControl jino:Region.Name="MainRegion"
                jino:Region.KeepAlive="True" />

<!-- 네비게이션 모드 설정 -->
<ContentControl jino:Region.Name="MainRegion"
                jino:Region.NavigationMode="Stack" /> <!-- Stack, Replace, Accumulate -->
```

---

### 4. 완전한 네비게이션 기능

#### IRegionNavigationService 개선
```csharp
public interface IRegionNavigationService
{
    IRegion Region { get; }

    // 현재 상태
    object? CurrentView { get; }
    object? CurrentViewModel { get; }

    // 네비게이션
    Task<bool> NavigateAsync(Type viewType, object? parameter = null,
        CancellationToken cancellationToken = default);

    // Back/Forward
    bool CanGoBack { get; }
    bool CanGoForward { get; }
    Task<bool> GoBackAsync(CancellationToken cancellationToken = default);
    Task<bool> GoForwardAsync(CancellationToken cancellationToken = default);

    // 히스토리
    int HistoryCount { get; }
    void ClearHistory();

    // Keep-Alive 관리
    bool KeepAlive { get; set; }
    void ClearCache(); // Keep-Alive 캐시 제거

    // 이벤트
    event EventHandler<object?>? Navigated;
}
```

#### NavigationMode 열거형
```csharp
public enum RegionNavigationMode
{
    /// <summary>
    /// 스택 기반 네비게이션 (Back/Forward 지원)
    /// </summary>
    Stack,

    /// <summary>
    /// 현재 뷰를 교체 (히스토리 없음)
    /// </summary>
    Replace,

    /// <summary>
    /// 뷰를 누적 (여러 뷰 동시 표시 - ItemsControl용)
    /// </summary>
    Accumulate
}
```

---

### 5. 생명주기 관리 강화

#### 기존 인터페이스 활용
```csharp
// INavigationAware - 네비게이션 생명주기
public interface INavigationAware
{
    Task OnNavigatingFromAsync(NavigationContext context); // Guard
    Task OnNavigatedFromAsync(NavigationContext context);  // 떠날 때
    Task OnNavigatingToAsync(NavigationContext context);   // Guard
    Task OnNavigatedToAsync(NavigationContext context);    // 도착할 때
}

// IActivatable - 활성화/비활성화
public interface IActivatable
{
    Task ActivateAsync();
    Task DeactivateAsync();
}

// IDestructible - 제거 시
public interface IDestructible
{
    Task OnDestroyAsync();
}
```

#### Keep-Alive 동작
- `KeepAlive = false` (기본): 네비게이션 시 이전 뷰 제거 → `OnDestroyAsync()` 호출
- `KeepAlive = true`: 뷰를 캐시에 보관 → `DeactivateAsync()` 호출, 재방문 시 `ActivateAsync()` 호출

---

### 6. IRegionManager 개선

```csharp
public interface IRegionManager
{
    // 리전 관리
    IEnumerable<IRegion> Regions { get; }
    IRegion CreateOrGetRegion(string regionName);
    IRegion? GetRegion(string regionName);
    bool ContainsRegion(string regionName);
    void RegisterRegion(IRegion region);
    bool RemoveRegion(string regionName);

    // View 기반 네비게이션
    Task<bool> NavigateAsync<TView>(string regionName, object? parameter = null,
        CancellationToken cancellationToken = default) where TView : class;

    Task<bool> NavigateAsync(string regionName, Type viewType, object? parameter = null,
        CancellationToken cancellationToken = default);

    // Back/Forward
    bool CanGoBack(string regionName);
    bool CanGoForward(string regionName);
    Task<bool> GoBackAsync(string regionName, CancellationToken cancellationToken = default);
    Task<bool> GoForwardAsync(string regionName, CancellationToken cancellationToken = default);

    // 리전별 네비게이션 서비스 접근
    IRegionNavigationService? GetNavigationService(string regionName);

    // 이벤트
    event EventHandler<IRegion>? RegionAdded;
    event EventHandler<string>? RegionRemoved;
}
```

---

### 7. Region Attached Property 구현

#### Core (플랫폼 독립)
```csharp
// Jinobald.Core/Services/Regions/RegionBehavior.cs
public static class RegionBehavior
{
    public const string XmlNamespace = "http://jinobald.com/winfx/xaml/core";

    // 리전 메타데이터
    public class RegionMetadata
    {
        public string Name { get; set; }
        public Type? DefaultViewType { get; set; }
        public bool KeepAlive { get; set; }
        public RegionNavigationMode NavigationMode { get; set; } = RegionNavigationMode.Stack;
    }
}
```

#### Avalonia
```csharp
// Jinobald.Avalonia/Services/Regions/Region.cs
public static class Region
{
    public static readonly AttachedProperty<string> NameProperty =
        AvaloniaProperty.RegisterAttached<Control, string>("Name", typeof(Region), string.Empty);

    public static readonly AttachedProperty<Type?> DefaultViewProperty =
        AvaloniaProperty.RegisterAttached<Control, Type?>("DefaultView", typeof(Region), null);

    public static readonly AttachedProperty<bool> KeepAliveProperty =
        AvaloniaProperty.RegisterAttached<Control, bool>("KeepAlive", typeof(Region), false);

    public static readonly AttachedProperty<RegionNavigationMode> NavigationModeProperty =
        AvaloniaProperty.RegisterAttached<Control, RegionNavigationMode>(
            "NavigationMode", typeof(Region), RegionNavigationMode.Stack);

    static Region()
    {
        NameProperty.Changed.AddClassHandler<Control>(OnRegionNameChanged);
    }

    private static void OnRegionNameChanged(Control control, AvaloniaPropertyChangedEventArgs e)
    {
        if (e.NewValue is not string regionName || string.IsNullOrEmpty(regionName))
            return;

        var regionManager = ContainerLocator.Current.Resolve<IRegionManager>();
        var region = regionManager.CreateOrGetRegion(regionName);

        // RegionAdapter를 통해 Control과 Region 연결
        // ...

        // DefaultView 설정되어 있으면 자동 네비게이션
        var defaultViewType = control.GetValue(DefaultViewProperty);
        if (defaultViewType != null)
        {
            _ = regionManager.NavigateAsync(regionName, defaultViewType);
        }
    }
}
```

#### WPF
```csharp
// Jinobald.Wpf/Services/Regions/Region.cs
public static class Region
{
    public static readonly DependencyProperty NameProperty =
        DependencyProperty.RegisterAttached("Name", typeof(string), typeof(Region),
            new PropertyMetadata(string.Empty, OnRegionNameChanged));

    // DefaultView, KeepAlive, NavigationMode도 동일하게...
}
```

---

## 단계별 구현 계획

### Phase 1: 인터페이스 및 Core 수정
1. ✅ `IRegionNavigationService` 개선 (Back/Forward, KeepAlive 추가)
2. ✅ `IRegionManager` 개선 (View 기반 네비게이션 추가)
3. ✅ `RegionNavigationMode` 열거형 추가
4. ✅ `RegionBehavior` 클래스 추가 (메타데이터)
5. ✅ `NavigationContext` 개선 (View 타입 포함)

### Phase 2: Core 구현체 수정
1. ✅ `RegionNavigationService` 개선
   - Back/Forward 히스토리 스택 구현
   - Keep-Alive 캐시 구현
   - View 기반 네비게이션 구현
2. ✅ `RegionManager` 개선
   - View 기반 API 추가
   - Back/Forward 위임 메서드 추가
3. ✅ `IViewResolver` 개선
   - View에서 ViewModel 자동 생성 지원

### Phase 3: Avalonia 구현
1. ✅ `Region` Attached Property 클래스 생성 (RegionManagerExtensions 대체)
2. ✅ xmlns 매핑 설정 (`http://jinobald.com/winfx/xaml/core`)
3. ✅ DefaultView, KeepAlive, NavigationMode 속성 구현
4. ✅ 샘플 프로젝트 업데이트

### Phase 4: WPF 구현
1. ✅ `Region` Attached Property 클래스 생성
2. ✅ xmlns 매핑 설정
3. ✅ DefaultView, KeepAlive, NavigationMode 속성 구현

### Phase 5: NavigationService 제거
1. ✅ `INavigationService` 인터페이스 제거
2. ✅ `NavigationService` 구현체 제거 (Avalonia, WPF)
3. ✅ 의존성 업데이트 (모든 `INavigationService` 사용처를 `IRegionManager`로 변경)
4. ✅ 샘플 프로젝트 업데이트

### Phase 6: 테스트 및 문서화
1. ✅ Avalonia 샘플 동작 확인
2. ✅ WPF 샘플 코드 수정 (빌드 제외)
3. ✅ CLAUDE.md 업데이트
4. ✅ README.md 업데이트

---

## 마이그레이션 가이드

### Before (기존)
```csharp
// App.axaml.cs
public MainWindow(INavigationService navigationService)
{
    _navigationService = navigationService;
    _ = navigationService.NavigateToAsync<HomeViewModel>();
}

// ViewModel
await _navigationService.NavigateToAsync<SettingsViewModel>();
```

```xml
<!-- MainWindow.axaml -->
<ContentControl Content="{Binding CurrentView}" />
```

### After (새 설계)
```csharp
// App.axaml.cs
public MainWindow(IRegionManager regionManager)
{
    _regionManager = regionManager;
    // DefaultView가 설정되어 있으면 자동 네비게이션되므로 필요 없음
}

// ViewModel
await _regionManager.NavigateAsync<SettingsView>("MainRegion");
```

```xml
<!-- MainWindow.axaml -->
<ContentControl jino:Region.Name="MainRegion"
                jino:Region.DefaultView="views:HomeView" />
```

---

## 예상 효과

### 1. 단순성
- NavigationService 제거로 개념 혼란 해소
- 단일 네비게이션 시스템으로 학습 곡선 감소

### 2. 일관성
- 모든 네비게이션이 Region 기반으로 통일
- View-First 패턴으로 일관성 확보

### 3. 유연성
- Region별 독립적인 Back/Forward 히스토리
- Keep-Alive로 성능 최적화 가능
- NavigationMode로 다양한 네비게이션 패턴 지원

### 4. 직관성
- `jino:Region.Name` 짧고 명확한 XAML 선언
- View 타입 기반 네비게이션으로 직관적인 코드

### 5. 확장성
- 플랫폼 독립적인 Core 설계
- WPF, Avalonia, 향후 다른 플랫폼 쉽게 추가 가능
