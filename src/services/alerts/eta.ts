/**
 * 도착 예정 시각 계산 — 순수 함수만 둡니다.
 *
 * 이 파일은 런타임 import 가 하나도 없습니다(타입 import 는 컴파일 시 지워짐).
 * 덕분에 기기나 번들러 없이 `node --experimental-strip-types` 로 바로 돌려
 * 검증할 수 있고, 알림 로직에서 가장 틀리기 쉬운 부분을 눈으로 확인할 수 있습니다.
 */

export interface AlertTimes {
  /** "N정거장 전" 알림 시각(ms). */
  preAlertAtMs: number;
  /** "곧 하차" 알림 시각(ms). */
  arriveAlertAtMs: number;
}

/** 하차역 도착 60초 전을 도착 알림으로, 그보다 N정거장 앞을 예비 알림으로 잡습니다. */
export const ARRIVE_LEAD_SECONDS = 60;

/** 탈 열차 도착 60초 전에 승차 알림을 보냅니다. */
export const BOARD_LEAD_SECONDS = 60;

export function computeAlertTimes(params: {
  nowMs: number;
  etaSeconds: number;
  /** 예비 알림을 도착 몇 초 전에 보낼지 — 보통 "N정거장 전"에 해당하는 운행 초의 합. */
  preAlertLeadSeconds: number;
}): AlertTimes {
  const { nowMs, etaSeconds, preAlertLeadSeconds } = params;
  const arriveAtMs = nowMs + Math.max(0, etaSeconds - ARRIVE_LEAD_SECONDS) * 1000;
  const preAtMs = nowMs + Math.max(0, etaSeconds - preAlertLeadSeconds) * 1000;
  // 예비 알림이 도착 알림보다 뒤로 밀리면 의미가 없습니다.
  return { preAlertAtMs: Math.min(preAtMs, arriveAtMs), arriveAlertAtMs: arriveAtMs };
}

/** 승차 알림 시각. 열차가 이미 승강장에 있거나 60초 안에 오면 지금입니다. */
export function computeBoardAlertTime(params: { nowMs: number; secondsUntilTrain: number }): number {
  return params.nowMs + Math.max(0, params.secondsUntilTrain - BOARD_LEAD_SECONDS) * 1000;
}

/** 진행 순서대로 늘어놓은 구간 초에서 "뒤에서 n 구간"의 합 = N정거장 전 알림의 리드 타임. */
export function trailingSegmentsSeconds(segments: number[], n: number): number {
  return segments.slice(Math.max(0, segments.length - n)).reduce((sum, s) => sum + s, 0);
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

/** "32분", "1시간 5분" — 경로 카드처럼 분 단위로 보여 줄 때 씁니다. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60));
  if (total < 60) return `${total}분`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
