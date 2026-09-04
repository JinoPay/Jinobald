/**
 * 저장 경로("내 경로") — 순수 모듈입니다.
 *
 * 사용자가 늘 타는 길은 최소 시간도 최소 환승도 아닐 수 있습니다 (앉아 갈 수 있는 노선,
 * 익숙한 환승 통로 …). 그래서 경로 자체(계통·승하차역)를 고정해 저장하고, 같은 출발·도착을
 * 검색하면 이 경로를 "추천"보다 앞에 둡니다. 출퇴근 루틴은 저장 경로를 가리킵니다.
 */
import type { RoutePlan } from '@/services/routing/types';

export interface SavedRoute {
  id: string;
  /** "출근", "퇴근", 또는 사용자가 붙인 이름. */
  name: string;
  /** 정규화 역명 (UniqueStation.key). */
  originKey: string;
  destinationKey: string;
  /** 저장 시점에 고정한 경로. 데이터셋이 바뀌면 `resolveSavedRoute` 가 같은 모양의 경로를 다시 찾습니다. */
  plan: RoutePlan;
  createdAt: number;
  lastUsedAt: number | null;
  useCount: number;
  /** 이 경로만의 알림 설정. null 이면 전역 기본값입니다. */
  alertNStationsBefore: number | null;
  useGps: boolean | null;
}

export type SavedRouteInput = Pick<SavedRoute, 'name' | 'originKey' | 'destinationKey' | 'plan'> &
  Partial<Pick<SavedRoute, 'alertNStationsBefore' | 'useGps'>>;

export function newSavedRoute(input: SavedRouteInput, now = Date.now()): SavedRoute {
  return {
    id: `route-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: input.name.trim() || `${input.originKey} → ${input.destinationKey}`,
    originKey: input.originKey,
    destinationKey: input.destinationKey,
    // 저장 경로는 늘 "내 경로" 라벨로 보입니다. 원래 어떤 기준으로 찾았는지는 중요하지 않습니다.
    plan: { ...input.plan, label: 'saved', avoidedLineId: null },
    createdAt: now,
    lastUsedAt: null,
    useCount: 0,
    alertNStationsBefore: input.alertNStationsBefore ?? null,
    useGps: input.useGps ?? null,
  };
}

/** 두 경로가 같은 계통을 같은 순서로 같은 역에서 타고 내리는지. 인덱스는 보지 않습니다 — 데이터셋 갱신으로 밀릴 수 있습니다. */
export function sameShape(a: RoutePlan, b: RoutePlan): boolean {
  if (a.legs.length !== b.legs.length) return false;
  return a.legs.every((leg, i) => {
    const other = b.legs[i];
    return (
      leg.lineId === other.lineId &&
      leg.direction === other.direction &&
      leg.boardStationName === other.boardStationName &&
      leg.alightStationName === other.alightStationName
    );
  });
}

export type ResolvedSavedRoute =
  | { status: 'pinned'; plan: RoutePlan }
  /** 데이터셋이 바뀌어 다시 찾았고, 같은 모양의 경로가 있었습니다. 호출자는 저장값을 갱신하는 편이 좋습니다. */
  | { status: 'refreshed'; plan: RoutePlan }
  /** 같은 모양의 경로를 더는 만들 수 없습니다 (노선 폐지·역명 변경). 사용자가 다시 골라야 합니다. */
  | { status: 'unavailable'; plan: null };

/**
 * 저장 경로를 지금의 데이터셋에서 쓸 수 있는 경로로 바꿉니다.
 *
 * @param isValid `routing/index.ts#isPlanValid` — 인덱스·역명이 현재 데이터와 맞는지.
 * @param search  `findRoutes` — 같은 출발·도착의 후보 (대안 포함).
 */
export function resolveSavedRoute(
  saved: SavedRoute,
  isValid: (plan: RoutePlan) => boolean,
  search: (originKey: string, destinationKey: string) => RoutePlan[],
): ResolvedSavedRoute {
  if (isValid(saved.plan)) return { status: 'pinned', plan: { ...saved.plan, label: 'saved' } };
  const match = search(saved.originKey, saved.destinationKey).find((candidate) => sameShape(candidate, saved.plan));
  if (match) return { status: 'refreshed', plan: { ...match, label: 'saved', avoidedLineId: null } };
  return { status: 'unavailable', plan: null };
}

/** 같은 출발·도착의 저장 경로. 여럿이면 많이 쓴 것, 그다음 최근 것. */
export function findSavedForPair(
  routes: SavedRoute[],
  originKey: string,
  destinationKey: string,
): SavedRoute | undefined {
  return routes
    .filter((route) => route.originKey === originKey && route.destinationKey === destinationKey)
    .sort((a, b) => b.useCount - a.useCount || (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt))[0];
}

/** 저장 목록의 검증 — AsyncStorage 값이 깨져도 앱이 죽지 않게. */
export function isSavedRouteList(value: unknown): value is SavedRoute[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        v &&
        typeof v.id === 'string' &&
        typeof v.name === 'string' &&
        typeof v.originKey === 'string' &&
        typeof v.destinationKey === 'string' &&
        v.plan &&
        Array.isArray(v.plan.legs),
    )
  );
}
