import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Expo Go 로 실행 중인지. 백그라운드 위치/TaskManager 는 여기서 동작하지 않습니다. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * 실행 환경별 기능 표.
 *
 * 앱의 주 알림 경로(ETA 기반 로컬 알림)는 어디서든 동작하고, GPS 지오펜싱만
 * dev build 를 요구합니다. 조용히 실패하는 대신 이 값을 UI 에 그대로 노출합니다.
 */
export const capabilities = {
  /** 예약 로컬 알림 — Expo Go 포함 어디서든 동작. */
  localNotifications: true,
  /** 앱이 열려 있을 때의 위치 보정 — Expo Go 에서도 동작. */
  foregroundLocation: true,
  /** 앱이 닫혀 있을 때의 지오펜싱 — dev build 필요. */
  backgroundGeofencing: !isExpoGo,
} as const;

export const capabilityNotice = isExpoGo
  ? 'Expo Go 에서는 백그라운드 GPS 보정이 동작하지 않습니다. 도착예정 기반 알림은 정상 동작하며, GPS 보정을 쓰려면 개발 빌드(pnpm ios / pnpm android)가 필요합니다.'
  : null;
