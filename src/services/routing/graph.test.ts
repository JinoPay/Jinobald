import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { FASTEST_COST, FEWEST_STOPS_COST, FEWEST_TRANSFER_COST, RECOMMENDED_COST, withMeasuredTransfers } from './cost';
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
  { label: 'recommended', cost: withMeasuredTransfers(RECOMMENDED_COST, byPair) },
  { label: 'fastest', cost: withMeasuredTransfers(FASTEST_COST, byPair) },
  { label: 'fewest-transfers', cost: withMeasuredTransfers(FEWEST_TRANSFER_COST, byPair) },
  { label: 'fewest-stops', cost: withMeasuredTransfers(FEWEST_STOPS_COST, byPair) },
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

test('첫 후보는 추천, 대안은 피한 계통을 타지 않음', () => {
  const plans = findRoutesInGraph(graph, '김포공항', '강남', PROFILES);
  assert.equal(plans[0].label, 'recommended');
  const alternatives = plans.filter((p) => p.label === 'alternative');
  assert.ok(alternatives.length >= 1);
  for (const plan of alternatives) {
    assert.ok(plan.avoidedLineId);
    assert.ok(!plan.legs.some((leg) => leg.lineId === plan.avoidedLineId));
  }
  assert.ok(plans.length <= 6);
});

test('avoidLineIds 는 모든 후보에 적용', () => {
  const plans = findRoutesInGraph(graph, '김포공항', '강남', PROFILES, { avoidLineIds: ['9'] });
  assert.ok(plans.length >= 1);
  assert.ok(!plans.some((p) => p.legs.some((leg) => leg.lineId === '9')));
});

test('viaKey 는 경유역을 지나는 경로만', () => {
  const plans = findRoutesInGraph(graph, '강남', '홍대입구', PROFILES, { viaKey: '서울역', alternatives: false });
  assert.ok(plans.length >= 1);
  for (const plan of plans) {
    assert.ok(
      plan.legs.some(
        (leg) => normalizeStationKey(leg.boardStationName) === '서울' || normalizeStationKey(leg.alightStationName) === '서울',
      ),
    );
  }
});

test('최소 정거장 후보의 정거장 수는 최소 시간 이하', () => {
  const plans = findRoutesInGraph(graph, '소요산', '신창', PROFILES, { alternatives: false });
  const has = (p: (typeof plans)[number], label: string) => p.label === label || p.alsoLabels?.includes(label as never);
  const stops = plans.find((p) => has(p, 'fewest-stops'));
  const fast = plans.find((p) => has(p, 'fastest'));
  if (stops && fast) assert.ok(stops.totalStations <= fast.totalStations);
});
