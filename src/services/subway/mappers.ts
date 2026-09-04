import { findStationRefs, getLineBySubwayId, normalizeStationName } from '@/data/stations';

import type { RawArrival, RawPosition } from './raw-types';
import type {
  Arrival,
  ArrivalStatus,
  Direction,
  TrainKind,
  TrainPosition,
  TrainPositionStatus,
} from './types';

const STATUS_BY_CODE: Record<string, ArrivalStatus> = {
  '0': 'entering',
  '1': 'arrived',
  '2': 'departed',
  '3': 'prevDeparted',
  '4': 'prevEntering',
  '5': 'prevArrived',
  '99': 'running',
};

const POSITION_STATUS_BY_CODE: Record<string, TrainPositionStatus> = {
  '0': 'entering',
  '1': 'arrived',
  '2': 'departed',
  '3': 'prevDeparted',
};

export function parseStatus(arvlCd: string | undefined): ArrivalStatus {
  if (!arvlCd) return 'unknown';
  return STATUS_BY_CODE[arvlCd] ?? 'unknown';
}

export function parseDirection(updnLine: string | undefined, loop: boolean): Direction {
  const value = updnLine ?? '';
  if (loop) return value.includes('내') ? 'inner' : 'outer';
  return value.includes('상') ? 'up' : 'down';
}

/** 열차 위치 API 는 방향을 "0"/"1" 코드로 줍니다. */
export function parseDirectionCode(updnLine: string | undefined, loop: boolean): Direction {
  const code = (updnLine ?? '').trim();
  const first = code === '0' || code.includes('상') || code.includes('내');
  if (loop) return first ? 'inner' : 'outer';
  return first ? 'up' : 'down';
}

export function parseTrainKind(btrainSttus: string | undefined): TrainKind {
  const value = btrainSttus ?? '';
  return value.includes('급행') || value.includes('특급') ? 'express' : 'local';
}

/**
 * `barvlDt` 는 여러 상태에서 "0" 으로 내려오는데 이는 "0초 후 도착"이 아니라
 * "값 없음"입니다. 그대로 0 으로 쓰면 알림이 즉시 발화하므로 null 로 옮깁니다.
 * 실제로 열차가 도착/진입 중일 때는 상태 코드로 판단합니다.
 */
export function parseSecondsUntilArrival(barvlDt: string | undefined): number | null {
  if (barvlDt == null) return null;
  const seconds = Number.parseInt(barvlDt, 10);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

export { isAtStation } from './status';

export function mapArrival(raw: RawArrival, requestedStationName: string, now: number): Arrival | null {
  const line = raw.subwayId ? getLineBySubwayId(raw.subwayId) : undefined;
  if (!line) return null; // 데이터셋에 없는 노선(경의중앙·신분당 등)은 조용히 건너뜁니다.

  const status = parseStatus(raw.arvlCd);
  const stationName = raw.statnNm ?? requestedStationName;
  const currentPosition = raw.arvlMsg3?.trim();
  const trainNo = raw.btrainNo?.trim() || null;

  return {
    id: [line.id, raw.updnLine, trainNo ?? raw.bstatnNm, raw.arvlMsg2, raw.recptnDt]
      .filter(Boolean)
      .join('|'),
    lineId: line.id,
    stationName,
    direction: parseDirection(raw.updnLine, line.loop),
    terminalStationName: raw.bstatnNm ?? raw.trainLineNm?.split(/[-행]/)[0]?.trim() ?? '',
    trainKind: parseTrainKind(raw.btrainSttus),
    trainNo,
    secondsUntilArrival: parseSecondsUntilArrival(raw.barvlDt),
    statusMessage: raw.arvlMsg2?.trim() || '정보 없음',
    currentPositionStationName:
      currentPosition && normalizeStationName(currentPosition) ? currentPosition : null,
    status,
    receivedAt: now,
  };
}

/**
 * 열차 위치 한 행 → 도메인.
 *
 * 서울 API 는 노선 단위(본선 subwayId)로 응답하지만 열차는 지선(성수지선 등)에 있을 수 있으므로
 * 역을 그룹 안의 모든 계통에서 찾고, 본선을 우선합니다.
 */
export function mapPosition(raw: RawPosition, now: number): TrainPosition | null {
  const line = raw.subwayId ? getLineBySubwayId(raw.subwayId) : undefined;
  if (!line || !raw.trainNo) return null;

  const stationName = raw.statnNm?.trim() ?? '';
  const refs = findStationRefs(stationName).filter((r) => r.line.groupId === line.groupId);
  const ref = refs.find((r) => r.line.id === line.id) ?? refs[0];

  return {
    lineId: ref?.line.id ?? line.id,
    trainNo: raw.trainNo.trim(),
    stationName: ref?.station.name ?? stationName,
    stationIndex: ref?.index ?? null,
    direction: parseDirectionCode(raw.updnLine, (ref?.line ?? line).loop),
    terminalStationName: raw.statnTnm?.trim() ?? '',
    status: POSITION_STATUS_BY_CODE[raw.trainSttus ?? ''] ?? 'unknown',
    express: raw.directAt === '1',
    lastTrain: raw.lstcarAt === '1',
    receivedAt: now,
  };
}
