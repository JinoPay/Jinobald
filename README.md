# 지노발드 지하철

수도권 전철 실시간 도착·열차 위치 안내와 승차·하차·환승 알림, 빠른 환승 칸 안내를 제공하는 React Native(Expo) 앱과
그 데이터를 공급하는 C# 백엔드([`backend/`](backend/README.md))입니다.

## 기능

- **홈** — 진행 중인 여정 배너, 출발·도착 검색과 최근 검색, 집·회사·즐겨찾기 칩(가장 빨리 오는 열차까지의 시간이 얹힘), 내 주변 역, 운행 공지, 노선별 열차 위치 진입점.
- **환승 경로 탐색** — 두 역을 이름으로 찾아 지정하면 **최소 시간 / 최소 환승** 후보를 보여 줍니다. 서울교통공사 **역간 실측 운행시간**과 **환승 도보 시간**으로 계산하고, 각 환승마다 **"3-2 칸 하차 → 5-1 칸 승차"** 같은 빠른 환승 칸을 함께 싣습니다.
- **실시간 도착·열차 위치** — 역별 도착 카운트다운과, 노선을 세로 트랙으로 그린 **열차 위치 화면**(방향 토글, 급행·막차 표시).
- **승차·하차·환승 알림** — 탈 열차가 1분 안에 오면 **승차 알림**, 하차·환승역은 "N정거장 전" 예비 알림과 도착 1분 전 알림. 알림 문구에 빠른 하차 칸이 들어갑니다. 승차 후에는 **승차한 열차의 실시간 위치**로 진행 상황을 계산하고, 위치를 못 받으면 경과 시간으로 내려갑니다.
- **인증키 없이도 동작** — 백엔드는 키가 없으면 실제 시각표로 열차 위치·도착정보를 합성하고, 앱은 백엔드도 키도 없으면 모의 데이터로 동작합니다. 화면에 항상 어떤 데이터로 동작 중인지 표시합니다.

## 구성

```
src/                 Expo 앱 (expo-router)
  app/(tabs)/        홈 · 여정 · 설정
  app/line/[lineId]  노선 열차 위치
  data/generated/    번들되는 환승 칸·환승 시간·역코드 JSON (scripts/build-transfer-data.mjs 산출물)
scripts/data/raw/    공공데이터 원본 CSV (README 참고)
backend/             C# .NET 10 백엔드 — Dapper + SQLite, CQRS(MediatR), 실시간 프록시·캐시, 시각표 시뮬레이터
```

## 데이터 소스

앱은 세 소스 가운데 하나로 동작하며 설정 화면에서 고를 수 있습니다 (기본 `자동`).

| 소스 | 조건 | 제공 |
|---|---|---|
| **백엔드** | `.env` 의 `EXPO_PUBLIC_BACKEND_URL` | 실시간 도착·열차 위치(캐시), 빠른하차 칸, 운행 공지. 키는 서버에만 있고 HTTPS 면 ATS 예외가 필요 없습니다 |
| **서울 직접** | `EXPO_PUBLIC_SEOUL_SUBWAY_API_KEY` | 실시간 도착·열차 위치. 키가 번들에 들어가고 HTTP 호스트라 개발용입니다 |
| **모의** | 둘 다 없거나 설정에서 선택 | 결정적 모의 도착·열차 위치·칸 안내. 승차 후 추적까지 오프라인으로 검증 가능 |

백엔드 실행과 인증키 발급 절차는 [backend/README.md](backend/README.md) 에 있습니다.

## 실행

패키지 매니저는 **pnpm** 을 씁니다. 버전은 `package.json` 의 `packageManager` 필드로 고정돼 있으므로,
Node 에 기본 포함된 corepack 을 켜면 별도 설치 없이 같은 버전이 쓰입니다.

```bash
corepack enable             # 최초 1회 (또는 npm i -g pnpm)
pnpm install
cp .env.example .env        # 키를 넣거나, 비워 두면 모의 데이터로 동작합니다
```

가장 빠른 확인은 Expo Go 입니다. 다만 백그라운드 지오펜싱은 Expo Go 에서 동작하지 않습니다
(아래 [실행 환경별 기능](#실행-환경별-기능) 참고).

```bash
pnpm start:go               # Expo Go 로 QR 스캔 — iOS/Android 공통
```

전체 기능을 쓰려면 개발 빌드가 필요합니다. 아래 [네이티브 빌드](#네이티브-빌드-ios--android)를 보세요.

### 웹 (데스크톱에서 UI 만 빠르게 볼 때)

`react-native-web` 으로 브라우저에서도 그대로 뜹니다. 시뮬레이터를 띄우는 것보다 훨씬 빨라서
화면 레이아웃과 전환을 만질 때 편합니다.

```bash
pnpm web
```

다만 **웹은 이 앱의 절반짜리 환경입니다.** 알림 예약과 지오펜싱은 브라우저에 대응물이 없어
설정 화면에 "웹에서는 사용 불가"로 표시됩니다. 알림·위치 로직을 검증하려면 시뮬레이터나 실기기를 쓰세요.

> Electron 같은 데스크톱 셸은 두지 않았습니다. 개발 중 얻는 것이 브라우저와 같고
> (같은 `react-native-web` 번들을 창 하나에 띄우는 것뿐입니다),
> 정작 이 앱의 핵심인 알림·백그라운드 위치는 데스크톱에 존재하지 않아 유지 비용만 늘기 때문입니다.

## 네이티브 빌드 (iOS / Android)

`ios/`, `android/` 디렉터리는 저장소에 두지 않습니다([CNG](https://docs.expo.dev/workflow/continuous-native-generation/)).
`app.config.ts` 가 네이티브 설정의 유일한 진실의 원천이고, 빌드 명령이 필요할 때 `expo prebuild` 로 두 폴더를 생성합니다.
따라서 **네이티브 설정을 바꿀 때는 생성된 파일이 아니라 `app.config.ts` 를 고쳐야 합니다.**

### 0. 사전 점검

툴체인이 하나라도 빠지면 빌드가 한참 진행된 뒤에 실패합니다. 먼저 이걸 돌리세요.

```bash
pnpm check:native
```

빠진 항목과 설치 명령을 함께 출력합니다. 필요한 것은 다음과 같습니다.

| 대상 | 필요한 것 |
|---|---|
| 공통 | Node 20+, pnpm, (권장) `brew install watchman` |
| iOS | macOS + Xcode(App Store) + iOS 시뮬레이터 런타임 + `brew install cocoapods` |
| Android | JDK 17+ (`brew install --cask zulu@17`), Android Studio, `ANDROID_HOME` 환경변수 |

Android 는 셸 프로필(`~/.zshrc`)에 다음을 추가해야 합니다.

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

### 1. 로컬 빌드 — 시뮬레이터 / 에뮬레이터

첫 실행은 네이티브 프로젝트 생성부터 컴파일까지 하므로 수 분에서 십수 분 걸립니다. 이후로는 증분 빌드입니다.

> Homebrew 의 CocoaPods(Ruby 4.x)는 앱 이름에 한글이 있으면 `Encoding::CompatibilityError` 로 `pod install` 이 실패할 수 있습니다.
> 셸 로케일을 UTF-8 로 두면 됩니다: `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` (또는 `LANG=en_US.UTF-8 pnpm ios`).
>
> Xcode 26.0(Swift 6.2)에서는 `expo-modules-jsi` 가 `'weak' must be a mutable variable` 로 컴파일되지 않습니다
> ([expo/expo#46242](https://github.com/expo/expo/issues/46242)). SDK 56+ 는 더 새로운 Xcode(26.4+)를 요구하므로
> App Store 에서 Xcode 를 올리세요. 그때까지는 Expo Go(`pnpm start:go`)로 확인할 수 있습니다.

```bash
pnpm ios                    # iOS 시뮬레이터 (기본 기기로 실행)
pnpm android                # Android 에뮬레이터 (미리 켜 두거나 연결된 기기)
```

특정 시뮬레이터를 고르려면 `pnpm ios --device` 로 목록에서 선택합니다.

### 2. 로컬 빌드 — 실기기

```bash
pnpm ios:device             # 연결된 iPhone (목록에서 선택)
pnpm android:device         # 연결된 Android 기기
```

- **iPhone**: 케이블로 연결하고 기기에서 이 Mac 을 "신뢰"합니다. Xcode 로 `ios/jinobald.xcworkspace` 를
  한 번 열어 Signing & Capabilities 에서 팀(무료 Apple ID 도 가능)을 선택하세요.
  무료 계정으로 서명한 앱은 7일 뒤 만료되므로 그때 다시 빌드하면 됩니다.
  기기의 설정 > 개인정보 보호 및 보안 > 개발자 모드도 켜야 합니다(iOS 16+).
- **Android**: 기기에서 개발자 옵션 > USB 디버깅을 켜고 연결한 뒤 `adb devices` 로 잡히는지 확인합니다.

### 2-1. Apple 개발자 계정 없이 내 iPhone 에 설치하기

**연 99 USD 유료 멤버십 없이도 이 앱의 모든 기능을 본인 기기에서 쓸 수 있습니다.**
무료 Apple ID 만으로 서명하는 "Personal Team" 방식이면 충분합니다.

이 앱이 유료 계정을 요구하는 기능을 쓰지 않기 때문입니다.

| 이 앱이 쓰는 것 | 필요한 것 | 무료 계정 |
|---|---|---|
| 예약 로컬 알림 | 없음 (권한만) | 가능 |
| 백그라운드 위치·지오펜싱 | `UIBackgroundModes` — Info.plist 키 | 가능 |
| 원격 푸시(APNs) | `aps-environment` 엔타이틀먼트 | **이 앱은 쓰지 않음** |

핵심은 백그라운드 모드가 *엔타이틀먼트가 아니라 Info.plist 키*라는 점입니다.
엔타이틀먼트가 필요한 기능(원격 푸시, App Groups, iCloud, HealthKit, Associated Domains 등)만
유료 멤버십을 요구하는데, 이 앱은 그중 아무것도 쓰지 않습니다.

**절차**

1. Xcode > Settings > Accounts 에서 본인 Apple ID 로 로그인합니다. 팀 이름이 `이름 (Personal Team)` 으로 잡힙니다.
2. iPhone 에서 설정 > 개인정보 보호 및 보안 > **개발자 모드**를 켜고 재시동합니다 (iOS 16+).
3. 케이블로 연결하고 기기에서 이 Mac 을 "신뢰"합니다.
4. `pnpm prebuild` 후 `ios/jinobald.xcworkspace` 를 열어 타깃의 Signing & Capabilities 에서 팀을 Personal Team 으로 지정합니다.
5. `pnpm ios:device` 로 빌드·설치합니다.
6. 첫 실행 시 기기에서 설정 > 일반 > VPN 및 기기 관리 > 해당 개발자를 "신뢰"합니다.

**무료 계정의 제약**

- **서명이 7일 뒤 만료됩니다.** 앱이 실행되지 않으면 `pnpm ios:device` 를 다시 돌리면 됩니다. 데이터는 유지됩니다.
- 한 기기에 무료 서명으로 동시에 설치 가능한 앱은 3개까지입니다.
- 7일당 App ID 10개 제한이 있으니 `bundleIdentifier` 를 자주 바꾸지 마세요.
- TestFlight·App Store 배포, 타인 기기 설치는 불가합니다.
- **EAS 클라우드 iOS *실기기* 빌드도 불가합니다** — 기기 등록과 프로비저닝 프로필 발급에 유료 멤버십이 필요합니다.
  대신 `pnpm build:dev:ios:sim`(시뮬레이터 빌드)은 Apple 계정 자체가 필요 없습니다.

즉 무료 계정이라면 **iOS 실기기는 로컬 빌드(`pnpm ios:device`), Android 는 아무 제약 없음**이 기본 경로입니다.
유료 멤버십은 남에게 배포하거나 스토어에 올릴 때 사면 됩니다.

> 백그라운드 지오펜싱이 필요 없는 작업이라면 서명 없이 **Expo Go**(`pnpm start:go`)로 QR 만 찍는 게 제일 빠릅니다.
> 지오펜싱을 만질 때만 개발 빌드를 쓰세요.

### 3. 릴리스 구성으로 확인

`app.config.ts` 의 ATS / cleartext 예외는 **디버그 빌드에서는 티가 나지 않다가 릴리스에서 문제가 되는** 종류의 설정입니다.
HTTP API 를 쓰는 동안에는 릴리스 구성으로 한 번 확인하고 넘어가는 편이 좋습니다.

```bash
pnpm ios:release
pnpm android:release
```

### 4. EAS 클라우드 빌드

Mac 없이 iOS 빌드가 필요하거나, 팀에 배포할 설치 파일이 필요할 때 씁니다. 프로필은 `eas.json` 에 있습니다.

```bash
pnpm dlx eas-cli login
pnpm dlx eas-cli build:configure   # 최초 1회 — EAS 프로젝트 ID 를 app.config.ts 에 연결

pnpm build:dev:ios:sim      # iOS 시뮬레이터용 개발 빌드 (.app — 서명 불필요)
pnpm build:dev:ios          # iOS 실기기용 개발 빌드 (Apple 개발자 계정 필요)
pnpm build:dev:android      # Android 개발 빌드 (.apk)
pnpm build:preview          # 내부 배포용 릴리스 빌드 (양 플랫폼)
pnpm build:production       # 스토어 제출용 (iOS .ipa / Android .aab)
```

| 프로필 | 개발 클라이언트 | 배포 | Android | iOS | Apple 유료 계정 |
|---|---|---|---|---|---|
| `development` | 있음 | internal | apk | 실기기 | iOS 만 필요 |
| `development-simulator` | 있음 | internal | apk | 시뮬레이터 | 불필요 |
| `preview` | 없음 | internal | apk | 실기기 | iOS 만 필요 |
| `production` | 없음 | store | aab | 실기기 | iOS 만 필요 |

Android 는 어느 프로필이든 Apple 계정과 무관합니다.
iOS 실기기 클라우드 빌드만 유료 멤버십을 요구하며, 그 경우에도 로컬 `pnpm ios:device` 는
무료 계정으로 됩니다([위 항목](#2-1-apple-개발자-계정-없이-내-iphone-에-설치하기) 참고).

개발 빌드를 설치한 뒤에는 `pnpm start` 로 Metro 를 띄우면 그 빌드가 붙습니다(`--dev-client`).

> EAS 빌드 서버에는 로컬 `.env` 가 올라가지 않습니다(`.gitignore` 대상).
> 실시간 데이터가 필요한 빌드라면 `EXPO_PUBLIC_SEOUL_SUBWAY_API_KEY` 를 EAS 환경변수로 등록하세요.
> 등록하지 않으면 그 빌드는 모의 데이터로 동작합니다.
>
> ```bash
> pnpm dlx eas-cli env:create --name EXPO_PUBLIC_SEOUL_SUBWAY_API_KEY --scope project
> ```

### 네이티브 설정을 바꿨다면

`app.config.ts`, 플러그인 설정, 또는 네이티브 코드를 포함한 의존성을 바꾼 뒤에는 네이티브 프로젝트를 다시 만들어야 합니다.

```bash
pnpm prebuild               # ios/, android/ 를 지우고 다시 생성
```

## API 키

실시간 도착정보는 [서울 열린데이터광장](https://data.seoul.go.kr)에서 무료로 발급하는 인증키가 필요합니다.
발급 후 `.env` 에 넣고 앱을 다시 시작하세요.

```dotenv
EXPO_PUBLIC_SEOUL_SUBWAY_API_KEY=발급받은_키
```

> **주의**: `EXPO_PUBLIC_` 접두사가 붙은 변수는 JS 번들에 그대로 포함되어 배포된 앱에서 추출할 수 있습니다.
> 이 앱이 쓰는 키는 공개 교통정보용 저민감 키이고 사용자 데이터나 과금과 무관하므로 이 방식을 택했습니다.
> 최악의 경우는 제3자가 호출 한도를 소진하는 것이고, 키를 재발급하면 해결됩니다.
> **결과가 따르는 비밀 키에는 이 방식을 쓰면 안 됩니다** — 그런 경우에는 서버 프록시를 두어야 합니다.

일일 호출 한도가 있으므로 앱은 다음과 같이 호출을 아낍니다.

- 화면이 활성일 때만 폴링합니다 (기본 30초, 다음 열차가 5분 넘게 남았으면 60초).
- 승차한 뒤에는 네트워크를 전혀 쓰지 않습니다 (아래 참고).
- 설정에서 "모의 데이터 강제 사용"을 켜면 호출을 완전히 멈출 수 있습니다.

## 알림이 동작하는 방식

두 경로를 함께 씁니다.

**1. 도착예정(ETA) 기반 — 주 경로, Expo Go 포함 어디서든 동작**

`setTimeout` 을 쓰지 않는 것이 핵심입니다. 앱이 백그라운드로 가면 JS 타이머는 멈추지만 OS 에 예약한 알림은 그대로 발화합니다.
그래서 벽시계 시각을 계산해 `expo-notifications` 의 `DATE` 트리거로 넘깁니다.

한 구간에서 나가는 알림은 `board`(승차) → `pre`/`transfer-pre`(N정거장 전) → `arrive`/`transfer`(도착 1분 전) 입니다.
승차 전과 승차 후는 쓸 수 있는 신호가 다릅니다.

| 시점 | 계산 근거 (`basis`) | 네트워크 |
|---|---|---|
| 승차 전 | 승차역의 실시간 도착정보 + 구간 실측 (`arrival`) | 도착정보 폴링 |
| 승차 후, 열차 위치 제공 시 | 승차 시점에 기록한 **열차번호**를 노선 열차 위치에서 찾음 (`live-position`) | 위치 30초 폴링 |
| 승차 후, 위치 없음 | 승차 시각으로부터의 경과 시간 (`elapsed`) | 미사용 |
| 신호 없음 | 구간 실측·노선 평균 (`static`) | 미사용 |

승차 후에 하차역의 도착정보를 쓰지 않는 이유는, 그 열차가 사용자가 탄 열차가 아니라 뒤이어 하차역으로 향하는
다른 열차이기 때문입니다. 그 값을 쓰면 승차 직후부터 "1정거장 남음"으로 잘못 표시됩니다.
열차 위치를 쓰면 지연까지 반영되고, 경과 시간으로 내려가면 **열차 지연은 반영되지 않습니다.** 화면에 지금 어떤 신호로 계산 중인지 항상 표시합니다.

"N정거장 전"은 하차역 앞 N개 구간의 실측 운행 초로 계산합니다. 알림 문구에는 그 역의 빠른 하차·환승 칸("3-2 칸에서 내리면 환승이 빠릅니다")이 들어갑니다 —
알림은 백그라운드에서 뜨므로 예약 시점에 문구가 완성되어 있어야 하고, 그래서 칸 데이터는 서버가 아니라 번들에 있습니다.

여정이 여러 구간이면 이 계산을 **현재 구간에만** 적용합니다. 남은 구간은 언제나 정적 추정입니다.
알림도 현재 구간의 두 개(`N정거장 전`, `곧 하차/환승`)만 예약합니다 — 다음 구간의 알림 시각은 실제 환승
소요와 다음 열차 대기에 달려 있어 지금 알 수 없고, 미리 잡아 두면 아직 첫 구간을 타고 있는데 세 번째
구간의 알림이 발화하기 때문입니다. 환승 완료는 사용자가 눌러 확인하거나 환승 알림·지오펜스가 대신합니다.

**2. GPS 지오펜싱 — 보정 경로, 개발 빌드 필요**

목표역(하차역 또는 환승역) 좌표를 아는 경우 반경 300m 지오펜스를 걸어 진입 시 즉시 알립니다.
지하 구간에서는 GPS 가 잡히지 않으므로 어디까지나 보조 수단입니다.
두 경로 중 먼저 도달한 쪽이 알림을 소비하고 나머지 예약은 취소합니다.

### 실행 환경별 기능

| 기능 | 웹 | Expo Go | 개발 빌드 |
|---|---|---|---|
| 역 검색 / 실시간 도착 | 사용 가능 | 사용 가능 | 사용 가능 |
| 예약 로컬 알림 (ETA 알림) | **불가** | 사용 가능 | 사용 가능 |
| 포그라운드 GPS 보정 (앱 열려 있을 때) | **불가** | 사용 가능 | 사용 가능 |
| 백그라운드 지오펜싱 (앱 닫혀 있을 때) | **불가** | **불가** | 사용 가능 |

앱은 Expo Go 에서도 온전히 동작하며, 못 쓰는 기능은 조용히 실패하지 않고 화면에 이유를 표시합니다.

웹에서 알림이 불가한 이유는 `expo-notifications` 에 `scheduleNotificationAsync` 의 웹 구현이 없기 때문입니다. 브라우저 Notification API 로 권한은 받을 수 있지만 예약 발화가 안 되므로, `src/services/location/capabilities.ts` 의 `localNotifications` 를 `false` 로 두고 서비스 경계(`schedule.ts`, `setup.ts`, `TripAlertManager.ts`)와 UI 양쪽에서 막습니다.

## 경로 탐색

`src/services/routing/graph.ts` 가 `lines.json` 에서 그래프를 세웁니다.

- **노드** = (운행 계통, 역 인덱스) 797개. **승차 간선** = 인접 쌍, 가중치는 구간 실측 운행시간(`stations[i].secondsToNext`, 없으면 노선 평균). 순환선은 끝과 처음도 잇고, 어느 쪽으로 돌지는 정거장 수가 아니라 **운행 초**로 정합니다.
- **환승 비용** = 실측 도보 시간(`src/data/generated/transfer-times.json`) + 평균 대기 120초. 실측이 없는 환승은 `cost.ts` 의 상수입니다. `RouteTransfer.measured` 가 둘을 구분해 화면에 "3분 · 도보 180m" 와 "약 4분" 으로 나뉘어 보입니다.
- **전이 간선** = 정규화 역명(별칭 포함)이 같은 서로 다른 계통의 노드 쌍. 별칭까지 봐야 4호선 총신대입구와 7호선 이수가 이어집니다.
  - 노선 그룹이 다르면 **환승**, 같으면 **계통 변경**입니다. 구로·금천구청·신도림처럼 같은 승강장에서 다음 열차를 타는 곳을 환승으로 세면 광명 → 서울역이 "환승 2회"로 보입니다.
- 후보는 가중치를 바꿔 Dijkstra 를 두 번 돌려 만듭니다 (최소 시간 / 최소 환승). 794 노드에서 1회가 1ms 남짓이라 k-shortest 알고리즘이 필요 없습니다.

`graph.ts` 에는 **런타임 import 가 하나도 없습니다** (`eta.ts` 와 같은 규율). 그래서 `scripts/verify-routes.mjs` 가 이 파일을 그대로 읽어 실제 데이터셋으로 경로를 검증합니다 — `stations.ts` 는 `lines.json` 을 import 하기 때문에 Node 에서 읽히지 않습니다. 역명 정규화·방향·정거장 수 계산의 원본도 같은 이유로 `graph.ts` 에 있고 `stations.ts` 가 감싸 씁니다.

## 데이터셋

`src/data/lines.json` 이 노선 위상의 유일한 진실의 원천입니다. 역 순서 배열에서 인접역·남은 정거장 수·방향·환승 여부와 경로 탐색 그래프가 모두 파생됩니다.

여기에 서울교통공사 공공데이터가 붙습니다. 원본은 [`scripts/data/raw/`](scripts/data/raw/README.md) 에 UTF-8 로 커밋되어 있습니다.

| 데이터 | 번들 / 서버 | 쓰는 곳 |
|---|---|---|
| 역간 운행시간 (1~8호선 서울교통공사 구간) | 번들 (`lines.json` 의 `secondsToNext`) | 경로 탐색, ETA, "N정거장 전" 리드 타임 |
| 환승 도보 거리·시간 (145개 환승) | 번들 (`generated/transfer-times.json`) | 환승 비용, 경로 카드 |
| 환승 승하차 칸 (1,020건 / 108역) | 번들 (`generated/transfer-guides.json`) | 경로 카드·여정 화면·알림 문구 |
| 열차운행시각표 (1~9호선 42만 행) | 서버 (SQLite) | 다음 열차 조회, 키 없을 때 열차 위치·도착 시뮬레이터 |
| 빠른하차 칸 · 운행 공지 | 서버 (공공데이터포털 API, 키 필요) | 최종 하차역 칸 안내, 홈 공지 |

```bash
pnpm fetch-datasets          # 원본 파일 점검 (+ 시각표 압축 해제본)
pnpm build-transfer-data     # scripts/data/raw → src/data/generated/*.json
pnpm verify-transfer-data
```

- 수도권 전철 **32개 운행 계통 / 24개 노선 그룹**, 797개 역 항목 (인천1호선 검단연장·자양·시우 반영)
- 1~9호선과 지선(1호선 경부·장항/광명/서동탄, 2호선 성수·신정, 5호선 마천), 경의중앙·수인분당·신분당·경춘·공항철도·경강·서해·우이신설·신림·김포골드라인·인천1·2호선·의정부경전철·용인에버라인·GTX-A 를 포함합니다.
- 좌표는 **선택 항목**입니다. 797개 중 764개(95.9%)에 들어 있고, 없는 역은 GPS 보정만 자동으로 비활성화되며 ETA 알림은 그대로 동작합니다. 비어 있는 33개는 2021년 이후 개통 구간(진접선·별내선·하남연장·신림선·GTX-A·검단연장 등)입니다.

### 생성과 검증

```bash
pnpm build-lines     # scripts/data/*  ->  src/data/lines.json
pnpm verify-data     # 데이터셋 불변식 검사
pnpm verify-routes   # 경로 탐색 불변식 검사 (알려진 경로 + 무작위 200쌍)
```

- `scripts/data/lines.def.mjs` — 운행 계통과 역 순서. 손으로 관리하는 원본입니다.
- `scripts/data/station-coords.csv` — 역명 → 위경도. 공개 데이터에서 추출했습니다.

> **실시간 도착 커버리지**: 각 계통의 `realtime` 플래그가 서울 열린데이터광장 도착정보 API 범위를 나타냅니다. `false` 인 노선(인천1·2호선, 경전철, 경강선, GTX-A 등)은 역 상세 화면에서 빈 목록 대신 "실시간 도착 정보를 제공하지 않는 노선"이라고 안내합니다.
>
> 광역철도의 `subwayId` 는 실제 API 응답으로 확인하지 못했습니다(샘플 키는 도착정보 API 에 통하지 않습니다). 확신할 수 없는 값을 넣으면 `mappers.ts` 가 도착 정보를 **조용히 버리므로**, 미확인 노선은 `subwayId: null` + `realtime: false` 로 두었습니다. 실제 인증키로 확인한 뒤 `scripts/data/lines.def.mjs` 에서 채우면 그 노선의 실시간 도착이 살아납니다.

## HTTP 전용 API에 대하여

서울 열린데이터광장 지하철 API 호스트(`swopenapi.seoul.go.kr`)는 HTTP 전용입니다.
Android 는 API 28+ 부터, iOS 는 ATS 로 cleartext HTTP 를 기본 차단하므로 `app.config.ts` 에서 예외를 열어 두었습니다.

- **Android**: `expo-build-properties` 의 `usesCleartextTraffic: true` — 앱 전역 설정입니다. 도메인 한정으로 좁히려면 `network_security_config.xml` 을 주입하는 커스텀 config plugin 이 필요합니다.
- **iOS**: `NSAppTransportSecurity.NSExceptionDomains` 로 해당 도메인만 예외 처리했습니다.

해당 호스트가 HTTPS 를 지원하는 것을 확인했다면 `.env` 에 `SUBWAY_API_BASE_URL=https://swopenapi.seoul.go.kr` 를 넣는 편이 낫습니다. 그러면 위 예외가 불필요해집니다.

또한 이 설정들은 **Expo Go 에서는 적용되지 않습니다** (Expo Go 자체의 매니페스트가 적용됩니다).
HTTP 호출이 Expo Go 에서 되더라도 릴리스 빌드에서 막힐 수 있으니 `pnpm ios:release` / `pnpm android:release` 로 한 번 확인하세요.

## 검증

```bash
pnpm typecheck                          # strict 타입체크
pnpm lint                               # eslint (eslint-config-expo)
pnpm verify-data                        # 데이터셋 불변식 검사
pnpm verify-routes                      # 경로 탐색 불변식 검사
pnpm verify-transfer-data               # 환승 칸·환승 시간·역코드 불변식 검사
pnpm backend:build && pnpm backend:test # C# 백엔드
pnpm check:native                       # iOS/Android 툴체인 사전 점검
pnpm doctor                             # 의존성/설정 정합성 (expo-doctor)
pnpm exec expo export --platform ios
pnpm exec expo export --platform android  # Metro 번들 — 두 플랫폼의 import 그래프 검증
```

`app.config.ts` 를 고쳤을 때는 생성된 네이티브 설정까지 눈으로 확인하는 편이 확실합니다.

```bash
pnpm prebuild
cat ios/*/Info.plist                    # ATS 예외, UIBackgroundModes
cat android/app/src/main/AndroidManifest.xml   # 권한, cleartext 설정
```

## 알려진 제약

- 열차 위치를 못 받는 환경(모의 소스 제외)에서는 승차 후 ETA 가 경과 시간 기반이라 열차 지연을 반영하지 못합니다.
- 구간 실측 운행시간은 서울교통공사 운영 구간(1~8호선 일부)에만 있고, 나머지는 노선 평균입니다. 급행 운행 계통과 시각표 기반 경로 탐색은 아직 없습니다.
- 빠른하차 칸과 운행 공지는 공공데이터포털 키가 있는 백엔드에서만 실제 값이 나옵니다. 두 API 의 응답 필드명은 활용신청 후 확인이 필요합니다 (backend/README.md 참고).
- Android 의 `DATE` 트리거 알림은 `AlarmManager` 를 거치므로 Doze/절전 최적화에 걸리면 수 분 지연될 수 있습니다. 예비 알림을 넉넉히(기본 2정거장 전) 잡는 이유입니다. 삼성·샤오미 등에서는 배터리 최적화 예외 설정이 필요할 수 있습니다.
- 지하 구간에서는 GPS 가 잡히지 않아 지오펜싱이 역 출입구 근처에서만 신뢰할 수 있습니다.
- 지오펜싱에는 위치 권한 "항상 허용"이 필요합니다. iOS 는 먼저 "앱 사용 중"을 받은 뒤에야 "항상"을 요청할 수 있어
  권한 대화상자가 두 번 뜹니다. 시뮬레이터/에뮬레이터에서는 Features > Location 으로 위치를 직접 흘려보내야 검증할 수 있습니다.
- 역명 표기가 API 와 다른 경우가 있어 정규화와 별칭으로 맞추고 있으나, 실 API 응답으로 검증되지 않은 역이 남아 있을 수 있습니다.
- 경로 탐색은 급행 운행 계통을 고려하지 못합니다 (예: 김포공항 → 강남의 9호선 급행).

## 기술 스택

앱: Expo SDK 57 · React Native 0.86 · React 19.2 · expo-router · TypeScript(strict) · react-native-svg · expo-notifications · expo-location + expo-task-manager · expo-dev-client · EAS Build

백엔드: .NET 10 · ASP.NET Core Minimal API · Dapper · SQLite · MediatR 12.5 · Serilog · xunit + NSubstitute · Docker
