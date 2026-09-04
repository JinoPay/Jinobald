import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { capabilities } from '@/services/location/capabilities';

/**
 * 승하차 알람 채널.
 *
 * Android 채널 설정은 만든 뒤에 바꿀 수 없습니다. 소리·DND 우회를 추가하면서 id 를 올렸고,
 * 옛 채널은 지웁니다 (사용자가 옛 채널에서 소리를 껐어도 새 채널은 기본값으로 시작합니다).
 */
export const TRIP_CHANNEL_ID = 'trip-alarm-v2';
const LEGACY_TRIP_CHANNEL_ID = 'trip-alerts';
/** 출퇴근 루틴 리마인더. 알람이 아니라 보통 알림입니다. */
export const ROUTINE_CHANNEL_ID = 'routine-reminders';

/**
 * 번들한 알람음 (`assets/sounds/alarm.wav`, `scripts/generate-alarm-sound.mjs` 산출물).
 * iOS 는 알림 콘텐츠의 `sound`, Android 는 채널의 `sound` 로 지정합니다.
 * 파일은 app.config.ts 의 expo-notifications 플러그인 `sounds` 가 양쪽 네이티브 프로젝트에 복사합니다.
 */
export const ALARM_SOUND = 'alarm.wav';

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

let channelsReady: Promise<void> | null = null;

/**
 * Android 알림 채널.
 * importance 가 MAX 가 아니면 헤드업 배너가 뜨지 않아 기능이 사실상 보이지 않고,
 * usage 가 ALARM 이 아니면 알림 볼륨(보통 낮음)으로 울립니다. bypassDnd 는 방해 금지에서도 울리게 합니다.
 */
export function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  channelsReady ??= (async () => {
    await Notifications.setNotificationChannelAsync(TRIP_CHANNEL_ID, {
      name: '승하차 알람',
      description: '하차·환승역 도착 알람. 방해 금지 모드에서도 울립니다.',
      importance: Notifications.AndroidImportance.MAX,
      sound: ALARM_SOUND,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      bypassDnd: true,
      enableVibrate: true,
      vibrationPattern: [0, 500, 300, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(ROUTINE_CHANNEL_ID, {
      name: '출퇴근 루틴',
      description: '정해 둔 시각에 여정 시작을 알립니다.',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
    await Notifications.deleteNotificationChannelAsync(LEGACY_TRIP_CHANNEL_ID).catch(() => undefined);
  })();
  return channelsReady;
}

/** 이전 이름과의 호환. */
export const ensureChannel = ensureChannels;

export interface NotificationPermissionState {
  granted: boolean;
  canAskAgain: boolean;
  /** 시뮬레이터/에뮬레이터에서는 알림 권한 자체가 의미가 없습니다. */
  isPhysicalDevice: boolean;
}

/**
 * 예약할 수 없는 환경에서는 권한을 물어봐야 의미가 없습니다.
 *
 * 웹 브라우저는 Notification API 로 권한 자체는 내주지만 예약 발화가 안 됩니다.
 * granted 로 보고하면 UI 가 "알림 설정 완료"라고 오해하게 되므로 여기서 끊습니다.
 */
const UNAVAILABLE: NotificationPermissionState = {
  granted: false,
  canAskAgain: false,
  isPhysicalDevice: Device.isDevice,
};

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  if (!capabilities.localNotifications) return UNAVAILABLE;
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain,
    isPhysicalDevice: Device.isDevice,
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!capabilities.localNotifications) return UNAVAILABLE;
  await ensureChannels();
  const { status, canAskAgain } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return {
    granted: status === 'granted',
    canAskAgain,
    isPhysicalDevice: Device.isDevice,
  };
}
