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
        isAndroidBackgroundLocationEnabled: true,
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
