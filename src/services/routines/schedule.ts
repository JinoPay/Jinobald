/**
 * 루틴 시각 계산 — 순수 함수입니다 (`pnpm test`).
 */
import type { CommuteRoutine } from './types';

/** expo-notifications 의 WEEKLY 트리거는 1 = 일요일 … 7 = 토요일입니다. JS 는 0 = 일요일. */
export function toExpoWeekday(jsWeekday: number): number {
  return jsWeekday + 1;
}

export interface ReminderSlot {
  /** JS 요일. 리마인더가 자정을 넘어 앞당겨지면 전날입니다. */
  weekday: number;
  hour: number;
  minute: number;
}

/** 요일마다 리마인더가 울릴 시각. 나서는 시각 - N분. 자정을 넘으면 전날로 감습니다. */
export function reminderSlots(routine: CommuteRoutine): ReminderSlot[] {
  const total = routine.time.hour * 60 + routine.time.minute - routine.remindMinutesBefore;
  const shiftDays = total < 0 ? -1 : 0;
  const minutes = ((total % 1440) + 1440) % 1440;
  return [...new Set(routine.weekdays)]
    .sort()
    .map((day) => ({ weekday: (day + shiftDays + 7) % 7, hour: Math.floor(minutes / 60), minute: minutes % 60 }));
}

/** 'YYYY-MM-DD' (로컬). 하루 한 번 무장하는 기준입니다. */
export function todayKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface ArmWindow {
  /** 나서는 시각 몇 분 전부터 (리마인더보다 조금 앞). */
  beforeMinutes: number;
  /** 몇 분 후까지 — 늦게 나섰어도 이 안이면 오늘의 출근으로 봅니다. */
  afterMinutes: number;
}

export const DEFAULT_ARM_WINDOW: ArmWindow = { beforeMinutes: 20, afterMinutes: 60 };

/** 지금이 이 루틴의 시작 창 안인지 (오늘 요일 + 시각 범위). */
export function isInArmWindow(routine: CommuteRoutine, now: Date, window: ArmWindow = DEFAULT_ARM_WINDOW): boolean {
  if (!routine.weekdays.includes(now.getDay())) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const target = routine.time.hour * 60 + routine.time.minute;
  return nowMinutes >= target - window.beforeMinutes && nowMinutes <= target + window.afterMinutes;
}

/** 창 안이고, 켜져 있고, 오늘 아직 시작하지도 건너뛰지도 않았으면 무장 대상입니다. */
export function shouldArm(routine: CommuteRoutine, now: Date, window?: ArmWindow): boolean {
  if (!routine.enabled) return false;
  const today = todayKey(now);
  if (routine.lastArmedDate === today || routine.skippedDate === today) return false;
  return isInArmWindow(routine, now, window);
}

/** 다음에 나서는 시각. 요일이 없으면 null. */
export function nextOccurrence(routine: CommuteRoutine, now: Date): Date | null {
  if (routine.weekdays.length === 0) return null;
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, routine.time.hour, routine.time.minute, 0, 0);
    if (routine.weekdays.includes(candidate.getDay()) && candidate.getTime() > now.getTime()) return candidate;
  }
  return null;
}
