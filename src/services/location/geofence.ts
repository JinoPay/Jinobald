import * as Location from 'expo-location';

import { capabilities } from './capabilities';
import { GEOFENCE_TASK, geofenceIdentifier } from './geofence-ids';

import type { AlertKind } from '@/services/notifications/kinds';

/** 지오펜스 반경(m). 지하 구간에서는 GPS 가 잡히지 않으므로 넉넉하게 둡니다. */
const RADIUS_BY_KIND: Record<AlertKind, number> = {
  /** 승차 알림은 도착정보로만 잡습니다 — 지오펜스를 걸지 않습니다. */
  board: 0,
  pre: 500,
  arrive: 300,
  'transfer-pre': 500,
  transfer: 300,
};

export interface GeofenceTarget {
  kind: AlertKind;
  /** 어느 구간의 목표인지. 식별자에 담겨 발화 때 되돌아옵니다. */
  legIndex: number;
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
 *
 * `startGeofencingAsync` 는 태스크의 region 을 통째로 **교체**합니다. 구간이 넘어갈
 * 때는 그냥 다시 부르면 되고, iOS 의 앱당 20개 제한 때문에 한 번에 몇 개만 겁니다.
 */
export async function startTripGeofence(
  tripId: string,
  targets: GeofenceTarget[],
): Promise<boolean> {
  if (!capabilities.backgroundGeofencing || targets.length === 0) return false;

  const permission = await getLocationPermission();
  if (!permission.background) return false;

  const regions: Location.LocationRegion[] = targets.map((target) => ({
    identifier: geofenceIdentifier(tripId, target.legIndex, target.kind),
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

/** 지오펜스가 실제로 걸려 있는지. 재부팅 뒤 Android 는 조용히 사라지므로 복구 시 확인합니다. */
export async function isTripGeofenceActive(): Promise<boolean> {
  if (!capabilities.backgroundGeofencing) return false;
  try {
    return await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
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
