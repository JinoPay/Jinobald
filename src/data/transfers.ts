/**
 * 번들된 환승 데이터셋 접근자.
 *
 * `scripts/build-transfer-data.mjs` 가 공공데이터에서 만든 JSON 을 읽습니다.
 * 오프라인·백그라운드 알림 문구에서도 써야 하므로 서버에 묻지 않고 번들에 싣습니다 (총 ~370KB).
 */
import type { Direction } from '@/services/subway/types';

import guidesJson from './generated/transfer-guides.json';
import manifestJson from './generated/manifest.json';
import codesJson from './generated/station-codes.json';
import timesJson from './generated/transfer-times.json';
import { normalizeStationName } from './stations';

/** 열차 칸·문 위치. "3-2" = 3번째 칸 2번째 문. */
export interface DoorPosition {
  car: number;
  door: number;
}

/** 환승역의 최단 환승 경로 한 건 (서울교통공사 환승정보). */
export interface TransferGuideEntry {
  fromGroupId: string;
  fromLineId: string;
  fromDirection: Direction;
  toGroupId: string;
  toLineId: string;
  toDirection: Direction;
  /** 하차 시 빠른 칸. 같은 승강장(아무 칸)이면 null. */
  alight: DoorPosition | null;
  /** 환승 후 승차 시 빠른 칸. */
  board: DoorPosition | null;
  /** 하차 → 승차 이동 소요 초. */
  seconds: number;
}

export interface TransferWalk {
  seconds: number;
  meters: number;
}

export interface StationCodeEntry {
  stationCd: string;
  externalCode: string | null;
}

const GUIDES = guidesJson as Record<string, TransferGuideEntry[]>;
const TIMES = timesJson as Record<string, TransferWalk>;
const CODES = codesJson as Record<string, StationCodeEntry>;

export const TRANSFER_DATA_MANIFEST = manifestJson as {
  generatedAt: string;
  transferGuides: { stations: number; rows: number };
  transferTimes: { rows: number };
  stationCodes: { rows: number };
};

export function doorLabel(door: DoorPosition): string {
  return `${door.car}-${door.door}`;
}

/** 이 역의 모든 환승 가이드. 없으면 빈 배열. */
export function findTransferGuides(stationName: string): TransferGuideEntry[] {
  return GUIDES[normalizeStationName(stationName)] ?? [];
}

/**
 * 특정 환승(그룹 A → 그룹 B)에 맞는 가이드.
 * 하차 열차 방향이 맞는 항목을 우선하고, 없으면 방향 무관 항목을 돌려줍니다.
 * 환승 후 승차 방향까지 맞는 것이 있으면 그것을 고릅니다.
 */
export function findTransferGuide(
  stationName: string,
  fromGroupId: string,
  toGroupId: string,
  fromDirection: Direction | null = null,
  toDirection: Direction | null = null,
): TransferGuideEntry | null {
  const candidates = findTransferGuides(stationName).filter(
    (g) => g.fromGroupId === fromGroupId && g.toGroupId === toGroupId,
  );
  if (candidates.length === 0) return null;
  const score = (g: TransferGuideEntry) =>
    (fromDirection && g.fromDirection === fromDirection ? 2 : 0) +
    (toDirection && g.toDirection === toDirection ? 1 : 0);
  return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

/** 환승 통로 도보 시간·거리 (서울교통공사 환승역거리 정보). 없으면 null. */
export function transferWalk(
  stationName: string,
  fromGroupId: string,
  toGroupId: string,
): TransferWalk | null {
  return TIMES[`${normalizeStationName(stationName)}|${fromGroupId}|${toGroupId}`] ?? null;
}

/** 서울교통공사 역코드. 빠른하차·시각표 조회의 키입니다. */
export function stationCodeOf(groupId: string, stationName: string): StationCodeEntry | null {
  return CODES[`${groupId}|${normalizeStationName(stationName)}`] ?? null;
}
