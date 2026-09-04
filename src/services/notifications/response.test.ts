import assert from 'node:assert/strict';
import { test } from 'node:test';

import { interpretResponse } from './response';

const DEFAULT = 'expo.modules.notifications.actions.DEFAULT';

test('알림 본체 탭 → open', () => {
  assert.deepEqual(interpretResponse({ tripId: 't1', legIndex: 0, kind: 'arrive' }, DEFAULT, DEFAULT), {
    type: 'trip',
    tripId: 't1',
    legIndex: 0,
    kind: 'arrive',
    action: 'open',
  });
});

test('액션 버튼 해석', () => {
  const data = { tripId: 't1', legIndex: 1, kind: 'transfer' };
  assert.equal(interpretResponse(data, 'ack', DEFAULT)?.action, 'ack');
  assert.equal(interpretResponse(data, 'advanced', DEFAULT)?.action, 'advanced');
  assert.equal(interpretResponse({ ...data, kind: 'board' }, 'boarded', DEFAULT)?.action, 'boarded');
  assert.equal(interpretResponse({ ...data, kind: 'board' }, 'not-this-train', DEFAULT)?.action, 'not-this-train');
  assert.equal(interpretResponse(data, 'unknown-action', DEFAULT), null);
});

test('루틴 알림', () => {
  assert.deepEqual(interpretResponse({ routineId: 'r1' }, DEFAULT, DEFAULT), { type: 'routine', routineId: 'r1', action: 'open' });
  assert.equal(interpretResponse({ routineId: 'r1' }, 'start-routine', DEFAULT)?.action, 'start');
  assert.equal(interpretResponse({ routineId: 'r1' }, 'skip-today', DEFAULT)?.action, 'skip');
});

test('깨진 payload 는 null', () => {
  assert.equal(interpretResponse(null, DEFAULT, DEFAULT), null);
  assert.equal(interpretResponse({ tripId: 't1', legIndex: 'x', kind: 'arrive' }, DEFAULT, DEFAULT), null);
  assert.equal(interpretResponse({ tripId: 't1', legIndex: 0, kind: 'nope' }, DEFAULT, DEFAULT), null);
  assert.equal(interpretResponse({ tripId: '', legIndex: 0, kind: 'arrive' }, DEFAULT, DEFAULT), null);
});
