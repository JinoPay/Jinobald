import * as Notifications from 'expo-notifications';

import { classifyAlertTime } from '@/services/alerts/eta';
import { capabilities } from '@/services/location/capabilities';

import { categoryForKind } from './action-ids';
import type { AlertKind } from './kinds';
import { ALARM_SOUND, ensureChannels, TRIP_CHANNEL_ID } from './setup';

export { ALERT_KINDS, alertKey, isAlertKind, parseAlertKey } from './kinds';
export type { AlertKey, AlertKind } from './kinds';

export interface TripNotificationPayload {
  tripId: string;
  /** 어느 구간의 알림인지. 이게 없으면 지난 구간의 늦은 알림을 구분할 수 없습니다. */
  legIndex: number;
  kind: AlertKind;
}

interface ScheduleParams {
  title: string;
  body: string;
  atMs: number;
  payload: TripNotificationPayload;
  /**
   * 결정적 식별자. 같은 식별자로 다시 예약하면 이전 예약이 **교체**됩니다 — 재예약이
   * 취소·예약 두 단계로 갈라져 Android 에서 누락되거나 중복되는 일을 줄입니다.
   */
  identifier?: string;
}

/** 승하차·환승 알림 문구를 알람답게 꾸민 콘텐츠. */
function alarmContent(
  title: string,
  body: string,
  data: Record<string, unknown>,
  kind: AlertKind,
): Notifications.NotificationContentInput {
  // 하차·환승은 사용자가 확인할 때까지 남아 있어야 합니다. 예비·승차 알림은 지나가도 됩니다.
  const persistent = kind === 'arrive' || kind === 'transfer';
  return {
    title,
    body,
    data,
    sound: ALARM_SOUND,
    // iOS: 집중 모드에서도 전달됩니다. 엔타이틀먼트가 없는 빌드에서는 OS 가 조용히 active 로 낮춥니다.
    interruptionLevel: 'timeSensitive',
    categoryIdentifier: categoryForKind(kind),
    // Android
    priority: Notifications.AndroidNotificationPriority.MAX,
    vibrate: [0, 500, 300, 500],
    sticky: persistent,
    autoDismiss: !persistent,
  };
}

/**
 * 알림 예약.
 *
 * 핵심: `setTimeout` 을 쓰지 않습니다. 앱이 백그라운드로 가면 JS 타이머는 멈추지만
 * OS 에 예약한 알림은 그대로 발화합니다. 그래서 벽시계 시각을 계산해 DATE 트리거로
 * 넘깁니다 — 이 덕분에 Expo Go 에서도 알림 기능이 온전히 동작합니다.
 *
 * 목표 시각이 이미 지났다면 예약 대신 즉시 표시하고, 너무 지났으면(90초 초과) 표시하지
 * 않습니다 — 둘 다 null 을 돌려주므로 호출자는 "발화함"으로 기록합니다.
 *
 * 알림을 못 쓰는 환경(웹)에서는 호출 자체가 예외를 던지므로 서비스 경계에서 막습니다.
 * geofence.ts 와 같은 패턴입니다 — UI 가 먼저 막지만, 어떤 경로로 들어와도 앱이 죽지
 * 않도록 여기서도 방어합니다.
 */
export async function scheduleTripNotification({
  title,
  body,
  atMs,
  payload,
  identifier,
}: ScheduleParams): Promise<string | null> {
  if (!capabilities.localNotifications) return null;
  await ensureChannels();
  const data = { ...payload };

  const timing = classifyAlertTime(atMs, Date.now());
  if (timing === 'stale') return null;
  if (timing === 'now') {
    await presentNow(title, body, data, payload.kind);
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    identifier,
    content: alarmContent(title, body, data, payload.kind),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(atMs),
      channelId: TRIP_CHANNEL_ID,
    },
  });
}

export async function presentTripNotification(
  title: string,
  body: string,
  payload: TripNotificationPayload,
): Promise<void> {
  if (!capabilities.localNotifications) return;
  await ensureChannels();
  await presentNow(title, body, { ...payload }, payload.kind);
}

/**
 * 즉시 표시. `presentNotificationAsync` 는 이 SDK 에서 제거되었으므로
 * 채널만 지정한 트리거로 예약합니다 (트리거에 시각이 없으면 곧바로 발화합니다).
 */
async function presentNow(
  title: string,
  body: string,
  data: Record<string, unknown>,
  kind: AlertKind,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: alarmContent(title, body, data, kind),
    trigger: { channelId: TRIP_CHANNEL_ID },
  });
}

/** 예약을 해제하고, 이미 표시된 것이면 트레이에서도 지웁니다. */
export async function cancelNotifications(ids: (string | null | undefined)[]): Promise<void> {
  if (!capabilities.localNotifications) return;
  const valid = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  await Promise.all(
    valid.flatMap((id) => [
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
      Notifications.dismissNotificationAsync(id).catch(() => undefined),
    ]),
  );
}
