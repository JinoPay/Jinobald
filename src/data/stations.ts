import rawLines from './lines.json';

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
  /** 서울 API 의 subwayId (1001 = 1호선 …). */
  subwayId: string;
  color: string;
  loop: boolean;
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
 * API 의 `statnNm` 과 사용자 입력, 그리고 정적 데이터의 표기가 서로 다릅니다.
 * (예: "총신대입구(이수)" vs "이수", "서울역" vs "서울") 괄호 안 부기와 후행 "역",
 * 모든 공백을 제거해 하나의 키로 맞춥니다.
 */
export function normalizeStationName(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .replace(/역$/, '')
    .trim();
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

const lineById = new Map(LINES.map((l) => [l.id, l]));
const lineBySubway = new Map(LINES.map((l) => [l.subwayId, l]));

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

/** 두 개 이상 노선에 등장하면 환승역입니다. 별도 테이블을 두지 않습니다. */
export function isTransferStation(name: string): boolean {
  return findStationRefs(name).length > 1;
}

/** 화면에 쓸 고유 역 목록 (정규화 이름 기준 1개씩). */
export interface UniqueStation {
  /** 정규화된 이름 — 라우팅 키로 사용합니다. */
  key: string;
  /** 표시용 이름 (첫 등장 노선의 표기). */
  displayName: string;
  lineIds: string[];
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
  const forward = toIndex > fromIndex;
  if (line.loop) {
    // 순환선에서는 더 짧은 쪽으로 도는 방향을 택합니다.
    const n = line.stations.length;
    const forwardSteps = (toIndex - fromIndex + n) % n;
    return forwardSteps <= n - forwardSteps ? 'outer' : 'inner';
  }
  return forward ? 'down' : 'up';
}

/** from → to 사이의 정거장 수. 순환선은 진행 방향에 맞춰 감아서 셉니다. */
export function stationsBetween(line: Line, fromIndex: number, toIndex: number): number {
  if (!line.loop) return Math.abs(toIndex - fromIndex);
  const n = line.stations.length;
  const forwardSteps = (toIndex - fromIndex + n) % n;
  return Math.min(forwardSteps, n - forwardSteps);
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
