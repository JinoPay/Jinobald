/**
 * 순수 모듈 테스트용 픽스처. 데이터셋(JSON)을 끌고 오지 않도록 작은 가상 노선을 씁니다.
 */
import type { RouteLineInput } from '@/services/routing/graph';
import type { RouteLeg, RoutePlan } from '@/services/routing/types';
import type { Arrival, TrainPosition } from '@/services/subway/types';

import { createTrip, type Trip } from './trip';

/** A→B→C→D→E→F 여섯 역, 구간 120초씩. */
export const LINE: RouteLineInput = {
  id: 'test',
  groupId: 'test',
  loop: false,
  realtime: true,
  avgSecondsPerStation: 120,
  stations: ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => ({ name, secondsToNext: 120 })),
};

export const LINE2: RouteLineInput = {
  id: 'test2',
  groupId: 'test2',
  loop: false,
  realtime: true,
  avgSecondsPerStation: 100,
  stations: ['F', 'G', 'H', 'I'].map((name) => ({ name, secondsToNext: 100 })),
};

export function leg(overrides: Partial<RouteLeg> = {}): RouteLeg {
  return {
    lineId: 'test',
    direction: 'down',
    boardStationName: 'A',
    alightStationName: 'E',
    boardIndex: 0,
    alightIndex: 4,
    stationCount: 4,
    seconds: 480,
    transferIn: null,
    ...overrides,
  };
}

export function plan(legs: RouteLeg[] = [leg()]): RoutePlan {
  return {
    id: legs.map((l) => `${l.lineId}:${l.boardIndex}>${l.alightIndex}`).join('|'),
    legs,
    totalStations: legs.reduce((s, l) => s + l.stationCount, 0),
    totalSeconds: legs.reduce((s, l) => s + l.seconds + (l.transferIn?.seconds ?? 0), 0),
    transferCount: legs.filter((l) => l.transferIn?.kind === 'transfer').length,
    legChangeCount: legs.length - 1,
    hasNonRealtimeLine: false,
    label: 'fastest',
  };
}

/** A→E 한 구간, 2정거장 전 예비 알림. */
export function trip(overrides: Partial<Trip> = {}): Trip {
  return { ...createTrip({ plan: plan(), alertNStationsBefore: 2, useGps: false }), id: 'trip-test', ...overrides };
}

/** A→F(test) 환승 F→I(test2) 두 구간. */
export function twoLegTrip(overrides: Partial<Trip> = {}): Trip {
  const legs = [
    leg({ alightStationName: 'F', alightIndex: 5, stationCount: 5, seconds: 600 }),
    leg({
      lineId: 'test2',
      boardStationName: 'F',
      alightStationName: 'I',
      boardIndex: 0,
      alightIndex: 3,
      stationCount: 3,
      seconds: 300,
      transferIn: { fromStationName: 'F', toStationName: 'F', kind: 'transfer', seconds: 240, measured: false },
    }),
  ];
  return { ...createTrip({ plan: plan(legs), alertNStationsBefore: 2, useGps: false }), id: 'trip-two', ...overrides };
}

export function arrival(overrides: Partial<Arrival> = {}): Arrival {
  return {
    id: 'arr-1',
    lineId: 'test',
    stationName: 'A',
    direction: 'down',
    terminalStationName: 'F',
    trainKind: 'local',
    trainNo: '1001',
    secondsUntilArrival: 180,
    statusMessage: '3분 후',
    currentPositionStationName: null,
    status: 'running',
    receivedAt: 0,
    ...overrides,
  };
}

export function position(overrides: Partial<TrainPosition> = {}): TrainPosition {
  return {
    lineId: 'test',
    trainNo: '1001',
    stationName: 'B',
    stationIndex: 1,
    direction: 'down',
    terminalStationName: 'F',
    status: 'arrived',
    express: false,
    lastTrain: false,
    receivedAt: 0,
    ...overrides,
  };
}
