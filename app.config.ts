import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * 서울 열린데이터광장 지하철 API 는 HTTP 전용 호스트입니다.
 * Android 는 API 28+ 부터, iOS 는 ATS 로 cleartext HTTP 를 기본 차단하므로
 * 아래에서 해당 도메인에 한해 예외를 열어 줍니다.
 * `SUBWAY_API_BASE_URL` 을 https:// 로 설정하면 이 예외 없이도 동작합니다.
 */
const API_HOST = 'swopenapi.seoul.go.kr';
const DEFAULT_API_BASE_URL = `http://${API_HOST}`;

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
    infoPlist: {
      NSAppTransportSecurity: {
        NSExceptionDomains: {
          [API_HOST]: {
            NSExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: true,
          },
        },
      },
    },
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
        // 앱 전역 cleartext 허용. 도메인 한정이 필요하면 커스텀 config plugin 으로
        // network_security_config.xml 을 주입해야 합니다 (README 참고).
        android: { usesCleartextTraffic: true },
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
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    subwayApiBaseUrl: process.env.SUBWAY_API_BASE_URL || DEFAULT_API_BASE_URL,
  },
});
