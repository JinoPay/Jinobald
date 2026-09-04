import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeProgress, detectWrongDirection, estimateSecondsToOrigin } from './progress';
import { arrival, leg, LINE, position, trip, twoLegTrip } from './test-fixtures';

const NOW = 1_000_000_000;

test('승차 전, 도착정보 있음 → arrival 기준, fresh', () => {
  const p = computeProgress(trip(), LINE, [arrival({ secondsUntilArrival: 120 })], [], NOW);
  assert.equal(p.basis, 'arrival');
  assert.equal(p.fresh, true);
  assert.equal(p.secondsToTrain, 120);
  assert.equal(p.stationsLeft, 4);
  assert.equal(p.etaSeconds, 120 + 480);
});

test('승차 전, 도착정보 없음 → static, fresh 아님 (4.1)', () => {
  const p = computeProgress(trip(), LINE, [], [], NOW);
  assert.equal(p.basis, 'static');
  assert.equal(p.fresh, false);
  assert.equal(p.secondsToTrain, null);
  assert.equal(p.etaSeconds, 480);
});

test('승차 전, 다른 방향 열차는 무시', () => {
  const p = computeProgress(trip(), LINE, [arrival({ direction: 'up' })], [], NOW);
  assert.equal(p.basis, 'static');
});

test('estimateSecondsToOrigin: 초가 없어도 현재 위치 역으로 추정 (4.10)', () => {
  // 승차역 A(0) 로 하행하는 열차… 는 A 뒤쪽이 없으므로 C 에서 타는 구간으로 봅니다.
  const l = leg({ boardStationName: 'C', boardIndex: 2, alightIndex: 5, alightStationName: 'F', stationCount: 3 });
  const approaching = arrival({ secondsUntilArrival: null, currentPositionStationName: 'A역', status: 'running' });
  assert.equal(estimateSecondsToOrigin(approaching, LINE, l), 240);
  // 승강장에 있으면 0.
  assert.equal(estimateSecondsToOrigin(arrival({ secondsUntilArrival: null, status: 'arrived' }), LINE, l), 0);
  // 하차역 쪽(D)에 있으면 우리 승차역으로 오는 열차가 아닙니다.
  const past = arrival({ secondsUntilArrival: null, currentPositionStationName: 'D', status: 'running' });
  assert.equal(estimateSecondsToOrigin(past, LINE, l), null);
  // 모르는 역이면 null.
  assert.equal(estimateSecondsToOrigin(arrival({ secondsUntilArrival: null, currentPositionStationName: 'Z' }), LINE, l), null);
});

test('승차 후, 열차 위치 있음 → live-position', () => {
  const t = trip({ boarded: true, boardedAt: NOW - 60_000, boardedTrainNo: '1001' });
  const p = computeProgress(t, LINE, [], [position({ stationIndex: 2, status: 'arrived' })], NOW);
  assert.equal(p.basis, 'live-position');
  assert.equal(p.fresh, true);
  assert.equal(p.stationsLeft, 2);
  assert.equal(p.etaSeconds, 240);
});

test('승차 후, 열차가 구간 밖이면 경과 시간으로', () => {
  const t = trip({ boarded: true, boardedAt: NOW - 250_000, boardedTrainNo: '1001' });
  // F(5) 는 하차역 E(4) 너머.
  const p = computeProgress(t, LINE, [], [position({ stationIndex: 5 })], NOW);
  assert.equal(p.basis, 'elapsed');
  assert.equal(p.stationsLeft, 2);
  assert.equal(p.etaSeconds, 230);
});

test('승차 후, 열차번호 없음 → elapsed', () => {
  const t = trip({ boarded: true, boardedAt: NOW - 10_000, boardedTrainNo: null });
  const p = computeProgress(t, LINE, [], [position()], NOW);
  assert.equal(p.basis, 'elapsed');
  assert.equal(p.stationsLeft, 4);
});

test('다구간: 남은 구간은 정적 합산', () => {
  const p = computeProgress(twoLegTrip(), LINE, [arrival({ secondsUntilArrival: 60 })], [], NOW);
  assert.equal(p.isFinalLeg, false);
  assert.equal(p.totalStationsLeft, 5 + 3);
  assert.equal(p.totalEtaSeconds, 60 + 600 + 240 + 300);
  assert.equal(p.nextTransfer?.kind, 'transfer');
});

test('detectWrongDirection: 방향 필드가 다르거나 승차역 반대편이면 true', () => {
  const l = leg({ boardStationName: 'C', boardIndex: 2, alightIndex: 5, alightStationName: 'F', stationCount: 3 });
  assert.equal(detectWrongDirection([position({ stationIndex: 3 })], '1001', LINE, l), false);
  assert.equal(detectWrongDirection([position({ stationIndex: 3, direction: 'up' })], '1001', LINE, l), true);
  // 승차역 C 에서 하행인데 열차가 A 에 있음.
  assert.equal(detectWrongDirection([position({ stationIndex: 0 })], '1001', LINE, l), true);
  // 승차역에 아직 있으면 판단 보류.
  assert.equal(detectWrongDirection([position({ stationIndex: 2 })], '1001', LINE, l), false);
  // 모르는 열차면 false.
  assert.equal(detectWrongDirection([position({ trainNo: '9' })], '1001', LINE, l), false);
});
