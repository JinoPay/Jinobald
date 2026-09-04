/**
 * 여정 상태 전이 — 순수 함수만 둡니다 (런타임 import: kinds, trip 뿐).
 *
 * 알림 취소·지오펜스 같은 부수효과는 하지 않고, 대신 "취소해야 할 알림 ID" 를 돌려줍니다.
 * `TripAlertManager` 와 백그라운드 지오펜스 태스크가 같은 전이를 써야 하는데, 지오펜스
 * 태스크는 앱이 죽어 있을 때 저장소만 보고 동작하므로 React 상태에 기대면 안 됩니다.
 */
import { alertKey, type AlertKey } from '@/services/notifications/kinds';

import { currentLegIndex, hasFired, legAlertKinds, type Trip } from './trip';

export interface StateChange {
  trip: Trip;
  /** OS 에서 취소(예약 해제·트레이에서 제거)해야 할 알림 식별자. */
  cancelIds: string[];
}

function unchanged(trip: Trip): StateChange {
  return { trip, cancelIds: [] };
}

/**
 * 알림 하나를 "발화함"으로 소비합니다. 이미 소비됐으면 아무 일도 하지 않습니다 —
 * ETA 경로·지오펜스·알림 탭이 같은 알림을 두 번 처리해도 안전해야 합니다.
 */
export function consumeAlert(trip: Trip, key: AlertKey): StateChange {
  if (hasFired(trip, key)) return unchanged(trip);
  const { [key]: existing, ...restScheduled } = trip.scheduled;
  return {
    trip: { ...trip, firedKeys: [...trip.firedKeys, key], scheduled: restScheduled },
    cancelIds: existing?.notificationId ? [existing.notificationId] : [],
  };
}

/** 이 구간의 예약·발화 기록을 전부 지웁니다. */
function dropLegAlerts(trip: Trip, legIndex: number): StateChange {
  const prefix = `${legIndex}:`;
  const cancelIds: string[] = [];
  const scheduled = { ...trip.scheduled };
  for (const [key, value] of Object.entries(scheduled)) {
    if (!key.startsWith(prefix)) continue;
    if (value?.notificationId) cancelIds.push(value.notificationId);
    delete scheduled[key as AlertKey];
  }
  return {
    trip: { ...trip, scheduled, firedKeys: trip.firedKeys.filter((key) => !key.startsWith(prefix)) },
    cancelIds,
  };
}

/**
 * 승차 취소.
 *
 * 승차 상태만 되돌리면 안 됩니다. 이 구간에서 이미 발화한 알림(승차 알림, 짧은 구간의
 * 예비 알림)이 `firedKeys` 에 남아 있으면 다시는 예약되지 않아, 제대로 탄 열차에서
 * 아무 알림도 받지 못합니다. 그래서 구간의 발화 기록까지 지웁니다.
 */
export function clearLegState(trip: Trip, legIndex: number): StateChange {
  const dropped = dropLegAlerts(trip, legIndex);
  return {
    ...dropped,
    trip: { ...dropped.trip, boarded: false, boardedAt: null, boardedTrainNo: null, boardedBy: null },
  };
}

/**
 * 다음 구간으로 넘어갑니다. 마지막 구간이면 그대로입니다.
 *
 * 지난 구간의 예약을 거두는 것이 중요합니다 — 빼먹으면 이전 구간의 예비 알림이 다음
 * 구간을 타는 도중에 발화합니다. 승차 상태도 되돌립니다: "승차 전에만 실시간 도착정보를
 * 쓴다"는 규칙이 그대로 다음 구간의 승차 대기에 다시 적용되기 때문입니다.
 */
export function advanceLegState(trip: Trip): StateChange {
  const index = currentLegIndex(trip);
  if (index >= trip.plan.legs.length - 1) return unchanged(trip);
  const dropped = dropLegAlerts(trip, index);
  return {
    ...dropped,
    trip: {
      ...dropped.trip,
      currentLegIndex: index + 1,
      boarded: false,
      boardedAt: null,
      boardedTrainNo: null,
      boardedBy: null,
    },
  };
}

export type ReconcileOutcome = 'none' | 'completed' | 'advanced';

/**
 * OS 가 이미 발화한 알림을 여정 상태에 반영합니다.
 *
 * 앱이 죽어 있는 동안 발화한 알림은 수신 리스너가 받지 못합니다. 그래서 여정을 복구할 때와
 * 매 폴링마다 "예약 시각이 지났는데 발화 기록이 없는" 알림을 발화한 것으로 소비하고,
 * 그 결과 이 구간의 도착 알림이 발화했으면 여정을 끝내고 환승 알림이면 다음 구간으로 넘깁니다.
 * 이걸 빼먹으면 도착한 지 한참 지난 여정이 영원히 "진행 중"으로 남고, 다시 켰을 때
 * 늦은 "도착" 알림이 한 번 더 뜹니다.
 */
export function reconcileElapsed(
  trip: Trip,
  nowMs: number,
): StateChange & { outcome: ReconcileOutcome } {
  if (trip.status !== 'active') return { ...unchanged(trip), outcome: 'none' };

  const legIndex = currentLegIndex(trip);
  let current = trip;
  const cancelIds: string[] = [];
  for (const [rawKey, value] of Object.entries(current.scheduled)) {
    const key = rawKey as AlertKey;
    if (!key.startsWith(`${legIndex}:`) || !value) continue;
    if (value.atMs > nowMs) continue;
    const change = consumeAlert(current, key);
    current = change.trip;
    cancelIds.push(...change.cancelIds);
  }

  const [, endKind] = legAlertKinds(current, legIndex);
  if (hasFired(current, alertKey(legIndex, endKind))) {
    if (endKind === 'arrive') {
      return {
        trip: { ...current, status: 'completed', scheduled: {} },
        cancelIds: [...cancelIds, ...scheduledIds(current)],
        outcome: 'completed',
      };
    }
    const advanced = advanceLegState(current);
    return { trip: advanced.trip, cancelIds: [...cancelIds, ...advanced.cancelIds], outcome: 'advanced' };
  }

  return { trip: current, cancelIds, outcome: 'none' };
}

export function scheduledIds(trip: Trip): string[] {
  return Object.values(trip.scheduled)
    .map((value) => value?.notificationId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}
