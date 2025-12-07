# Jinobald 모듈화 가이드

## 개요

Jinobald 프레임워크를 모듈화하여 사용자가 필요한 기능만 선택적으로 사용할 수 있도록 재구성했습니다.

## 패키지 구조

### 핵심 패키지

#### 1. **Jinobald.Abstractions** (필수)
- DI 컨테이너 추상화 인터페이스
- 모든 Jinobald 패키지의 기본 의존성
- `IContainerExtension`, `IContainerProvider`, `IContainerRegistry`
- `IScopeAccessor`, `ContainerLocator`

#### 2. **Jinobald.Ioc.Microsoft** (기본 DI 구현)
- Microsoft.Extensions.DependencyInjection 기반
- 대부분의 애플리케이션에 적합
- Named resolution 미지원 (Keyed Services는 .NET 8+ 사용 가능)

#### 3. **Jinobald.Ioc.DryIoc** (대체 DI 구현)
- DryIoc 5.4.3 기반
- Named resolution 지원
- 고급 DI 기능 필요 시 사용

#### 4. **Jinobald.Core** (MVVM 핵심)
- MVVM 기본 클래스 및 인터페이스
- `ViewModelBase`, 라이프사이클 인터페이스
- `ApplicationBase`, `ISplashScreen`
- 의존성: Jinobald.Abstractions

### 기능별 패키지

#### 5. **Jinobald.Events**
- 이벤트 집계기 (Event Aggregator)
- Pub/Sub 패턴 지원
- `IEventAggregator`, `PubSubEvent`
- 완전 독립적 (Abstractions만 의존)

#### 6. **Jinobald.Dialogs**
- 다이얼로그 서비스
- In-window 오버레이 다이얼로그
- `IDialogService`, `IDialogAware`
- 중첩 다이얼로그 지원

#### 7. **Jinobald.Toast**
- 토스트 알림 서비스
- 비침투적 알림
- `IToastService`, `ToastMessage`

#### 8. **Jinobald.Theme**
- 테마 관리 서비스
- Light/Dark 모드 및 커스텀 테마
- `IThemeService`
- 색상 하드코딩 방지

#### 9. **Jinobald.Settings**
- 설정 관리 서비스
- 타입 안전성 및 자동 저장
- `ISettingsService`

#### 10. **Jinobald.Commands**
- 복합 명령 (CompositeCommand)
- 여러 명령을 하나로 조합
- `IActiveAware` 지원

#### 11. **Jinobald.Regions** (예정)
- Region 기반 네비게이션
- `IRegionManager`, `IRegion`

#### 12. **Jinobald.Modularity** (예정)
- 모듈 시스템
- `IModule`, `IModuleManager`

### 플랫폼 구현

#### **Jinobald.Avalonia**
- Avalonia UI 플랫폼 구현
- 모든 서비스 구현체 제공
- `ViewModelLocator` (자동 View-ViewModel 연결)

#### **Jinobald.Wpf**
- WPF 플랫폼 구현
- Windows 전용

## 사용 방법

### 기본 설정 (Avalonia)

```csharp
// Program.cs 또는 App.axaml.cs
using Jinobald.Abstractions.Ioc;
using Jinobald.Ioc.Microsoft;

var services = new ServiceCollection();

// DI 컨테이너 설정
var container = new MicrosoftDependencyInjectionExtension(services);
ContainerLocator.SetContainerExtension(container);

// 필요한 서비스만 선택적으로 추가
services.AddJinobaldCore();           // 필수
services.AddJinobaldEvents();          // 선택
services.AddJinobaldDialogs();         // 선택
services.AddJinobaldToast();           // 선택
services.AddJinobaldTheme();           // 선택
services.AddJinobaldSettings();        // 선택

// 컨테이너 빌드
container.FinalizeExtension();
```

### DryIoc 사용

```csharp
using Jinobald.Ioc.DryIoc;

// Microsoft 대신 DryIoc 사용
var container = new DryIocContainerExtension();
ContainerLocator.SetContainerExtension(container);

// Named resolution 사용 가능
container.Register<IService, ServiceA>("ServiceA");
container.Register<IService, ServiceB>("ServiceB");

var serviceA = container.Resolve<IService>("ServiceA");
```

## 마이그레이션 가이드

### 기존 코드에서 변경사항

#### Namespace 변경

| 기존 | 신규 |
|------|------|
| `Jinobald.Core.Services.Events` | `Jinobald.Events` |
| `Jinobald.Core.Services.Dialog` | `Jinobald.Dialogs` |
| `Jinobald.Core.Services.Toast` | `Jinobald.Toast` |
| `Jinobald.Core.Services.Theme` | `Jinobald.Theme` |
| `Jinobald.Core.Services.Settings` | `Jinobald.Settings` |
| `Jinobald.Core.Commands` | `Jinobald.Commands` |
| `Jinobald.Core.Ioc` | `Jinobald.Abstractions.Ioc` |

#### 패키지 참조 변경

기존:
```xml
<PackageReference Include="Jinobald.Core" Version="1.0.0" />
```

신규 (필요한 것만):
```xml
<PackageReference Include="Jinobald.Core" Version="2.0.0" />
<PackageReference Include="Jinobald.Ioc.Microsoft" Version="1.0.0" />
<PackageReference Include="Jinobald.Events" Version="1.0.0" />
<PackageReference Include="Jinobald.Dialogs" Version="1.0.0" />
```

## 장점

1. **선택적 의존성**: 필요한 기능만 설치
2. **패키지 크기 축소**: 불필요한 코드 제거
3. **DI 컨테이너 선택 가능**: Microsoft DI 또는 DryIoc
4. **독립적 버전 관리**: 각 기능별 독립 업데이트
5. **명확한 책임 분리**: 각 패키지가 단일 책임

## 호환성

- .NET 9.0 이상
- C# 13
- Avalonia 11.2.2 이상 (Jinobald.Avalonia)
- .NET 9.0-windows (Jinobald.Wpf)

## 빌드 상태

✅ Jinobald.Abstractions
✅ Jinobald.Ioc.Microsoft
✅ Jinobald.Ioc.DryIoc
✅ Jinobald.Events
✅ Jinobald.Toast
✅ Jinobald.Theme
✅ Jinobald.Settings
✅ Jinobald.Commands
🔄 Jinobald.Dialogs (작업 중)
🔄 Jinobald.Regions (예정)
🔄 Jinobald.Modularity (예정)
🔄 Jinobald.Core (리팩토링 중)
🔄 Jinobald.Avalonia (업데이트 중)
🔄 Jinobald.Wpf (업데이트 중)
