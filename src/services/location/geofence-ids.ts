/**
 * 지오펜스 식별자 — 순수 모듈입니다.
 *
 * `geofence.ts`(등록)와 `geofence-task.ts`(발화 처리)가 둘 다 쓰는데, 태스크 쪽은
 * 알림 문구를 만들려고 `TripAlertManager` 를 끌고 오고 그쪽은 다시 `geofence.ts` 를
 * 씁니다. 식별자를 따로 두어 순환 import 를 끊습니다.
 */
import type { AlertKind } from '@/services/notifications/kinds';

export const GEOFENCE_TASK = 'jinobald-trip-geofence';

/**
 * 지오펜스 식별자 형식: `${tripId}:${legIndex}:${kind}`
 *
 * 구간 번호가 있어야 지난 구간에 걸어 둔 지오펜스가 늦게 발화해도 구분할 수 있습니다.
 */
export function geofenceIdentifier(tripId: string, legIndex: number, kind: AlertKind): string {
  return `${tripId}:${legIndex}:${kind}`;
}

const IDENTIFIER_PATTERN = /^(.+):(\d+):(pre|arrive|transfer-pre|transfer)$/;

export function parseGeofenceIdentifier(
  identifier: string,
): { tripId: string; legIndex: number; kind: AlertKind } | null {
  const matched = IDENTIFIER_PATTERN.exec(identifier);
  if (!matched) return null;
  return { tripId: matched[1], legIndex: Number(matched[2]), kind: matched[3] as AlertKind };
}
