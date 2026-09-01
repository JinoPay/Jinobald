import { getLineBySubwayId, normalizeStationName } from '@/data/stations';

import type { RawArrival } from './raw-types';
import type { Arrival, ArrivalStatus, Direction, TrainKind } from './types';

const STATUS_BY_CODE: Record<string, ArrivalStatus> = {
  '0': 'entering',
  '1': 'arrived',
  '2': 'departed',
  '3': 'prevDeparted',
  '4': 'prevEntering',
  '5': 'prevArrived',
  '99': 'running',
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

/** 열차가 이미 승강장에 있거나 진입 중인 상태. */
export function isAtStation(status: ArrivalStatus): boolean {
  return status === 'arrived' || status === 'entering';
}

export function mapArrival(raw: RawArrival, requestedStationName: string, now: number): Arrival | null {
  const line = raw.subwayId ? getLineBySubwayId(raw.subwayId) : undefined;
  if (!line) return null; // 데이터셋에 없는 노선(경의중앙·신분당 등)은 조용히 건너뜁니다.

  const status = parseStatus(raw.arvlCd);
  const stationName = raw.statnNm ?? requestedStationName;
  const currentPosition = raw.arvlMsg3?.trim();

  return {
    id: [line.id, raw.updnLine, raw.bstatnNm, raw.arvlMsg2, raw.recptnDt]
      .filter(Boolean)
      .join('|'),
    lineId: line.id,
    stationName,
    direction: parseDirection(raw.updnLine, line.loop),
    terminalStationName: raw.bstatnNm ?? raw.trainLineNm?.split(/[-행]/)[0]?.trim() ?? '',
    trainKind: parseTrainKind(raw.btrainSttus),
    secondsUntilArrival: parseSecondsUntilArrival(raw.barvlDt),
    statusMessage: raw.arvlMsg2?.trim() || '정보 없음',
    currentPositionStationName:
      currentPosition && normalizeStationName(currentPosition) ? currentPosition : null,
    status,
    receivedAt: now,
  };
}
