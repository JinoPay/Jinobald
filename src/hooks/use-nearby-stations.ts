import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { UNIQUE_STATIONS, type UniqueStation } from '@/data/stations';
import { haversineMeters } from '@/services/alerts/eta';

export interface NearbyStation {
  station: UniqueStation;
  meters: number;
}

export type NearbyStatus = 'idle' | 'requesting' | 'denied' | 'unavailable' | 'ready';

const MAX_RESULTS = 3;
/** 이 거리 안에 역이 없으면 가장 가까운 역을 그대로 보여 줍니다. */
const NEAR_RADIUS_METERS = 1500;

/**
 * 내 주변 역. 위치 권한은 앱 시작이 아니라 사용자가 **눌렀을 때만** 묻습니다 —
 * 홈 화면을 처음 열자마자 권한 대화상자가 뜨면 거부율이 크게 올라갑니다.
 */
export function useNearbyStations() {
  const [status, setStatus] = useState<NearbyStatus>(Platform.OS === 'web' ? 'unavailable' : 'idle');
  const [stations, setStations] = useState<NearbyStation[]>([]);

  const locate = useCallback(async () => {
    if (Platform.OS === 'web') return;
    setStatus('requesting');
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (!permission.granted) {
        setStatus('denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const here = { lat: position.coords.latitude, lng: position.coords.longitude };
      const ranked = UNIQUE_STATIONS.filter((s) => s.lat != null && s.lng != null)
        .map((station) => ({ station, meters: haversineMeters(here, { lat: station.lat!, lng: station.lng! }) }))
        .sort((a, b) => a.meters - b.meters);
      const within = ranked.filter((s) => s.meters <= NEAR_RADIUS_METERS);
      setStations((within.length > 0 ? within : ranked).slice(0, MAX_RESULTS));
      setStatus('ready');
    } catch {
      setStatus('unavailable');
    }
  }, []);

  return { status, stations, locate };
}
