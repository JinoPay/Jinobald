import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { legAlertContent } from '@/services/alerts/TripAlertManager';
import { effectiveStationsBefore } from '@/services/alerts/eta';
import { migrateStoredTrip } from '@/services/alerts/trip-migrate';
import { consumeAlert } from '@/services/alerts/trip-state';
import { currentLeg, currentLegIndex, hasFired } from '@/services/alerts/trip';
import { alertKey } from '@/services/notifications/kinds';
import { cancelNotifications, presentTripNotification } from '@/services/notifications/schedule';
import { readJson, StorageKeys, writeJson } from '@/services/storage/persist';

import { GEOFENCE_TASK, parseGeofenceIdentifier } from './geofence-ids';

export { GEOFENCE_TASK, geofenceIdentifier } from './geofence-ids';

/**
 * 백그라운드 지오펜스 태스크.
 *
 * 모듈 최상위에서 정의해야 하며 루트 레이아웃에서 import 됩니다. 지오펜스 이벤트로
 * 앱이 콜드 스타트될 때도 이 등록이 먼저 일어나야 하기 때문입니다.
 *
 * 앱이 죽어 있을 때도 돌 수 있으므로 React 상태가 아니라 **저장소의 여정**을 봅니다.
 * ETA 알림과 같은 문구를 쓰고, 발화를 저장소에 기록해 예약된 ETA 알림을 거둡니다 —
 * 그래야 두 경로가 같은 사건에 다른 문구로 두 번 울리지 않습니다.
 */
TaskManager.defineTask<{
  eventType: Location.LocationGeofencingEventType;
  region: Location.LocationRegion;
}>(GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data) return;
  if (data.eventType !== Location.LocationGeofencingEventType.Enter) return;

  const parsed = parseGeofenceIdentifier(data.region.identifier ?? '');
  if (!parsed) return;

  const trip = migrateStoredTrip(await readJson<unknown>(StorageKeys.activeTrip, null));
  if (!trip || trip.status !== 'active' || trip.id !== parsed.tripId) return;
  const legIndex = currentLegIndex(trip);
  if (legIndex !== parsed.legIndex) return;
  const key = alertKey(legIndex, parsed.kind);
  if (hasFired(trip, key)) return;

  const leg = currentLeg(trip);
  const { title, body } = legAlertContent(
    trip,
    legIndex,
    parsed.kind,
    effectiveStationsBefore(trip.alertNStationsBefore, leg.stationCount),
  );
  await presentTripNotification(title, body, { tripId: trip.id, legIndex, kind: parsed.kind });

  const change = consumeAlert(trip, key);
  await cancelNotifications(change.cancelIds);
  await writeJson(StorageKeys.activeTrip, change.trip);
});
