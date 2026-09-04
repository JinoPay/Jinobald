#!/usr/bin/env node
/**
 * 경로 탐색의 불변식 검사.
 *
 * `verify-data.mjs` 와 같은 형식입니다 — 의존성 0, 오류가 있으면 exit(1).
 * `src/services/routing/graph.ts` 를 Node 가 그대로 읽습니다 (타입 스트리핑).
 * 이것이 graph.ts 에 런타임 import 를 하나도 두지 않는 이유입니다.
 *
 * 실행: node scripts/verify-routes.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FASTEST_COST,
  FEWEST_STOPS_COST,
  FEWEST_TRANSFER_COST,
  RECOMMENDED_COST,
  withMeasuredTransfers,
} from '../src/services/routing/cost.ts';
import {
  buildRouteGraph,
  findRoutesInGraph,
  normalizeStationKey,
  rideSecondsBetween,
} from '../src/services/routing/graph.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lines = JSON.parse(readFileSync(join(root, 'src/data/lines.json'), 'utf8'));
// routing/index.ts 와 같은 방식으로 실측 환승 도보 시간을 주입합니다.
const transferTimes = JSON.parse(readFileSync(join(root, 'src/data/generated/transfer-times.json'), 'utf8'));
const TRANSFER_SECONDS_BY_PAIR = Object.fromEntries(
  Object.entries(transferTimes).map(([key, value]) => [key, value.seconds]),
);

const errors = [];
const fail = (message) => errors.push(message);
const check = (condition, message) => {
  if (!condition) fail(message);
};

const graph = buildRouteGraph(lines);
const PROFILES = [
  { label: 'recommended', cost: withMeasuredTransfers(RECOMMENDED_COST, TRANSFER_SECONDS_BY_PAIR) },
  { label: 'fastest', cost: withMeasuredTransfers(FASTEST_COST, TRANSFER_SECONDS_BY_PAIR) },
  { label: 'fewest-transfers', cost: withMeasuredTransfers(FEWEST_TRANSFER_COST, TRANSFER_SECONDS_BY_PAIR) },
  { label: 'fewest-stops', cost: withMeasuredTransfers(FEWEST_STOPS_COST, TRANSFER_SECONDS_BY_PAIR) },
];
const route = (from, to, options) => findRoutesInGraph(graph, from, to, PROFILES, options);
const hasLabel = (plan, label) => plan.label === label || (plan.alsoLabels ?? []).includes(label);
const fastest = (from, to) => route(from, to).find((plan) => hasLabel(plan, 'fastest')) ?? null;

const lineById = new Map(lines.map((line) => [line.id, line]));

// ---------------------------------------------------------------------------
// 1. 역명 정규화 — stations.ts 가 이 구현에 위임하므로, 규칙 자체를 여기서 다시 씁니다.
// ---------------------------------------------------------------------------
const expectedNormalize = (name) =>
  name.replace(/\(.*?\)/g, '').replace(/\s+/g, '').replace(/역$/, '').trim();

for (const line of lines) {
  for (const station of line.stations) {
    for (const name of [station.name, ...(station.aliases ?? [])]) {
      check(
        normalizeStationKey(name) === expectedNormalize(name),
        `정규화 불일치: "${name}" → "${normalizeStationKey(name)}" (기대 "${expectedNormalize(name)}")`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 2. 그래프 구조
// ---------------------------------------------------------------------------
const totalStations = lines.reduce((sum, line) => sum + line.stations.length, 0);
check(
  graph.nodes.length === totalStations,
  `노드 수가 역 항목 수와 다릅니다 (${graph.nodes.length} vs ${totalStations})`,
);

// 별칭으로만 이어지는 환승. 이게 깨지면 4호선 총신대입구 ↔ 7호선 이수가 끊어집니다.
const isuNodes = graph.nodesByKey.get('이수') ?? [];
const isuLines = new Set(isuNodes.map((id) => lines[graph.nodes[id].lineIndex].id));
check(
  isuLines.has('4') && isuLines.has('7'),
  `별칭 환승이 끊어졌습니다: "이수" 에 걸린 계통 = ${[...isuLines].join(', ')}`,
);

// 연결성 — 고립된 계통이 있으면 그 노선으로는 아무도 갈 수 없습니다.
{
  const start = (graph.nodesByKey.get('시청') ?? [])[0];
  check(start != null, '기준점 "시청" 을 찾을 수 없습니다.');
  const seen = new Uint8Array(graph.nodes.length);
  const queue = [start];
  seen[start] = 1;
  let visited = 0;
  while (queue.length > 0) {
    const node = queue.pop();
    visited += 1;
    for (const edge of graph.edges[node]) {
      if (seen[edge.to]) continue;
      seen[edge.to] = 1;
      queue.push(edge.to);
    }
  }
  if (visited !== graph.nodes.length) {
    const orphans = new Set();
    graph.nodes.forEach((node, id) => {
      if (!seen[id]) orphans.add(lines[node.lineIndex].name);
    });
    fail(`고립된 계통이 있습니다: ${[...orphans].join(', ')} (도달 ${visited}/${graph.nodes.length})`);
  }
}

// ---------------------------------------------------------------------------
// 3. 알려진 경로
// ---------------------------------------------------------------------------
const minutes = (plan) => Math.round(plan.totalSeconds / 60);

const cases = [
  {
    name: '잠원 → 반포 (고속터미널 3→7 실측 환승)',
    from: '잠원',
    to: '반포',
    assert: (plan) => {
      const transfer = plan.legs[1]?.transferIn;
      check(transfer != null && transfer.fromStationName === '고속터미널', '고속터미널에서 환승해야 합니다');
      check(transfer?.measured === true, '고속터미널 3→7 환승은 실측값이어야 합니다');
      const expected = TRANSFER_SECONDS_BY_PAIR['고속터미널|3|7'] + FASTEST_COST.transferWaitSeconds;
      check(transfer?.seconds === expected, `환승 시간이 실측 ${expected}초와 다릅니다 (${transfer?.seconds})`);
    },
  },
  {
    name: '사당 → 왕십리 (그룹 간 환승)',
    from: '사당',
    to: '왕십리',
    assert: (plan) => {
      check(plan.legs.length === 2, `구간이 2개여야 합니다 (현재 ${plan.legs.length})`);
      check(plan.transferCount === 1, `환승 1회여야 합니다 (현재 ${plan.transferCount})`);
      check(minutes(plan) >= 15 && minutes(plan) <= 35, `소요 ${minutes(plan)}분이 범위를 벗어납니다`);
    },
  },
  {
    name: '인천 → 수원 (무환승이 이겨야 함)',
    from: '인천',
    to: '수원',
    assert: (plan) => {
      check(plan.transferCount === 0, `환승 0회여야 합니다 (현재 ${plan.transferCount})`);
      check(plan.legs[0].lineId === 'suin', `수인분당선이어야 합니다 (현재 ${plan.legs[0].lineId})`);
    },
  },
  {
    name: '신도림 → 건대입구 (순환선 wrap)',
    from: '신도림',
    to: '건대입구',
    assert: (plan) => {
      check(plan.legs.length === 1, `구간이 1개여야 합니다 (현재 ${plan.legs.length})`);
      check(plan.legs[0].direction === 'outer', `외선이어야 합니다 (현재 ${plan.legs[0].direction})`);
      check(plan.legs[0].stationCount === 21, `21정거장이어야 합니다 (현재 ${plan.legs[0].stationCount})`);
    },
  },
  {
    // 까치산은 5호선으로 영등포구청까지 가는 편이 실측상 더 빨라 신정지선만 지나는 양천구청을 씁니다.
    name: '양천구청 → 문래 (같은 그룹 계통 변경)',
    from: '양천구청',
    to: '문래',
    assert: (plan) => {
      check(plan.legs.length === 2, `구간이 2개여야 합니다 (현재 ${plan.legs.length})`);
      check(
        plan.legs[1].transferIn?.kind === 'switch',
        `신정지선 → 본선은 switch 여야 합니다 (현재 ${plan.legs[1].transferIn?.kind})`,
      );
      check(
        plan.legs[1].transferIn?.fromStationName === '신도림',
        `신도림에서 갈아타야 합니다 (현재 ${plan.legs[1].transferIn?.fromStationName})`,
      );
      check(plan.transferCount === 0, `환승 0회여야 합니다 (현재 ${plan.transferCount})`);
    },
  },
  {
    name: '광명 → 서울역 (지선 체인은 환승이 아님)',
    from: '광명',
    to: '서울역',
    assert: (plan) => {
      check(plan.transferCount === 0, `환승 0회여야 합니다 (현재 ${plan.transferCount})`);
      check(plan.legChangeCount === 2, `계통 변경 2회여야 합니다 (현재 ${plan.legChangeCount})`);
    },
  },
  {
    name: '총신대입구 → 건대입구 (별칭은 같은 역)',
    from: '총신대입구',
    to: '건대입구',
    assert: (plan) => {
      // 총신대입구 = 이수 이므로 7호선에서 바로 탑니다. 환승이 생기면 별칭이 깨진 것입니다.
      check(plan.legs.length === 1, `구간이 1개여야 합니다 (현재 ${plan.legs.length})`);
      check(plan.legs[0].lineId === '7', `7호선이어야 합니다 (현재 ${plan.legs[0].lineId})`);
    },
  },
  {
    name: '수서 → 동탄 (비실시간 노선)',
    from: '수서',
    to: '동탄',
    assert: (plan) => {
      check(plan.hasNonRealtimeLine, 'hasNonRealtimeLine 이 true 여야 합니다');
    },
  },
];

for (const testCase of cases) {
  const plan = fastest(testCase.from, testCase.to);
  if (!plan) {
    fail(`${testCase.name}: 경로를 찾지 못했습니다`);
    continue;
  }
  const before = errors.length;
  testCase.assert(plan);
  for (let i = before; i < errors.length; i += 1) errors[i] = `${testCase.name}: ${errors[i]}`;
}

// 후보가 실제로 갈라지는지 — 이 한 쌍이 "최소 환승" 프로파일의 존재 이유입니다.
{
  const plans = route('소요산', '신창');
  const fewest = plans.find((plan) => hasLabel(plan, 'fewest-transfers'));
  check(plans.length >= 2, `소요산 → 신창: 후보가 2개 이상이어야 합니다 (현재 ${plans.length})`);
  check(
    fewest?.transferCount === 0,
    `소요산 → 신창: 최소 환승 후보가 무환승이어야 합니다 (현재 ${fewest?.transferCount})`,
  );
  check(new Set(plans.map((plan) => plan.id)).size === plans.length, '소요산 → 신창: 후보가 중복됩니다');
}

// 프로파일 순서와 라벨 — 첫 후보는 언제나 추천입니다.
{
  const plans = route('김포공항', '강남');
  check(plans[0]?.label === 'recommended', `김포공항 → 강남: 첫 후보가 추천이어야 합니다 (${plans[0]?.label})`);
  const stops = plans.find((plan) => hasLabel(plan, 'fewest-stops'));
  const fast = plans.find((plan) => hasLabel(plan, 'fastest'));
  if (stops && fast) {
    check(stops.totalStations <= fast.totalStations, '김포공항 → 강남: 최소 정거장 후보의 정거장 수가 최소 시간보다 많습니다');
  }
}

// 대안 — 추천 경로의 계통을 하나씩 피한 경로. 피한 계통을 타면 안 되고, 너무 느리면 안 됩니다.
{
  const plans = route('김포공항', '강남');
  const best = Math.min(...plans.map((plan) => plan.totalSeconds));
  const alternatives = plans.filter((plan) => plan.label === 'alternative');
  check(alternatives.length >= 1, '김포공항 → 강남: 대안이 하나는 있어야 합니다');
  for (const plan of alternatives) {
    check(typeof plan.avoidedLineId === 'string', '대안에는 피한 계통 id 가 있어야 합니다');
    check(
      !plan.legs.some((leg) => leg.lineId === plan.avoidedLineId),
      `대안이 피했다는 계통 ${plan.avoidedLineId} 을 탑니다`,
    );
    check(plan.totalSeconds <= best * 1.5 + 1, `대안이 최선의 1.5배를 넘습니다 (${plan.totalSeconds} vs ${best})`);
  }
  check(plans.length <= 6, `후보가 6개를 넘습니다 (${plans.length})`);
}

// 노선 제외
{
  const plans = route('김포공항', '강남', { avoidLineIds: ['9'], alternatives: false });
  check(plans.length >= 1, '9호선 제외: 경로가 있어야 합니다');
  check(!plans.some((plan) => plan.legs.some((leg) => leg.lineId === '9')), '9호선 제외 옵션이 무시되었습니다');
}

// 경유역
{
  const plans = route('강남', '홍대입구', { viaKey: '서울역', alternatives: false });
  check(plans.length >= 1, '경유 탐색: 경로가 있어야 합니다');
  const passes = (plan) =>
    plan.legs.some(
      (leg) => normalizeStationKey(leg.boardStationName) === '서울' || normalizeStationKey(leg.alightStationName) === '서울',
    );
  check(plans.every(passes), '경유역(서울역)을 지나지 않는 경로가 있습니다');
  // 경유가 출발·도착과 같으면 보통 탐색과 같습니다.
  check(route('강남', '홍대입구', { viaKey: '강남', alternatives: false })[0]?.id === route('강남', '홍대입구', { alternatives: false })[0]?.id, '경유=출발 이면 보통 탐색과 같아야 합니다');
}

// 같은 역 / 표기만 다른 같은 역 / 없는 역
check(route('서울역', '서울').length === 0, '표기만 다른 같은 역은 경로가 없어야 합니다');
check(route('강남', '강남').length === 0, '같은 역은 경로가 없어야 합니다');
check(route('강남', '없는역이름').length === 0, '없는 역은 경로가 없어야 합니다');

// ---------------------------------------------------------------------------
// 4. 구조 불변식 — 무작위 200쌍 (재현 가능한 의사난수)
// ---------------------------------------------------------------------------
const keys = [...graph.nodesByKey.keys()];
let seed = 20260901;
const nextIndex = (limit) => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % limit;
};

// 순환선은 정거장 수가 아니라 운행 초가 적은 쪽으로 돕니다 (graph.ts 의 loopSide 와 같은 규칙을 독립 구현).
const segSeconds = (line, i) => line.stations[i]?.secondsToNext ?? line.avgSecondsPerStation;
const loopSides = (line, from, to) => {
  const n = line.stations.length;
  const forward = (to - from + n) % n;
  let fwd = 0;
  for (let k = 0, at = from; k < forward; k += 1, at = (at + 1) % n) fwd += segSeconds(line, at);
  let bwd = 0;
  for (let k = 0, at = from; k < n - forward; k += 1, at = (at - 1 + n) % n) bwd += segSeconds(line, (at - 1 + n) % n);
  const outer = fwd !== bwd ? fwd < bwd : forward <= n - forward;
  return { outer, count: outer ? forward : n - forward };
};
const expectedDirection = (line, from, to) => {
  if (line.loop) return loopSides(line, from, to).outer ? 'outer' : 'inner';
  return to > from ? 'down' : 'up';
};
const expectedBetween = (line, from, to) => {
  if (!line.loop) return Math.abs(to - from);
  if (from === to) return 0;
  return loopSides(line, from, to).count;
};

let sampled = 0;
const started = performance.now();
for (let attempt = 0; attempt < 2000 && sampled < 200; attempt += 1) {
  const from = keys[nextIndex(keys.length)];
  const to = keys[nextIndex(keys.length)];
  if (from === to) continue;
  const plans = route(from, to);
  if (plans.length === 0) {
    fail(`${from} → ${to}: 경로가 없습니다 (그래프는 연결되어 있어야 합니다)`);
    continue;
  }
  sampled += 1;

  for (const plan of plans) {
    const where = `${from} → ${to} [${plan.label}]`;
    check(plan.legs.length > 0, `${where}: 구간이 없습니다`);

    let sum = 0;
    for (const [i, leg] of plan.legs.entries()) {
      const line = lineById.get(leg.lineId);
      check(line != null, `${where}: 알 수 없는 계통 ${leg.lineId}`);
      if (!line) continue;

      check(leg.stationCount >= 1, `${where}: 구간 ${i} 의 정거장 수가 ${leg.stationCount} 입니다`);
      check(
        leg.stationCount === expectedBetween(line, leg.boardIndex, leg.alightIndex),
        `${where}: 구간 ${i} 정거장 수 불일치 (${leg.stationCount})`,
      );
      check(
        leg.direction === expectedDirection(line, leg.boardIndex, leg.alightIndex),
        `${where}: 구간 ${i} 방향 불일치 (${leg.direction})`,
      );
      check(
        line.stations[leg.boardIndex]?.name === leg.boardStationName,
        `${where}: 구간 ${i} 승차역 이름이 인덱스와 다릅니다`,
      );
      check(
        line.stations[leg.alightIndex]?.name === leg.alightStationName,
        `${where}: 구간 ${i} 하차역 이름이 인덱스와 다릅니다`,
      );
      check(
        leg.seconds === rideSecondsBetween(line, leg.boardIndex, leg.alightIndex),
        `${where}: 구간 ${i} 소요시간이 구간 실측·노선 평균 합과 맞지 않습니다`,
      );
      check(
        leg.seconds >= leg.stationCount * 40 && leg.seconds <= leg.stationCount * 400,
        `${where}: 구간 ${i} 소요시간 ${leg.seconds}초가 정거장 ${leg.stationCount}개 치고 이상합니다`,
      );

      if (i === 0) {
        check(leg.transferIn === null, `${where}: 첫 구간에 환승이 붙어 있습니다`);
      } else {
        const transfer = leg.transferIn;
        check(transfer != null, `${where}: 구간 ${i} 에 환승 정보가 없습니다`);
        if (!transfer) continue;
        const previous = plan.legs[i - 1];
        check(
          previous.alightStationName === transfer.fromStationName,
          `${where}: 구간 ${i} 환승 출발역이 앞 구간 하차역과 다릅니다`,
        );
        check(
          leg.boardStationName === transfer.toStationName,
          `${where}: 구간 ${i} 환승 도착역이 승차역과 다릅니다`,
        );
        // 두 표기가 같은 역이어야 합니다 — 정규화 키가 겹치는지로 확인합니다.
        const fromKeys = new Set(
          [
            transfer.fromStationName,
            ...(lineById.get(previous.lineId)?.stations[previous.alightIndex]?.aliases ?? []),
          ].map(normalizeStationKey),
        );
        const toKeys = [
          transfer.toStationName,
          ...(line.stations[leg.boardIndex]?.aliases ?? []),
        ].map(normalizeStationKey);
        check(
          toKeys.some((key) => fromKeys.has(key)),
          `${where}: 구간 ${i} 환승이 같은 역이 아닙니다 (${transfer.fromStationName} → ${transfer.toStationName})`,
        );
        const sameGroup =
          lineById.get(previous.lineId)?.groupId === line.groupId;
        check(
          transfer.kind === (sameGroup ? 'switch' : 'transfer'),
          `${where}: 구간 ${i} 환승 종류가 그룹과 맞지 않습니다`,
        );
        check(transfer.seconds > 0, `${where}: 구간 ${i} 환승 시간이 0 이하입니다`);
        sum += transfer.seconds;
      }
      sum += leg.seconds;
    }

    check(
      Math.abs(plan.totalSeconds - sum) < 1,
      `${where}: totalSeconds 가 구간 합과 다릅니다 (${plan.totalSeconds} vs ${sum})`,
    );
    check(
      plan.totalStations === plan.legs.reduce((acc, leg) => acc + leg.stationCount, 0),
      `${where}: totalStations 가 구간 합과 다릅니다`,
    );
    check(
      plan.legChangeCount === plan.legs.length - 1,
      `${where}: legChangeCount 가 구간 수와 맞지 않습니다`,
    );
  }
}
const elapsed = performance.now() - started;

check(sampled === 200, `표본이 부족합니다 (${sampled}쌍)`);
check(elapsed < 2000, `탐색이 느립니다 (${sampled}쌍 ${elapsed.toFixed(0)}ms)`);

// ---------------------------------------------------------------------------
// 요약
// ---------------------------------------------------------------------------
const rideEdges = graph.edges.reduce(
  (sum, list) => sum + list.filter((edge) => edge.kind === 'ride').length,
  0,
);
const transferEdges = graph.edges.reduce(
  (sum, list) => sum + list.filter((edge) => edge.kind === 'transfer').length,
  0,
);
const switchEdges = graph.edges.reduce(
  (sum, list) => sum + list.filter((edge) => edge.kind === 'switch').length,
  0,
);

console.log(`노드            : ${graph.nodes.length}`);
console.log(`승차 간선       : ${rideEdges / 2}`);
console.log(`환승 간선       : ${transferEdges / 2}`);
console.log(`계통 변경 간선  : ${switchEdges / 2}`);
console.log(`표본 탐색       : ${sampled}쌍 ${elapsed.toFixed(0)}ms`);
console.log('');

if (errors.length > 0) {
  for (const error of errors.slice(0, 40)) console.error(`오류: ${error}`);
  if (errors.length > 40) console.error(`… 외 ${errors.length - 40}건`);
  console.error(`\n${errors.length}개의 오류가 있습니다.`);
  process.exit(1);
}
console.log('모든 경로 불변식 검사를 통과했습니다.');
