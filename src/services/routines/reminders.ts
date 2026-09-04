import * as Notifications from 'expo-notifications';

import { capabilities } from '@/services/location/capabilities';
import { CATEGORY } from '@/services/notifications/action-ids';
import { ensureChannels, ROUTINE_CHANNEL_ID } from '@/services/notifications/setup';

import { reminderSlots, toExpoWeekday } from './schedule';
import type { CommuteRoutine } from './types';

function reminderIdentifier(routineId: string, weekday: number): string {
  return `routine:${routineId}:${weekday}`;
}

/**
 * 루틴의 WEEKLY 리마인더를 OS 에 맞춥니다. 식별자가 결정적이라 몇 번 불러도 같은 상태가 됩니다.
 *
 * @returns 걸어 둔 알림 식별자. 꺼진 루틴이면 빈 배열.
 */
export async function syncRoutineReminders(
  routine: CommuteRoutine,
  labels: { originName: string; destinationName: string },
): Promise<string[]> {
  if (!capabilities.localNotifications) return [];
  await cancelRoutineReminders(routine);
  if (!routine.enabled || routine.weekdays.length === 0) return [];
  await ensureChannels();

  const ids: string[] = [];
  for (const slot of reminderSlots(routine)) {
    const identifier = reminderIdentifier(routine.id, slot.weekday);
    try {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: `${routine.name} 여정을 시작할 시간입니다`,
          body: `${labels.originName} → ${labels.destinationName} · ${routine.remindMinutesBefore}분 뒤 출발. 탭하면 하차 알림이 시작됩니다.`,
          data: { routineId: routine.id },
          categoryIdentifier: CATEGORY.routine,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(slot.weekday),
          hour: slot.hour,
          minute: slot.minute,
          channelId: ROUTINE_CHANNEL_ID,
        },
      });
      ids.push(identifier);
    } catch {
      // 한 요일이 실패해도 나머지는 겁니다.
    }
  }
  return ids;
}

export async function cancelRoutineReminders(routine: CommuteRoutine): Promise<void> {
  if (!capabilities.localNotifications) return;
  // 저장된 id 와, 요일이 바뀌었을 수 있으니 가능한 모든 요일 id 를 함께 거둡니다.
  const ids = new Set([
    ...routine.reminderNotificationIds,
    ...[0, 1, 2, 3, 4, 5, 6].map((d) => reminderIdentifier(routine.id, d)),
  ]);
  await Promise.all([...ids].map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}
