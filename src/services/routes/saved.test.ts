import assert from 'node:assert/strict';
import { test } from 'node:test';

import { leg, plan } from '@/services/alerts/test-fixtures';

import { findSavedForPair, newSavedRoute, resolveSavedRoute, sameShape } from './saved';

const base = newSavedRoute({ name: '출근', originKey: 'A', destinationKey: 'E', plan: plan() }, 1000);

test('newSavedRoute: 라벨은 saved, 이름 공백이면 기본 이름', () => {
  assert.equal(base.plan.label, 'saved');
  assert.equal(base.useCount, 0);
  assert.equal(newSavedRoute({ name: '  ', originKey: 'A', destinationKey: 'E', plan: plan() }).name, 'A → E');
});

test('sameShape: 계통·방향·승하차역이 같으면 인덱스가 달라도 같은 모양', () => {
  const shifted = plan([leg({ boardIndex: 1, alightIndex: 5 })]);
  assert.equal(sameShape(plan(), shifted), true);
  assert.equal(sameShape(plan(), plan([leg({ alightStationName: 'F' })])), false);
  assert.equal(sameShape(plan(), plan([leg(), leg()])), false);
});

test('resolveSavedRoute: 유효하면 pinned', () => {
  const r = resolveSavedRoute(base, () => true, () => []);
  assert.equal(r.status, 'pinned');
  assert.equal(r.plan?.label, 'saved');
});

test('resolveSavedRoute: 무효면 같은 모양을 다시 찾아 refreshed', () => {
  const shifted = { ...plan([leg({ boardIndex: 1, alightIndex: 5 })]), label: 'fastest' as const };
  const r = resolveSavedRoute(base, () => false, () => [shifted]);
  assert.equal(r.status, 'refreshed');
  assert.equal(r.plan?.legs[0].boardIndex, 1);
  assert.equal(r.plan?.label, 'saved');
});

test('resolveSavedRoute: 같은 모양이 없으면 unavailable', () => {
  const r = resolveSavedRoute(base, () => false, () => [plan([leg({ lineId: 'other' })])]);
  assert.equal(r.status, 'unavailable');
  assert.equal(r.plan, null);
});

test('findSavedForPair: 많이 쓴 것 우선', () => {
  const a = { ...base, id: 'a', useCount: 1 };
  const b = { ...base, id: 'b', useCount: 5 };
  const other = { ...base, id: 'c', destinationKey: 'F', useCount: 9 };
  assert.equal(findSavedForPair([a, b, other], 'A', 'E')?.id, 'b');
  assert.equal(findSavedForPair([a, b, other], 'E', 'A'), undefined);
});
