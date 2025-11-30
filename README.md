# Jinobald

**Jinobald**는 WPF와 Avalonia를 모두 지원하는 크로스 플랫폼 MVVM 프레임워크입니다.

DI, 네비게이션, 이벤트 집계, 커맨드, 다이얼로그 등 MVVM 애플리케이션 개발에 필요한 핵심 기능을 제공합니다.

## 프로젝트 구조

```
Jinobald/
├── src/
│   ├── Jinobald.Core/          # 플랫폼 독립적 인터페이스
│   │   ├── Mvvm/                # INavigationAware, IActivatable, IDestructible, IInitializableAsync
│   │   └── Services/            # INavigationService, IEventAggregator, IDialogService, IThemeService
│   ├── Jinobald.Wpf/           # WPF 구현체
│   └── Jinobald.Avalonia/      # Avalonia 구현체
├── samples/
│   ├── Jinobald.Sample.Wpf/
│   └── Jinobald.Sample.Avalonia/
└── tests/
    └── Jinobald.Tests/
```

## 주요 기능

### MVVM 라이프사이클 인터페이스

- **INavigationAware**: 네비게이션 이벤트 처리
- **IActivatable**: 활성화/비활성화 상태 관리
- **IInitializableAsync**: 비동기 초기화
- **IDestructible**: 리소스 정리

### 핵심 서비스

- **INavigationService**: 비동기 네비게이션, 히스토리, Guard 기능
- **IEventAggregator**: Pub/Sub 패턴 기반 이벤트 집계 (UI/Background 스레드 지원, PubSubEvent 상속 필수)
- **IDialogService**: 다이얼로그 표시 (메시지, 확인, 선택, 커스텀)
- **IThemeService**: 테마 스타일 관리
- **ISettingsService**: 애플리케이션 설정 관리 (타입 안전, 자동 저장)

## 사용 방법

### 1. 초기 설정

#### Avalonia 애플리케이션

```csharp
// Program.cs
public static AppBuilder BuildAvaloniaApp()
{
    var services = new ServiceCollection();

    // Jinobald 서비스 등록
    services.AddJinobaldAvalonia();

    // 애플리케이션 서비스 등록
    services.AddSingleton<MainViewModel>();
    services.AddTransient<DetailViewModel>();

    var serviceProvider = services.BuildServiceProvider();
    ViewModelLocator.SetServiceProvider(serviceProvider);

    return AppBuilder.Configure<App>()
        .UsePlatformDetect()
        .WithInterFont()
        .LogToTrace();
}
```

#### WPF 애플리케이션

```csharp
// App.xaml.cs
protected override void OnStartup(StartupEventArgs e)
{
    var services = new ServiceCollection();

    // Jinobald 서비스 등록
    services.AddJinobaldWpf();

    // 애플리케이션 서비스 등록
    services.AddSingleton<MainViewModel>();

    var serviceProvider = services.BuildServiceProvider();

    base.OnStartup(e);
}
```

### 2. ViewModel 작성

```csharp
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Navigation;

public partial class MainViewModel : ViewModel, INavigationAware, IInitializableAsync
{
    private readonly INavigationService _navigationService;
    private readonly IEventAggregator _eventAggregator;

    public MainViewModel(INavigationService navigationService, IEventAggregator eventAggregator)
    {
        _navigationService = navigationService;
        _eventAggregator = eventAggregator;
    }

    // 비동기 초기화
    public async Task InitializeAsync()
    {
        // 데이터 로드 등
        await Task.Delay(100);
    }

    // 네비게이션 이벤트 처리
    public Task OnNavigatedToAsync(NavigationContext context)
    {
        // View가 표시될 때
        return Task.CompletedTask;
    }

    public Task<bool> OnNavigatingFromAsync(NavigationContext context)
    {
        // View에서 나갈 때 (취소 가능)
        return Task.FromResult(true);
    }

    public Task OnNavigatedFromAsync()
    {
        // View에서 완전히 벗어났을 때
        return Task.CompletedTask;
    }

    public Task<bool> OnNavigatingToAsync(NavigationContext context)
    {
        // View로 이동하기 전 (취소 가능)
        return Task.FromResult(true);
    }
}
```

### 3. View와 ViewModel 연결

#### XAML에서 자동 연결 (Avalonia)

```xml
<UserControl xmlns="https://github.com/avaloniaui"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             xmlns:vm="using:YourApp.ViewModels"
             xmlns:jinobald="using:Jinobald.Avalonia.Mvvm"
             x:Class="YourApp.Views.MainView"
             jinobald:ViewModelLocator.AutoWireViewModel="True">
    <!-- View 내용 -->
</UserControl>
```

#### 코드에서 수동 연결

```csharp
var viewModel = serviceProvider.GetRequiredService<MainViewModel>();
view.DataContext = viewModel;
```

### 4. 네비게이션

```csharp
public partial class MainViewModel : ViewModel
{
    private readonly INavigationService _navigationService;

    [RelayCommand]
    private async Task NavigateToDetail()
    {
        // 단순 네비게이션
        await _navigationService.NavigateToAsync<DetailViewModel>();
    }

    [RelayCommand]
    private async Task NavigateWithParameter()
    {
        // 파라미터와 함께 네비게이션
        var param = new NavigationParameter { Id = 123 };
        await _navigationService.NavigateToAsync<DetailViewModel>(param);
    }

    [RelayCommand]
    private async Task GoBack()
    {
        // 뒤로 가기
        await _navigationService.GoBackAsync();
    }

    [RelayCommand]
    private async Task GoForward()
    {
        // 앞으로 가기
        await _navigationService.GoForwardAsync();
    }
}
```

### 5. 이벤트 집계

#### 이벤트 정의

```csharp
using Jinobald.Core.Services.Events;

// 모든 이벤트는 PubSubEvent를 상속해야 함
public class UserLoggedInEvent : PubSubEvent
{
    public int UserId { get; set; }
    public string UserName { get; set; }
}
```

#### Prism 스타일 사용 (권장)

```csharp
public partial class MainViewModel : ViewModel
{
    private readonly IEventAggregator _eventAggregator;

    public MainViewModel(IEventAggregator eventAggregator)
    {
        _eventAggregator = eventAggregator;

        // 이벤트 구독
        _eventAggregator.GetEvent<UserLoggedInEvent>()
            .Subscribe(OnUserLoggedIn, ThreadOption.UIThread);
    }

    private void OnUserLoggedIn(UserLoggedInEvent e)
    {
        Console.WriteLine($"User {e.UserName} logged in!");
    }

    [RelayCommand]
    private void PublishEvent()
    {
        // 이벤트 발행
        _eventAggregator.GetEvent<UserLoggedInEvent>()
            .Publish(new UserLoggedInEvent
            {
                UserId = 123,
                UserName = "홍길동"
            });
    }
}
```

#### 직접 Subscribe/Publish 방식

```csharp
// 동기 구독
var token = _eventAggregator.Subscribe<UserLoggedInEvent>(
    e => Console.WriteLine($"User {e.UserId}"),
    ThreadOption.UIThread
);

// 비동기 구독
_eventAggregator.Subscribe<UserLoggedInEvent>(
    async e => await HandleUserLoginAsync(e),
    ThreadOption.BackgroundThread
);

// 이벤트 발행
await _eventAggregator.PublishAsync(new UserLoggedInEvent { UserId = 123 });

// 구독 해제
_eventAggregator.Unsubscribe(token);
```

### 6. 다이얼로그

```csharp
public partial class MainViewModel : ViewModel
{
    private readonly IDialogService _dialogService;

    [RelayCommand]
    private async Task ShowMessage()
    {
        // 메시지 다이얼로그
        await _dialogService.ShowMessageAsync("알림", "작업이 완료되었습니다.");
    }

    [RelayCommand]
    private async Task ShowConfirmation()
    {
        // 확인 다이얼로그
        var result = await _dialogService.ShowConfirmationAsync(
            "확인",
            "정말로 삭제하시겠습니까?"
        );

        if (result)
        {
            // 삭제 처리
        }
    }

    [RelayCommand]
    private async Task ShowCustomDialog()
    {
        // 커스텀 다이얼로그
        var result = await _dialogService.ShowDialogAsync<CustomDialogViewModel>();
    }
}
```

### 7. 테마 서비스

```csharp
public partial class SettingsViewModel : ViewModel
{
    private readonly IThemeService _themeService;

    [RelayCommand]
    private void ChangeTheme(string themeName)
    {
        // 테마 변경
        _themeService.SetTheme(themeName);
    }

    [RelayCommand]
    private void GetCurrentTheme()
    {
        var currentTheme = _themeService.CurrentTheme;
        Console.WriteLine($"현재 테마: {currentTheme}");
    }
}
```

### 8. 설정 서비스

```csharp
public partial class SettingsViewModel : ViewModel
{
    private readonly ISettingsService _settingsService;

    public SettingsViewModel(ISettingsService settingsService)
    {
        _settingsService = settingsService;

        // 설정 변경 감지
        _settingsService.SettingChanged += OnSettingChanged;
    }

    [RelayCommand]
    private void SaveSettings()
    {
        // 설정 저장
        _settingsService.Set("Theme", "Dark");
        _settingsService.Set("Language", "ko-KR");
        _settingsService.Set("WindowWidth", 1920);
        _settingsService.Set("EnableNotifications", true);
    }

    [RelayCommand]
    private void LoadSettings()
    {
        // 설정 로드 (기본값 포함)
        var theme = _settingsService.Get("Theme", "Light");
        var language = _settingsService.Get("Language", "en-US");
        var width = _settingsService.Get("WindowWidth", 1280);
        var notifications = _settingsService.Get("EnableNotifications", false);
    }

    private void OnSettingChanged(string key, object value)
    {
        Console.WriteLine($"설정 변경: {key} = {value}");
    }
}
```

### 9. DI 컨테이너 직접 사용

```csharp
using Jinobald.Core.Ioc;

// 서비스 해결
var navigationService = ContainerLocator.Current.Resolve<INavigationService>();

// 파라미터와 함께 서비스 해결
var viewModel = ContainerLocator.Current.Resolve<DetailViewModel>(
    new NavigationParameter { Id = 123 }
);
```

## 빌드 요구사항

- **.NET 10.0 SDK**
- **Jinobald.Core**: 크로스 플랫폼 (Windows, macOS, Linux)
- **Jinobald.Avalonia**: 크로스 플랫폼 (Windows, macOS, Linux)
- **Jinobald.Wpf**: **Windows 전용** (macOS/Linux에서는 빌드 불가)

## 빌드

```bash
# 전체 솔루션 빌드 (Windows)
dotnet build

# Core + Avalonia만 빌드 (macOS/Linux)
dotnet build src/Jinobald.Core
dotnet build src/Jinobald.Avalonia
```

## 라이선스

MIT
