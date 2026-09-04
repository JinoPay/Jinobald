import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { FASTEST_COST, FEWEST_TRANSFER_COST, withMeasuredTransfers } from './cost';
import { buildRouteGraph, findRoutesInGraph, normalizeStationKey, type RouteLineInput, type RouteProfile } from './graph';

// graph.ts 는 데이터셋을 모르므로 verify-routes.mjs 와 같은 방식으로 실제 lines.json 을 읽습니다.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const lines = JSON.parse(readFileSync(join(root, 'src/data/lines.json'), 'utf8')) as RouteLineInput[];
const transferTimes = JSON.parse(
  readFileSync(join(root, 'src/data/generated/transfer-times.json'), 'utf8'),
) as Record<string, { seconds: number }>;
const byPair = Object.fromEntries(Object.entries(transferTimes).map(([k, v]) => [k, v.seconds]));

const graph = buildRouteGraph(lines);
const PROFILES: RouteProfile[] = [
  { label: 'fastest', cost: withMeasuredTransfers(FASTEST_COST, byPair) },
  { label: 'fewest-transfers', cost: withMeasuredTransfers(FEWEST_TRANSFER_COST, byPair) },
];

test('normalizeStationKey', () => {
  assert.equal(normalizeStationKey('총신대입구(이수)'), '총신대입구');
  assert.equal(normalizeStationKey('서울역'), '서울');
  assert.equal(normalizeStationKey(' 강남 '), '강남');
});

test('강남 → 홍대입구: 2호선 직통, 환승 0', () => {
  const plans = findRoutesInGraph(graph, '강남', '홍대입구', PROFILES);
  assert.ok(plans.length >= 1);
  assert.equal(plans[0].transferCount, 0);
  assert.equal(plans[0].legs[0].lineId, '2');
});

test('같은 역·모르는 역이면 빈 배열', () => {
  assert.deepEqual(findRoutesInGraph(graph, '강남', '강남', PROFILES), []);
  assert.deepEqual(findRoutesInGraph(graph, '서울역', '서울', PROFILES), []);
  assert.deepEqual(findRoutesInGraph(graph, '없는역', '강남', PROFILES), []);
});

test('표시 소요시간에는 탐색 가산치가 섞이지 않음', () => {
  const plans = findRoutesInGraph(graph, '김포공항', '강남', PROFILES);
  for (const plan of plans) {
    const sum = plan.legs.reduce((s, l) => s + l.seconds + (l.transferIn?.seconds ?? 0), 0);
    assert.equal(plan.totalSeconds, sum);
  }
});
