import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * 서울 열린데이터광장 지하철 API 는 HTTP 전용 호스트입니다.
 * Android 는 API 28+ 부터, iOS 는 ATS 로 cleartext HTTP 를 기본 차단하므로
 * 아래에서 해당 도메인에 한해 예외를 열어 줍니다.
 * `SUBWAY_API_BASE_URL` 을 https:// 로 설정하면 이 예외 없이도 동작합니다.
 */
const API_HOST = 'swopenapi.seoul.go.kr';
const DEFAULT_API_BASE_URL = `http://${API_HOST}`;

/**
 * 실제로 쓰는 URL 가운데 http:// 인 호스트만 예외로 엽니다.
 *
 * - 서울 API 직접 호출(`SUBWAY_API_BASE_URL`)은 기본이 http 라 예외가 필요합니다.
 * - 백엔드(`EXPO_PUBLIC_BACKEND_URL`)는 개발 중 LAN IP 로 http 를 쓰고, 운영은 https 입니다.
 *
 * https 백엔드만 쓰는 빌드라면 예외 목록이 비어 ATS/cleartext 설정이 아예 생기지 않습니다.
 */
function insecureHostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' ? parsed.hostname : null;
  } catch {
    return null;
  }
}
const directBaseUrl = process.env.SUBWAY_API_BASE_URL || DEFAULT_API_BASE_URL;
const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
const insecureHosts = [...new Set([directBaseUrl, backendUrl].map(insecureHostOf).filter((h): h is string => h !== null))];
// localhost 는 iOS ATS 가 기본 허용하고 Android 도 디버그에서 허용하지만, 명시해 두면 릴리스 구성 확인이 쉽습니다.

/**
 * iOS "시간 민감(Time Sensitive)" 알림 엔타이틀먼트.
 *
 * 있으면 집중 모드에서도 하차 알람이 전달됩니다. 무료 Personal Team 서명에서는 이 capability 가
 * 서명 단계에서 거부될 수 있어 **옵트인**입니다: `IOS_TIME_SENSITIVE=1 pnpm prebuild`.
 * 없어도 앱은 `interruptionLevel: 'timeSensitive'` 를 그대로 보내고, OS 가 조용히 일반 알림으로 낮춥니다.
 */
const iosTimeSensitive = process.env.IOS_TIME_SENSITIVE === '1';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '지노발드 지하철',
  slug: 'jinobald',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'jinobald',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.jinopay.jinobald',
    supportsTablet: true,
    entitlements: iosTimeSensitive
      ? { 'com.apple.developer.usernotifications.time-sensitive': true }
      : {},
    infoPlist:
      insecureHosts.length > 0
        ? {
            NSAppTransportSecurity: {
              NSExceptionDomains: Object.fromEntries(
                insecureHosts.map((host) => [
                  host,
                  { NSExceptionAllowsInsecureHTTPLoads: true, NSIncludesSubdomains: true },
                ]),
              ),
            },
          }
        : {},
  },
  android: {
    package: 'com.jinopay.jinobald',
    adaptiveIcon: {
      backgroundColor: '#0052A4',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    /**
     * 정확한 시각의 알람. 없으면 expo-notifications 가 부정확 알람(setAndAllowWhileIdle)으로 떨어져
     * Doze 에서 수 분 늦습니다. USE_EXACT_ALARM(API 33+)은 알람 앱에 자동 부여되고,
     * SCHEDULE_EXACT_ALARM(API 31–32)은 설정 화면에서 사용자가 켜야 합니다.
     */
    permissions: [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.VIBRATE',
      'android.permission.WAKE_LOCK',
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0052A4',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-build-properties',
      {
        // 앱 전역 cleartext 허용 — http 호스트를 하나라도 쓸 때만 켭니다. 도메인 한정이
        // 필요하면 커스텀 config plugin 으로 network_security_config.xml 을 주입해야 합니다 (README 참고).
        android: { usesCleartextTraffic: insecureHosts.length > 0 },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: '하차역 도착 알림을 위해 위치 정보를 사용합니다.',
        locationAlwaysAndWhenInUsePermission:
          '앱이 백그라운드에 있을 때도 하차역 도착을 알리기 위해 위치 정보를 사용합니다.',
        // 백그라운드 지오펜싱은 양쪽 플랫폼에서 각각 켜 줘야 합니다.
        // iOS: Info.plist 의 UIBackgroundModes 에 'location' 추가.
        // Android: ACCESS_BACKGROUND_LOCATION + FOREGROUND_SERVICE_LOCATION 권한 추가.
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      // Android 알림 아이콘은 알파 채널만 사용합니다. 지정하지 않으면 앱 아이콘이
      // 흰 사각형으로 뭉개져 표시되므로 모노크롬 실루엣을 넘겨 줍니다.
      // iOS 는 이 설정을 쓰지 않고 앱 아이콘을 그대로 사용합니다.
      'expo-notifications',
      {
        icon: './assets/images/android-icon-monochrome.png',
        color: '#0052A4',
        // 알람음. iOS 번들과 Android res/raw 양쪽에 복사됩니다 (scripts/generate-alarm-sound.mjs 산출물).
        sounds: ['./assets/sounds/alarm.wav'],
      },
    ],
    '@react-native-community/datetimepicker',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    subwayApiBaseUrl: directBaseUrl,
  },
});
