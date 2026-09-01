import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { presentTripNotification, type AlertKind } from '@/services/notifications/schedule';

export const GEOFENCE_TASK = 'jinobald-trip-geofence';

/** 지오펜스 식별자 형식: `${tripId}:${kind}` */
export function geofenceIdentifier(tripId: string, kind: AlertKind): string {
  return `${tripId}:${kind}`;
}

function parseIdentifier(identifier: string): { tripId: string; kind: AlertKind } | null {
  const separator = identifier.lastIndexOf(':');
  if (separator < 0) return null;
  const kind = identifier.slice(separator + 1);
  if (kind !== 'pre' && kind !== 'arrive') return null;
  return { tripId: identifier.slice(0, separator), kind };
}

/**
 * 백그라운드 지오펜스 태스크.
 *
 * 모듈 최상위에서 정의해야 하며 루트 레이아웃에서 import 됩니다. 지오펜스 이벤트로
 * 앱이 콜드 스타트될 때도 이 등록이 먼저 일어나야 하기 때문입니다.
 */
TaskManager.defineTask<{
  eventType: Location.LocationGeofencingEventType;
  region: Location.LocationRegion;
}>(GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data) return;
  if (data.eventType !== Location.LocationGeofencingEventType.Enter) return;

  const parsed = parseIdentifier(data.region.identifier ?? '');
  if (!parsed) return;

  const title = parsed.kind === 'arrive' ? '하차역 도착' : '하차 준비';
  const body =
    parsed.kind === 'arrive'
      ? '목적지에 도착했습니다. 내릴 준비를 하세요.'
      : '곧 하차역입니다.';

  await presentTripNotification(title, body, { tripId: parsed.tripId, kind: parsed.kind });
});
