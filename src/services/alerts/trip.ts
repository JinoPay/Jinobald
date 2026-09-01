import type { AlertKind } from '@/services/notifications/schedule';
import type { Direction } from '@/services/subway/types';

export interface ScheduledAlert {
  /** expo-notifications 가 돌려준 식별자. 즉시 표시된 경우 null. */
  notificationId: string | null;
  atMs: number;
}

export interface Trip {
  id: string;
  lineId: string;
  direction: Direction;
  originStationName: string;
  destinationStationName: string;
  /** 하차 몇 정거장 전에 예비 알림을 보낼지. */
  alertNStationsBefore: number;
  useGps: boolean;
  createdAt: number;
  status: 'active' | 'completed' | 'cancelled';
  /** 승차 확인 여부. 승차 전후로 진행 계산에 쓰는 신호가 달라집니다. */
  boarded: boolean;
  /** 승차 시각. 승차 후 경과 시간 기반 계산의 기준점입니다. */
  boardedAt: number | null;
  /** 이미 발화한 알림 종류. ETA 경로와 GPS 경로가 중복 발화하지 않도록 하는 잠금입니다. */
  firedKinds: AlertKind[];
  scheduled: Partial<Record<AlertKind, ScheduledAlert>>;
  geofenceActive: boolean;
}

export interface TripDraft {
  lineId: string;
  direction: Direction;
  originStationName: string;
  destinationStationName: string;
  alertNStationsBefore: number;
  useGps: boolean;
}

export function createTrip(draft: TripDraft): Trip {
  return {
    id: `trip-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    ...draft,
    createdAt: Date.now(),
    status: 'active',
    boarded: false,
    boardedAt: null,
    firedKinds: [],
    scheduled: {},
    geofenceActive: false,
  };
}

export function hasFired(trip: Trip, kind: AlertKind): boolean {
  return trip.firedKinds.includes(kind);
}
