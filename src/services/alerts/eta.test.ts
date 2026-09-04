import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ARRIVE_LEAD_SECONDS,
  classifyAlertTime,
  computeAlertTimes,
  computeBoardAlertTime,
  effectiveStationsBefore,
  shouldReschedule,
  STALE_ALERT_MS,
  trailingSegmentsSeconds,
} from './eta';

const NOW = 1_000_000_000;

test('computeAlertTimes: 도착 60초 전, 예비는 리드 타임 전', () => {
  const times = computeAlertTimes({ nowMs: NOW, etaSeconds: 600, preAlertLeadSeconds: 240 });
  assert.equal(times.arriveAlertAtMs, NOW + (600 - ARRIVE_LEAD_SECONDS) * 1000);
  assert.equal(times.preAlertAtMs, NOW + (600 - 240) * 1000);
});

test('computeAlertTimes: 예비 리드가 도착 리드 이하면 예비 알림 없음 (4.11)', () => {
  const times = computeAlertTimes({ nowMs: NOW, etaSeconds: 600, preAlertLeadSeconds: 60 });
  assert.equal(times.preAlertAtMs, null);
  assert.equal(computeAlertTimes({ nowMs: NOW, etaSeconds: 600, preAlertLeadSeconds: 0 }).preAlertAtMs, null);
});

test('computeAlertTimes: 예비 알림이 30초 안이면 생략 — 승강장에서 "곧 하차"가 뜨지 않게', () => {
  // 240초 구간, 240초 리드 → 예비 = 지금. 생략.
  const times = computeAlertTimes({ nowMs: NOW, etaSeconds: 240, preAlertLeadSeconds: 240 });
  assert.equal(times.preAlertAtMs, null);
  assert.equal(times.arriveAlertAtMs, NOW + 180_000);
  // 35초 뒤면 살아 있습니다.
  const ok = computeAlertTimes({ nowMs: NOW, etaSeconds: 275, preAlertLeadSeconds: 240 });
  assert.equal(ok.preAlertAtMs, NOW + 35_000);
});

test('computeAlertTimes: ETA 가 0 이면 도착 알림은 지금', () => {
  const times = computeAlertTimes({ nowMs: NOW, etaSeconds: 0, preAlertLeadSeconds: 240 });
  assert.equal(times.arriveAlertAtMs, NOW);
  assert.equal(times.preAlertAtMs, null);
});

test('computeBoardAlertTime: 60초 전, 이미 가까우면 지금', () => {
  assert.equal(computeBoardAlertTime({ nowMs: NOW, secondsUntilTrain: 300 }), NOW + 240_000);
  assert.equal(computeBoardAlertTime({ nowMs: NOW, secondsUntilTrain: 30 }), NOW);
});

test('trailingSegmentsSeconds: 뒤에서 n 구간의 합', () => {
  assert.equal(trailingSegmentsSeconds([100, 200, 300, 400], 2), 700);
  assert.equal(trailingSegmentsSeconds([100, 200], 5), 300);
  assert.equal(trailingSegmentsSeconds([], 2), 0);
});

test('effectiveStationsBefore: 구간 길이 - 1 을 넘지 않음', () => {
  assert.equal(effectiveStationsBefore(2, 10), 2);
  assert.equal(effectiveStationsBefore(5, 3), 2);
  assert.equal(effectiveStationsBefore(2, 1), 0);
});

test('shouldReschedule: 처음이면 항상, 이후엔 30초 초과 이동만', () => {
  assert.equal(shouldReschedule(null, NOW), true);
  assert.equal(shouldReschedule(NOW, NOW + 10_000), false);
  assert.equal(shouldReschedule(NOW, NOW + 31_000), true);
});

test('shouldReschedule: 정적 추정(fresh=false)은 이미 잡힌 알림을 절대 옮기지 않음 (4.1)', () => {
  assert.equal(shouldReschedule(NOW, NOW + 600_000, false), false);
  // 아직 아무것도 없으면 안전망으로 채웁니다.
  assert.equal(shouldReschedule(null, NOW + 600_000, false), true);
});

test('classifyAlertTime: future / now / stale', () => {
  assert.equal(classifyAlertTime(NOW + 5_000, NOW), 'future');
  assert.equal(classifyAlertTime(NOW + 500, NOW), 'now');
  assert.equal(classifyAlertTime(NOW - 30_000, NOW), 'now');
  assert.equal(classifyAlertTime(NOW - STALE_ALERT_MS - 1, NOW), 'stale');
});
