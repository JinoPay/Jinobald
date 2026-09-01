/**
 * 앱에서 쓰는 경로 탐색 진입점.
 *
 * `graph.ts` 는 데이터셋을 모릅니다 (Node 로 검증할 수 있어야 하므로).
 * 여기서 `LINES` 를 물려 주고 결과를 캐시합니다.
 */
import {
  directionBetween,
  findStationRefOnLine,
  getLine,
  LINES,
  stationsBetween,
} from '@/data/stations';

import { FASTEST_COST, FEWEST_TRANSFER_COST } from './cost';
import {
  buildRouteGraph,
  findRoutesInGraph,
  normalizeStationKey,
  type RouteGraph,
  type RouteProfile,
} from './graph';
import type { RouteLeg, RoutePlan } from './types';

export type { RouteLabel, RouteLeg, RoutePlan, RouteTransfer, TransferKind } from './types';

/** 최소 시간 먼저, 그다음 최소 환승. 화면에 보이는 순서이기도 합니다. */
const PROFILES: RouteProfile[] = [
  { label: 'fastest', cost: FASTEST_COST },
  { label: 'fewest-transfers', cost: FEWEST_TRANSFER_COST },
];

let graph: RouteGraph | null = null;

function getGraph(): RouteGraph {
  graph ??= buildRouteGraph(LINES);
  return graph;
}

/**
 * 탐색 결과 캐시.
 *
 * 검색 화면이 출발·도착이 바뀔 때마다 렌더 중에 부르므로, 같은 쌍을 두 번 계산하지
 * 않게 합니다. 한 번에 1ms 남짓이지만 캐시가 있으면 화면 전환(`/trip/setup` 이 같은
 * 탐색을 다시 돌려 경로를 재현합니다)이 공짜가 됩니다.
 */
const cache = new Map<string, RoutePlan[]>();
const CACHE_LIMIT = 100;

/**
 * 출발역 → 도착역 후보 경로. 최대 2개 (최소 시간 / 최소 환승).
 *
 * 인자는 정규화 전 이름이어도 됩니다. 두 역이 이어져 있지 않거나 같은 역이면 빈 배열입니다.
 */
export function findRoutes(originName: string, destinationName: string): RoutePlan[] {
  const key = `${normalizeStationKey(originName)}>${normalizeStationKey(destinationName)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const plans = findRoutesInGraph(getGraph(), originName, destinationName, PROFILES);
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, plans);
  return plans;
}

/** 후보 목록의 n 번째 경로. 화면 사이에는 이 인덱스만 넘깁니다. */
export function findRoutePlan(
  originName: string,
  destinationName: string,
  index: number,
): RoutePlan | null {
  return findRoutes(originName, destinationName)[index] ?? null;
}

/**
 * 한 노선만 타는 1구간 경로.
 *
 * 탐색을 거치지 않고 승·하차역이 이미 정해진 경우(저장된 v1 여정 복원 등)에 씁니다.
 * 두 역이 이 계통에 없거나 같은 역이면 null 입니다.
 */
export function planFromSingleLeg(
  lineId: string,
  boardStationName: string,
  alightStationName: string,
): RoutePlan | null {
  const line = getLine(lineId);
  const board = findStationRefOnLine(lineId, boardStationName);
  const alight = findStationRefOnLine(lineId, alightStationName);
  if (!line || !board || !alight || board.index === alight.index) return null;

  const stationCount = stationsBetween(line, board.index, alight.index);
  const leg: RouteLeg = {
    lineId,
    direction: directionBetween(line, board.index, alight.index),
    boardStationName: board.station.name,
    alightStationName: alight.station.name,
    boardIndex: board.index,
    alightIndex: alight.index,
    stationCount,
    seconds: stationCount * line.avgSecondsPerStation,
    transferIn: null,
  };

  return {
    id: `${leg.lineId}:${leg.boardIndex}>${leg.alightIndex}`,
    legs: [leg],
    totalStations: stationCount,
    totalSeconds: leg.seconds,
    transferCount: 0,
    legChangeCount: 0,
    hasNonRealtimeLine: !line.realtime,
    label: 'fastest',
  };
}

/**
 * 경로가 지금의 데이터셋과 여전히 맞는지 확인합니다.
 *
 * 저장된 여정을 복원할 때와 여정을 시작할 때 **미리** 검사합니다. 지연 검증하면
 * 뒤쪽 구간의 역명이 어긋나도 처음엔 멀쩡해 보이다가 여정 중반에 진행 계산이
 * 조용히 멈춥니다 (`computeProgress` 가 null 을 돌려주기 때문입니다).
 */
export function isPlanValid(plan: RoutePlan): boolean {
  if (!Array.isArray(plan.legs) || plan.legs.length === 0) return false;
  return plan.legs.every((leg) => {
    const line = getLine(leg.lineId);
    if (!line) return false;
    if (line.stations[leg.boardIndex]?.name !== leg.boardStationName) return false;
    if (line.stations[leg.alightIndex]?.name !== leg.alightStationName) return false;
    return leg.stationCount >= 1;
  });
}
