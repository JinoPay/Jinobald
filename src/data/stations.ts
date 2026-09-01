import rawLines from './lines.json';

import {
  directionBetweenIndices,
  normalizeStationKey,
  stationsBetweenIndices,
} from '@/services/routing/graph';
import type { Direction } from '@/services/subway/types';

export interface Station {
  name: string;
  lat?: number;
  lng?: number;
  aliases?: string[];
}

export interface Line {
  id: string;
  name: string;
  /**
   * 서울 API 의 subwayId (1001 = 1호선 …).
   * 지선 계통은 본선과 같은 노선으로 응답이 오므로 null 이고, 그룹의 본선이 대표합니다.
   * 실시간 도착 API 가 다루지 않는 노선도 null 입니다.
   */
  subwayId: string | null;
  color: string;
  loop: boolean;
  /** 실시간 도착 API 커버리지. false 면 도착 화면이 빈 목록 대신 안내 문구를 보여 줍니다. */
  realtime: boolean;
  /** 같은 노선의 지선끼리 묶는 그룹. 배지 색과 이름을 공유합니다. */
  groupId: string;
  /** 배지에 쓸 짧은 라벨 ("1", "경의", "I2" …). 그룹 안에서 동일합니다. */
  badge: string;
  avgSecondsPerStation: number;
  note: string;
  upTerminal: string;
  downTerminal: string;
  stations: Station[];
}

export const LINES = rawLines as Line[];

/** 노선 위의 한 역을 가리키는 참조. 인접·거리 계산의 기본 단위입니다. */
export interface StationRef {
  line: Line;
  index: number;
  station: Station;
}

/**
 * 역명 정규화.
 *
 * 구현은 `routing/graph.ts` 에 있습니다 — 경로 탐색이 같은 키 규칙 위에서 전이 간선을
 * 만들어야 하는데, 그 파일은 Node 로 검증하기 위해 런타임 import 를 두지 않습니다.
 * 규칙을 두 벌 유지하면 반드시 어긋나므로 여기서 감싸 쓰기만 합니다.
 */
export function normalizeStationName(name: string): string {
  return normalizeStationKey(name);
}

function buildIndex(): Map<string, StationRef[]> {
  const index = new Map<string, StationRef[]>();
  const add = (key: string, ref: StationRef) => {
    const normalized = normalizeStationName(key);
    if (!normalized) return;
    const existing = index.get(normalized);
    if (existing) {
      if (!existing.some((r) => r.line.id === ref.line.id && r.index === ref.index)) {
        existing.push(ref);
      }
    } else {
      index.set(normalized, [ref]);
    }
  };

  for (const line of LINES) {
    line.stations.forEach((station, i) => {
      const ref: StationRef = { line, index: i, station };
      add(station.name, ref);
      for (const alias of station.aliases ?? []) add(alias, ref);
    });
  }
  return index;
}

const stationIndex = buildIndex();

/** 노선 그룹 — 지선을 묶어 배지·색·대표 이름을 공유합니다. */
export interface LineGroup {
  id: string;
  /** 그룹 대표 이름 (본선 이름). */
  name: string;
  color: string;
  badge: string;
  /** 이 그룹에 속한 운행 계통들. 첫 항목이 본선입니다. */
  lineIds: string[];
}

export const LINE_GROUPS: LineGroup[] = (() => {
  const byId = new Map<string, LineGroup>();
  for (const line of LINES) {
    const existing = byId.get(line.groupId);
    if (existing) {
      existing.lineIds.push(line.id);
    } else {
      // 정의 배열에서 본선이 항상 먼저 오므로 첫 등장이 그룹 대표입니다.
      byId.set(line.groupId, {
        id: line.groupId,
        name: line.name,
        color: line.color,
        badge: line.badge,
        lineIds: [line.id],
      });
    }
  }
  return [...byId.values()];
})();

const groupById = new Map(LINE_GROUPS.map((g) => [g.id, g]));

export function getLineGroup(groupId: string): LineGroup | undefined {
  return groupById.get(groupId);
}

/** 운행 계통 id 를 노선 그룹 id 로 (지선 → 본선). 배지 표시에 씁니다. */
export function groupIdOf(lineId: string): string {
  return lineById.get(lineId)?.groupId ?? lineId;
}

const lineById = new Map(LINES.map((l) => [l.id, l]));
// 지선은 subwayId 가 null 이므로 자연스럽게 본선만 남습니다.
const lineBySubway = new Map(
  LINES.filter((l): l is Line & { subwayId: string } => l.subwayId !== null).map((l) => [
    l.subwayId,
    l,
  ]),
);

export function getLine(lineId: string): Line | undefined {
  return lineById.get(lineId);
}

export function getLineBySubwayId(subwayId: string): Line | undefined {
  return lineBySubway.get(subwayId);
}

/** 정규화된 이름으로 이 역이 속한 모든 노선 위치를 찾습니다. */
export function findStationRefs(name: string): StationRef[] {
  return stationIndex.get(normalizeStationName(name)) ?? [];
}

export function findStationRefOnLine(lineId: string, name: string): StationRef | undefined {
  return findStationRefs(name).find((ref) => ref.line.id === lineId);
}

/**
 * 두 개 이상의 노선 **그룹**에 등장하면 환승역입니다. 별도 테이블을 두지 않습니다.
 *
 * 계통(Line) 기준으로 세면 안 됩니다. 구로·성수·신도림·강동처럼 본선과 지선이
 * 갈라지는 분기역이 같은 노선인데도 환승역으로 잡히기 때문입니다.
 */
export function isTransferStation(name: string): boolean {
  return groupIdsAt(name).length > 1;
}

/** 이 역을 지나는 노선 그룹 id 목록 (등장 순서 유지). */
export function groupIdsAt(name: string): string[] {
  return [...new Set(findStationRefs(name).map((ref) => ref.line.groupId))];
}

/** 화면에 쓸 고유 역 목록 (정규화 이름 기준 1개씩). */
export interface UniqueStation {
  /** 정규화된 이름 — 라우팅 키로 사용합니다. */
  key: string;
  /** 표시용 이름 (첫 등장 노선의 표기). */
  displayName: string;
  /** 이 역을 지나는 운행 계통 id (지선 포함). */
  lineIds: string[];
  /** 이 역을 지나는 노선 그룹 id — 배지 표시와 환승 판정에 씁니다. */
  groupIds: string[];
  lat?: number;
  lng?: number;
}

export const UNIQUE_STATIONS: UniqueStation[] = (() => {
  const list: UniqueStation[] = [];
  for (const [key, refs] of stationIndex) {
    const withCoords = refs.find((r) => r.station.lat != null && r.station.lng != null);
    list.push({
      key,
      displayName: refs[0].station.name,
      lineIds: [...new Set(refs.map((r) => r.line.id))],
      groupIds: [...new Set(refs.map((r) => r.line.groupId))],
      lat: withCoords?.station.lat,
      lng: withCoords?.station.lng,
    });
  }
  return list.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'));
})();

export function getUniqueStation(key: string): UniqueStation | undefined {
  const normalized = normalizeStationName(key);
  return UNIQUE_STATIONS.find((s) => s.key === normalized);
}

export function searchStations(query: string, limit = 30): UniqueStation[] {
  const q = normalizeStationName(query);
  if (!q) return [];
  const starts: UniqueStation[] = [];
  const contains: UniqueStation[] = [];
  for (const station of UNIQUE_STATIONS) {
    if (station.key.startsWith(q)) starts.push(station);
    else if (station.key.includes(q)) contains.push(station);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

/**
 * 같은 노선에서 from → to 로 갈 때의 방향.
 * 배열 인덱스가 커지는 쪽이 하행(순환선은 외선), 작아지는 쪽이 상행(내선)입니다.
 */
export function directionBetween(line: Line, fromIndex: number, toIndex: number): Direction {
  return directionBetweenIndices(line.loop, line.stations.length, fromIndex, toIndex);
}

/** from → to 사이의 정거장 수. 순환선은 진행 방향에 맞춰 감아서 셉니다. */
export function stationsBetween(line: Line, fromIndex: number, toIndex: number): number {
  return stationsBetweenIndices(line.loop, line.stations.length, fromIndex, toIndex);
}

/**
 * from 에서 지정한 방향으로 갈 때 도달 가능한 역들.
 * 하차역 선택 목록을 만드는 데 씁니다.
 */
export function downstreamStations(line: Line, fromIndex: number, direction: Direction): Station[] {
  const n = line.stations.length;
  if (line.loop) {
    const step = direction === 'outer' ? 1 : -1;
    const result: Station[] = [];
    for (let k = 1; k < n; k += 1) {
      result.push(line.stations[(((fromIndex + step * k) % n) + n) % n]);
    }
    return result;
  }
  return direction === 'down'
    ? line.stations.slice(fromIndex + 1)
    : line.stations.slice(0, fromIndex).reverse();
}

export function directionLabel(line: Line, direction: Direction): string {
  if (line.loop) return direction === 'inner' ? '내선순환' : '외선순환';
  return direction === 'up' ? `상행 (${line.upTerminal} 방면)` : `하행 (${line.downTerminal} 방면)`;
}
