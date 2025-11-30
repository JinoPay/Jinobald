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

### Avalonia

```csharp
// Program.cs 또는 App.axaml.cs
services.AddJinobaldAvalonia();

// ViewModelLocator 설정
ViewModelLocator.SetServiceProvider(serviceProvider);
```

### WPF

```csharp
// App.xaml.cs
services.AddJinobaldWpf();
```

### 네비게이션

```csharp
// ViewModel에서
await _navigationService.NavigateToAsync<MainViewModel>();
await _navigationService.NavigateToAsync<DetailViewModel>(parameter);
await _navigationService.GoBackAsync();
```

### 이벤트 집계

```csharp
// 이벤트 정의 (PubSubEvent 상속 필수)
public class UserLoggedInEvent : PubSubEvent
{
    public int UserId { get; set; }
}

// Prism 스타일 (권장)
var userEvent = _eventAggregator.GetEvent<UserLoggedInEvent>();
userEvent.Subscribe(e => Console.WriteLine($"User {e.UserId} logged in"), ThreadOption.UIThread);
userEvent.Publish(new UserLoggedInEvent { UserId = 123 });

// 직접 Subscribe/Publish 방식
var token = _eventAggregator.Subscribe<UserLoggedInEvent>(OnUserLoggedIn, ThreadOption.UIThread);
await _eventAggregator.PublishAsync(new UserLoggedInEvent { UserId = 123 });
_eventAggregator.Unsubscribe(token);
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
