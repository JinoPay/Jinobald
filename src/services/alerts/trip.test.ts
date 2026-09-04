import assert from 'node:assert/strict';
import { test } from 'node:test';

import { trip, twoLegTrip } from './test-fixtures';
import { createTrip, currentLegIndex, legAlertKinds, tripAlertKey, tripDestinationName } from './trip';

test('createTrip: 초기 상태', () => {
  const t = createTrip({ plan: trip().plan, alertNStationsBefore: 3, useGps: true });
  assert.equal(t.status, 'active');
  assert.equal(t.currentLegIndex, 0);
  assert.equal(t.boarded, false);
  assert.equal(t.boardedBy, null);
  assert.deepEqual(t.firedKeys, []);
  assert.deepEqual(t.scheduled, {});
  assert.equal(t.alertNStationsBefore, 3);
  assert.equal(t.useGps, true);
});

test('currentLegIndex: 저장값이 깨져도 유효 범위로', () => {
  assert.equal(currentLegIndex(twoLegTrip({ currentLegIndex: 7 })), 1);
  assert.equal(currentLegIndex(twoLegTrip({ currentLegIndex: -1 })), 0);
});

test('legAlertKinds: 마지막 구간은 pre/arrive, 그 앞은 transfer-pre/transfer', () => {
  const t = twoLegTrip();
  assert.deepEqual(legAlertKinds(t, 0), ['transfer-pre', 'transfer']);
  assert.deepEqual(legAlertKinds(t, 1), ['pre', 'arrive']);
  assert.equal(tripAlertKey(t, 'transfer'), '0:transfer');
  assert.equal(tripDestinationName(t), 'I');
});
