import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, Platform } from 'react-native';

/** Expo Go 로 실행 중인지. 백그라운드 위치/TaskManager 는 여기서 동작하지 않습니다. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** 웹에는 expo-task-manager 도, expo-notifications 의 스케줄러 구현도 없습니다. */
const isWeb = Platform.OS === 'web';

/**
 * 실행 환경별 기능 표.
 *
 * ETA 기반 로컬 알림은 네이티브(Expo Go 포함)에서 동작하고, GPS 지오펜싱은 dev build 를
 * 요구합니다. 웹은 둘 다 불가입니다. 조용히 실패하는 대신 이 값을 UI 에 그대로 노출합니다.
 */
export const capabilities = {
  /**
   * 예약 로컬 알림 — Expo Go 포함 네이티브에서 동작합니다.
   *
   * 웹은 불가입니다. expo-notifications 는 웹에 `scheduleNotificationAsync` 구현이 없어
   * 호출하면 "not available on web" 예외를 던집니다. 브라우저 Notification API 로 권한은
   * 받을 수 있지만 예약 발화가 안 되므로 기능이 성립하지 않습니다.
   */
  localNotifications: !isWeb,
  /** 앱이 열려 있을 때의 위치 보정 — Expo Go 에서도 동작. */
  foregroundLocation: true,
  /** 앱이 닫혀 있을 때의 지오펜싱 — dev build 필요. 웹에서는 불가. */
  backgroundGeofencing: !isExpoGo && !isWeb,
} as const;

/** 위치/지오펜싱 제약 안내. 제약이 없으면 null. */
export const capabilityNotice = isWeb
  ? '웹에서는 GPS 보정과 지오펜싱을 쓸 수 없습니다. 역 검색과 실시간 도착 확인용으로만 쓰세요.'
  : isExpoGo
  ? 'Expo Go 에서는 백그라운드 GPS 보정이 동작하지 않습니다. 도착예정 기반 알림은 정상 동작하며, GPS 보정을 쓰려면 개발 빌드(pnpm ios / pnpm android)가 필요합니다.'
  : null;

/** 예약 알림을 쓸 수 없을 때 그 이유. 쓸 수 있으면 null. */
export const notificationNotice = isWeb
  ? '웹 브라우저에서는 승하차 알림을 예약할 수 없습니다. iOS/Android 빌드(pnpm ios / pnpm android)에서 사용해 주세요.'
  : null;

/**
 * 네트워크 폴링을 해도 되는 상태인지.
 *
 * 네이티브는 AppState 가 'active' 일 때만 폴링해 호출 한도를 아낍니다. 웹은 탭이 가려지면
 * 'background' 로 보고되는데(미리보기 창 포함) 브라우저에서 폴링을 멈춰 얻는 것이 없으므로 항상 허용합니다.
 */
export function isForeground(): boolean {
  if (isWeb) return true;
  return AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
}
