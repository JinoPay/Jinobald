import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const TRIP_CHANNEL_ID = 'trip-alerts';

/**
 * 포그라운드에서도 배너를 띄웁니다.
 * `shouldShowAlert` 는 이 SDK 에서 폐기되었고 banner/list 로 나뉘었습니다.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady: Promise<void> | null = null;

/**
 * Android 알림 채널.
 * importance 가 MAX 가 아니면 헤드업 배너가 뜨지 않아 기능이 사실상 보이지 않습니다.
 */
export function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  channelReady ??= Notifications.setNotificationChannelAsync(TRIP_CHANNEL_ID, {
    name: '승하차 알림',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  }).then(() => undefined);
  return channelReady;
}

export interface NotificationPermissionState {
  granted: boolean;
  canAskAgain: boolean;
  /** 시뮬레이터/에뮬레이터에서는 알림 권한 자체가 의미가 없습니다. */
  isPhysicalDevice: boolean;
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain,
    isPhysicalDevice: Device.isDevice,
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  await ensureChannel();
  const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain,
    isPhysicalDevice: Device.isDevice,
  };
}
