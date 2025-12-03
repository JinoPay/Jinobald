# Jinobald

**Enterprise-grade MVVM Framework for WPF & Avalonia**

Jinobald는 현대적인 .NET 애플리케이션 개발을 위한 강력한 크로스 플랫폼 MVVM 프레임워크입니다. Prism과 유사한 구조를 가지며, WPF와 Avalonia를 모두 지원합니다.

## ✨ 핵심 기능

- **🎯 View-First Region Navigation** - Prism 스타일의 리전 기반 View-First 네비게이션 (Back/Forward, KeepAlive 지원)
- **💬 Advanced Dialog System** - 오버레이 기반 in-window 다이얼로그 시스템
- **🔄 Event Aggregation** - Pub/Sub 패턴 기반 약결합 이벤트 통신
- **🎨 Theme Management** - 동적 테마 전환 및 스타일 관리
- **💾 Settings Service** - 타입 안전한 설정 저장/로드 시스템
- **🚀 Application Bootstrap** - 스플래시 스크린과 함께하는 자동 초기화
- **📝 Comprehensive Logging** - Serilog 기반 구조화된 로깅
- **🏗️ Dependency Injection** - Microsoft.Extensions.DependencyInjection 통합

## 📦 프로젝트 구조

```
Jinobald/
├── src/
│   ├── Jinobald.Core/          # 플랫폼 독립적 추상화 계층
│   │   ├── Mvvm/                # ViewModelBase, INavigationAware, IActivatable
│   │   ├── Services/            # 핵심 서비스 인터페이스
│   │   │   ├── Events/          # IEventAggregator, PubSubEvent
│   │   │   ├── Dialog/          # IDialogService, IDialogAware
│   │   │   ├── Regions/         # IRegionManager, IRegion, IRegionNavigationService
│   │   │   ├── Theme/           # IThemeService
│   │   │   └── Settings/        # ISettingsService
│   │   └── Ioc/                 # DI 컨테이너 추상화
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

#### Avalonia 애플리케이션

```csharp
// App.axaml.cs
using Jinobald.Avalonia.Application;
using Jinobald.Core.Ioc;

public partial class App : AvaloniaApplicationBase<MainWindow, SplashScreenWindow>
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    protected override void RegisterTypes(IContainerRegistry containerRegistry)
    {
        // Navigation용 View/ViewModel 등록
        containerRegistry.RegisterForNavigation<HomeView, HomeViewModel>();
        containerRegistry.RegisterForNavigation<SettingsView, SettingsViewModel>();

        // Dialog 등록 (View만 등록 - ViewModel은 자동 매핑)
        containerRegistry.RegisterDialog<ConfirmDialogView>();
        containerRegistry.RegisterDialog<MessageDialogView>();

        // 애플리케이션 서비스 등록
        containerRegistry.RegisterSingleton<IDataService, DataService>();
    }
}
```

#### WPF 애플리케이션

```csharp
// App.xaml.cs
using Jinobald.Wpf.Application;
using Jinobald.Core.Ioc;

public partial class App : WpfApplicationBase<MainWindow, SplashScreenWindow>
{
    protected override void RegisterTypes(IContainerRegistry containerRegistry)
    {
        // Navigation용 View/ViewModel 등록
        containerRegistry.RegisterForNavigation<MainView, MainViewModel>();
        containerRegistry.RegisterForNavigation<DetailView, DetailViewModel>();

        // Dialog 등록 (View만 등록)
        containerRegistry.RegisterDialog<ConfirmDialogView>();
    }
}
```

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

```csharp
// ViewModelLocator는 ContainerLocator를 통해 ViewModel을 resolve합니다
// 따라서 ViewModel을 DI 컨테이너에 등록해야 합니다

protected override void RegisterTypes(IContainerRegistry containerRegistry)
{
    // Navigation 등록 시 View와 ViewModel 함께 등록됨
    containerRegistry.RegisterForNavigation<HomeView, HomeViewModel>();
    containerRegistry.RegisterForNavigation<SettingsView, SettingsViewModel>();
}
```

### 💬 Dialog Service

Prism 스타일의 강력한 다이얼로그 시스템을 제공합니다.

**주요 기능:**
- ✅ In-window overlay 방식 (모달 다이얼로그)
- ✅ 중첩 다이얼로그 지원 (다이얼로그 위에 다이얼로그)
- ✅ Prism 스타일 ButtonResult (OK, Cancel, Yes, No 등)
- ✅ Async/await 기반 API
- ✅ View-First 방식 (자동 ViewModel 매핑)

#### DialogHost 설정

**1. App.axaml에 DialogHost 스타일 포함 (Avalonia):**

```xml
<Application xmlns="https://github.com/avaloniaui"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             x:Class="YourApp.App">
    <Application.Styles>
        <FluentTheme />
        <!-- DialogHost 스타일 포함 (필수!) -->
        <StyleInclude Source="avares://Jinobald.Avalonia/Controls/DialogHost.axaml"/>
    </Application.Styles>
</Application>
```

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

**3. 코드비하인드에서 DialogService 등록:**

```csharp
// Avalonia
public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();

        // DialogHost를 DialogService에 등록
        var dialogService = ContainerLocator.Current.Resolve<IDialogService>();
        dialogService.RegisterHost(DialogHost);
    }
}

// WPF
public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        var dialogService = ContainerLocator.Current.Resolve<IDialogService>();
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
- ✅ SettingsService를 통한 테마 설정 자동 저장/로드

#### WPF 테마 설정

WPF에서는 테마 ResourceDictionary를 직접 등록해야 합니다:

```csharp
// App.xaml.cs
protected override Task OnInitializeAsync()
{
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

    // 저장된 테마 적용
    themeService.ApplySavedTheme();

    return Task.CompletedTask;
}
```

#### Avalonia 테마 설정

Avalonia는 기본 테마(Light, Dark, System)가 자동 등록됩니다:

```csharp
// App.axaml.cs
protected override Task OnInitializeAsync()
{
    var themeService = Container!.Resolve<IThemeService>();
    themeService.ApplySavedTheme();
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

## 📄 라이선스

MIT License

---

**Built with ❤️ for modern .NET developers**
