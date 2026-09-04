/**
 * 출퇴근 루틴 — 순수 모델입니다.
 *
 * "평일 07:30 에 집에서 나선다" 같은 규칙 하나가 루틴입니다. 저장 경로를 가리키고,
 * 요일마다 OS 에 WEEKLY 알림을 하나씩 걸어 둡니다. 앱이 죽어 있어도 그 알림이 울리고,
 * 탭하거나 "여정 시작" 버튼을 누르면 앱이 열리며 여정이 시작됩니다 — JS 를 예약 실행할
 * 방법이 없는 모바일에서 이것이 실현 가능한 "자동 시작"입니다.
 */
export interface CommuteRoutine {
  id: string;
  /** "출근", "퇴근" … */
  name: string;
  /** 저장 경로 id (`SavedRoute.id`). */
  savedRouteId: string;
  /** JS `Date#getDay()` 기준 요일. 0 = 일요일. */
  weekdays: number[];
  /** 집/회사에서 나서는 시각. */
  time: { hour: number; minute: number };
  /** 나서는 시각 몇 분 전에 알릴지. */
  remindMinutesBefore: number;
  enabled: boolean;
  /** 시작 창 안에서 앱을 열면 묻지 않고 바로 여정을 시작할지. */
  autoStart: boolean;
  /** 이 루틴만의 알림 설정. null 이면 저장 경로 → 전역 기본값 순입니다. */
  alertNStationsBefore: number | null;
  useGps: boolean | null;
  /** 걸어 둔 WEEKLY 알림 식별자 (요일마다 하나). */
  reminderNotificationIds: string[];
  /** 마지막으로 여정을 시작한 날 ('YYYY-MM-DD'). 하루에 한 번만 무장합니다. */
  lastArmedDate: string | null;
  /** "오늘은 건너뛰기"를 누른 날. */
  skippedDate: string | null;
}

export type CommuteRoutineInput = Omit<CommuteRoutine, 'id' | 'reminderNotificationIds' | 'lastArmedDate' | 'skippedDate'>;

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'] as const;
export const WEEKDAY_PRESETS = {
  평일: [1, 2, 3, 4, 5],
  주말: [0, 6],
  매일: [0, 1, 2, 3, 4, 5, 6],
} as const;

export function newRoutine(input: CommuteRoutineInput, now = Date.now()): CommuteRoutine {
  return {
    ...input,
    id: `routine-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    weekdays: [...new Set(input.weekdays)].filter((d) => d >= 0 && d <= 6).sort(),
    reminderNotificationIds: [],
    lastArmedDate: null,
    skippedDate: null,
  };
}

export function isRoutineList(value: unknown): value is CommuteRoutine[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        v &&
        typeof v.id === 'string' &&
        typeof v.name === 'string' &&
        typeof v.savedRouteId === 'string' &&
        Array.isArray(v.weekdays) &&
        v.time &&
        typeof v.time.hour === 'number' &&
        typeof v.time.minute === 'number',
    )
  );
}

/** "평일", "주말", "매일", 또는 "월·수·금". */
export function weekdaysLabel(weekdays: number[]): string {
  const sorted = [...new Set(weekdays)].sort();
  const same = (preset: readonly number[]) => preset.length === sorted.length && preset.every((d, i) => d === sorted[i]);
  if (same(WEEKDAY_PRESETS.매일)) return '매일';
  if (same(WEEKDAY_PRESETS.평일)) return '평일';
  if (same(WEEKDAY_PRESETS.주말)) return '주말';
  if (sorted.length === 0) return '요일 없음';
  return sorted.map((d) => WEEKDAY_LABEL[d]).join('·');
}

export function timeLabel(time: { hour: number; minute: number }): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}
