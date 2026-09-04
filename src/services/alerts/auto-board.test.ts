import assert from 'node:assert/strict';
import { test } from 'node:test';

import { suggestBoarding } from './auto-board';
import { arrival, leg, LINE, position } from './test-fixtures';

const NOW = 1_000_000_000;
const base = { leg: leg(), line: LINE, nowMs: NOW, previousSeenAtMs: NOW - 40_000 };
const platform = arrival({ status: 'arrived', trainNo: '1001' });

test('승강장에 있던 열차가 다음 역에서 보이면 high', () => {
  const s = suggestBoarding({ ...base, previous: platform, arrivals: [], positions: [position({ stationIndex: 1 })] });
  assert.equal(s?.confidence, 'high');
  assert.equal(s?.trainNo, '1001');
  assert.equal(s?.departedAtMs, NOW - 40_000);
});

test('열차가 반대쪽으로 갔으면 우리 열차가 아님', () => {
  const l = leg({ boardStationName: 'C', boardIndex: 2, alightIndex: 5, alightStationName: 'F', stationCount: 3 });
  const s = suggestBoarding({
    ...base,
    leg: l,
    previous: platform,
    arrivals: [arrival({ id: 'other', trainNo: '1002' })],
    positions: [position({ stationIndex: 1 })],
  });
  // 위치 신호는 무시되고, 도착 목록에 같은 열차가 없으므로 medium.
  assert.equal(s?.confidence, 'medium');
});

test('도착 목록에서 사라지면 medium', () => {
  const s = suggestBoarding({ ...base, previous: platform, arrivals: [arrival({ id: 'other', trainNo: '1002' })], positions: [] });
  assert.equal(s?.confidence, 'medium');
});

test('아직 승강장에 있으면 null, 도착 목록이 비면(폴링 실패) null', () => {
  assert.equal(suggestBoarding({ ...base, previous: platform, arrivals: [platform], positions: [] }), null);
  assert.equal(suggestBoarding({ ...base, previous: platform, arrivals: [], positions: [] }), null);
});

test('승강장에 없던 열차나 너무 오래된 관측은 무시', () => {
  assert.equal(suggestBoarding({ ...base, previous: arrival({ status: 'running' }), arrivals: [], positions: [position()] }), null);
  assert.equal(
    suggestBoarding({ ...base, previousSeenAtMs: NOW - 10 * 60_000, previous: platform, arrivals: [], positions: [position()] }),
    null,
  );
});
