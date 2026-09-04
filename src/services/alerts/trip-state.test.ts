import assert from 'node:assert/strict';
import { test } from 'node:test';

import { trip, twoLegTrip } from './test-fixtures';
import { advanceLegState, clearLegState, consumeAlert, reconcileElapsed } from './trip-state';

const NOW = 1_000_000_000;

test('consumeAlert: 예약을 발화 기록으로 옮기고 취소할 ID 를 돌려줌, 멱등', () => {
  const base = trip({ scheduled: { '0:arrive': { notificationId: 'n1', atMs: NOW } } });
  const first = consumeAlert(base, '0:arrive');
  assert.deepEqual(first.cancelIds, ['n1']);
  assert.deepEqual(first.trip.firedKeys, ['0:arrive']);
  assert.equal(first.trip.scheduled['0:arrive'], undefined);

  const second = consumeAlert(first.trip, '0:arrive');
  assert.equal(second.trip, first.trip);
  assert.deepEqual(second.cancelIds, []);
});

test('clearLegState: 승차 취소는 이 구간의 발화 기록까지 지움 (4.2)', () => {
  const base = trip({
    boarded: true,
    boardedAt: NOW,
    boardedTrainNo: '1001',
    boardedBy: 'manual',
    firedKeys: ['0:board', '0:pre'],
    scheduled: { '0:arrive': { notificationId: 'n1', atMs: NOW + 60_000 } },
  });
  const { trip: next, cancelIds } = clearLegState(base, 0);
  assert.deepEqual(next.firedKeys, []);
  assert.deepEqual(next.scheduled, {});
  assert.deepEqual(cancelIds, ['n1']);
  assert.equal(next.boarded, false);
  assert.equal(next.boardedAt, null);
  assert.equal(next.boardedTrainNo, null);
  assert.equal(next.boardedBy, null);
});

test('clearLegState: 다른 구간의 기록은 건드리지 않음', () => {
  const base = twoLegTrip({ currentLegIndex: 1, firedKeys: ['0:transfer', '1:board'] });
  const { trip: next } = clearLegState(base, 1);
  assert.deepEqual(next.firedKeys, ['0:transfer']);
});

test('advanceLegState: 지난 구간 예약을 거두고 승차 상태를 되돌림', () => {
  const base = twoLegTrip({
    boarded: true,
    boardedAt: NOW,
    scheduled: {
      '0:transfer-pre': { notificationId: 'p', atMs: NOW },
      '0:transfer': { notificationId: 't', atMs: NOW },
    },
  });
  const { trip: next, cancelIds } = advanceLegState(base);
  assert.equal(next.currentLegIndex, 1);
  assert.equal(next.boarded, false);
  assert.deepEqual(next.scheduled, {});
  assert.deepEqual(cancelIds.sort(), ['p', 't']);
  // 마지막 구간에서는 그대로.
  assert.equal(advanceLegState(next).trip, next);
});

test('reconcileElapsed: 지난 예약이 없으면 변화 없음', () => {
  const base = trip({ scheduled: { '0:arrive': { notificationId: 'n1', atMs: NOW + 60_000 } } });
  const result = reconcileElapsed(base, NOW);
  assert.equal(result.outcome, 'none');
  assert.equal(result.trip, base);
});

test('reconcileElapsed: 도착 알림 시각이 지났으면 여정 완료 (4.5)', () => {
  const base = trip({
    scheduled: {
      '0:pre': { notificationId: 'p', atMs: NOW - 300_000 },
      '0:arrive': { notificationId: 'a', atMs: NOW - 10_000 },
    },
  });
  const result = reconcileElapsed(base, NOW);
  assert.equal(result.outcome, 'completed');
  assert.equal(result.trip.status, 'completed');
  assert.deepEqual(result.cancelIds.sort(), ['a', 'p']);
});

test('reconcileElapsed: 지오펜스가 도착을 이미 소비했어도 완료로 봄', () => {
  const base = trip({ firedKeys: ['0:arrive'] });
  assert.equal(reconcileElapsed(base, NOW).outcome, 'completed');
});

test('reconcileElapsed: 환승 알림 시각이 지났으면 다음 구간으로', () => {
  const base = twoLegTrip({
    boarded: true,
    scheduled: { '0:transfer': { notificationId: 't', atMs: NOW - 1 } },
  });
  const result = reconcileElapsed(base, NOW);
  assert.equal(result.outcome, 'advanced');
  assert.equal(result.trip.currentLegIndex, 1);
  assert.equal(result.trip.boarded, false);
  assert.ok(result.cancelIds.includes('t'));
});

test('reconcileElapsed: 예비 알림만 지났으면 소비만 하고 계속 진행', () => {
  const base = trip({
    scheduled: {
      '0:pre': { notificationId: 'p', atMs: NOW - 1 },
      '0:arrive': { notificationId: 'a', atMs: NOW + 120_000 },
    },
  });
  const result = reconcileElapsed(base, NOW);
  assert.equal(result.outcome, 'none');
  assert.deepEqual(result.trip.firedKeys, ['0:pre']);
  assert.ok(result.trip.scheduled['0:arrive']);
});
