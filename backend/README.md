# 지노발드 지하철 백엔드

앱이 서울 열린데이터광장 키를 번들에 싣지 않도록 **키를 대신 보관하고**, 실시간 도착·열차 위치를 캐시해 주며,
환승칸·환승시간·구간시간·시각표 같은 정적 데이터셋을 제공하는 .NET 10 서버입니다.

- **Dapper + SQLite** — `dotnet run` 만으로 동작. `backend/data/subway.db` 하나가 전부입니다.
- **CQRS (MediatR 12.5.0)** — 적재는 Command, API 는 Query. 13.x 는 라이선스가 바뀌어 올리지 않습니다.
- **인증키 없이도 전 기능 동작** — 키가 없으면 `TimetableSimulatorProvider` 가 실제 시각표로 열차 위치·도착정보를 합성합니다 (`source: "timetable"`).

## 실행

```bash
pnpm check:backend           # .NET 10 SDK / docker 확인
pnpm backend:build
pnpm backend:test
pnpm backend:import          # scripts/data/raw → backend/data/subway.db (체크섬이 같으면 건너뜀)
pnpm backend:run             # http://0.0.0.0:5080  (시작 시에도 자동 적재 — 개발 환경은 같은 backend/data/subway.db 를 씁니다)
```

```bash
curl -s localhost:5080/api/v1/health | jq
curl -s "localhost:5080/api/v1/transfers/guides?station=고속터미널&from=3" | jq '.[0]'
curl -s localhost:5080/api/v1/realtime/positions/1002 | jq '.source, (.rows|length)'
curl -s "localhost:5080/api/v1/realtime/arrivals/서울역" | jq '.rows[0]'
curl -s "localhost:5080/api/v1/timetable/2/0201?direction=IN&limit=3" | jq
```

시뮬레이터 스냅샷만 보려면:

```bash
dotnet run --project backend/src/Jinobald.Subway.Ingest -- simulate --line 2 --at 08:30
```

### Docker

```bash
docker compose -f backend/docker-compose.yml up --build
```

데이터셋은 이미지에 포함되고 DB 는 `subway-data` 볼륨에 남습니다.

## 인증키

둘 다 **무료**이고 없어도 됩니다. 넣으면 실시간·빠른하차·운행공지가 실제 값으로 바뀝니다.

| 설정 키 | 발급 | 쓰는 곳 |
|---|---|---|
| `Seoul:ApiKey` (`Seoul__ApiKey`) | [서울 열린데이터광장](https://data.seoul.go.kr) → 로그인 → 나의 화면 → **인증키 신청** (즉시 발급, 1,000회/일) | 실시간 도착 `realtimeStationArrival`, 열차 위치 `realtimePosition` |
| `DataGoKr:ServiceKey` (`DataGoKr__ServiceKey`) | [공공데이터포털](https://www.data.go.kr) → 로그인 → 아래 두 API 각각 **활용신청** (자동승인, 10,000회/일) — [빠른하차정보 15143840](https://www.data.go.kr/data/15143840/openapi.do), [지하철알림정보 15144070](https://www.data.go.kr/data/15144070/openapi.do) | 빠른하차 칸, 지연·사고 공지 |

키를 두는 방법 (우선순위 순):

```bash
# 1. 환경변수
Seoul__ApiKey=발급키 DataGoKr__ServiceKey=발급키 pnpm backend:run
# 2. user-secrets (개발 머신에만 저장, git 에 안 들어감)
dotnet user-secrets --project backend/src/Jinobald.Subway.Api set Seoul:ApiKey 발급키
# 3. backend/src/Jinobald.Subway.Api/appsettings.Production.local.json  (.gitignore 대상)
```

> 서울 키는 **백엔드 사용자 전체가 나눠 씁니다.** `RealtimeCache`(도착 20초·위치 30초 TTL, 동일 키 single-flight)와
> `QuotaGuard`(900회에서 새 호출 중단, 이후 `source: "stale"`)가 하루 1,000회를 지킵니다. 사용자가 늘면 열린데이터광장에
> 트래픽 상향을 신청하세요. `/api/v1/health` 의 `quota` 로 오늘 사용량을 볼 수 있습니다.

> 공공데이터포털 두 API 의 응답 필드명은 활용신청 후 Swagger 로 확인해야 합니다. `DataGoKrClient` 는 후보 이름
> 여러 개(`carNo`/`carNum`, `doorNo`/`doorNum` …)를 시도하도록 느슨하게 짜 두었으니, 실제 응답을 보고 한 곳만 고치면 됩니다.

## API (`/api/v1`)

모든 실시간 응답에는 `source` 가 있습니다: `live` · `cached` · `stale` · `timetable` · `mock`.

| 경로 | 설명 |
|---|---|
| `GET /health` | 공급자 이름, 키 설정 여부, 할당량, 적재된 데이터셋 |
| `GET /realtime/arrivals/{역명}` | 실시간 도착 (서울 API 원본 필드 그대로, `btrainNo` 포함) |
| `GET /realtime/positions/{subwayId}` | 노선 열차 위치. `1001`~`1009`, `1063` 경의중앙 … |
| `GET /stations` | 역코드 목록 |
| `GET /transfers/guides?station=&from=` | 환승 가이드 (하차 칸·승차 칸·소요시간) |
| `GET /transfers/walk-times` | 환승 도보 거리·시간 |
| `GET /segments[/{호선}]` | 역간 표준 운행시간 |
| `GET /timetable/{호선}/{역코드}?day=DAY&direction=UP&after=08:30&limit=5` | 다음 출발 열차 (`day` 는 DAY/SAT/END, 아니면 400) |
| `GET /timetable/{호선}/{역코드}/last?day=&direction=` | 막차. 방향을 주지 않으면 방향마다 하나 |
| `GET /fast-exit/{호선}/{역코드}?station=` | 빠른하차 칸 (키 있을 때 공공데이터포털에서 받아 7일 보관) |
| `GET /notices?active=true` | 운행 공지 |
| `GET /datasets/manifest` | 데이터셋 체크섬·행수·적재 시각 |
| `POST /admin/import` | 수동 적재 (`Datasets:RawDir`). `Admin:ApiKey` 가 없으면 404, 있으면 `X-Admin-Key` 헤더 필수 |

`/health` 는 DB 를 실제로 읽고 시각표 행이 있어야 `ok: true` 이며, 아니면 503 입니다 — readiness 프로브로 쓸 수 있습니다.
실시간·시각표·빠른하차 엔드포인트는 IP 당 분당 `RateLimit:PermitPerMinute`(기본 60)회로 제한되고 넘으면 429 `quota` 입니다.

### 운영 설정

| 설정 키 | 기본 | 설명 |
|---|---|---|
| `Admin:ApiKey` | 없음 | 관리 엔드포인트 키. 비우면 관리 엔드포인트가 아예 없는 것처럼 동작합니다 |
| `Cors:AllowedOrigins` | `[]` | 웹 빌드를 다른 오리진에서 띄울 때만. 비우면 CORS 정책을 등록하지 않습니다 |
| `RateLimit:PermitPerMinute` | 60 | IP 당 분당 실시간 요청 |
| `Https:Redirect` | false | TLS 프록시가 `X-Forwarded-Proto` 를 붙일 때만 켭니다. 없는데 켜면 리디렉션 루프 |

OpenAPI 문서(`/openapi/v1.json`)는 Development 환경에서만 노출됩니다. 컨테이너는 비루트 사용자 `app` 으로 돕니다.
서울 API 가 실패하거나 할당량이 소진되면 도착정보·열차 위치 모두 시각표 시뮬레이터로 폴백합니다(시각표가 없는 역은 원래 오류).

OpenAPI 문서: `GET /openapi/v1.json`.

## 구조

```
src/Jinobald.Subway.Core     도메인 record · CQRS(MediatR) · CSV 파서 · 서울/공공데이터 클라이언트 · 캐시·할당량 · 시각표 시뮬레이터
src/Jinobald.Subway.Data     SQLite 연결 · 임베디드 SQL 마이그레이션 · Dapper 리포지토리
src/Jinobald.Subway.Api      Minimal API · 시작 시 적재 · 공지 갱신 HostedService · Dockerfile
src/Jinobald.Subway.Ingest   CLI: import / export-app-json / simulate
tests/…Core.Tests            xunit + NSubstitute (파서·캐시·할당량·시뮬레이터·SQLite 통합)
```

역명 정규화(`StationNameNormalizer`)는 앱의 `normalizeStationKey` 와 같은 규칙이며, 테스트가 같은 픽스처로 둘을 고정합니다.
데이터셋 자체에 대한 설명은 [`scripts/data/raw/README.md`](../scripts/data/raw/README.md) 를 보세요.
