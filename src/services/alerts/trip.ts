import { alertKey, type AlertKey, type AlertKind } from '@/services/notifications/kinds';
import type { RouteLeg, RoutePlan, RouteTransfer } from '@/services/routing/types';
import type { DoorGuide } from '@/services/subway/types';

/**
 * 저장 스키마 버전.
 *
 * 1 = 단일 노선 여정 (lineId/direction/origin/destination 를 직접 들고 있었음)
 * 2 = 다구간 여정 (RoutePlan 을 통째로 들고 currentLegIndex 로 진행)
 * 3 = 승차 열차번호와 빠른 승하차 칸 안내를 함께 저장
 */
export const TRIP_SCHEMA_VERSION = 3;

/**
 * 구간별 칸 안내의 키. `${구간}:alight` = 그 구간에서 내릴 때, `${구간}:board` = 그 구간에 탈 때.
 */
export type DoorGuideKey = `${number}:alight` | `${number}:board`;

export function doorGuideKey(legIndex: number, side: 'alight' | 'board'): DoorGuideKey {
  return `${legIndex}:${side}`;
}

export interface ScheduledAlert {
  /** expo-notifications 가 돌려준 식별자. 즉시 표시된 경우 null. */
  notificationId: string | null;
  atMs: number;
}

export interface Trip {
  schemaVersion: typeof TRIP_SCHEMA_VERSION;
  id: string;
  /**
   * 여정 시작 시점에 고정한 경로. 진행 중에 다시 탐색하지 않습니다.
   *
   * 노선·방향·승하차역을 Trip 이 따로 들고 있지 않은 것이 핵심입니다. 그렇게 하면
   * 구간이 넘어갈 때 복사본이 낡아 "그럴듯한 오답"이 나옵니다.
   */
  plan: RoutePlan;
  /** 지금 타고 있는(또는 탈) 구간. */
  currentLegIndex: number;
  /** 하차·환승 몇 정거장 전에 예비 알림을 보낼지. */
  alertNStationsBefore: number;
  useGps: boolean;
  createdAt: number;
  status: 'active' | 'completed' | 'cancelled';
  /** **현재 구간** 승차 여부. 구간이 넘어가면 false 로 돌아갑니다. */
  boarded: boolean;
  /** 현재 구간 승차 시각. 승차 후 경과 시간 계산의 기준점입니다. */
  boardedAt: number | null;
  /**
   * 승차한 열차의 번호. 승차 버튼을 누른 순간 도착정보의 첫 열차에서 가져옵니다.
   * 열차 위치 API 가 있으면 이 번호로 사용자의 열차를 따라갑니다. 모르면 null.
   */
  boardedTrainNo: string | null;
  /** 승차 상태를 누가 정했는지. 자동 감지로 넘어간 경우 화면에서 밝혀 둡니다. */
  boardedBy: 'manual' | 'auto' | null;
  /** 구간별 빠른 승하차 칸. 없는 구간은 키가 없거나 null 입니다. */
  doorGuides: Partial<Record<DoorGuideKey, DoorGuide | null>>;
  /** 이미 발화한 알림. ETA 경로와 GPS 경로가 중복 발화하지 않도록 하는 잠금입니다. */
  firedKeys: AlertKey[];
  scheduled: Partial<Record<AlertKey, ScheduledAlert>>;
  geofenceActive: boolean;
}

export interface TripDraft {
  plan: RoutePlan;
  alertNStationsBefore: number;
  useGps: boolean;
  /** 미리 구해 둔 칸 안내. 없으면 빈 객체. */
  doorGuides?: Partial<Record<DoorGuideKey, DoorGuide | null>>;
}

export function createTrip(draft: TripDraft): Trip {
  const { doorGuides, ...rest } = draft;
  return {
    schemaVersion: TRIP_SCHEMA_VERSION,
    id: `trip-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    ...rest,
    doorGuides: doorGuides ?? {},
    currentLegIndex: 0,
    createdAt: Date.now(),
    status: 'active',
    boarded: false,
    boardedAt: null,
    boardedTrainNo: null,
    boardedBy: null,
    firedKeys: [],
    scheduled: {},
    geofenceActive: false,
  };
}

/** 이 구간에서 내릴 때의 칸 안내. */
export function alightDoorGuide(trip: Trip, legIndex: number): DoorGuide | null {
  return trip.doorGuides[doorGuideKey(legIndex, 'alight')] ?? null;
}

/** 이 구간에 탈 때의 칸 안내 (앞 구간의 환승 정보에서 옵니다). */
export function boardDoorGuide(trip: Trip, legIndex: number): DoorGuide | null {
  return trip.doorGuides[doorGuideKey(legIndex, 'board')] ?? null;
}

/** 구간 번호를 항상 유효 범위로 좁힙니다. 저장값이 깨져도 화면이 죽지 않아야 합니다. */
function clampLegIndex(trip: Trip, index: number): number {
  return Math.min(Math.max(0, index), trip.plan.legs.length - 1);
}

export function legAt(trip: Trip, index: number): RouteLeg | undefined {
  return trip.plan.legs[index];
}

/** 유효 범위로 좁힌 현재 구간 번호. 알림 키와 지오펜스 식별자의 기준입니다. */
export function currentLegIndex(trip: Trip): number {
  return clampLegIndex(trip, trip.currentLegIndex);
}

export function currentLeg(trip: Trip): RouteLeg {
  return trip.plan.legs[currentLegIndex(trip)];
}

export function isFinalLeg(trip: Trip, index: number = trip.currentLegIndex): boolean {
  return clampLegIndex(trip, index) === trip.plan.legs.length - 1;
}

export function tripOriginName(trip: Trip): string {
  return trip.plan.legs[0].boardStationName;
}

export function tripDestinationName(trip: Trip): string {
  return trip.plan.legs[trip.plan.legs.length - 1].alightStationName;
}

/** 이 구간에서 내려야 하는 역 — 최종 하차역이거나 환승역입니다. */
export function legTargetName(trip: Trip, index: number = trip.currentLegIndex): string {
  return trip.plan.legs[clampLegIndex(trip, index)].alightStationName;
}

/** 이 구간 다음에 오는 환승. 마지막 구간이면 null. */
export function nextTransfer(
  trip: Trip,
  index: number = trip.currentLegIndex,
): RouteTransfer | null {
  return trip.plan.legs[clampLegIndex(trip, index) + 1]?.transferIn ?? null;
}

/** 이 구간에서 쓸 [예비, 도착] 알림 종류. */
export function legAlertKinds(
  trip: Trip,
  index: number = trip.currentLegIndex,
): readonly [AlertKind, AlertKind] {
  return isFinalLeg(trip, index) ? ['pre', 'arrive'] : ['transfer-pre', 'transfer'];
}

/** 현재 구간 기준의 알림 키. */
export function tripAlertKey(trip: Trip, kind: AlertKind): AlertKey {
  return alertKey(clampLegIndex(trip, trip.currentLegIndex), kind);
}

export function hasFired(trip: Trip, key: AlertKey): boolean {
  return trip.firedKeys.includes(key);
}
