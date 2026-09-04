import {
  directionBetweenIndices,
  normalizeStationKey,
  rideSecondsBetween,
  rideSegmentsBetween,
  stationsBetweenIndices,
  type RouteLineInput,
} from '@/services/routing/graph';
import type { RouteLeg, RouteTransfer } from '@/services/routing/types';
import { isAtStation } from '@/services/subway/status';
import type { Arrival, TrainPosition } from '@/services/subway/types';

import { currentLeg, isFinalLeg, nextTransfer, type Trip } from './trip';

/**
 * 여정 진행 상황 계산.
 *
 * 순수 계산에만 의존합니다 (expo-* 런타임 import 없음, 데이터셋도 인자로 받음).
 * 덕분에 기기 없이 `pnpm test` 로 바로 실행해 확인할 수 있고, 알림 예약 같은
 * 부수효과는 TripAlertManager 쪽에 남습니다.
 *
 * 계산 대상은 항상 **현재 구간**입니다. 정거장 수와 방향은 경로를 만들 때 이미
 * 확정되어 `RouteLeg` 에 들어 있으므로 여기서 다시 역을 조회하지 않습니다 —
 * 그 조회가 다른 구간의 노선에서 유효한 답을 돌려주는 것이 이 코드에서 가장
 * 눈치채기 어려운 오답의 원인이었습니다.
 */
export interface TripProgress {
  /** 계산 대상 구간. 알림 키와 맞춰 보는 데 씁니다. */
  legIndex: number;
  /** 현재 구간의 목표역(하차역 또는 환승역)까지 남은 정거장 수. */
  stationsLeft: number;
  /** 현재 구간의 목표역 도착까지 남은 초. */
  etaSeconds: number;
  /** 최종 하차역까지 남은 정거장 수 — 남은 구간을 모두 더한 값입니다. */
  totalStationsLeft: number;
  /** 최종 하차역 도착까지 남은 초 — 남은 구간과 환승 시간을 모두 더한 값입니다. */
  totalEtaSeconds: number;
  /** 현재 구간이 마지막인지. 알림 문구와 화면 문구가 갈립니다. */
  isFinalLeg: boolean;
  /** 이 구간이 끝나고 할 환승. 마지막 구간이면 null 입니다. */
  nextTransfer: RouteTransfer | null;
  /** 승차 전 계산에 사용한 열차. 승차 후에는 null 입니다. */
  matchedArrival: Arrival | null;
  /**
   * 승차 전, 탈 열차가 승차역에 도착하기까지의 초. 도착정보의 초가 없으면 열차의
   * 현재 위치 역으로 추정합니다. 모르면 null — 승차 알림을 잡지 않습니다.
   */
  secondsToTrain: number | null;
  /** 승차 후 열차 위치로 계산했을 때 그 위치. 아니면 null. */
  livePosition: TrainPosition | null;
  /**
   * 어떤 신호로 계산했는지 — UI 에 그대로 노출합니다.
   * **현재 구간**을 설명합니다. 남은 구간은 언제나 정적 추정입니다.
   */
  basis: 'arrival' | 'live-position' | 'elapsed' | 'static';
  /**
   * 실제 신호(도착정보·열차 위치·승차 시각)로 계산했는지.
   * false 면 "지금 + 구간 소요"라는 정적 추정이라, 이 값으로 **이미 잡힌 알림을 옮기면 안 됩니다**
   * (`shouldReschedule` 참고).
   */
  fresh: boolean;
  /** 진행이 이상할 때의 경고. 화면 배너로 노출합니다. */
  warning: 'wrong-direction' | null;
}

/**
 * 승차 전과 승차 후는 쓸 수 있는 신호가 다릅니다.
 *
 * - **승차 전**: 승차역의 도착정보가 곧 "언제 탈 수 있는가"입니다. 여기에
 *   승차역→하차역 구간 추정을 더해 전체 소요를 냅니다.
 * - **승차 후, 열차 위치가 있을 때**: 승차 시점에 기록한 열차번호를 노선 열차 위치에서
 *   찾아 지금 어느 역인지 봅니다. 지연까지 반영되는 가장 좋은 신호입니다.
 * - **승차 후, 열차 위치가 없을 때**: 하차역의 도착정보는 쓸 수 없습니다. 그 열차는
 *   사용자가 탄 열차가 아니라 뒤이어 하차역으로 향하는 다른 열차이기 때문입니다.
 *   그래서 승차 시각으로부터의 경과 시간으로 계산합니다. 대신 열차 지연은 반영되지 않습니다.
 */
export function computeProgress(
  trip: Trip,
  /** 현재 구간의 노선. 호출자가 `getLine(leg.lineId)` 로 넘깁니다. */
  line: RouteLineInput,
  arrivals: Arrival[],
  positions: TrainPosition[] = [],
  now: number = Date.now(),
): TripProgress {
  const leg = currentLeg(trip);
  const legIndex = trip.plan.legs.indexOf(leg);
  const totalStations = leg.stationCount;
  // 진행 순서대로 늘어놓은 구간 초. 실측이 있으면 실측, 없으면 노선 평균입니다.
  const segments = rideSegmentsBetween(line, leg.boardIndex, leg.alightIndex);
  const legSeconds = segments.reduce((sum, s) => sum + s, 0);

  // 남은 구간은 정적 추정만 가능합니다. 환승 시간도 경로에 실린 값입니다.
  const rest = trip.plan.legs.slice(legIndex + 1);
  const restStations = rest.reduce((sum, next) => sum + next.stationCount, 0);
  const restSeconds = rest.reduce(
    (sum, next) => sum + next.seconds + (next.transferIn?.seconds ?? 0),
    0,
  );

  const shared = {
    legIndex,
    isFinalLeg: isFinalLeg(trip, legIndex),
    nextTransfer: nextTransfer(trip, legIndex),
    matchedArrival: null as Arrival | null,
    secondsToTrain: null as number | null,
    livePosition: null as TrainPosition | null,
    warning: null as TripProgress['warning'],
  };
  const withTotals = (stationsLeft: number, etaSeconds: number) => ({
    stationsLeft,
    etaSeconds,
    totalStationsLeft: stationsLeft + restStations,
    totalEtaSeconds: etaSeconds + restSeconds,
  });

  if (trip.boarded) {
    const live = trip.boardedTrainNo ? locateTrain(trip, positions, line, leg.boardIndex, leg.alightIndex) : null;
    if (live) {
      const { travelled, position } = live;
      const stationsLeft = Math.max(0, totalStations - travelled);
      // 남은 구간 초 + 열차 상태에 따른 보정. 출발 직후면 다음 구간의 일부를 이미 지났고,
      // 접근 중이면 아직 그 역 앞 구간이 조금 남아 있습니다.
      let eta = segments.slice(travelled).reduce((sum, s) => sum + s, 0);
      const nextSegment = segments[travelled] ?? 0;
      const prevSegment = segments[travelled - 1] ?? 0;
      if (position.status === 'departed') eta -= nextSegment * 0.25;
      else if (position.status === 'prevDeparted') eta += prevSegment * 0.5;
      else if (position.status === 'entering') eta += prevSegment * 0.15;
      return {
        ...shared,
        ...withTotals(stationsLeft, Math.max(0, Math.round(eta))),
        livePosition: position,
        basis: 'live-position',
        fresh: true,
      };
    }

    if (trip.boardedAt != null) {
      const elapsed = Math.max(0, (now - trip.boardedAt) / 1000);
      let travelled = 0;
      let cumulative = 0;
      for (const seconds of segments) {
        if (cumulative + seconds > elapsed) break;
        cumulative += seconds;
        travelled += 1;
      }
      return {
        ...shared,
        ...withTotals(Math.max(0, totalStations - travelled), Math.max(0, legSeconds - elapsed)),
        basis: 'elapsed',
        fresh: true,
      };
    }
  }

  const matched = matchArrival(arrivals, leg);
  const secondsToOrigin = matched ? estimateSecondsToOrigin(matched, line, leg) : null;

  if (secondsToOrigin !== null) {
    return {
      ...shared,
      ...withTotals(totalStations, secondsToOrigin + legSeconds),
      matchedArrival: matched,
      secondsToTrain: secondsToOrigin,
      basis: 'arrival',
      fresh: true,
    };
  }

  return {
    ...shared,
    ...withTotals(totalStations, legSeconds),
    matchedArrival: matched,
    basis: 'static',
    fresh: false,
  };
}

/** 승차역 도착정보에서 이 구간의 노선·방향에 맞는 첫 열차. */
export function matchArrival(arrivals: Arrival[], leg: RouteLeg): Arrival | null {
  return arrivals.find((a) => a.lineId === leg.lineId && a.direction === leg.direction) ?? null;
}

/**
 * 탈 열차가 승차역에 오기까지의 초.
 *
 * 서울 API 는 여러 상태에서 `barvlDt` 를 비워 보냅니다. 그때는 열차의 현재 위치 역
 * (`arvlMsg3`)이 이 노선 위에 있고 승차역 쪽으로 오는 방향이면 구간 실측으로 추정합니다.
 * 이게 없으면 승차 알림 자체를 잡을 수 없기 때문입니다.
 */
export function estimateSecondsToOrigin(arrival: Arrival, line: RouteLineInput, leg: RouteLeg): number | null {
  if (arrival.secondsUntilArrival != null) return arrival.secondsUntilArrival;
  if (isAtStation(arrival.status)) return 0;
  if (!arrival.currentPositionStationName) return null;
  const index = findStationIndex(line, arrival.currentPositionStationName);
  if (index === null) return null;
  if (index === leg.boardIndex) return 0;
  // 승차역으로 오는 열차는 승차역 "뒤쪽"에 있어야 합니다. 하차역 쪽에 있으면 다른 방향의 열차입니다.
  if (directionBetweenIndices(line, index, leg.boardIndex) !== leg.direction) return null;
  return rideSecondsBetween(line, index, leg.boardIndex);
}

/** 정규화 이름(별칭 포함)으로 노선 위 인덱스를 찾습니다. */
export function findStationIndex(line: RouteLineInput, name: string): number | null {
  const key = normalizeStationKey(name);
  if (!key) return null;
  for (const [index, station] of line.stations.entries()) {
    if (normalizeStationKey(station.name) === key) return index;
    if (station.aliases?.some((alias) => normalizeStationKey(alias) === key)) return index;
  }
  return null;
}

/**
 * 승차한 열차를 위치 목록에서 찾아 "승차역에서 몇 정거장 왔는지"를 냅니다.
 *
 * 열차가 구간 밖(승차역 뒤쪽이나 하차역 너머)에 있으면 우리 열차가 아니거나 잘못된
 * 응답이므로 null — 호출자는 경과 시간 계산으로 내려갑니다.
 */
function locateTrain(
  trip: Trip,
  positions: TrainPosition[],
  line: RouteLineInput,
  boardIndex: number,
  alightIndex: number,
): { travelled: number; position: TrainPosition } | null {
  const leg = currentLeg(trip);
  const position = findTrainPosition(positions, trip.boardedTrainNo, leg.lineId);
  if (!position || position.stationIndex === null) return null;
  const travelled = stationsBetweenIndices(line, boardIndex, position.stationIndex);
  const remaining = stationsBetweenIndices(line, position.stationIndex, alightIndex);
  // 승차역→열차→하차역이 한 줄로 이어져야 구간 안에 있는 것입니다.
  if (travelled + remaining !== leg.stationCount) return null;
  return { travelled, position };
}

export function findTrainPosition(
  positions: TrainPosition[],
  trainNo: string | null,
  lineId: string,
): TrainPosition | null {
  if (!trainNo) return null;
  return positions.find((p) => p.trainNo === trainNo && p.lineId === lineId && p.stationIndex !== null) ?? null;
}

/**
 * 승차한 열차가 반대 방향으로 가고 있는지.
 *
 * 열차 위치 API 의 방향이 구간 방향과 다르거나, 열차가 승차역 기준으로 하차역의 반대편에
 * 있으면 잘못 탄 것입니다. 한 번의 응답은 오류일 수 있으므로 호출자가 연속 횟수를 셉니다.
 * 순환선은 인덱스만으로 반대편을 정할 수 없어 API 의 방향 필드만 봅니다.
 */
export function detectWrongDirection(
  positions: TrainPosition[],
  trainNo: string | null,
  line: RouteLineInput,
  leg: RouteLeg,
): boolean {
  const position = findTrainPosition(positions, trainNo, leg.lineId);
  if (!position || position.stationIndex === null) return false;
  if (position.direction !== leg.direction) return true;
  if (line.loop || position.stationIndex === leg.boardIndex) return false;
  const travelled = stationsBetweenIndices(line, leg.boardIndex, position.stationIndex);
  const remaining = stationsBetweenIndices(line, position.stationIndex, leg.alightIndex);
  if (travelled + remaining === leg.stationCount) return false;
  return directionBetweenIndices(line, leg.boardIndex, position.stationIndex) !== leg.direction;
}
