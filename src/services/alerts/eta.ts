/**
 * 도착 예정 시각 계산 — 순수 함수만 둡니다.
 *
 * 이 파일은 런타임 import 가 하나도 없습니다(타입 import 는 컴파일 시 지워짐).
 * 덕분에 기기나 번들러 없이 `node --experimental-strip-types` 로 바로 돌려
 * 검증할 수 있고, 알림 로직에서 가장 틀리기 쉬운 부분을 눈으로 확인할 수 있습니다.
 */

/** 열차가 지금 어디 있는지에 따라 남은 정거장 수를 셉니다. */
export function stationsRemaining(params: {
  fromIndex: number;
  toIndex: number;
  totalStations: number;
  loop: boolean;
}): number {
  const { fromIndex, toIndex, totalStations, loop } = params;
  if (!loop) return Math.abs(toIndex - fromIndex);
  const forward = (toIndex - fromIndex + totalStations) % totalStations;
  return Math.min(forward, totalStations - forward);
}

export interface AlertTimes {
  /** "N정거장 전" 알림 시각(ms). */
  preAlertAtMs: number;
  /** "곧 하차" 알림 시각(ms). */
  arriveAlertAtMs: number;
}

/** 하차역 도착 60초 전을 도착 알림으로, 그보다 N정거장 앞을 예비 알림으로 잡습니다. */
export const ARRIVE_LEAD_SECONDS = 60;

export function computeAlertTimes(params: {
  nowMs: number;
  etaSeconds: number;
  avgSecondsPerStation: number;
  alertNStationsBefore: number;
}): AlertTimes {
  const { nowMs, etaSeconds, avgSecondsPerStation, alertNStationsBefore } = params;
  const arriveAtMs = nowMs + Math.max(0, etaSeconds - ARRIVE_LEAD_SECONDS) * 1000;
  const preAtMs = nowMs + Math.max(0, etaSeconds - alertNStationsBefore * avgSecondsPerStation) * 1000;
  // 예비 알림이 도착 알림보다 뒤로 밀리면 의미가 없습니다.
  return { preAlertAtMs: Math.min(preAtMs, arriveAtMs), arriveAlertAtMs: arriveAtMs };
}

/**
 * 재예약 임계값.
 *
 * 폴링마다 알림을 취소하고 다시 잡으면 Android 에서 알림이 누락되거나 중복되는
 * 일이 있습니다. 목표 시각이 이 값보다 크게 움직일 때만 다시 잡습니다.
 */
export const RESCHEDULE_THRESHOLD_MS = 30_000;

export function shouldReschedule(previousMs: number | null, nextMs: number): boolean {
  if (previousMs === null) return true;
  return Math.abs(previousMs - nextMs) > RESCHEDULE_THRESHOLD_MS;
}

/** 두 지점 사이 거리(m). GPS 보정에서 씁니다. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
