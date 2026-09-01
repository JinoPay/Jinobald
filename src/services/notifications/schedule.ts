import * as Notifications from 'expo-notifications';

import { ensureChannel, TRIP_CHANNEL_ID } from './setup';

export type AlertKind = 'pre' | 'arrive';

export interface TripNotificationPayload {
  tripId: string;
  kind: AlertKind;
}

interface ScheduleParams {
  title: string;
  body: string;
  atMs: number;
  payload: TripNotificationPayload;
}

/**
 * 알림 예약.
 *
 * 핵심: `setTimeout` 을 쓰지 않습니다. 앱이 백그라운드로 가면 JS 타이머는 멈추지만
 * OS 에 예약한 알림은 그대로 발화합니다. 그래서 벽시계 시각을 계산해 DATE 트리거로
 * 넘깁니다 — 이 덕분에 Expo Go 에서도 알림 기능이 온전히 동작합니다.
 *
 * 목표 시각이 이미 지났다면 예약 대신 즉시 표시합니다.
 */
export async function scheduleTripNotification({
  title,
  body,
  atMs,
  payload,
}: ScheduleParams): Promise<string | null> {
  await ensureChannel();
  const data = { ...payload };

  if (atMs <= Date.now() + 1_000) {
    await presentNow(title, body, data);
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
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
  await ensureChannel();
  await presentNow(title, body, { ...payload });
}

/**
 * 즉시 표시. `presentNotificationAsync` 는 이 SDK 에서 제거되었으므로
 * 채널만 지정한 트리거로 예약합니다 (트리거에 시각이 없으면 곧바로 발화합니다).
 */
async function presentNow(
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: { channelId: TRIP_CHANNEL_ID },
  });
}

export async function cancelNotifications(ids: (string | null | undefined)[]): Promise<void> {
  await Promise.all(
    ids
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)),
  );
}
