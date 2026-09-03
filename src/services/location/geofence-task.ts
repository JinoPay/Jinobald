import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { type AlertKind } from '@/services/notifications/kinds';
import { presentTripNotification } from '@/services/notifications/schedule';

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

function parseIdentifier(
  identifier: string,
): { tripId: string; legIndex: number; kind: AlertKind } | null {
  const matched = IDENTIFIER_PATTERN.exec(identifier);
  if (!matched) return null;
  return { tripId: matched[1], legIndex: Number(matched[2]), kind: matched[3] as AlertKind };
}

const GEOFENCE_MESSAGE: Record<AlertKind, { title: string; body: string }> = {
  // 승차 알림은 지오펜스로 발화하지 않습니다 (Record 완전성을 위해 둡니다).
  board: { title: '승차', body: '열차가 곧 도착합니다.' },
  arrive: { title: '하차역 도착', body: '목적지에 도착했습니다. 내릴 준비를 하세요.' },
  pre: { title: '하차 준비', body: '곧 하차역입니다.' },
  transfer: { title: '환승역 도착', body: '내려서 갈아탈 준비를 하세요.' },
  'transfer-pre': { title: '환승 준비', body: '곧 환승역입니다.' },
};

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

  const { title, body } = GEOFENCE_MESSAGE[parsed.kind];
  await presentTripNotification(title, body, {
    tripId: parsed.tripId,
    legIndex: parsed.legIndex,
    kind: parsed.kind,
  });
});
