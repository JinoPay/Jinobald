import Constants from 'expo-constants';

/**
 * 앱 설정의 단일 읽기 지점.
 *
 * `process.env.EXPO_PUBLIC_*` 는 babel-preset-expo 가 번들 타임에 문자열로
 * 치환합니다. 반드시 리터럴 멤버 표현식으로 써야 하며 `process.env[key]` 처럼
 * 동적으로 접근하면 조용히 undefined 가 됩니다.
 *
 * 보안 주의: EXPO_PUBLIC_ 변수는 JS 번들에 그대로 포함되어 배포된 앱에서
 * 추출할 수 있습니다. 여기서 다루는 값은 공개 데이터용 저민감 키이므로
 * 허용되지만, 결과가 있는 비밀 키라면 서버 프록시를 두어야 합니다.
 */
const rawKey = process.env.EXPO_PUBLIC_SEOUL_SUBWAY_API_KEY?.trim();
const rawBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();

const extraBaseUrl = (Constants.expoConfig?.extra as { subwayApiBaseUrl?: string } | undefined)
  ?.subwayApiBaseUrl;

export const env = {
  /** 인증키. 없으면 null 이고, 이 경우 앱은 모의 데이터로 동작합니다. */
  seoulApiKey: rawKey && rawKey.length > 0 ? rawKey : null,
  baseUrl: extraBaseUrl ?? 'http://swopenapi.seoul.go.kr',
  /**
   * C# 백엔드 주소 (backend/ 참고). 있으면 서울 API 대신 이쪽을 씁니다 — 인증키가
   * 서버에 있어 번들에 아무것도 싣지 않고, 실시간 열차 위치·빠른하차·운행 공지까지 받습니다.
   */
  backendUrl: rawBackendUrl && rawBackendUrl.length > 0 ? rawBackendUrl.replace(/\/$/, '') : null,
  /** 도착정보 폴링 주기. 일일 호출 한도를 고려한 기본값입니다. */
  pollIntervalMs: 30_000,
  /** 도착이 임박했을 때(초) 폴링을 촘촘히 할 임계값. */
  nearArrivalSeconds: 300,
  /** 도착이 멀 때 사용하는 느린 폴링 주기. */
  slowPollIntervalMs: 60_000,
  /** 단일 요청 타임아웃. 서울 API 는 응답이 멈추는 사례가 있습니다. */
  requestTimeoutMs: 8_000,
  /** 노선 뷰·승차 후 추적의 열차 위치 폴링 주기. 백엔드 캐시 TTL(30초)과 맞춥니다. */
  positionsPollIntervalMs: 30_000,
  /** 운행 공지 폴링 주기. */
  noticesPollIntervalMs: 300_000,
  /** 즐겨찾기 도착 미리보기 폴링 주기. */
  favoritesPollIntervalMs: 60_000,
} as const;
