import { findStationRefOnLine, getLine } from '@/data/stations';
import { startTripGeofence, stopTripGeofence, type GeofenceTarget } from '@/services/location/geofence';
import {
  cancelNotifications,
  scheduleTripNotification,
  type AlertKind,
} from '@/services/notifications/schedule';

import { computeAlertTimes, shouldReschedule } from './eta';
import type { TripProgress } from './progress';
import { hasFired, type Trip } from './trip';

export { computeProgress, resolveDirection } from './progress';
export type { TripProgress } from './progress';

function alertContent(trip: Trip, kind: AlertKind, stationsLeft: number) {
  if (kind === 'arrive') {
    return {
      title: `${trip.destinationStationName} 도착`,
      body: '하차 준비하세요.',
    };
  }
  return {
    title: `곧 ${trip.destinationStationName}입니다`,
    body: `${Math.max(1, stationsLeft)}정거장 남았습니다.`,
  };
}

/**
 * 진행 상황에 맞춰 알림을 다시 잡습니다.
 *
 * 폴링마다 무조건 취소·재예약하면 Android 에서 알림이 누락되거나 중복되므로,
 * 목표 시각이 임계값 이상 움직였을 때만 다시 잡습니다.
 */
export async function syncAlerts(trip: Trip, progress: TripProgress): Promise<Trip> {
  const line = getLine(trip.lineId);
  if (!line || trip.status !== 'active') return trip;

  const times = computeAlertTimes({
    nowMs: Date.now(),
    etaSeconds: progress.etaSeconds,
    avgSecondsPerStation: line.avgSecondsPerStation,
    alertNStationsBefore: trip.alertNStationsBefore,
  });

  const targets: Record<AlertKind, number> = {
    pre: times.preAlertAtMs,
    arrive: times.arriveAlertAtMs,
  };

  let next = trip;
  for (const kind of ['pre', 'arrive'] as AlertKind[]) {
    if (hasFired(next, kind)) continue;
    const existing = next.scheduled[kind];
    if (!shouldReschedule(existing?.atMs ?? null, targets[kind])) continue;

    await cancelNotifications([existing?.notificationId]);
    const { title, body } = alertContent(next, kind, progress.stationsLeft);
    const notificationId = await scheduleTripNotification({
      title,
      body,
      atMs: targets[kind],
      payload: { tripId: next.id, kind },
    });

    next = {
      ...next,
      scheduled: { ...next.scheduled, [kind]: { notificationId, atMs: targets[kind] } },
      // 예약 시점이 이미 지나 즉시 표시된 경우 발화한 것으로 기록합니다.
      firedKinds: notificationId === null ? [...next.firedKinds, kind] : next.firedKinds,
    };
  }
  return next;
}

/** 하차역 좌표가 있을 때만 지오펜스를 겁니다. 좌표가 없으면 ETA 알림만 씁니다. */
export async function syncGeofence(trip: Trip): Promise<Trip> {
  if (!trip.useGps || trip.status !== 'active') return trip;

  const destination = findStationRefOnLine(trip.lineId, trip.destinationStationName);
  const { lat, lng } = destination?.station ?? {};
  if (lat == null || lng == null) return { ...trip, geofenceActive: false };

  const targets: GeofenceTarget[] = [{ kind: 'arrive', lat, lng }];
  const started = await startTripGeofence(trip.id, targets);
  return { ...trip, geofenceActive: started };
}

/** ETA 경로와 GPS 경로 중 먼저 도달한 쪽이 알림을 소비하고 나머지를 취소합니다. */
export async function markFired(trip: Trip, kind: AlertKind): Promise<Trip> {
  if (hasFired(trip, kind)) return trip;
  await cancelNotifications([trip.scheduled[kind]?.notificationId]);
  const { [kind]: _removed, ...restScheduled } = trip.scheduled;
  return { ...trip, firedKinds: [...trip.firedKinds, kind], scheduled: restScheduled };
}

export async function finishTrip(trip: Trip, status: 'completed' | 'cancelled'): Promise<Trip> {
  await cancelNotifications(Object.values(trip.scheduled).map((s) => s?.notificationId));
  if (trip.geofenceActive) await stopTripGeofence();
  return { ...trip, status, scheduled: {}, geofenceActive: false };
}
