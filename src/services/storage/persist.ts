import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'jinobald:';

/**
 * AsyncStorage 의 얇은 타입 래퍼.
 * 저장된 값이 깨져 있어도 앱이 죽지 않도록 읽기는 항상 fallback 을 돌려줍니다.
 */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 저장 실패는 치명적이지 않습니다. 다음 변경 때 다시 시도됩니다.
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // 무시
  }
}

export const StorageKeys = {
  activeTrip: 'active-trip',
  tripHistory: 'trip-history',
  recentStations: 'recent-stations',
  favoriteStations: 'favorite-stations',
  settings: 'settings',
} as const;
