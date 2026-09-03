/**
 * 노선 그래프와 경로 탐색.
 *
 * 이 파일에는 **런타임 import 가 하나도 없습니다** (타입 import 는 컴파일 시 지워짐).
 * `eta.ts` 와 같은 규율입니다. 덕분에 `node scripts/verify-routes.mjs` 가 이 파일을
 * 그대로 읽어 실제 데이터셋으로 경로를 검증할 수 있습니다 — `stations.ts` 는
 * `import rawLines from './lines.json'` 때문에 Node 에서 읽히지 않습니다.
 *
 * 그래서 노선 위상 계산의 원본(정규화·방향·정거장 수)도 여기에 둡니다.
 * `@/data/stations` 는 이 함수들을 감싸 쓰기만 합니다. 같은 규칙을 두 벌 유지하면
 * 반드시 어긋나기 때문입니다.
 */
import type { Direction } from '@/services/subway/types';

import type { RouteCostConfig } from './cost';
import type { RouteLabel, RouteLeg, RoutePlan, RouteTransfer, TransferKind } from './types';

// ---------------------------------------------------------------------------
// 위상 기본 연산 — 인덱스만 다룹니다.
// ---------------------------------------------------------------------------

/**
 * 역명 정규화.
 *
 * API 의 `statnNm` 과 사용자 입력, 정적 데이터의 표기가 서로 다릅니다.
 * (예: "총신대입구(이수)" vs "이수", "서울역" vs "서울") 괄호 안 부기와 후행 "역",
 * 모든 공백을 제거해 하나의 키로 맞춥니다.
 */
export function normalizeStationKey(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .replace(/역$/, '')
    .trim();
}

/**
 * 순환선에서 from → to 로 갈 때 어느 쪽으로 돌지.
 *
 * 정거장 수가 아니라 **운행 초**로 고릅니다 — 구간 실측이 있으면 정거장이 하나 더 많은 쪽이
 * 더 빠를 수 있고, Dijkstra 도 초를 최소화하므로 여기서 다른 기준을 쓰면 경로와 진행 계산이 어긋납니다.
 * 같으면 정거장이 적은 쪽, 그것도 같으면 외선(인덱스 증가) 입니다.
 */
function loopSide(line: RouteLineInput, fromIndex: number, toIndex: number): { step: 1 | -1; count: number } {
  const total = line.stations.length;
  const forward = (toIndex - fromIndex + total) % total;
  const backward = total - forward;
  let forwardSeconds = 0;
  for (let k = 0, at = fromIndex; k < forward; k += 1, at = (at + 1) % total) {
    forwardSeconds += segmentSeconds(line, at);
  }
  let backwardSeconds = 0;
  for (let k = 0, at = fromIndex; k < backward; k += 1, at = (at - 1 + total) % total) {
    backwardSeconds += segmentSeconds(line, (at - 1 + total) % total);
  }
  if (forwardSeconds !== backwardSeconds) {
    return forwardSeconds < backwardSeconds ? { step: 1, count: forward } : { step: -1, count: backward };
  }
  return forward <= backward ? { step: 1, count: forward } : { step: -1, count: backward };
}

/**
 * 같은 노선에서 from → to 로 갈 때의 방향.
 * 배열 인덱스가 커지는 쪽이 하행(순환선은 외선), 작아지는 쪽이 상행(내선)입니다.
 */
export function directionBetweenIndices(line: RouteLineInput, fromIndex: number, toIndex: number): Direction {
  if (line.loop) return loopSide(line, fromIndex, toIndex).step === 1 ? 'outer' : 'inner';
  return toIndex > fromIndex ? 'down' : 'up';
}

/**
 * 인덱스 a 와 a+1 (순환선의 마지막↔첫 역 포함) 사이 운행 초.
 * 실측이 없으면 노선 평균입니다. 간선 가중치와 구간 소요시간이 모두 이 함수를 씁니다.
 */
export function segmentSeconds(line: RouteLineInput, fromIndex: number): number {
  return line.stations[fromIndex]?.secondsToNext ?? line.avgSecondsPerStation;
}

/**
 * from → to 로 갈 때 지나는 각 구간의 운행 초를 진행 순서대로.
 * 방향은 `directionBetweenIndices` 와 같은 규칙(순환선은 짧은 쪽)입니다.
 * 길이 = 정거장 수. 같은 역이면 빈 배열.
 */
export function rideSegmentsBetween(line: RouteLineInput, fromIndex: number, toIndex: number): number[] {
  const total = line.stations.length;
  if (fromIndex === toIndex || total < 2) return [];
  const { step, count } = line.loop
    ? loopSide(line, fromIndex, toIndex)
    : { step: toIndex > fromIndex ? (1 as const) : (-1 as const), count: Math.abs(toIndex - fromIndex) };
  const segments: number[] = [];
  let at = fromIndex;
  for (let k = 0; k < count; k += 1) {
    // 뒤로 갈 때는 (at-1 → at) 구간이므로 낮은 인덱스의 값을 씁니다.
    const edgeIndex = step === 1 ? at : (at - 1 + total) % total;
    segments.push(segmentSeconds(line, edgeIndex));
    at = (at + step + total) % total;
  }
  return segments;
}

/** from → to 운행 초 합계. */
export function rideSecondsBetween(line: RouteLineInput, fromIndex: number, toIndex: number): number {
  return rideSegmentsBetween(line, fromIndex, toIndex).reduce((sum, s) => sum + s, 0);
}

/** from → to 사이의 정거장 수. 순환선은 (시간 기준으로) 빠른 쪽으로 감아서 셉니다. */
export function stationsBetweenIndices(line: RouteLineInput, fromIndex: number, toIndex: number): number {
  if (!line.loop) return Math.abs(toIndex - fromIndex);
  if (fromIndex === toIndex) return 0;
  return loopSide(line, fromIndex, toIndex).count;
}

// ---------------------------------------------------------------------------
// 그래프
// ---------------------------------------------------------------------------

/** 그래프가 필요로 하는 최소한의 역 정보. `Station` 이 구조적으로 만족합니다. */
export interface RouteStationInput {
  name: string;
  aliases?: string[];
  /** 다음 역(배열의 다음 항목, 순환선은 마지막→첫 역 포함)까지의 실측 운행 초. 없으면 노선 평균. */
  secondsToNext?: number;
}

/** 그래프가 필요로 하는 최소한의 노선 정보. `Line` 이 구조적으로 만족합니다. */
export interface RouteLineInput {
  id: string;
  groupId: string;
  loop: boolean;
  realtime: boolean;
  avgSecondsPerStation: number;
  stations: RouteStationInput[];
}

type EdgeKind = 'ride' | TransferKind;

interface GraphEdge {
  to: number;
  kind: EdgeKind;
  /** 승차 간선에만 의미가 있습니다. 전이 간선의 비용은 탐색 시점에 계산합니다. */
  seconds: number;
}

interface GraphNode {
  lineIndex: number;
  stationIndex: number;
  /** 이 계통에서의 표기. leg 의 승·하차역 이름이 됩니다. */
  name: string;
  /** 정규화된 이름 + 별칭. 전이 간선과 검색의 키입니다. */
  keys: string[];
}

export interface RouteGraph {
  lines: RouteLineInput[];
  nodes: GraphNode[];
  edges: GraphEdge[][];
  nodesByKey: Map<string, number[]>;
}

function connect(edges: GraphEdge[][], a: number, b: number, kind: EdgeKind, seconds: number): void {
  edges[a].push({ to: b, kind, seconds });
  edges[b].push({ to: a, kind, seconds });
}

/**
 * 노선 배열에서 그래프를 만듭니다.
 *
 * - 노드 = (계통, 역 인덱스). 인접성은 `stations` 배열 순서에만 존재합니다.
 * - 승차 간선 = 인접 쌍 양방향, 가중치는 구간 실측 운행시간(없으면 노선 평균). 순환선은 끝↔처음도 잇습니다.
 * - 전이 간선 = 정규화 이름(별칭 포함)이 같은 서로 다른 계통의 노드 쌍.
 *   별칭까지 봐야 총신대입구(4호선) ↔ 이수(7호선) 가 연결됩니다.
 */
export function buildRouteGraph(lines: RouteLineInput[]): RouteGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[][] = [];
  const nodesByKey = new Map<string, number[]>();

  lines.forEach((line, lineIndex) => {
    const base = nodes.length;
    for (const [stationIndex, station] of line.stations.entries()) {
      const keys = [
        ...new Set(
          [station.name, ...(station.aliases ?? [])].map(normalizeStationKey).filter(Boolean),
        ),
      ];
      nodes.push({ lineIndex, stationIndex, name: station.name, keys });
      edges.push([]);
    }

    const total = line.stations.length;
    for (let i = 0; i + 1 < total; i += 1) {
      connect(edges, base + i, base + i + 1, 'ride', segmentSeconds(line, i));
    }
    // 순환선의 마지막 → 첫 역. 역이 2개뿐이면 이미 이어져 있으므로 건너뜁니다.
    if (line.loop && total > 2) {
      connect(edges, base + total - 1, base, 'ride', segmentSeconds(line, total - 1));
    }
  });

  for (const [id, node] of nodes.entries()) {
    for (const key of node.keys) {
      const bucket = nodesByKey.get(key);
      if (bucket) bucket.push(id);
      else nodesByKey.set(key, [id]);
    }
  }

  // 같은 쌍이 여러 키(이름 + 별칭)로 두 번 잡히는 것을 막습니다.
  const linked = new Set<string>();
  for (const ids of nodesByKey.values()) {
    for (let a = 0; a < ids.length; a += 1) {
      for (let b = a + 1; b < ids.length; b += 1) {
        const [x, y] = [ids[a], ids[b]];
        const lineX = nodes[x].lineIndex;
        const lineY = nodes[y].lineIndex;
        if (lineX === lineY) continue;
        const pair = x < y ? `${x}|${y}` : `${y}|${x}`;
        if (linked.has(pair)) continue;
        linked.add(pair);
        // 그룹이 같으면 같은 승강장 열차 변경입니다. 환승으로 세면 안 됩니다.
        const kind: TransferKind = lines[lineX].groupId === lines[lineY].groupId ? 'switch' : 'transfer';
        connect(edges, x, y, kind, 0);
      }
    }
  }

  return { lines, nodes, edges, nodesByKey };
}

// ---------------------------------------------------------------------------
// 비용
// ---------------------------------------------------------------------------

/** 이 전이에 실측 오버라이드가 있으면 그 값. 양쪽 역명 표기를 모두 봅니다. */
function overrideSeconds(
  graph: RouteGraph,
  from: number,
  to: number,
  cost: RouteCostConfig,
): number | undefined {
  for (const id of [from, to]) {
    for (const key of graph.nodes[id].keys) {
      const value = cost.transferSecondsOverride[key];
      if (value != null) return value;
    }
  }
  return undefined;
}

/** 실측 환승 도보 시간. 양쪽 노드의 모든 표기 키로 (역, 출발 그룹, 도착 그룹) 을 찾습니다. */
function measuredWalkSeconds(
  graph: RouteGraph,
  from: number,
  to: number,
  cost: RouteCostConfig,
): number | undefined {
  const fromGroup = graph.lines[graph.nodes[from].lineIndex].groupId;
  const toGroup = graph.lines[graph.nodes[to].lineIndex].groupId;
  for (const id of [from, to]) {
    for (const key of graph.nodes[id].keys) {
      const value = cost.transferSecondsByPair[`${key}|${fromGroup}|${toGroup}`];
      if (value != null) return value;
    }
  }
  return undefined;
}

/** 사용자가 실제로 쓰는 시간. 탐색 전용 가산치는 포함하지 않습니다. */
export function transferSeconds(
  graph: RouteGraph,
  from: number,
  to: number,
  kind: TransferKind,
  cost: RouteCostConfig,
): { seconds: number; measured: boolean } {
  if (kind === 'switch') return { seconds: cost.sameGroupSwitchSeconds, measured: false };
  const walk = measuredWalkSeconds(graph, from, to, cost);
  if (walk != null) return { seconds: walk + cost.transferWaitSeconds, measured: true };
  return { seconds: overrideSeconds(graph, from, to, cost) ?? cost.transferSeconds, measured: false };
}

/** 탐색에 쓰는 간선 비용 = 실제 시간 + 가산치. */
function edgeCost(graph: RouteGraph, from: number, edge: GraphEdge, cost: RouteCostConfig): number {
  if (edge.kind === 'ride') return edge.seconds;
  const line = graph.lines[graph.nodes[edge.to].lineIndex];
  return (
    transferSeconds(graph, from, edge.to, edge.kind, cost).seconds +
    (edge.kind === 'transfer' ? cost.transferBiasSeconds : 0) +
    (line.realtime ? 0 : cost.nonRealtimeBiasSeconds)
  );
}

// ---------------------------------------------------------------------------
// Dijkstra
// ---------------------------------------------------------------------------

/** 최소 힙. 노드 794개라 배열 정렬로도 되지만, 힙 쪽이 정직하고 의존성도 없습니다. */
class MinHeap {
  private readonly keys: number[] = [];
  private readonly values: number[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(key: number, value: number): void {
    this.keys.push(key);
    this.values.push(value);
    let i = this.keys.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= this.keys[i]) break;
      this.swap(parent, i);
      i = parent;
    }
  }

  pop(): number {
    const top = this.values[0];
    const lastKey = this.keys.pop() as number;
    const lastValue = this.values.pop() as number;
    if (this.keys.length > 0) {
      this.keys[0] = lastKey;
      this.values[0] = lastValue;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.keys.length && this.keys[left] < this.keys[smallest]) smallest = left;
        if (right < this.keys.length && this.keys[right] < this.keys[smallest]) smallest = right;
        if (smallest === i) break;
        this.swap(smallest, i);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    [this.values[a], this.values[b]] = [this.values[b], this.values[a]];
  }
}

/**
 * 다중 출발 · 다중 도착 Dijkstra.
 *
 * 출발역이 놓인 모든 계통을 동시에 출발점으로 둡니다. 이것이 "어느 노선에서 타야
 * 하는가"를 자동으로 풀어 줍니다 — 사용자가 노선을 고를 필요가 없습니다.
 */
function shortestPath(
  graph: RouteGraph,
  sources: number[],
  targets: Set<number>,
  cost: RouteCostConfig,
): number[] | null {
  const count = graph.nodes.length;
  const dist = new Float64Array(count).fill(Infinity);
  const prev = new Int32Array(count).fill(-1);
  const done = new Uint8Array(count);
  const heap = new MinHeap();

  for (const source of sources) {
    // 실시간 도착정보가 없는 계통에서 출발하는 것도 한 번의 "구간"이므로 가산합니다.
    const initial = graph.lines[graph.nodes[source].lineIndex].realtime
      ? 0
      : cost.nonRealtimeBiasSeconds;
    if (initial < dist[source]) {
      dist[source] = initial;
      heap.push(initial, source);
    }
  }

  let found = -1;
  while (heap.size > 0) {
    const node = heap.pop();
    if (done[node]) continue;
    done[node] = 1;
    if (targets.has(node)) {
      found = node;
      break;
    }
    for (const edge of graph.edges[node]) {
      if (done[edge.to]) continue;
      const next = dist[node] + edgeCost(graph, node, edge, cost);
      if (next < dist[edge.to]) {
        dist[edge.to] = next;
        prev[edge.to] = node;
        heap.push(next, edge.to);
      }
    }
  }

  if (found < 0) return null;
  const path: number[] = [];
  for (let at = found; at >= 0; at = prev[at]) path.push(at);
  return path.reverse();
}

// ---------------------------------------------------------------------------
// 경로 서술
// ---------------------------------------------------------------------------

function edgeBetween(graph: RouteGraph, from: number, to: number): GraphEdge {
  const edge = graph.edges[from].find((e) => e.to === to);
  if (!edge) throw new Error(`경로에 없는 간선입니다: ${from} → ${to}`);
  return edge;
}

interface RawLeg {
  lineIndex: number;
  startNode: number;
  endNode: number;
  stationCount: number;
  /** 승차 간선 가중치의 합 = 이 구간의 운행 초. */
  seconds: number;
  transferIn: { from: number; to: number; kind: TransferKind } | null;
}

/**
 * 노드 경로를 구간(leg) 목록으로 압축합니다.
 *
 * 정거장 수가 0 인 구간(한 역에서 전이가 연달아 일어난 경우)은 제거하고 양쪽 전이를
 * 하나로 합칩니다. 전이 비용이 양수라 Dijkstra 가 이런 경로를 고를 일은 거의 없지만,
 * 남겨 두면 방향 계산이 무의미해지므로 여기서 확실히 없앱니다.
 */
function compress(graph: RouteGraph, path: number[]): RawLeg[] {
  const legs: RawLeg[] = [];
  let current: RawLeg = {
    lineIndex: graph.nodes[path[0]].lineIndex,
    startNode: path[0],
    endNode: path[0],
    stationCount: 0,
    seconds: 0,
    transferIn: null,
  };

  for (let i = 0; i + 1 < path.length; i += 1) {
    const edge = edgeBetween(graph, path[i], path[i + 1]);
    if (edge.kind === 'ride') {
      current.endNode = path[i + 1];
      current.stationCount += 1;
      current.seconds += edge.seconds;
      continue;
    }
    legs.push(current);
    current = {
      lineIndex: graph.nodes[path[i + 1]].lineIndex,
      startNode: path[i + 1],
      endNode: path[i + 1],
      stationCount: 0,
      seconds: 0,
      transferIn: { from: path[i], to: path[i + 1], kind: edge.kind },
    };
  }
  legs.push(current);

  const merged: RawLeg[] = [];
  let skipped = false;
  for (const leg of legs) {
    if (leg.stationCount === 0) {
      skipped = true;
      continue;
    }
    const previous = merged[merged.length - 1];
    if (!previous) {
      // 앞의 빈 구간들은 같은 역에서의 이동이므로 여기가 진짜 출발입니다.
      leg.transferIn = null;
    } else if (skipped) {
      // 빈 구간을 건너뛰었으니 앞뒤 전이를 하나로 잇습니다.
      const kind: TransferKind =
        graph.lines[previous.lineIndex].groupId === graph.lines[leg.lineIndex].groupId
          ? 'switch'
          : 'transfer';
      leg.transferIn = { from: previous.endNode, to: leg.startNode, kind };
    }
    skipped = false;
    merged.push(leg);
  }
  return merged;
}

function describeRoute(
  graph: RouteGraph,
  path: number[],
  label: RouteLabel,
  cost: RouteCostConfig,
): RoutePlan | null {
  const raw = compress(graph, path);
  if (raw.length === 0) return null;

  const legs: RouteLeg[] = raw.map((leg) => {
    const line = graph.lines[leg.lineIndex];
    const board = graph.nodes[leg.startNode];
    const alight = graph.nodes[leg.endNode];
    const transfer: RouteTransfer | null = leg.transferIn
      ? {
          fromStationName: graph.nodes[leg.transferIn.from].name,
          toStationName: graph.nodes[leg.transferIn.to].name,
          kind: leg.transferIn.kind,
          ...transferSeconds(graph, leg.transferIn.from, leg.transferIn.to, leg.transferIn.kind, cost),
        }
      : null;
    return {
      lineId: line.id,
      direction: directionBetweenIndices(line, board.stationIndex, alight.stationIndex),
      boardStationName: board.name,
      alightStationName: alight.name,
      boardIndex: board.stationIndex,
      alightIndex: alight.stationIndex,
      stationCount: leg.stationCount,
      seconds: leg.seconds,
      transferIn: transfer,
    };
  });

  const totalSeconds = legs.reduce(
    (sum, leg) => sum + leg.seconds + (leg.transferIn?.seconds ?? 0),
    0,
  );

  return {
    id: legs.map((leg) => `${leg.lineId}:${leg.boardIndex}>${leg.alightIndex}`).join('|'),
    legs,
    totalStations: legs.reduce((sum, leg) => sum + leg.stationCount, 0),
    totalSeconds,
    transferCount: legs.filter((leg) => leg.transferIn?.kind === 'transfer').length,
    legChangeCount: legs.length - 1,
    hasNonRealtimeLine: raw.some((leg) => !graph.lines[leg.lineIndex].realtime),
    label,
  };
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

export interface RouteProfile {
  label: RouteLabel;
  cost: RouteCostConfig;
}

/**
 * 후보 경로를 찾습니다.
 *
 * 프로파일(가중치)마다 Dijkstra 를 한 번씩 돌립니다. 794 노드 그래프에서 1회가
 * 1ms 남짓이라 k-shortest 알고리즘이나 라이브러리가 필요 없습니다.
 * 같은 경로가 나오면 하나만 남깁니다.
 */
export function findRoutesInGraph(
  graph: RouteGraph,
  originKey: string,
  destinationKey: string,
  profiles: RouteProfile[],
): RoutePlan[] {
  const origin = normalizeStationKey(originKey);
  const destination = normalizeStationKey(destinationKey);
  if (!origin || !destination || origin === destination) return [];

  const sources = graph.nodesByKey.get(origin);
  const targetIds = graph.nodesByKey.get(destination);
  if (!sources?.length || !targetIds?.length) return [];

  const targets = new Set(targetIds);
  // 표기만 다른 같은 역 (예: "서울역"과 "서울") 이면 경로가 없습니다.
  if (sources.some((id) => targets.has(id))) return [];

  const plans: RoutePlan[] = [];
  const seen = new Set<string>();
  for (const profile of profiles) {
    const path = shortestPath(graph, sources, targets, profile.cost);
    if (!path) continue;
    // 표시 소요시간은 프로파일과 무관하게 같은 상수로 계산합니다.
    const plan = describeRoute(graph, path, profile.label, {
      ...profile.cost,
      transferBiasSeconds: 0,
      nonRealtimeBiasSeconds: 0,
    });
    if (!plan || seen.has(plan.id)) continue;
    seen.add(plan.id);
    plans.push(plan);
  }
  return plans;
}
