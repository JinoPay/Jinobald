import { directionLabel, getLine, type Line, type Station } from '@/data/stations';
import { capabilities } from '@/services/location/capabilities';
import {
  startTripGeofence,
  stopTripGeofence,
  type GeofenceTarget,
} from '@/services/location/geofence';
import { alertKey, type AlertKey, type AlertKind } from '@/services/notifications/kinds';
import { cancelNotifications, scheduleTripNotification } from '@/services/notifications/schedule';
import { rideSegmentsBetween } from '@/services/routing/graph';
import type { RouteLeg } from '@/services/routing/types';

import { computeAlertTimes, computeBoardAlertTime, shouldReschedule, trailingSegmentsSeconds } from './eta';
import type { TripProgress } from './progress';
import {
  alightDoorGuide,
  boardDoorGuide,
  currentLeg,
  currentLegIndex,
  hasFired,
  legAlertKinds,
  legAt,
  tripDestinationName,
  type Trip,
} from './trip';

export { computeProgress } from './progress';
export type { TripProgress } from './progress';

/** 알림 문구. 포그라운드 GPS 보정도 같은 문구를 써야 사용자가 헷갈리지 않습니다. */
export function legAlertContent(
  trip: Trip,
  legIndex: number,
  kind: AlertKind,
  stationsLeft: number,
  /** 승차 알림에 실을 열차 (도착정보의 첫 열차). */
  train?: { trainNo: string | null; terminalStationName: string } | null,
): { title: string; body: string } {
  const remaining = Math.max(1, stationsLeft);
  const leg = legAt(trip, legIndex);
  const line = leg ? getLine(leg.lineId) : undefined;

  if (kind === 'board') {
    const boardDoor = boardDoorGuide(trip, legIndex);
    const trainLabel = train
      ? `${train.terminalStationName ? `${train.terminalStationName}행 ` : ''}열차${train.trainNo ? ` (${train.trainNo})` : ''}`
      : '열차';
    const where = line && leg ? `${line.name} ${directionLabel(line, leg.direction)}` : '열차';
    return {
      title: `${leg?.boardStationName ?? '승차역'}에 ${trainLabel} 곧 도착`,
      body: `${where}에 승차하세요.${boardDoor ? `\n${boardDoor.label} 칸에 타면 ${boardDoor.note ?? '이동이 빠릅니다'}.` : ''}`,
    };
  }

  // 하차·환승 알림에는 빠른 칸을 덧붙입니다. 알림은 백그라운드에서 뜨므로 문구에 미리 들어 있어야 합니다.
  const alightDoor = alightDoorGuide(trip, legIndex);
  const doorHint = alightDoor
    ? `\n${alightDoor.label} 칸에서 내리면 ${alightDoor.purpose === 'exit' ? '출구' : '환승'}가 빠릅니다.`
    : '';

  if (kind === 'arrive') {
    return { title: `${tripDestinationName(trip)} 도착`, body: `하차 준비하세요.${doorHint}` };
  }
  if (kind === 'pre') {
    return {
      title: `곧 ${tripDestinationName(trip)}입니다`,
      body: `${remaining}정거장 남았습니다.${doorHint}`,
    };
  }

  const next = legAt(trip, legIndex + 1);
  const nextLine = next ? getLine(next.lineId) : undefined;
  const where = leg?.alightStationName ?? tripDestinationName(trip);
  // 같은 그룹의 계통 변경은 대개 같은 승강장에서 다음 열차를 타는 것입니다.
  // 이걸 "환승"이라고 하면 없는 이동을 안내하게 됩니다.
  const isSwitch = next?.transferIn?.kind === 'switch';
  const toward =
    nextLine && next ? `${nextLine.name} ${directionLabel(nextLine, next.direction)}` : '다음 열차';

  if (kind === 'transfer') {
    return isSwitch
      ? { title: `${where} 열차 갈아타기`, body: `같은 승강장에서 ${toward} 열차를 타세요.` }
      : { title: `${where} 환승`, body: `${toward}으로 갈아타세요.${doorHint}` };
  }
  return {
    title: `곧 ${where}입니다`,
    body: isSwitch
      ? `${remaining}정거장 뒤 ${toward} 열차로 갈아탑니다.`
      : `${remaining}정거장 뒤 ${toward}으로 환승합니다.${doorHint}`,
  };
}

/**
 * 진행 상황에 맞춰 알림을 다시 잡습니다.
 *
 * 폴링마다 무조건 취소·재예약하면 Android 에서 알림이 누락되거나 중복되므로,
 * 목표 시각이 임계값 이상 움직였을 때만 다시 잡습니다.
 *
 * **현재 구간의 알림만** 예약합니다. 다음 구간의 알림 시각은 실제 환승 소요와
 * 다음 열차 대기에 달려 있어 지금 알 수 없고, 미리 잡아 두면 아직 첫 구간을 타고
 * 있는데 세 번째 구간의 알림이 발화합니다.
 */
export async function syncAlerts(trip: Trip, progress: TripProgress): Promise<Trip> {
  const leg = currentLeg(trip);
  const line = getLine(leg.lineId);
  if (!line || trip.status !== 'active') return trip;
  // 알림을 못 쓰는 환경에서는 예약을 시도하지 않습니다. scheduleTripNotification 이
  // null 을 돌려주면 "이미 발화함"으로 기록되어 여정 상태가 잘못되기 때문입니다.
  if (!capabilities.localNotifications) return trip;

  const now = Date.now();
  // "N정거장 전"은 하차역 앞 N개 구간의 실측 초입니다. 구간 실측이 없으면 노선 평균과 같습니다.
  const segments = rideSegmentsBetween(line, leg.boardIndex, leg.alightIndex);
  const times = computeAlertTimes({
    nowMs: now,
    etaSeconds: progress.etaSeconds,
    preAlertLeadSeconds: trailingSegmentsSeconds(segments, trip.alertNStationsBefore),
  });

  const legIndex = currentLegIndex(trip);
  const [preKind, arriveKind] = legAlertKinds(trip);
  const targets: [AlertKind, number][] = [
    [preKind, times.preAlertAtMs],
    [arriveKind, times.arriveAlertAtMs],
  ];

  // 승차 알림: 아직 안 탔고 탈 열차의 도착 초를 아는 동안만. 승차하면 더 이상 잡지 않습니다.
  const train = progress.matchedArrival;
  if (!trip.boarded && train?.secondsUntilArrival != null) {
    targets.unshift(['board', computeBoardAlertTime({ nowMs: now, secondsUntilTrain: train.secondsUntilArrival })]);
  }

  let next = trip;
  for (const [kind, atMs] of targets) {
    const key = alertKey(legIndex, kind);
    if (hasFired(next, key)) continue;
    const existing = next.scheduled[key];
    if (!shouldReschedule(existing?.atMs ?? null, atMs)) continue;

    await cancelNotifications([existing?.notificationId]);
    const { title, body } = legAlertContent(next, legIndex, kind, progress.stationsLeft, train);
    const notificationId = await scheduleTripNotification({
      title,
      body,
      atMs,
      payload: { tripId: next.id, legIndex, kind },
    });

    next = {
      ...next,
      scheduled: { ...next.scheduled, [key]: { notificationId, atMs } },
      // 예약 시점이 이미 지나 즉시 표시된 경우 발화한 것으로 기록합니다.
      firedKeys: notificationId === null ? [...next.firedKeys, key] : next.firedKeys,
    };
  }
  return next;
}

/** 목표역에서 진행 방향 반대로 n 정거장 떨어진 역. 승차역을 넘어가면 없는 것으로 봅니다. */
function stationBeforeAlight(line: Line, leg: RouteLeg, n: number): Station | undefined {
  if (n < 1 || n >= leg.stationCount) return undefined;
  const total = line.stations.length;
  // 인덱스가 커지는 방향(하행·외선)이면 뒤로 가는 것은 인덱스를 줄이는 쪽입니다.
  const backward = leg.direction === 'up' || leg.direction === 'inner' ? 1 : -1;
  return line.stations[(((leg.alightIndex + backward * n) % total) + total) % total];
}

/**
 * 현재 구간의 지오펜스를 겁니다. 좌표를 모르는 역은 건너뛰고 ETA 알림만 씁니다.
 *
 * `startTripGeofence` 가 region 을 통째로 교체하므로 구간이 넘어갈 때마다 다시
 * 부르면 됩니다. iOS 의 앱당 20개 제한 때문에 한 구간에 2개까지만 겁니다.
 */
export async function syncGeofence(trip: Trip): Promise<Trip> {
  if (!trip.useGps || trip.status !== 'active') return trip;

  const leg = currentLeg(trip);
  const line = getLine(leg.lineId);
  if (!line) return clearGeofence(trip);

  const legIndex = currentLegIndex(trip);
  const [preKind, arriveKind] = legAlertKinds(trip);
  const targets: GeofenceTarget[] = [];

  for (const [kind, station] of [
    [arriveKind, line.stations[leg.alightIndex]],
    [preKind, stationBeforeAlight(line, leg, trip.alertNStationsBefore)],
  ] as const) {
    const { lat, lng } = station ?? {};
    if (lat == null || lng == null) continue;
    targets.push({ kind, legIndex, lat, lng });
  }

  if (targets.length === 0) return clearGeofence(trip);
  const started = await startTripGeofence(trip.id, targets);
  return { ...trip, geofenceActive: started };
}

/**
 * 걸어 둔 지오펜스를 거둡니다.
 *
 * 구간이 넘어갔는데 새 목표역의 좌표를 모르면 새로 걸 것이 없습니다. 그렇다고
 * 그냥 두면 이전 구간의 region 이 그대로 살아 있어 엉뚱한 곳에서 발화합니다.
 */
async function clearGeofence(trip: Trip): Promise<Trip> {
  if (trip.geofenceActive) await stopTripGeofence();
  return { ...trip, geofenceActive: false };
}

/** ETA 경로와 GPS 경로 중 먼저 도달한 쪽이 알림을 소비하고 나머지를 취소합니다. */
export async function markFired(trip: Trip, key: AlertKey): Promise<Trip> {
  if (hasFired(trip, key)) return trip;
  await cancelNotifications([trip.scheduled[key]?.notificationId]);
  const { [key]: _removed, ...restScheduled } = trip.scheduled;
  return { ...trip, firedKeys: [...trip.firedKeys, key], scheduled: restScheduled };
}

/**
 * 지난 구간에 걸어 둔 예약을 모두 거둡니다.
 *
 * 이걸 빼먹으면 이전 구간의 예비 알림이 다음 구간을 타는 도중에 발화합니다.
 */
export async function cancelLegAlerts(trip: Trip, legIndex: number): Promise<Trip> {
  const stale = Object.entries(trip.scheduled).filter(([key]) =>
    key.startsWith(`${legIndex}:`),
  ) as [AlertKey, { notificationId: string | null }][];
  if (stale.length === 0) return trip;

  await cancelNotifications(stale.map(([, value]) => value.notificationId));
  const scheduled = { ...trip.scheduled };
  for (const [key] of stale) delete scheduled[key];
  return { ...trip, scheduled };
}

/**
 * 다음 구간으로 넘어갑니다.
 *
 * 승차 상태를 되돌리는 것이 중요합니다. "승차 전에만 실시간 도착정보를 쓴다"는
 * 규칙이 그대로 다음 구간의 승차 대기에 다시 적용되기 때문입니다.
 */
export async function advanceLeg(trip: Trip): Promise<Trip> {
  const index = currentLegIndex(trip);
  if (index >= trip.plan.legs.length - 1) return trip;

  const cleaned = await cancelLegAlerts(trip, index);
  return syncGeofence({
    ...cleaned,
    currentLegIndex: index + 1,
    boarded: false,
    boardedAt: null,
    boardedTrainNo: null,
  });
}

export async function finishTrip(trip: Trip, status: 'completed' | 'cancelled'): Promise<Trip> {
  await cancelNotifications(Object.values(trip.scheduled).map((s) => s?.notificationId));
  if (trip.geofenceActive) await stopTripGeofence();
  return { ...trip, status, scheduled: {}, geofenceActive: false };
}
