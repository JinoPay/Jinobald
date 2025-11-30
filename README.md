# Jinobald

**Enterprise-grade MVVM Framework for WPF & Avalonia**

Jinobald는 현대적인 .NET 애플리케이션 개발을 위한 강력한 크로스 플랫폼 MVVM 프레임워크입니다. Prism과 유사한 구조를 가지며, WPF와 Avalonia를 모두 지원합니다.

## ✨ 핵심 기능

- **🎯 Region-Based Navigation** - Prism 스타일의 리전 기반 UI 구성 및 네비게이션
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
│   │   │   ├── Navigation/      # INavigationService
│   │   │   ├── Events/          # IEventAggregator, PubSubEvent
│   │   │   ├── Dialog/          # IDialogService, IDialogAware
│   │   │   ├── Regions/         # IRegionManager, IRegion
│   │   │   ├── Theme/           # IThemeService
│   │   │   └── Settings/        # ISettingsService
│   │   └── Ioc/                 # DI 컨테이너 추상화
│   ├── Jinobald.Wpf/           # WPF 플랫폼 구현체
│   └── Jinobald.Avalonia/      # Avalonia 플랫폼 구현체
├── samples/
│   ├── Jinobald.Sample.Wpf/
│   └── Jinobald.Sample.Avalonia/
└── tests/
    └── Jinobald.Tests/
```

## 🚀 빠른 시작

### 1️⃣ 애플리케이션 설정

#### Avalonia 애플리케이션

```csharp
// App.axaml.cs
using Jinobald.Avalonia.Application;
using Microsoft.Extensions.DependencyInjection;

public partial class App : AvaloniaApplicationBase<MainWindow, SplashScreenWindow>
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        // ViewModels 등록
        services.AddTransient<HomeViewModel>();
        services.AddTransient<SettingsViewModel>();

        // 애플리케이션 서비스 등록
        services.AddSingleton<IDataService, DataService>();
    }
}
```

#### WPF 애플리케이션

```csharp
// App.xaml.cs
using Jinobald.Wpf.Application;
using Microsoft.Extensions.DependencyInjection;

public partial class App : WpfApplicationBase<MainWindow, SplashScreenWindow>
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        // ViewModels 등록
        services.AddTransient<MainViewModel>();
        services.AddTransient<DetailViewModel>();
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
        await _regionManager.NavigateAsync<DetailViewModel>("ContentRegion");
    }

    // 네비게이션 라이프사이클
    public Task OnNavigatedToAsync(NavigationContext context)
    {
        // View가 활성화될 때
        return Task.CompletedTask;
    }

    public Task<bool> OnNavigatingFromAsync(NavigationContext context)
    {
        // View에서 나가기 전 검증 (취소 가능)
        return Task.FromResult(true);
    }
}
```

## 📚 주요 기능 가이드

### 🎯 Region Manager

Prism의 Region 시스템과 동일한 방식으로 UI를 구성하고 네비게이션을 관리합니다.

#### XAML에서 Region 정의

**Avalonia & WPF:**
```xml
<Window xmlns:jino="https://github.com/JinoPay/Jinobald">
    <Grid>
        <!-- ContentControl 리전 -->
        <ContentControl jino:RegionManager.RegionName="MainRegion" />

        <!-- ItemsControl 리전 (다중 뷰) -->
        <ItemsControl jino:RegionManager.RegionName="TabRegion" />
    </Grid>
</Window>
```

#### 코드에서 Region 사용

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
        // 리전으로 네비게이션
        await _regionManager.NavigateAsync<HomeViewModel>("MainRegion");
    }

    [RelayCommand]
    private void AddTab()
    {
        // 리전에 뷰 추가 (다중 뷰 시나리오)
        _regionManager.AddToRegion<TabViewModel>("TabRegion");
    }

    [RelayCommand]
    private async Task NavigateWithParameter()
    {
        var parameter = new { UserId = 123, Mode = "Edit" };
        await _regionManager.NavigateAsync<DetailViewModel>("MainRegion", parameter);
    }
}
```

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

### 💬 Dialog Service

모던한 오버레이 기반 다이얼로그 시스템으로 깔끔한 UX를 제공합니다.

#### Dialog ViewModel 작성

```csharp
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Dialog;

public partial class ConfirmDialogViewModel : ViewModelBase, IDialogAware
{
    [ObservableProperty]
    private string _message = string.Empty;

    public event Action<IDialogResult>? RequestClose;

    public void OnDialogOpened(IDialogParameters parameters)
    {
        Message = parameters.GetValue<string>("Message") ?? "확인하시겠습니까?";
    }

    public bool CanCloseDialog() => true;

    public void OnDialogClosed() { }

    [RelayCommand]
    private void Confirm()
    {
        var result = new DialogResult();
        result.Parameters.Add("Confirmed", true);
        RequestClose?.Invoke(result);
    }

    [RelayCommand]
    private void Cancel()
    {
        var result = new DialogResult();
        result.Parameters.Add("Confirmed", false);
        RequestClose?.Invoke(result);
    }
}
```

#### Dialog 호출

```csharp
public partial class MainViewModel : ViewModelBase
{
    private readonly IDialogService _dialogService;

    [RelayCommand]
    private async Task ShowConfirmDialog()
    {
        var parameters = new DialogParameters();
        parameters.Add("Message", "정말로 삭제하시겠습니까?");

        var result = await _dialogService.ShowDialogAsync<ConfirmDialogViewModel>(parameters);

        if (result?.Parameters.GetValue<bool>("Confirmed") == true)
        {
            // 확인 버튼 클릭됨
            await DeleteItemAsync();
        }
    }
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

// 백그라운드 스레드에서 실행
_eventAggregator.Subscribe<DataProcessingEvent>(
    async e => await ProcessDataAsync(e),
    ThreadOption.BackgroundThread
);

// 약한 참조로 구독 (메모리 누수 방지)
_eventAggregator.GetEvent<StatusUpdateEvent>()
    .Subscribe(OnStatusUpdate, ThreadOption.UIThread, keepSubscriberReferenceAlive: false);
```

### 🎨 Theme Service

런타임에 테마를 동적으로 전환할 수 있습니다.

```csharp
public partial class SettingsViewModel : ViewModelBase
{
    private readonly IThemeService _themeService;

    [RelayCommand]
    private void ChangeTheme(string themeName)
    {
        _themeService.SetTheme(themeName);  // "Light", "Dark", "Custom"
    }

    [RelayCommand]
    private void ToggleDarkMode()
    {
        var isDark = _themeService.CurrentTheme == "Dark";
        _themeService.SetTheme(isDark ? "Light" : "Dark");
    }
}
```

### 💾 Settings Service

타입 안전한 애플리케이션 설정 관리를 제공합니다.

```csharp
public partial class AppSettingsViewModel : ViewModelBase
{
    private readonly ISettingsService _settingsService;

    public AppSettingsViewModel(ISettingsService settingsService)
    {
        _settingsService = settingsService;

        // 설정 변경 감지
        _settingsService.SettingChanged += OnSettingChanged;

        LoadSettings();
    }

    private void LoadSettings()
    {
        Language = _settingsService.Get("Language", "ko-KR");
        Theme = _settingsService.Get("Theme", "Light");
        AutoSave = _settingsService.Get("AutoSave", true);
        MaxRecentFiles = _settingsService.Get("MaxRecentFiles", 10);
    }

    [RelayCommand]
    private void SaveSettings()
    {
        _settingsService.Set("Language", Language);
        _settingsService.Set("Theme", Theme);
        _settingsService.Set("AutoSave", AutoSave);
        _settingsService.Set("MaxRecentFiles", MaxRecentFiles);

        // 자동으로 JSON 파일에 저장됨
    }

    private void OnSettingChanged(string key, object value)
    {
        Console.WriteLine($"Setting changed: {key} = {value}");
    }
}
```

### 🔄 Navigation Service

기본 네비게이션 서비스로 전통적인 페이지 기반 네비게이션을 지원합니다.

```csharp
public partial class MainViewModel : ViewModelBase
{
    private readonly INavigationService _navigationService;

    [RelayCommand]
    private async Task NavigateToDetail()
    {
        await _navigationService.NavigateToAsync<DetailViewModel>();
    }

    [RelayCommand]
    private async Task NavigateWithParameter()
    {
        var param = new { ProductId = 123, Mode = "Edit" };
        await _navigationService.NavigateToAsync<ProductDetailViewModel>(param);
    }

    [RelayCommand]
    private async Task GoBack()
    {
        if (_navigationService.CanGoBack)
            await _navigationService.GoBackAsync();
    }

    [RelayCommand]
    private async Task GoForward()
    {
        if (_navigationService.CanGoForward)
            await _navigationService.GoForwardAsync();
    }
}
```

## 🔌 의존성 주입

ContainerLocator를 통해 어디서든 서비스를 해결할 수 있습니다.

```csharp
using Jinobald.Core.Ioc;

// 서비스 해결
var navigationService = ContainerLocator.Current.Resolve<INavigationService>();

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
    public Task OnNavigatingToAsync(NavigationContext context)
    {
        // 네비게이션 시작 전 (취소 가능)
        return Task.FromResult(true);
    }

    public Task OnNavigatedToAsync(NavigationContext context)
    {
        // 네비게이션 완료 후
        var productId = context.Parameters.GetValue<int>("ProductId");
        return LoadProductAsync(productId);
    }

    public Task<bool> OnNavigatingFromAsync(NavigationContext context)
    {
        // 다른 페이지로 이동하기 전 (취소 가능)
        if (HasUnsavedChanges)
            return Task.FromResult(await ConfirmLeaveAsync());

        return Task.FromResult(true);
    }

    public Task OnNavigatedFromAsync()
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
dotnet build

# Core + Avalonia만 빌드 (macOS/Linux)
dotnet build src/Jinobald.Core
dotnet build src/Jinobald.Avalonia

# 샘플 앱 실행
dotnet run --project samples/Jinobald.Sample.Avalonia
```

## 🔧 핵심 의존성

- **CommunityToolkit.Mvvm** 8.3.2 - MVVM 헬퍼 (ObservableProperty, RelayCommand 등)
- **Microsoft.Extensions.DependencyInjection** 9.0.0 - DI 컨테이너
- **Serilog** 4.1.0 - 구조화된 로깅

## 📄 라이선스

MIT License

---

**Built with ❤️ for modern .NET developers**
