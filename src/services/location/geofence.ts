import * as Location from 'expo-location';

import { capabilities } from './capabilities';
import { GEOFENCE_TASK, geofenceIdentifier } from './geofence-task';

import type { AlertKind } from '@/services/notifications/schedule';

/** 지오펜스 반경(m). 지하 구간에서는 GPS 가 잡히지 않으므로 넉넉하게 둡니다. */
const RADIUS_BY_KIND: Record<AlertKind, number> = { pre: 500, arrive: 300 };

export interface GeofenceTarget {
  kind: AlertKind;
  lat: number;
  lng: number;
}

export interface LocationPermissionState {
  foreground: boolean;
  background: boolean;
}

export async function getLocationPermission(): Promise<LocationPermissionState> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return { foreground: false, background: false };
  const background = await Location.getBackgroundPermissionsAsync();
  return { foreground: true, background: background.status === 'granted' };
}

/** 백그라운드 권한은 포그라운드 권한이 먼저 허용되어야 요청할 수 있습니다. */
export async function requestLocationPermission(): Promise<LocationPermissionState> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return { foreground: false, background: false };
  if (!capabilities.backgroundGeofencing) return { foreground: true, background: false };
  const background = await Location.requestBackgroundPermissionsAsync();
  return { foreground: true, background: background.status === 'granted' };
}

/**
 * 지오펜스를 시작합니다.
 * Expo Go 에서 호출하면 예외가 나므로 capabilities 로 먼저 걸러 냅니다.
 * 시작하지 못한 경우 false 를 돌려주며, 호출자는 ETA 알림만으로 계속 진행합니다.
 */
export async function startTripGeofence(
  tripId: string,
  targets: GeofenceTarget[],
): Promise<boolean> {
  if (!capabilities.backgroundGeofencing || targets.length === 0) return false;

  const permission = await getLocationPermission();
  if (!permission.background) return false;

  const regions: Location.LocationRegion[] = targets.map((target) => ({
    identifier: geofenceIdentifier(tripId, target.kind),
    latitude: target.lat,
    longitude: target.lng,
    radius: RADIUS_BY_KIND[target.kind],
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  try {
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
    return true;
  } catch {
    return false;
  }
}

export async function stopTripGeofence(): Promise<void> {
  try {
    if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
  } catch {
    // 이미 멈춰 있거나 지원되지 않는 환경 — 무시합니다.
  }
}
