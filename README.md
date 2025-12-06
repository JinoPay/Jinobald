# Jinobald

**Enterprise-grade MVVM Framework for WPF & Avalonia**

Jinobald는 현대적인 .NET 애플리케이션 개발을 위한 강력한 크로스 플랫폼 MVVM 프레임워크입니다. Prism과 유사한 구조를 가지며, WPF와 Avalonia를 모두 지원합니다.

## ✨ 핵심 기능

### Core Features
- **🎯 View-First Region Navigation** - Prism 스타일의 리전 기반 View-First 네비게이션 (Back/Forward, KeepAlive 지원)
- **💬 Advanced Dialog System** - 오버레이 기반 in-window 다이얼로그 시스템 (중첩 지원, 강타입 `IDialogResult<T>`)
- **🔔 Toast Service** - 현대적이고 비침투적인 알림 시스템 (자동 닫힘, 위치 설정, UI 커스터마이징)
- **📡 Event Aggregation** - Pub/Sub 패턴 기반 약결합 이벤트 통신 (Weak Event, 필터 지원)
- **🎨 Theme Management** - 동적 테마 전환 및 스타일 관리 (Light/Dark/System)
- **💾 Strongly-Typed Settings** - 컴파일 타임 타입 안전성과 IntelliSense 지원하는 설정 시스템
- **🔗 ViewModelLocator** - View-ViewModel 자동 매핑 (컨벤션 기반)

### Advanced Features
- **🧩 Module System** - Prism 스타일 모듈 시스템 (의존성 해결, 순환 참조 감지)
- **⚡ CompositeCommand** - 여러 명령을 하나로 조합 (IActiveAware 지원)
- **✅ Validation Support** - `INotifyDataErrorInfo` 기반 Data Annotations 검증
- **🔐 Navigation Confirmation** - 다이얼로그 기반 네비게이션 확인 (`IConfirmNavigationRequest`)
- **🔄 Service Scopes** - AsyncLocal 기반 범위 지정 서비스 (IScopeAccessor)
- **♻️ Resource Management** - `IDisposable` 자동 정리, `IRegionMemberLifetime`

### Infrastructure
- **🚀 Application Bootstrap** - 스플래시 스크린 지원 (선택적), `IProgress<InitializationProgress>` 기반 진행률 보고
- **📝 Comprehensive Logging** - Serilog 기반 구조화된 로깅
- **🏗️ Dependency Injection** - Microsoft.Extensions.DependencyInjection 통합

## 📦 프로젝트 구조

```
Jinobald/
├── src/
│   ├── Jinobald.Core/          # 플랫폼 독립적 추상화 계층
│   │   ├── Mvvm/                # ViewModelBase, ValidatableViewModelBase, INavigationAware
│   │   ├── Commands/            # CompositeCommand, IActiveAware
│   │   ├── Modularity/          # IModule, ModuleCatalog, ModuleManager
│   │   ├── Services/            # 핵심 서비스 인터페이스
│   │   │   ├── Events/          # IEventAggregator, PubSubEvent (Weak Event, Filter)
│   │   │   ├── Dialog/          # IDialogService, IDialogResult<T>, IDialogAware<T>
│   │   │   ├── Regions/         # IRegionManager, IRegion, IConfirmNavigationRequest
│   │   │   ├── Theme/           # IThemeService
│   │   │   └── Settings/        # ITypedSettingsService (Strongly-Typed)
│   │   └── Ioc/                 # DI 컨테이너 추상화, IScopeAccessor
│   ├── Jinobald.Wpf/           # WPF 플랫폼 구현체
│   └── Jinobald.Avalonia/      # Avalonia 플랫폼 구현체
├── samples/
│   ├── Jinobald.Sample.Avalonia/  # Avalonia 샘플 애플리케이션
│   └── Jinobald.Sample.Wpf/       # WPF 샘플 애플리케이션
└── tests/
    ├── Jinobald.Core.Tests/       # Core 유닛 테스트
    ├── Jinobald.Wpf.Tests/        # WPF 유닛 테스트
    └── Jinobald.Avalonia.Tests/   # Avalonia 유닛 테스트
```

### 솔루션 파일
- `Jinobald.slnx` - 전체 솔루션 (Windows)
- `Jinobald.Mac.slnx` - macOS/Linux용 (WPF 제외)

## 🚀 빠른 시작

### 1️⃣ 애플리케이션 설정

Jinobald는 두 가지 ApplicationBase를 제공합니다:
- `ApplicationBase<TMainWindow>` - 스플래시 없음, `OnInitializeAsync()` 선택적 오버라이드
- `ApplicationBase<TMainWindow, TSplashWindow>` - 스플래시 포함, `OnInitializeAsync(IProgress<InitializationProgress>)` **필수 구현**

#### Avalonia 애플리케이션 (스플래시 포함)

```csharp
// App.axaml.cs
using Jinobald.Avalonia.Application;
using Jinobald.Core.Application;
using Jinobald.Core.Ioc;

public partial class App : ApplicationBase<MainWindow, SplashScreenWindow>
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void RegisterTypes(IContainerRegistry containerRegistry)
    {
        // Strongly-Typed 설정 서비스 등록
        containerRegistry.RegisterSettings<AppSettings>();

        // MainWindow ViewModel 등록 (Window는 자동 네비게이션이 아니므로 명시적 등록 필요)
        containerRegistry.RegisterSingleton<MainWindowViewModel>();

        // 네비게이션용 View 등록 (ViewModel은 ViewModelLocator가 자동 매핑)
        containerRegistry.RegisterForNavigation<HomeView>();
        containerRegistry.RegisterForNavigation<SettingsView>();

        // 다이얼로그 등록
        containerRegistry.RegisterDialog<ConfirmDialogView>();
    }

    // 스플래시 버전에서는 반드시 구현해야 함
    public override async Task OnInitializeAsync(IProgress<InitializationProgress> progress)
    {
        progress.Report(new("초기화 중...", 50));

        // Avalonia는 테마가 ThemeVariant로 자동 처리됨 (별도 등록 불필요)
        await Task.Delay(500); // 예시용

        progress.Report(new("완료!", 100));
    }
}
```

#### WPF 애플리케이션 (스플래시 포함)

```csharp
// App.xaml.cs
using Jinobald.Wpf.Application;
using Jinobald.Core.Application;
using Jinobald.Core.Ioc;

public partial class App : ApplicationBase<MainWindow, SplashScreenWindow>
{
    public override void RegisterTypes(IContainerRegistry containerRegistry)
    {
        // Strongly-Typed 설정 서비스 등록
        containerRegistry.RegisterSettings<AppSettings>();

        // MainWindow ViewModel 등록
        containerRegistry.RegisterSingleton<MainWindowViewModel>();

        // 네비게이션용 View 등록
        containerRegistry.RegisterForNavigation<HomeView>();
        containerRegistry.RegisterForNavigation<DetailView>();

        // 다이얼로그 등록
        containerRegistry.RegisterDialog<ConfirmDialogView>();
    }

    // 스플래시 버전에서는 반드시 구현해야 함
    public override async Task OnInitializeAsync(IProgress<InitializationProgress> progress)
    {
        progress.Report(new("테마 로딩 중...", 30));

        // WPF 테마 ResourceDictionary 등록
        var themeService = Container!.Resolve<IThemeService>();
        themeService.RegisterTheme("Light", new ResourceDictionary
        {
            Source = new Uri("pack://application:,,,/Themes/LightTheme.xaml")
        });
        themeService.RegisterTheme("Dark", new ResourceDictionary
        {
            Source = new Uri("pack://application:,,,/Themes/DarkTheme.xaml")
        });

        progress.Report(new("테마 적용 중...", 70));
        themeService.ApplySavedTheme();

        progress.Report(new("완료!", 100));
    }
}
```

#### 스플래시 없는 간단한 앱

```csharp
// 스플래시 없이 간단하게 시작
public partial class App : ApplicationBase<MainWindow>
{
    public override void RegisterTypes(IContainerRegistry containerRegistry)
    {
        containerRegistry.RegisterForNavigation<HomeView>();
    }

    // 선택적 - 오버라이드하지 않아도 됨
    public override Task OnInitializeAsync()
    {
        // 초기화 로직
        return Task.CompletedTask;
    }
}
```

> **Note**: `MainWindow`처럼 `ViewModelLocator.AutoWireViewModel="True"`를 사용하지만 네비게이션으로 생성되지 않는 Window의 ViewModel은 명시적으로 등록해야 합니다.

### 2️⃣ ViewModel 작성

```csharp
using Jinobald.Core.Mvvm;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

public partial class MainViewModel : ViewModelBase, INavigationAware
{
    private readonly IRegionManager _regionManager;
    private readonly IEventAggregator _eventAggregator;

    [ObservableProperty]
    private string _title = "Main View";

    public MainViewModel(IRegionManager regionManager, IEventAggregator eventAggregator)
    {
        _regionManager = regionManager;
        _eventAggregator = eventAggregator;
    }

    [RelayCommand]
    private async Task NavigateToDetails()
    {
        // View-First 네비게이션: View 타입을 직접 지정
        await _regionManager.NavigateAsync<DetailView>("ContentRegion");
    }

    // 네비게이션 라이프사이클
    public Task<bool> OnNavigatingToAsync(NavigationContext context)
    {
        // 이 View로 네비게이션 되기 전 (취소 가능)
        return Task.FromResult(true);
    }

    public Task OnNavigatedToAsync(NavigationContext context)
    {
        // 이 View로 네비게이션 완료 후
        return Task.CompletedTask;
    }

    public Task<bool> OnNavigatingFromAsync(NavigationContext context)
    {
        // 이 View에서 나가기 전 검증 (취소 가능)
        return Task.FromResult(true);
    }

    public Task OnNavigatedFromAsync(NavigationContext context)
    {
        // 이 View에서 완전히 나간 후
        return Task.CompletedTask;
    }
}
```

## 🎮 샘플 애플리케이션

WPF와 Avalonia 샘플 앱은 프레임워크의 모든 주요 기능을 데모합니다:

| 데모 | 기능 | 주요 서비스 |
|------|------|-------------|
| **Home** | 프레임워크 개요 | - |
| **Navigation** | Region 기반 View-First 네비게이션, Back/Forward | `IRegionManager` |
| **Dialogs** | 오버레이 다이얼로그, 중첩 다이얼로그, ButtonResult | `IDialogService` |
| **Themes** | 동적 테마 전환 (Light/Dark), 설정 저장 | `IThemeService`, `ITypedSettingsService` |
| **Regions** | 다중 리전, KeepAlive, NavigationMode | `IRegionManager` |
| **Events** | Pub/Sub 이벤트, ThreadOption, 구독/발행 | `IEventAggregator` |
| **Toasts** | 비침투적 알림, 4가지 타입, 위치 설정, 자동 닫힘 | `IToastService` |
| **Advanced** | ValidatableViewModelBase, CompositeCommand, Event Filter/Weak, IConfirmNavigationRequest, IRegionMemberLifetime, IDisposable | 복합 |

```bash
# Avalonia 샘플 실행
dotnet run --project samples/Jinobald.Sample.Avalonia

# WPF 샘플 실행 (Windows 전용)
dotnet run --project samples/Jinobald.Sample.Wpf
```

## 📚 주요 기능 가이드

### 🎯 Region Manager

Prism 스타일의 Region 시스템으로 **View-First 네비게이션**을 제공합니다. Region은 UI의 특정 영역을 나타내며, 각 Region은 독립적인 네비게이션 컨텍스트를 가집니다.

#### XAML에서 Region 정의

**Avalonia & WPF:**
```xml
<Window xmlns:jino="https://github.com/JinoPay/Jinobald">
    <Grid>
        <!-- 기본 리전 -->
        <ContentControl jino:Region.Name="MainRegion" />

        <!-- 기본 뷰 설정 -->
        <ContentControl jino:Region.Name="SidebarRegion"
                        jino:Region.DefaultView="views:NavigationView" />

        <!-- Keep-Alive 활성화 (뷰 재사용) -->
        <ContentControl jino:Region.Name="ContentRegion"
                        jino:Region.DefaultView="views:HomeView"
                        jino:Region.KeepAlive="True" />

        <!-- 네비게이션 모드 설정 -->
        <ContentControl jino:Region.Name="TabRegion"
                        jino:Region.NavigationMode="Stack" /> <!-- Stack, Replace, Accumulate -->

        <!-- ItemsControl 리전 (다중 뷰) -->
        <ItemsControl jino:Region.Name="MultiViewRegion"
                      jino:Region.NavigationMode="Accumulate" />
    </Grid>
</Window>
```

**Region Attached Properties:**
- `jino:Region.Name` - 리전 이름 (필수)
- `jino:Region.DefaultView` - 리전 생성 시 자동으로 표시할 View 타입
- `jino:Region.KeepAlive` - 네비게이션 시 뷰 캐시 여부 (기본값: false)
- `jino:Region.NavigationMode` - 네비게이션 모드 (Stack/Replace/Accumulate)

#### View-First 네비게이션

```csharp
public partial class ShellViewModel : ViewModelBase
{
    private readonly IRegionManager _regionManager;

    public ShellViewModel(IRegionManager regionManager)
    {
        _regionManager = regionManager;
    }

    [RelayCommand]
    private async Task ShowHome()
    {
        // View 타입으로 네비게이션
        await _regionManager.NavigateAsync<HomeView>("MainRegion");
    }

    [RelayCommand]
    private async Task NavigateWithParameter()
    {
        // 파라미터 전달 (단일 객체)
        var parameter = new ProductDetailParameter { ProductId = 123, Mode = "Edit" };
        await _regionManager.NavigateAsync<DetailView>("MainRegion", parameter);
    }

    [RelayCommand]
    private async Task GoBack()
    {
        // 이전 뷰로 이동
        if (_regionManager.CanGoBack("MainRegion"))
            await _regionManager.GoBackAsync("MainRegion");
    }

    [RelayCommand]
    private async Task GoForward()
    {
        // 다음 뷰로 이동
        if (_regionManager.CanGoForward("MainRegion"))
            await _regionManager.GoForwardAsync("MainRegion");
    }

    [RelayCommand]
    private void AddTab()
    {
        // 리전에 뷰 추가 (Accumulate 모드)
        _regionManager.AddToRegion<TabView>("TabRegion");
    }
}
```

**ViewModel은 ViewModelLocator를 통해 자동으로 생성되고 연결됩니다:**
- `HomeView` → `HomeViewModel` (자동 생성 및 DataContext 바인딩)
- `DetailView` → `DetailViewModel`
- `TabView` → `TabViewModel`

#### Region 이벤트 구독

```csharp
public class ShellViewModel : ViewModelBase
{
    public ShellViewModel(IRegionManager regionManager)
    {
        regionManager.RegionAdded += OnRegionAdded;
        regionManager.RegionRemoved += OnRegionRemoved;
    }

    private void OnRegionAdded(object? sender, IRegion region)
    {
        Console.WriteLine($"Region added: {region.Name}");
    }
}
```

### 🔗 ViewModel Locator

View와 ViewModel을 컨벤션 기반으로 자동 연결하는 ViewModelLocator를 제공합니다.

#### XAML에서 자동 바인딩

**Avalonia & WPF:**
```xml
<Window xmlns:jino="https://github.com/JinoPay/Jinobald"
        jino:ViewModelLocator.AutoWireViewModel="True">
    <!-- View가 로드될 때 자동으로 ViewModel이 DataContext에 연결됩니다 -->
</Window>
```

#### 컨벤션 규칙

ViewModelLocator는 다음 패턴으로 자동 매칭합니다:
- `Views.HomeView` → `ViewModels.HomeViewModel`
- `Views.Settings.ProfileView` → `ViewModels.Settings.ProfileViewModel`
- `ShellWindow` → `ShellViewModel`
- `MainWindow` → `MainWindowViewModel`

```csharp
// ViewModelLocator는 ContainerLocator를 통해 ViewModel을 resolve합니다
// RegisterForNavigation<View>()는 View와 ViewModel 모두 자동 등록합니다

protected override void RegisterTypes(IContainerRegistry containerRegistry)
{
    // View만 지정하면 ViewModel은 자동으로 매핑됨 (권장)
    containerRegistry.RegisterForNavigation<HomeView>();
    containerRegistry.RegisterForNavigation<SettingsView>();
    containerRegistry.RegisterForNavigation<EventDemoView>();

    // View와 ViewModel을 명시적으로 지정할 수도 있음
    // containerRegistry.RegisterForNavigation<HomeView, HomeViewModel>();

    // 다이얼로그도 View만 등록
    containerRegistry.RegisterDialog<ConfirmDialogView>();

    // MainWindow ViewModel은 명시적 등록 필요 (네비게이션으로 생성되지 않음)
    containerRegistry.RegisterSingleton<MainWindowViewModel>();
}
```

> **중요**: `RegisterForNavigation<View>()`는 View와 매칭되는 ViewModel을 자동으로 DI 컨테이너에 등록합니다. 하지만 `MainWindow`처럼 네비게이션으로 생성되지 않는 Window의 ViewModel은 `RegisterSingleton<T>()`로 명시적 등록이 필요합니다.

### 💬 Dialog Service

Prism 스타일의 강력한 다이얼로그 시스템을 제공합니다.

**주요 기능:**
- ✅ In-window overlay 방식 (모달 다이얼로그)
- ✅ 중첩 다이얼로그 지원 (다이얼로그 위에 다이얼로그)
- ✅ Prism 스타일 ButtonResult (OK, Cancel, Yes, No 등)
- ✅ Async/await 기반 API
- ✅ View-First 방식 (자동 ViewModel 매핑)

#### DialogHost 설정

**1. DialogHost 스타일은 자동으로 로드됩니다**

`ApplicationBase`가 자동으로 DialogHost 스타일을 로드하므로, 별도로 StyleInclude를 추가할 필요가 없습니다.

**2. MainWindow에 DialogHost 추가:**

```xml
<Window xmlns:jino="https://github.com/JinoPay/Jinobald"
        ...>
    <jino:DialogHost x:Name="DialogHost">
        <!-- 메인 콘텐츠 -->
        <ContentControl jino:Region.Name="MainContentRegion" />
    </jino:DialogHost>
</Window>
```

**3. 코드비하인드에서 DialogService 등록 (생성자 주입):**

```csharp
// Avalonia & WPF
public partial class MainWindow : Window
{
    public MainWindow(IDialogService dialogService)
    {
        InitializeComponent();

        // DialogHost를 DialogService에 등록 (생성자 주입)
        dialogService.RegisterHost(DialogHost);
    }
}
```

**4. App.axaml.cs에서 Dialog 등록 (View만 등록):**

```csharp
protected override void RegisterTypes(IContainerRegistry containerRegistry)
{
    // View만 등록 - ViewModel은 ViewModelLocator가 자동으로 매핑
    containerRegistry.RegisterDialog<ConfirmDialogView>();
    containerRegistry.RegisterDialog<MessageDialogView>();
}
```

#### Dialog ViewModel 작성

`DialogViewModelBase`를 상속하고 ButtonResult를 사용합니다:

```csharp
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Dialog;

public partial class ConfirmDialogViewModel : DialogViewModelBase
{
    [ObservableProperty]
    private string _message = string.Empty;

    public override void OnDialogOpened(IDialogParameters parameters)
    {
        Message = parameters.GetValue<string>("Message") ?? "확인하시겠습니까?";
    }

    [RelayCommand]
    private void Yes()
    {
        // Prism 스타일 ButtonResult 사용
        CloseWithButtonResult(ButtonResult.Yes);
    }

    [RelayCommand]
    private void No()
    {
        CloseWithButtonResult(ButtonResult.No);
    }
}
```

#### Dialog 호출 및 결과 처리

```csharp
public partial class MainViewModel : ViewModelBase
{
    private readonly IDialogService _dialogService;

    [RelayCommand]
    private async Task ShowConfirmDialog()
    {
        var parameters = new DialogParameters
        {
            { "Message", "정말로 삭제하시겠습니까?" }
        };

        var result = await _dialogService.ShowDialogAsync<ConfirmDialogView>(parameters);

        if (result?.Result == ButtonResult.Yes)
        {
            // Yes 버튼 클릭됨
            await DeleteItemAsync();
        }
    }
}
```

#### 중첩 다이얼로그

다이얼로그 안에서 또 다른 다이얼로그를 표시할 수 있습니다:

```csharp
[RelayCommand]
private async Task ShowNestedDialog()
{
    // 첫 번째 다이얼로그 표시
    var result1 = await _dialogService.ShowDialogAsync<MessageDialogView>(parameters1);

    if (result1?.Result == ButtonResult.OK)
    {
        // 두 번째 다이얼로그 표시 (첫 번째 위에 오버레이)
        var result2 = await _dialogService.ShowDialogAsync<ConfirmDialogView>(parameters2);
    }
}
```

#### ButtonResult 종류

```csharp
public enum ButtonResult
{
    None = 0,    // 결과 없음
    OK = 1,      // OK 버튼
    Cancel = 2,  // Cancel 버튼
    Yes = 3,     // Yes 버튼
    No = 4,      // No 버튼
    Abort = 5,   // Abort 버튼
    Retry = 6,   // Retry 버튼
    Ignore = 7   // Ignore 버튼
}
```

### 🔔 Toast Service

현대적이고 비침투적인 알림 시스템을 제공합니다.

**주요 기능:**
- ✅ 비침투적(non-intrusive) 알림 방식
- ✅ 자동 닫힘 (타임아웃 설정 가능)
- ✅ 여러 토스트 동시 표시 가능
- ✅ 4가지 토스트 타입 (Success, Info, Warning, Error)
- ✅ 커스터마이징 가능한 UI (DataTemplate)
- ✅ 위치 설정 지원 (TopRight, BottomRight 등)

#### ToastHost 설정

**1. ToastHost 스타일은 자동으로 로드됩니다**

`ApplicationBase`가 자동으로 ToastHost 스타일을 로드하므로, 별도로 StyleInclude를 추가할 필요가 없습니다.

**2. MainWindow에 ToastHost 추가:**

```xml
<Window xmlns:jino="https://github.com/JinoPay/Jinobald"
        ...>
    <Panel>
        <!-- 메인 콘텐츠 -->
        <ContentControl jino:Region.Name="MainContentRegion" />

        <!-- ToastHost는 콘텐츠 위에 오버레이 (Panel의 마지막 자식으로 배치) -->
        <jino:ToastHost x:Name="ToastHost" Position="TopRight" MaxToasts="5" />
    </Panel>
</Window>
```

> **중요:** ToastHost는 Panel의 **마지막 자식**으로 배치해야 다른 콘텐츠 위에 표시됩니다.

**3. 코드비하인드에서 ToastService 등록 (생성자 주입):**

```csharp
// Avalonia & WPF
public partial class MainWindow : Window
{
    public MainWindow(IDialogService dialogService, IToastService toastService)
    {
        InitializeComponent();

        // DialogService와 ToastService에 Host 등록 (생성자 주입)
        dialogService.RegisterHost(DialogHost);
        toastService.RegisterHost(ToastHost);
    }
}
```

#### 토스트 사용법

**간단한 사용:**

```csharp
public partial class MainViewModel : ViewModelBase
{
    private readonly IToastService _toastService;

    public MainViewModel(IToastService toastService)
    {
        _toastService = toastService;
    }

    [RelayCommand]
    private void SaveData()
    {
        // 데이터 저장 로직...

        // 성공 토스트 표시
        _toastService.ShowSuccess("데이터가 저장되었습니다!");
    }

    [RelayCommand]
    private void LoadData()
    {
        try
        {
            // 데이터 로드 로직...
            _toastService.ShowInfo("데이터를 불러왔습니다.");
        }
        catch (Exception ex)
        {
            _toastService.ShowError($"오류 발생: {ex.Message}");
        }
    }
}
```

**커스텀 토스트:**

```csharp
// 긴 메시지와 커스텀 표시 시간
_toastService.ShowInfo(
    "이것은 상세한 메시지입니다...",
    title: "상세 정보",
    duration: 5  // 5초 동안 표시
);

// 완전히 커스텀 토스트
_toastService.Show(new ToastMessage
{
    Type = ToastType.Warning,
    Title = "주의",
    Message = "이 작업은 취소할 수 없습니다.",
    Duration = 10  // 10초 동안 표시
});
```

**여러 토스트 동시 표시:**

```csharp
_toastService.ShowSuccess("첫 번째 작업 완료");
_toastService.ShowSuccess("두 번째 작업 완료");
_toastService.ShowInfo("세 번째 작업 완료");
// 모든 토스트가 동시에 표시됨
```

**모든 토스트 닫기:**

```csharp
_toastService.ClearAll();
```

#### ToastPosition 종류

```csharp
public enum ToastPosition
{
    TopRight,     // 상단 오른쪽 (기본값)
    TopLeft,      // 상단 왼쪽
    TopCenter,    // 상단 중앙
    BottomRight,  // 하단 오른쪽
    BottomLeft,   // 하단 왼쪽
    BottomCenter  // 하단 중앙
}
```

#### UI 커스터마이징

ToastHost는 사용자가 DataTemplate을 통해 UI를 완전히 커스터마이징할 수 있습니다:

```xml
<jino:ToastHost x:Name="ToastHost" Position="TopRight">
    <jino:ToastHost.ItemTemplate>
        <DataTemplate DataType="toast:ToastMessage">
            <!-- 커스텀 토스트 UI -->
            <Border Background="Purple" CornerRadius="16" Padding="20">
                <TextBlock Text="{Binding Message}" Foreground="White" />
            </Border>
        </DataTemplate>
    </jino:ToastHost.ItemTemplate>
</jino:ToastHost>
```

### 🔄 Event Aggregation

Prism 스타일의 이벤트 집계로 느슨하게 결합된 컴포넌트 간 통신을 구현합니다.

#### 이벤트 정의

```csharp
using Jinobald.Core.Services.Events;

public class UserLoggedInEvent : PubSubEvent
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public DateTime LoginTime { get; set; }
}
```

#### 이벤트 구독 및 발행

```csharp
public partial class DashboardViewModel : ViewModelBase
{
    private readonly IEventAggregator _eventAggregator;

    public DashboardViewModel(IEventAggregator eventAggregator)
    {
        _eventAggregator = eventAggregator;

        // Prism 스타일 구독 (권장)
        _eventAggregator.GetEvent<UserLoggedInEvent>()
            .Subscribe(OnUserLoggedIn, ThreadOption.UIThread);
    }

    private void OnUserLoggedIn(UserLoggedInEvent e)
    {
        Title = $"Welcome, {e.UserName}!";
        LastLogin = e.LoginTime;
    }

    [RelayCommand]
    private void PublishLogin()
    {
        _eventAggregator.GetEvent<UserLoggedInEvent>()
            .Publish(new UserLoggedInEvent
            {
                UserId = 123,
                UserName = "홍길동",
                LoginTime = DateTime.Now
            });
    }
}
```

#### 고급 구독 옵션

```csharp
// UI 스레드에서 실행
_eventAggregator.Subscribe<DataChangedEvent>(
    e => UpdateUI(e),
    ThreadOption.UIThread
);

// 백그라운드 스레드에서 실행 (비동기)
_eventAggregator.Subscribe<DataProcessingEvent>(
    async e => await ProcessDataAsync(e),
    ThreadOption.BackgroundThread
);

// Prism 스타일 구독
_eventAggregator.GetEvent<StatusUpdateEvent>()
    .Subscribe(OnStatusUpdate, ThreadOption.UIThread);

// 구독 해제
var token = _eventAggregator.Subscribe<MyEvent>(OnMyEvent);
_eventAggregator.Unsubscribe(token);
// 또는 Dispose 사용
using var subscription = _eventAggregator.Subscribe<MyEvent>(OnMyEvent);
```

### 🎨 Theme Service

다크/라이트 모드를 기본 지원하며, 런타임에 테마를 동적으로 전환할 수 있습니다.

**주요 기능:**
- ✅ Dark/Light 모드 기본 지원
- ✅ Avalonia의 FluentTheme 및 WPF ResourceDictionary 통합
- ✅ 런타임 테마 전환
- ✅ ITypedSettingsService를 통한 테마 설정 자동 저장/로드

#### WPF 테마 설정

WPF에서는 테마 ResourceDictionary를 직접 등록해야 합니다:

```csharp
// App.xaml.cs (스플래시 버전)
public override async Task OnInitializeAsync(IProgress<InitializationProgress> progress)
{
    progress.Report(new("테마 로딩 중...", 30));

    var themeService = Container!.Resolve<IThemeService>();

    // 테마 ResourceDictionary 등록
    themeService.RegisterTheme("Light", new ResourceDictionary
    {
        Source = new Uri("pack://application:,,,/Themes/LightTheme.xaml")
    });
    themeService.RegisterTheme("Dark", new ResourceDictionary
    {
        Source = new Uri("pack://application:,,,/Themes/DarkTheme.xaml")
    });

    progress.Report(new("테마 적용 중...", 70));

    // 저장된 테마 적용
    themeService.ApplySavedTheme();

    progress.Report(new("완료!", 100));
}
```

#### Avalonia 테마 설정

Avalonia는 기본 테마(Light, Dark, System)가 자동 등록됩니다 (ThemeVariant 사용):

```csharp
// App.axaml.cs (스플래시 버전)
public override Task OnInitializeAsync(IProgress<InitializationProgress> progress)
{
    progress.Report(new("초기화 중...", 50));
    // Avalonia는 별도 테마 등록 불필요
    progress.Report(new("완료!", 100));
    return Task.CompletedTask;
}
```

#### ViewModel에서 테마 사용

```csharp
public partial class SettingsViewModel : ViewModelBase
{
    private readonly IThemeService _themeService;

    public SettingsViewModel(IThemeService themeService)
    {
        _themeService = themeService;

        // 현재 테마 가져오기
        CurrentTheme = _themeService.CurrentTheme; // "Light", "Dark"
    }

    [RelayCommand]
    private void ToggleDarkMode()
    {
        // 다크/라이트 모드 토글
        var isDark = _themeService.CurrentTheme == "Dark";
        _themeService.SetTheme(isDark ? "Light" : "Dark");
    }

    [RelayCommand]
    private void SetLightTheme()
    {
        _themeService.SetTheme("Light");
    }

    [RelayCommand]
    private void SetDarkTheme()
    {
        _themeService.SetTheme("Dark");
    }
}
```

**중요:** View나 ViewModel에서 색상을 하드코딩하지 마세요. 항상 DynamicResource를 통해 테마 리소스를 참조하세요:

```xml
<!-- Good: 테마에 따라 자동으로 변경됨 -->
<Border Background="{DynamicResource BackgroundBrush}" />
<TextBlock Foreground="{DynamicResource ForegroundBrush}" />
<Border BorderBrush="{DynamicResource PrimaryBrush}" />

<!-- Bad: 하드코딩된 색상은 테마 전환 시 변경되지 않음 -->
<Border Background="#FFFFFF" />
```

#### 테마 리소스 예제 (WPF)

```xml
<!-- Themes/LightTheme.xaml -->
<ResourceDictionary>
    <Color x:Key="PrimaryColor">#0078D4</Color>
    <Color x:Key="BackgroundColor">#FFFFFF</Color>
    <Color x:Key="ForegroundColor">#1A1A1A</Color>
    <Color x:Key="SurfaceColor">#F5F5F5</Color>

    <SolidColorBrush x:Key="PrimaryBrush" Color="{StaticResource PrimaryColor}" />
    <SolidColorBrush x:Key="BackgroundBrush" Color="{StaticResource BackgroundColor}" />
    <SolidColorBrush x:Key="ForegroundBrush" Color="{StaticResource ForegroundColor}" />
    <SolidColorBrush x:Key="SurfaceBrush" Color="{StaticResource SurfaceColor}" />
</ResourceDictionary>
```

### 💾 Settings Service

Strongly-Typed 설정 서비스를 제공합니다. 컴파일 타임 타입 안전성과 IntelliSense 지원을 제공합니다.

#### 설정 클래스 정의

```csharp
// Settings/AppSettings.cs
public class AppSettings
{
    public string Theme { get; set; } = "Light";
    public string Language { get; set; } = "ko-KR";
    public WindowSettings Window { get; set; } = new();
    public UserSettings User { get; set; } = new();
}

public class WindowSettings
{
    public double Width { get; set; } = 1024;
    public double Height { get; set; } = 768;
    public bool IsMaximized { get; set; }
}

public class UserSettings
{
    public string Name { get; set; } = string.Empty;
    public bool AutoSave { get; set; } = true;
    public int MaxRecentFiles { get; set; } = 10;
}
```

#### 설정 서비스 등록

```csharp
// App.xaml.cs 또는 App.axaml.cs
protected override void RegisterTypes(IContainerRegistry containerRegistry)
{
    // Strongly-Typed 설정 서비스 등록
    containerRegistry.RegisterSettings<AppSettings>();

    // 사용자 지정 파일 경로로 등록
    // containerRegistry.RegisterSettings<AppSettings>("C:/MyApp/settings.json");
}
```

#### ViewModel에서 사용

```csharp
public partial class SettingsViewModel : ViewModelBase
{
    private readonly ITypedSettingsService<AppSettings> _settings;

    public SettingsViewModel(ITypedSettingsService<AppSettings> settings)
    {
        _settings = settings;

        // 타입 안전한 설정 접근 (IntelliSense 지원!)
        var theme = _settings.Value.Theme;
        var userName = _settings.Value.User.Name;

        // 설정 변경 감지
        _settings.SettingsChanged += OnSettingsChanged;
    }

    [RelayCommand]
    private void ChangeTheme(string theme)
    {
        // 설정 업데이트 (자동 저장됨)
        _settings.Update(s => s.Theme = theme);
    }

    [RelayCommand]
    private void UpdateUserSettings()
    {
        // 중첩된 설정도 쉽게 업데이트
        _settings.Update(s =>
        {
            s.User.Name = "홍길동";
            s.User.AutoSave = true;
            s.User.MaxRecentFiles = 20;
        });
    }

    [RelayCommand]
    private void ResetToDefaults()
    {
        // 기본값으로 초기화
        _settings.Reset();
    }

    private void OnSettingsChanged(AppSettings settings)
    {
        Console.WriteLine($"테마 변경됨: {settings.Theme}");
    }
}
```

#### 키-값 vs Strongly-Typed 비교

| 기능 | 키-값 방식 | Strongly-Typed |
|------|-----------|----------------|
| 컴파일 타임 검증 | ❌ 런타임 오류 | ✅ 컴파일 오류 |
| IntelliSense | ❌ | ✅ |
| 리팩토링 | ❌ 수동 검색 | ✅ 자동 |
| 중첩 설정 | 불편함 | 자연스러움 |
| 기본값 정의 | 코드에 분산 | 클래스에 집중 |


## 🧩 Module System

Prism 스타일의 모듈 시스템으로 대규모 애플리케이션을 모듈화할 수 있습니다.

### 모듈 정의

```csharp
using Jinobald.Core.Modularity;
using Jinobald.Core.Ioc;

// 기본 모듈
public class ProductModule : IModule
{
    public void RegisterTypes(IContainerRegistry containerRegistry)
    {
        containerRegistry.RegisterForNavigation<ProductListView>();
        containerRegistry.RegisterForNavigation<ProductDetailView>();
        containerRegistry.RegisterSingleton<IProductService, ProductService>();
    }

    public void OnInitialized(IContainerProvider containerProvider)
    {
        // 모듈 초기화 로직
        var regionManager = containerProvider.Resolve<IRegionManager>();
        regionManager.RegisterViewWithRegion<ProductMenuView>("MenuRegion");
    }
}

// 의존성이 있는 모듈
[ModuleDependency(typeof(CoreModule))]
[ModuleDependency(typeof(SecurityModule))]
public class OrderModule : IModule
{
    // CoreModule과 SecurityModule이 먼저 초기화된 후 실행됨
    public void RegisterTypes(IContainerRegistry containerRegistry) { }
    public void OnInitialized(IContainerProvider containerProvider) { }
}
```

### 모듈 카탈로그에 등록

```csharp
// App.xaml.cs
protected override void ConfigureModuleCatalog(IModuleCatalog moduleCatalog)
{
    // 즉시 로드 (기본값)
    moduleCatalog.AddModule<ProductModule>();

    // 지연 로드 (OnDemand)
    moduleCatalog.AddModule<ReportModule>(InitializationMode.OnDemand);

    // 명시적 의존성 지정
    moduleCatalog.AddModule<OrderModule>(
        dependsOn: new[] { typeof(ProductModule), typeof(CustomerModule) }
    );
}
```

### 모듈 수동 로드

```csharp
public class ShellViewModel : ViewModelBase
{
    private readonly IModuleManager _moduleManager;

    [RelayCommand]
    private async Task LoadReportModule()
    {
        // OnDemand 모듈 수동 로드
        await _moduleManager.LoadModuleAsync(typeof(ReportModule));
    }
}
```

## ⚡ CompositeCommand

여러 명령을 하나로 조합하는 복합 명령 패턴입니다.

```csharp
using Jinobald.Core.Commands;

public class ShellViewModel : ViewModelBase
{
    public CompositeCommand SaveAllCommand { get; }

    public ShellViewModel()
    {
        // 기본 CompositeCommand
        SaveAllCommand = new CompositeCommand();

        // 활성 명령만 실행하는 CompositeCommand
        // SaveAllCommand = new CompositeCommand(monitorCommandActivity: true);
    }
}

// 개별 ViewModel에서 명령 등록
public class DocumentViewModel : ViewModelBase, IActiveAware
{
    public DocumentViewModel(ShellViewModel shell)
    {
        SaveCommand = new RelayCommand(Save, CanSave);

        // CompositeCommand에 등록
        shell.SaveAllCommand.RegisterCommand(SaveCommand);
    }

    public ICommand SaveCommand { get; }

    // IActiveAware 구현 (monitorCommandActivity: true일 때 사용)
    public bool IsActive { get; set; }
    public event EventHandler? IsActiveChanged;

    private void Save() { /* 저장 로직 */ }
    private bool CanSave() => HasChanges;
}
```

**Shell에서 전체 저장:**
```xml
<Button Command="{Binding SaveAllCommand}" Content="Save All" />
```

## ✅ Validation (INotifyDataErrorInfo)

`ValidatableViewModelBase`를 사용하여 Data Annotations 기반 검증을 구현합니다.

```csharp
using Jinobald.Core.Mvvm;
using System.ComponentModel.DataAnnotations;

public partial class UserFormViewModel : ValidatableViewModelBase
{
    private string _email = string.Empty;
    private string _name = string.Empty;
    private int _age;

    [Required(ErrorMessage = "이메일은 필수입니다")]
    [EmailAddress(ErrorMessage = "올바른 이메일 형식이 아닙니다")]
    public string Email
    {
        get => _email;
        set => SetPropertyAndValidate(ref _email, value);
    }

    [Required(ErrorMessage = "이름은 필수입니다")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "이름은 2-50자 사이여야 합니다")]
    public string Name
    {
        get => _name;
        set => SetPropertyAndValidate(ref _name, value);
    }

    [Range(1, 150, ErrorMessage = "나이는 1-150 사이여야 합니다")]
    public int Age
    {
        get => _age;
        set => SetPropertyAndValidate(ref _age, value);
    }

    [RelayCommand(CanExecute = nameof(CanSave))]
    private async Task Save()
    {
        // 전체 검증
        if (!ValidateAll())
        {
            // 오류가 있음
            return;
        }

        await SaveUserAsync();
    }

    private bool CanSave() => !HasErrors;
}
```

**XAML에서 오류 표시:**
```xml
<TextBox Text="{Binding Email, UpdateSourceTrigger=PropertyChanged}" />
<TextBlock Text="{Binding (Validation.Errors)[0].ErrorContent,
           RelativeSource={RelativeSource AncestorType=TextBox}}"
           Foreground="Red" />
```

## 📡 Advanced Event Aggregation

### Weak Event Subscription

구독자 참조를 약하게 유지하여 메모리 누수를 방지합니다:

```csharp
public class DashboardViewModel : ViewModelBase
{
    public DashboardViewModel(IEventAggregator eventAggregator)
    {
        // Weak 구독 - GC에 의해 자동 정리됨
        eventAggregator.Subscribe<DataChangedEvent>(
            handler: OnDataChanged,
            threadOption: ThreadOption.UIThread,
            keepSubscriberReferenceAlive: false  // Weak Reference!
        );

        // 일반 구독 (수동 해제 필요, 기본값)
        // eventAggregator.Subscribe<DataChangedEvent>(OnDataChanged);
    }

    private void OnDataChanged(DataChangedEvent e)
    {
        // 이벤트 처리
    }
}
```

### Event Filter Predicates

이벤트를 필터링하여 특정 조건을 만족하는 이벤트만 처리합니다:

```csharp
public class OrderViewModel : ViewModelBase
{
    private readonly string _currentUserId;

    public OrderViewModel(IEventAggregator eventAggregator)
    {
        _currentUserId = "user123";

        // 필터를 사용한 구독 - 현재 사용자의 주문만 처리
        eventAggregator.Subscribe<OrderCreatedEvent>(
            handler: OnOrderCreated,
            filter: e => e.UserId == _currentUserId,
            threadOption: ThreadOption.UIThread
        );

        // Prism 스타일
        eventAggregator.GetEvent<OrderCreatedEvent>()
            .Subscribe(
                action: OnOrderCreated,
                filter: e => e.Status == OrderStatus.Pending
            );
    }

    private void OnOrderCreated(OrderCreatedEvent e)
    {
        // 필터 조건을 만족하는 이벤트만 여기에 도달
    }
}
```

## 🔐 Navigation Confirmation

네비게이션 전에 사용자 확인을 요청합니다 (예: 저장되지 않은 변경사항).

### Callback 방식

```csharp
public class EditViewModel : ViewModelBase, IConfirmNavigationRequest
{
    private readonly IDialogService _dialogService;
    public bool HasUnsavedChanges { get; set; }

    public void ConfirmNavigationRequest(NavigationContext context, Action<bool> continuationCallback)
    {
        if (!HasUnsavedChanges)
        {
            continuationCallback(true);
            return;
        }

        // 비동기 다이얼로그 표시 후 콜백 호출
        Task.Run(async () =>
        {
            var result = await _dialogService.ShowDialogAsync<ConfirmDialogView>(
                new DialogParameters { { "Message", "저장하지 않은 변경사항이 있습니다. 나가시겠습니까?" } }
            );
            continuationCallback(result?.Result == ButtonResult.Yes);
        });
    }

    // INavigationAware 메서드 구현...
}
```

### Async 방식 (권장)

```csharp
public class EditViewModel : ViewModelBase, IConfirmNavigationRequestAsync
{
    private readonly IDialogService _dialogService;
    public bool HasUnsavedChanges { get; set; }

    public async Task<bool> ConfirmNavigationRequestAsync(NavigationContext context)
    {
        if (!HasUnsavedChanges)
            return true;

        var result = await _dialogService.ShowDialogAsync<ConfirmDialogView>(
            new DialogParameters { { "Message", "저장하지 않은 변경사항이 있습니다. 나가시겠습니까?" } }
        );

        return result?.Result == ButtonResult.Yes;
    }

    // INavigationAware 메서드 구현...
}
```

## 💬 Typed Dialog Result

DialogParameters를 통해 강타입 데이터를 반환하는 다이얼로그입니다.

### ViewModel 정의

```csharp
public partial class UserSelectDialogViewModel : DialogViewModelBase
{
    [ObservableProperty]
    private ObservableCollection<User> _users = new();

    [ObservableProperty]
    private User? _selectedUser;

    public override void OnDialogOpened(IDialogParameters parameters)
    {
        // 사용자 목록 로드
        Users = new ObservableCollection<User>(LoadUsers());
    }

    [RelayCommand]
    private void Confirm()
    {
        if (SelectedUser != null)
        {
            // Parameters를 통해 선택된 데이터 전달
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
```

### 호출 및 결과 처리

```csharp
public class MainViewModel : ViewModelBase
{
    [RelayCommand]
    private async Task SelectUser()
    {
        var result = await _dialogService.ShowDialogAsync<UserSelectDialogView>();

        if (result != null)
        {
            if (result.Result == ButtonResult.OK)
            {
                // Parameters에서 강타입 데이터 가져오기
                var user = result.Parameters.GetValue<User>("SelectedUser");
                if (user != null)
                {
                    SelectedUserName = user.Name;
                }
            }
            else if (result.Result == ButtonResult.Cancel)
            {
                // 취소됨
            }
        }
    }
}
```

### DialogViewModelBase Helper Methods

```csharp
// 단순 결과만 반환
CloseWithButtonResult(ButtonResult.OK);
CloseWithButtonResult(ButtonResult.Cancel);
CloseWithButtonResult(ButtonResult.Yes);
CloseWithButtonResult(ButtonResult.No);

// 결과와 함께 데이터 반환
var parameters = new DialogParameters();
parameters.Add("SelectedItem", item);
parameters.Add("Count", 42);
CloseWithParameters(ButtonResult.OK, parameters);
```

## 🔄 Service Scopes

AsyncLocal 기반의 범위 지정 서비스를 지원합니다.

### Scoped 서비스 등록

```csharp
protected override void RegisterTypes(IContainerRegistry containerRegistry)
{
    // Scoped 서비스 등록
    containerRegistry.RegisterScoped<IUnitOfWork, UnitOfWork>();
    containerRegistry.RegisterScoped<IDbContext, AppDbContext>();
}
```

### 범위 내에서 사용

```csharp
public class OrderService
{
    private readonly IScopeFactory _scopeFactory;

    public async Task ProcessOrderAsync(Order order)
    {
        // 새 범위 생성
        using var scope = _scopeFactory.CreateScope();

        var unitOfWork = scope.Resolve<IUnitOfWork>();
        var repository = scope.Resolve<IOrderRepository>();

        await repository.AddAsync(order);
        await unitOfWork.SaveChangesAsync();

        // 범위 종료 시 자동 정리
    }
}
```

### IScopeAccessor로 현재 범위 접근

```csharp
public class AuditService
{
    private readonly IScopeAccessor _scopeAccessor;

    public void LogAction(string action)
    {
        // 현재 범위의 서비스에 접근
        var currentUser = _scopeAccessor.Resolve<ICurrentUser>();
        // ...
    }
}
```

## ♻️ Resource Management

### IDisposable in ViewModelBase

`DisposableCollection`을 통해 리소스를 자동 정리합니다:

```csharp
public class DataViewModel : ViewModelBase
{
    private readonly IDataService _dataService;

    public DataViewModel(IDataService dataService)
    {
        _dataService = dataService;

        // 구독을 Disposables에 추가 - ViewModel 파괴 시 자동 해제
        var subscription = _dataService.DataChanged.Subscribe(OnDataChanged);
        Disposables.Add(subscription);

        // 또는 람다로
        Disposables.Add(Disposable.Create(() =>
        {
            _connection?.Close();
            _timer?.Stop();
        }));
    }

    // ViewModelBase.Dispose() 호출 시 모든 Disposables 자동 정리
}
```

### IRegionMemberLifetime

Region에서 View의 수명을 제어합니다:

```csharp
public class CachedViewModel : ViewModelBase, IRegionMemberLifetime
{
    // true: Region에서 유지됨 (캐시)
    // false: 네비게이션 시 파괴됨
    public bool KeepAlive => true;
}

public class TransientViewModel : ViewModelBase, IRegionMemberLifetime
{
    public bool KeepAlive => false;  // 매번 새로 생성
}
```

**XAML에서 설정:**
```xml
<!-- Region 레벨에서 KeepAlive 설정 (기본값) -->
<ContentControl jino:Region.Name="MainRegion"
                jino:Region.KeepAlive="True" />
```

## 🔌 의존성 주입

ContainerLocator를 통해 어디서든 서비스를 해결할 수 있습니다.

```csharp
using Jinobald.Core.Ioc;

// 서비스 해결
var regionManager = ContainerLocator.Current.Resolve<IRegionManager>();
var dialogService = ContainerLocator.Current.Resolve<IDialogService>();

// 파라미터와 함께 ViewModel 생성
var parameter = new { Id = 123 };
var viewModel = ContainerLocator.Current.Resolve<DetailViewModel>(parameter);
```

## 📝 MVVM 라이프사이클 인터페이스

### INavigationAware

네비게이션 이벤트를 처리합니다.

```csharp
public class ProductViewModel : ViewModelBase, INavigationAware
{
    public Task<bool> OnNavigatingToAsync(NavigationContext context)
    {
        // 네비게이션 시작 전 (취소 가능)
        return Task.FromResult(true);
    }

    public Task OnNavigatedToAsync(NavigationContext context)
    {
        // 네비게이션 완료 후 - 파라미터 가져오기
        var parameter = context.GetParameter<ProductDetailParameter>();
        if (parameter != null)
        {
            return LoadProductAsync(parameter.ProductId);
        }
        return Task.CompletedTask;
    }

    public async Task<bool> OnNavigatingFromAsync(NavigationContext context)
    {
        // 다른 페이지로 이동하기 전 (취소 가능)
        if (HasUnsavedChanges)
            return await ConfirmLeaveAsync();

        return true;
    }

    public Task OnNavigatedFromAsync(NavigationContext context)
    {
        // 다른 페이지로 완전히 이동한 후
        return Task.CompletedTask;
    }
}
```

### IActivatable

활성화/비활성화 상태를 관리합니다.

```csharp
public class DashboardViewModel : ViewModelBase, IActivatable
{
    public Task OnActivatedAsync()
    {
        // View가 활성화될 때 (탭 전환, 윈도우 포커스 등)
        return RefreshDataAsync();
    }

    public Task OnDeactivatedAsync()
    {
        // View가 비활성화될 때
        return PauseUpdatesAsync();
    }
}
```

### IInitializableAsync

비동기 초기화를 지원합니다.

```csharp
public class DataViewModel : ViewModelBase, IInitializableAsync
{
    public async Task InitializeAsync()
    {
        // ViewModel 생성 후 한 번만 실행
        await LoadInitialDataAsync();
        await ConnectToServerAsync();
    }
}
```

### IDestructible

리소스 정리를 처리합니다.

```csharp
public class ConnectionViewModel : ViewModelBase, IDestructible
{
    private readonly IDisposable _subscription;

    public void Destroy()
    {
        // ViewModel이 파괴될 때 리소스 정리
        _subscription?.Dispose();
        _connection?.Close();
    }
}
```

## 🛠️ 빌드 요구사항

- **.NET 9.0 SDK** 이상
- **Jinobald.Core**: 크로스 플랫폼 (Windows, macOS, Linux)
- **Jinobald.Avalonia**: 크로스 플랫폼 (Windows, macOS, Linux)
- **Jinobald.Wpf**: **Windows 전용**

### 빌드 명령

```bash
# 전체 솔루션 빌드 (Windows)
dotnet build Jinobald.slnx

# macOS/Linux 빌드 (WPF 제외)
dotnet build Jinobald.Mac.slnx

# 샘플 앱 실행
dotnet run --project samples/Jinobald.Sample.Avalonia  # Avalonia
dotnet run --project samples/Jinobald.Sample.Wpf      # WPF (Windows 전용)
```

### 테스트

```bash
# 전체 테스트 실행 (Windows)
dotnet test Jinobald.slnx

# macOS/Linux 테스트
dotnet test Jinobald.Mac.slnx

# 개별 테스트 프로젝트
dotnet test tests/Jinobald.Core.Tests
dotnet test tests/Jinobald.Avalonia.Tests
dotnet test tests/Jinobald.Wpf.Tests  # Windows 전용
```

**테스트 커버리지:** 299개 유닛 테스트
- Core Services (Events, Dialog, Regions, Settings)
- MVVM (ViewModelBase, ValidatableViewModelBase, Navigation)
- Commands (CompositeCommand, IActiveAware)
- Modularity (ModuleCatalog, ModuleManager)
- Ioc (ScopeAccessor, ContainerRegistry)

## 🔧 핵심 의존성

### 런타임
- **CommunityToolkit.Mvvm** 8.3.2 - MVVM 헬퍼 (ObservableProperty, RelayCommand 등)
- **Microsoft.Extensions.DependencyInjection** 9.0.0 - DI 컨테이너
- **Serilog** 4.1.0 - 구조화된 로깅
- **Avalonia** 11.2.2 - 크로스 플랫폼 UI (Avalonia 프로젝트용)

### 테스트
- **xUnit** 2.9.2 - 테스트 프레임워크
- **NSubstitute** 5.3.0 - 모킹 라이브러리
- **Avalonia.Headless.XUnit** 11.2.2 - Avalonia UI 테스트 지원

## 🔍 최근 코드 품질 개선 사항

### 2025-12-06 주요 개선

#### 1. 리소스 관리 개선
- **JsonSettingsService**: IDisposable 패턴 구현, SemaphoreSlim 및 Timer 자동 정리
- **JsonTypedSettingsService**: ObjectDisposedException 처리 강화
- **Timer 최적화**: 매번 재생성하던 Timer를 재사용하도록 개선하여 GC 압박 감소

#### 2. 동기 블로킹 제거
- **JsonSettingsService**: `SemaphoreSlim.Wait()` 호출을 제거하여 UI 스레드 데드락 위험 제거
- 모든 동기 메서드에서 비동기 락 대기 패턴 적용

#### 3. 예외 처리 강화
- **DialogService (Avalonia & WPF)**: try-finally 블록으로 예외 발생 시에도 이벤트 핸들러 정리 보장
- 메모리 누수 방지를 위한 안전한 리소스 정리 로직 추가

#### 4. 성능 최적화
- **Region 컬렉션**: List + List 구조를 List + HashSet으로 변경하여 조회 성능 향상
  - `Contains()`, `Activate()`, `Deactivate()` 메서드의 시간 복잡도 O(n) → O(1)
  - 순서 유지와 빠른 조회를 동시에 지원

#### 5. 코드 품질
- 모든 메서드에 ObjectDisposedException 체크 추가
- Timer 이벤트 핸들러에 예외 처리 및 로깅 추가
- 리소스 해제 순서 최적화

이러한 개선 사항들은 프레임워크의 안정성, 성능, 유지보수성을 향상시킵니다.

## 📄 라이선스

MIT License

---

**Built with ❤️ for modern .NET developers**
