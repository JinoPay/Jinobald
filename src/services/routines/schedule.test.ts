import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isInArmWindow, nextOccurrence, reminderSlots, shouldArm, todayKey, toExpoWeekday } from './schedule';
import { newRoutine, weekdaysLabel, type CommuteRoutine } from './types';

function routine(overrides: Partial<CommuteRoutine> = {}): CommuteRoutine {
  return {
    ...newRoutine({
      name: '출근',
      savedRouteId: 'r1',
      weekdays: [1, 2, 3, 4, 5],
      time: { hour: 7, minute: 30 },
      remindMinutesBefore: 10,
      enabled: true,
      autoStart: false,
      alertNStationsBefore: null,
      useGps: null,
    }),
    ...overrides,
  };
}

// 2026-09-02 는 수요일입니다.
const wed = (hour: number, minute: number) => new Date(2026, 8, 2, hour, minute);

test('toExpoWeekday: 일요일 0 → 1', () => {
  assert.equal(toExpoWeekday(0), 1);
  assert.equal(toExpoWeekday(6), 7);
});

test('reminderSlots: 나서는 시각 - N분, 요일별', () => {
  const slots = reminderSlots(routine());
  assert.equal(slots.length, 5);
  assert.deepEqual(slots[0], { weekday: 1, hour: 7, minute: 20 });
});

test('reminderSlots: 자정을 넘으면 전날 요일', () => {
  const slots = reminderSlots(routine({ weekdays: [1], time: { hour: 0, minute: 5 }, remindMinutesBefore: 15 }));
  assert.deepEqual(slots, [{ weekday: 0, hour: 23, minute: 50 }]);
});

test('todayKey', () => {
  assert.equal(todayKey(wed(9, 0)), '2026-09-02');
});

test('isInArmWindow: 요일과 시각 범위', () => {
  const r = routine();
  assert.equal(isInArmWindow(r, wed(7, 15)), true);
  assert.equal(isInArmWindow(r, wed(8, 29)), true);
  assert.equal(isInArmWindow(r, wed(7, 0)), false);
  assert.equal(isInArmWindow(r, wed(8, 31)), false);
  // 2026-09-05 는 토요일.
  assert.equal(isInArmWindow(r, new Date(2026, 8, 5, 7, 30)), false);
});

test('shouldArm: 꺼져 있거나 오늘 이미 시작·건너뛴 루틴은 제외', () => {
  assert.equal(shouldArm(routine(), wed(7, 30)), true);
  assert.equal(shouldArm(routine({ enabled: false }), wed(7, 30)), false);
  assert.equal(shouldArm(routine({ lastArmedDate: '2026-09-02' }), wed(7, 30)), false);
  assert.equal(shouldArm(routine({ skippedDate: '2026-09-02' }), wed(7, 30)), false);
  assert.equal(shouldArm(routine({ lastArmedDate: '2026-09-01' }), wed(7, 30)), true);
});

test('nextOccurrence: 오늘 아직 안 지났으면 오늘, 지났으면 다음 요일', () => {
  const r = routine();
  assert.equal(nextOccurrence(r, wed(6, 0))?.getTime(), wed(7, 30).getTime());
  const next = nextOccurrence(r, wed(9, 0));
  assert.equal(next?.getDay(), 4);
  assert.equal(next?.getHours(), 7);
  // 금요일 저녁 → 월요일.
  assert.equal(nextOccurrence(r, new Date(2026, 8, 4, 20, 0))?.getDay(), 1);
  assert.equal(nextOccurrence(routine({ weekdays: [] }), wed(6, 0)), null);
});

test('weekdaysLabel', () => {
  assert.equal(weekdaysLabel([1, 2, 3, 4, 5]), '평일');
  assert.equal(weekdaysLabel([0, 6]), '주말');
  assert.equal(weekdaysLabel([0, 1, 2, 3, 4, 5, 6]), '매일');
  assert.equal(weekdaysLabel([1, 3, 5]), '월·수·금');
  assert.equal(weekdaysLabel([]), '요일 없음');
});
