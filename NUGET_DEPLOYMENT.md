# NuGet 패키지 배포 가이드

이 문서는 Jinobald 프레임워크를 NuGet에 배포하는 방법을 설명합니다.

## 사전 준비

### 1. NuGet API Key 발급

1. [NuGet.org](https://www.nuget.org/)에 로그인
2. 계정 설정 > API Keys 메뉴로 이동
3. "Create" 버튼 클릭
4. API Key 설정:
   - **Key Name**: `Jinobald-GitHub-Actions` (또는 원하는 이름)
   - **Package Owner**: 본인 계정 선택
   - **Expiration**: 365일 (권장)
   - **Scopes**: `Push` 선택
   - **Glob Pattern**: `Jinobald.*` (Jinobald로 시작하는 모든 패키지)
5. "Create" 클릭하여 API Key 생성
6. **중요**: 생성된 API Key를 안전한 곳에 복사 (다시 볼 수 없음!)

### 2. GitHub Secrets 설정

1. GitHub 저장소로 이동
2. **Settings** > **Secrets and variables** > **Actions** 클릭
3. **New repository secret** 클릭
4. Secret 추가:
   - **Name**: `NUGET_API_KEY`
   - **Secret**: 위에서 복사한 NuGet API Key 붙여넣기
5. **Add secret** 클릭

### 3. Repository URL 업데이트

각 프로젝트 파일(.csproj)에서 `yourusername`을 실제 GitHub 사용자명으로 변경:

```xml
<PackageProjectUrl>https://github.com/yourusername/Jinobald</PackageProjectUrl>
<RepositoryUrl>https://github.com/yourusername/Jinobald</RepositoryUrl>
```

예시:
```xml
<PackageProjectUrl>https://github.com/JinoPay/Jinobald</PackageProjectUrl>
<RepositoryUrl>https://github.com/JinoPay/Jinobald</RepositoryUrl>
```

## 배포 방법

### 자동 배포 (권장)

Git 태그를 사용하여 자동으로 NuGet에 배포할 수 있습니다.

#### 1. 버전 태그 생성 및 푸시

```bash
# 버전 1.0.0 배포
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 버전 1.1.0 배포
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin v1.1.0
```

#### 2. GitHub Actions 자동 실행

태그를 푸시하면 자동으로 다음 작업이 실행됩니다:

1. 코드 체크아웃
2. .NET 9.0 설치
3. 의존성 복원
4. Release 모드로 빌드
5. 테스트 실행
6. NuGet 패키지 생성
7. NuGet.org에 자동 배포

#### 3. 배포 상태 확인

1. GitHub 저장소의 **Actions** 탭으로 이동
2. "Publish to NuGet" 워크플로우 실행 상태 확인
3. 모든 단계가 성공하면 NuGet.org에 패키지가 배포됨

#### 4. NuGet.org에서 확인

배포 후 몇 분 뒤 다음 URL에서 패키지 확인 가능:

- https://www.nuget.org/packages/Jinobald.Core/
- https://www.nuget.org/packages/Jinobald.Avalonia/
- https://www.nuget.org/packages/Jinobald.Wpf/

### 수동 배포

수동으로 배포하려면:

```bash
# 1. 빌드
dotnet build Jinobald.WithoutWpf.slnx --configuration Release

# 2. 테스트
dotnet test Jinobald.WithoutWpf.slnx --configuration Release

# 3. 패키지 생성 (버전 지정)
dotnet pack src/Jinobald.Core/Jinobald.Core.csproj -c Release -o ./nupkgs /p:Version=1.0.0
dotnet pack src/Jinobald.Avalonia/Jinobald.Avalonia.csproj -c Release -o ./nupkgs /p:Version=1.0.0

# 4. NuGet에 배포
dotnet nuget push ./nupkgs/*.nupkg --api-key YOUR_API_KEY --source https://api.nuget.org/v3/index.json
```

## 버전 관리 전략

### Semantic Versioning (SemVer) 사용

버전 형식: `MAJOR.MINOR.PATCH[-PRERELEASE]`

- **MAJOR**: 호환되지 않는 API 변경
- **MINOR**: 하위 호환되는 기능 추가
- **PATCH**: 하위 호환되는 버그 수정
- **PRERELEASE**: 미리보기 버전 (예: `1.0.0-beta.1`)

### 예시

```bash
# 정식 릴리스
git tag -a v1.0.0 -m "First stable release"
git push origin v1.0.0

# 마이너 업데이트 (새 기능 추가)
git tag -a v1.1.0 -m "Add new theme service features"
git push origin v1.1.0

# 패치 (버그 수정)
git tag -a v1.1.1 -m "Fix navigation deadlock issue"
git push origin v1.1.1

# 베타 버전
git tag -a v2.0.0-beta.1 -m "Beta release for v2.0.0"
git push origin v2.0.0-beta.1
```

## 패키지 설명

### Jinobald.Core

플랫폼 독립적인 핵심 라이브러리입니다.

**주요 기능:**
- Navigation Service
- Dialog Service
- Event Aggregator
- Module System
- DI Container 래퍼
- Lifecycle 관리

**설치:**
```bash
dotnet add package Jinobald.Core
```

### Jinobald.Avalonia

Avalonia 플랫폼 구현입니다.

**주요 기능:**
- DialogHost 컨트롤
- ToastHost 컨트롤
- Region Adapters (ContentControl, ItemsControl)
- AvaloniaApplicationBase
- Avalonia 전용 서비스

**설치:**
```bash
dotnet add package Jinobald.Avalonia
```

**의존성:** Jinobald.Core 자동 설치

### Jinobald.Wpf

WPF 플랫폼 구현입니다.

**주요 기능:**
- DialogHost 컨트롤
- ToastHost 컨트롤
- Region Adapters (ContentControl, ItemsControl)
- WpfApplicationBase
- WPF 전용 서비스

**설치:**
```bash
dotnet add package Jinobald.Wpf
```

**의존성:** Jinobald.Core 자동 설치

## 체크리스트

배포 전 확인 사항:

- [ ] 모든 테스트 통과 확인
- [ ] CHANGELOG.md 업데이트
- [ ] README.md에 새 기능 문서화
- [ ] Breaking Changes 확인 (MAJOR 버전 업데이트 필요 여부)
- [ ] 프로젝트 파일(.csproj)의 버전 정보 확인
- [ ] GitHub Repository URL이 올바른지 확인
- [ ] NuGet API Key가 유효한지 확인
- [ ] Git 태그 버전이 올바른지 확인

## 문제 해결

### 배포 실패 시

1. **GitHub Actions 로그 확인**
   - Actions 탭에서 실패한 워크플로우 클릭
   - 어떤 단계에서 실패했는지 확인

2. **흔한 오류**

   **API Key 오류:**
   ```
   error: Response status code does not indicate success: 403 (Forbidden)
   ```
   → GitHub Secrets의 `NUGET_API_KEY` 확인

   **패키지 중복 오류:**
   ```
   error: Response status code does not indicate success: 409 (Conflict)
   ```
   → 이미 같은 버전이 배포됨. 버전을 높여서 재배포

   **빌드 오류:**
   → 로컬에서 먼저 빌드 및 테스트 실행하여 확인

3. **로컬 테스트**

   배포 전 로컬에서 패키지 생성 테스트:
   ```bash
   dotnet pack src/Jinobald.Core/Jinobald.Core.csproj -c Release -o ./test-nupkgs /p:Version=0.0.1-local
   ```

### 패키지 삭제/Unlisting

NuGet.org에서는 패키지를 완전히 삭제할 수 없습니다.
대신 "Unlist" (목록에서 제거)만 가능합니다:

1. NuGet.org 로그인
2. 패키지 페이지로 이동
3. "Manage Package" 클릭
4. "Unlist" 버튼 클릭

Unlisted 패키지는:
- 검색 결과에 표시되지 않음
- 직접 URL로는 접근 가능
- 이미 사용 중인 프로젝트에는 영향 없음

## 추가 리소스

- [NuGet.org 문서](https://docs.microsoft.com/en-us/nuget/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [.NET 패키징 가이드](https://docs.microsoft.com/en-us/dotnet/core/tools/dotnet-pack)
