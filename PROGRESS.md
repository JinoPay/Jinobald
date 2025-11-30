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

### 🔄 진행 중인 작업
없음

### ⏳ 대기 중인 작업

#### 2단계: Jinobald.Core 기반 구조
- [ ] DI 래퍼 구현 (IContainerExtension, ContainerLocator)
- [ ] ApplicationBase 추상 클래스 구현
- [ ] ViewModelBase 클래스 구현
- [ ] IThemeService 강화 (테마 스타일 관리)

#### 3단계: Jinobald.Avalonia 구현
- [ ] ApplicationBase 구현체 작성
- [ ] DialogService 구현 (in-window overlay)
- [ ] ThemeService 구현
- [ ] NavigationService DI 통합 개선

#### 4단계: Jinobald.Wpf 구현
- [ ] ApplicationBase 구현체 작성
- [ ] NavigationService 구현
- [ ] DialogService 구현 (in-window overlay)
- [ ] ThemeService 구현

#### 5단계: 검증
- [ ] 샘플 애플리케이션 업데이트
- [ ] 통합 테스트

---

## 작업 로그

### 2025-11-30
- CLAUDE.md 작성 완료
- 프로젝트 구조 분석 완료
- 작업 계획 수립 완료
- **다음 작업**: NuGet 패키지 추가 (CommunityToolkit.Mvvm, Serilog)
