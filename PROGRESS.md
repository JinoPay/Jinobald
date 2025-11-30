# Jinobald 프레임워크 개발 진행 상황

## 작업 목표
- CommunityToolkit.Mvvm 기반 MVVM 프레임워크 구축
- Serilog 통합 로깅
- Prism 스타일 DI 래퍼 구현
- 플랫폼 독립적 ApplicationBase 구현
- WPF/Avalonia 통합 지원

## 작업 단계

### ✅ 완료된 작업
- [x] CLAUDE.md 작성 (프레임워크 아키텍처 문서화)
- [x] 1단계: NuGet 패키지 추가
  - Jinobald.Core: CommunityToolkit.Mvvm, Serilog, Microsoft.Extensions.DependencyInjection
  - Jinobald.Avalonia: Serilog
  - Jinobald.Wpf: Serilog, Microsoft.Extensions.DependencyInjection.Abstractions
  - 타겟 프레임워크를 net9.0으로 수정
- [x] 2단계: DI 래퍼 구현
  - `IContainerProvider` 인터페이스 (서비스 해결)
  - `IContainerRegistry` 인터페이스 (서비스 등록)
  - `IContainerExtension` 인터페이스 (통합 인터페이스)
  - `MicrosoftDependencyInjectionExtension` 구현 클래스
  - `ContainerLocator` 정적 클래스 (Prism 스타일)
  - 확장 메서드 (`AsContainerExtension`, `BuildContainer`)
- [x] 3단계: Jinobald.Core 기반 인프라 구축
  - `ISettingsService` 인터페이스 및 `JsonSettingsService` 구현
  - `ISplashScreen` 인터페이스 (필수 스플래시 화면)
  - `ApplicationBase` 추상 클래스 (플랫폼 독립적)
  - `ViewModelBase` 클래스 (CommunityToolkit.Mvvm 기반)
  - `IThemeService` 강화 (색상/리소스 관리 추가)
  - Serilog sinks 추가 (Console, File)
- [x] 4단계: Core & Avalonia 개선
  - ViewModelBase, DialogViewModelBase, NavigationService 강화
  - ContainerLocator 통합
  - ServiceCollectionExtensions: 자동 서비스 등록
- [x] 5단계: Avalonia 서비스 구현
  - ThemeService 구현 (SettingsService 통합)
  - DialogService 구현 (in-window overlay)
  - AvaloniaApplicationHost 및 SplashScreenWindow 구현
- [x] 6단계: WPF 구현
  - NavigationService 구현 (Avalonia 패턴 따름)
  - ViewModelLocator 구현 (DependencyProperty 기반)
  - ThemeService 구현 (ResourceDictionary 기반)
  - DialogService 구현 (in-window overlay)
  - WpfApplicationHost 및 SplashScreenWindow 구현
  - ServiceCollectionExtensions: 모든 서비스 자동 등록

### 🔄 진행 중인 작업
없음

### ⏳ 대기 중인 작업

#### 7단계: 검증
- [ ] 샘플 애플리케이션 업데이트
- [ ] 통합 테스트

---

## 작업 로그

### 2025-11-30
- CLAUDE.md 작성 완료
- 프로젝트 구조 분석 완료
- 작업 계획 수립 완료
- **1단계 완료**: NuGet 패키지 추가
  - CommunityToolkit.Mvvm 8.3.2 추가 (Core)
  - Serilog 4.1.0 추가 (모든 프로젝트)
  - Microsoft.Extensions.DependencyInjection 9.0.0 추가 (Core)
  - 타겟 프레임워크 net9.0으로 수정 (net10.0은 아직 존재하지 않음)
  - 빌드 검증 완료
- **2단계 완료**: DI 래퍼 구현
  - Prism 스타일의 DI 추상화 레이어 구현
  - `IContainerProvider`, `IContainerRegistry`, `IContainerExtension` 인터페이스
  - Microsoft.Extensions.DependencyInjection 기반 구현체
  - `ContainerLocator.Current` 패턴 구현
  - 제네릭 제약 조건 적용 (class, notnull)
  - 빌드 검증 완료 (경고 0개, 오류 0개)
- **3단계 완료**: Core 기반 인프라
  - `ISettingsService`, `JsonSettingsService` (debouncing)
  - `ISplashScreen`, `ApplicationBase` (전역 예외 처리)
  - `ViewModelBase` (IInitializableAsync, IActivatable 자동 구현)
  - `DialogViewModelBase<TResult>` 추가
  - `IThemeService` 강화
  - Serilog Sinks 추가
- **4단계 완료**: Core & Avalonia 개선
  - `ViewModelBase`: IInitializableAsync, IActivatable 자동 구현
  - `DialogViewModelBase<TResult>`: 다이얼로그 ViewModel 기본 클래스
  - `JsonSettingsService`: Debouncing 적용 (500ms)
  - `ApplicationBase`: 전역 예외 처리 추가
  - NavigationService: ContainerLocator 통합, 리소스 정리 자동화
  - ViewModelLocator: ContainerLocator 통합
  - ServiceCollectionExtensions: 모든 기본 서비스 자동 등록
  - 빌드 검증 완료
- **5단계 진행 중**: Avalonia ThemeService 구현
  - `ThemeService`: SettingsService 통합, 테마 자동 저장/로드
  - Light/Dark/System 기본 테마 지원
  - 커스텀 테마 등록 기능 (RegisterTheme)
  - GetThemeColor/GetThemeResource: Avalonia 리소스 시스템 통합
  - ServiceCollectionExtensions에 ThemeService 등록
  - 빌드 검증 완료 (경고 0개, 오류 0개)
- **5단계 계속**: Avalonia DialogService 구현 완료
  - `DialogService`: in-window overlay 방식 다이얼로그 서비스
  - `MessageDialogView`: 메시지 다이얼로그 (확인 버튼만)
  - `ConfirmDialogView`: 확인/취소 다이얼로그
  - `SelectionDialogView`: 선택 다이얼로그
  - `IDialogHost` 인터페이스를 통한 호스트 등록 메커니즘
  - TaskCompletionSource 기반 비동기 대기
  - ServiceCollectionExtensions에 DialogService 등록
  - 빌드 검증 완료 (경고 0개, 오류 0개)
- **5단계 완료**: Avalonia ApplicationBase 구현체 작성
  - `AvaloniaApplicationHost<TMainWindow>`: ApplicationBase를 상속받은 Avalonia 전용 호스트
  - 제네릭 타입으로 메인 윈도우 지정 가능
  - `OnConfigureServices`: 파생 클래스에서 추가 서비스 등록
  - `OnMainWindowShownAsync`: 메인 윈도우 표시 후 추가 초기화
  - `RunAsync`: Avalonia Application과 통합하여 앱 초기화
  - `SplashScreenWindow`: ISplashScreen 구현체, 기본 스플래시 화면
  - 진행률 표시 및 메시지 업데이트 지원
  - ThemeService 네임스페이스 충돌 해결 (global::Avalonia.Application)
  - .gitignore 개선 (macOS, Windows 시스템 파일 추가)
  - 빌드 검증 완료 (경고 0개, 오류 0개)
- **6단계 완료**: WPF 구현
  - `NavigationService`: Avalonia 패턴을 따른 WPF 구현 (Application.Current.Dispatcher 사용)
  - `ViewModelLocator`: DependencyProperty 기반 자동 View-ViewModel 와이어링
  - `ThemeService`: ResourceDictionary 기반 테마 관리, SettingsService 통합
  - `DialogService`: in-window overlay 방식 다이얼로그 서비스
  - `WpfApplicationHost<TMainWindow>`: ApplicationBase를 상속받은 WPF 전용 호스트
  - `SplashScreenWindow`: XAML 기반 스플래시 화면 (ISplashScreen 구현)
  - `ServiceCollectionExtensions`: 모든 WPF 서비스 자동 등록
  - Avalonia와 동일한 API 제공으로 플랫폼 간 일관성 확보
  - Core 및 Avalonia 빌드 검증 완료 (경고 0개, 오류 0개)
- **다음 작업**: 7단계 - 검증 (샘플 애플리케이션 업데이트 및 통합 테스트)
