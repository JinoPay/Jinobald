import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSavedRouteList, newSavedRoute, type SavedRoute, type SavedRouteInput } from '@/services/routes/saved';
import { readJson, StorageKeys, writeJson } from '@/services/storage/persist';

/** 집·회사 같은 라벨. null 은 일반 즐겨찾기. */
export type FavoriteLabel = 'home' | 'work' | null;

export interface FavoriteStation {
  /** 정규화 역명 (UniqueStation.key). */
  key: string;
  label: FavoriteLabel;
  addedAt: number;
}

export interface RecentSearch {
  originKey: string;
  destinationKey: string | null;
  at: number;
}

/** 끝난 여정 요약. 홈의 "자주 가는 경로"에 씁니다. 키는 정규화 역명(UniqueStation.key)입니다. */
export interface TripHistoryEntry {
  originKey: string;
  destinationKey: string;
  totalSeconds: number;
  transferCount: number;
  at: number;
}

const MAX_RECENTS = 10;
const MAX_HISTORY = 50;

interface UserDataContextValue {
  favorites: FavoriteStation[];
  recents: RecentSearch[];
  history: TripHistoryEntry[];
  savedRoutes: SavedRoute[];
  ready: boolean;
  isFavorite: (key: string) => boolean;
  toggleFavorite: (key: string) => void;
  /** 집/회사 라벨 지정. 같은 라벨을 가진 다른 역은 라벨을 잃습니다. */
  setFavoriteLabel: (key: string, label: FavoriteLabel) => void;
  removeFavorite: (key: string) => void;
  pushRecent: (search: Omit<RecentSearch, 'at'>) => void;
  clearRecents: () => void;
  pushHistory: (entry: Omit<TripHistoryEntry, 'at'>) => void;
  saveRoute: (input: SavedRouteInput) => SavedRoute;
  updateSavedRoute: (id: string, patch: Partial<Omit<SavedRoute, 'id'>>) => void;
  removeSavedRoute: (id: string) => void;
  /** 이 경로로 여정을 시작했을 때. 사용 횟수·시각을 올려 같은 쌍의 저장 경로 중 우선순위를 정합니다. */
  touchSavedRoute: (id: string) => void;
}

const UserDataContext = createContext<UserDataContextValue>({
  favorites: [],
  recents: [],
  history: [],
  savedRoutes: [],
  ready: false,
  isFavorite: () => false,
  toggleFavorite: () => {},
  setFavoriteLabel: () => {},
  removeFavorite: () => {},
  pushRecent: () => {},
  clearRecents: () => {},
  pushHistory: () => {},
  saveRoute: () => {
    throw new Error('UserDataProvider 가 없습니다.');
  },
  updateSavedRoute: () => {},
  removeSavedRoute: () => {},
  touchSavedRoute: () => {},
});

function isFavoriteList(value: unknown): value is FavoriteStation[] {
  return Array.isArray(value) && value.every((v) => v && typeof v.key === 'string');
}

function isRecentList(value: unknown): value is RecentSearch[] {
  return Array.isArray(value) && value.every((v) => v && typeof v.originKey === 'string');
}

function isHistoryList(value: unknown): value is TripHistoryEntry[] {
  return Array.isArray(value) && value.every((v) => v && typeof v.originKey === 'string' && typeof v.destinationKey === 'string');
}

/**
 * 즐겨찾기·최근 검색·여정 이력·저장 경로. 전부 기기 로컬(AsyncStorage)에만 있습니다.
 * 저장은 항상 낙관적으로 — 화면을 먼저 바꾸고 뒤에서 씁니다.
 */
export function UserDataProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [history, setHistory] = useState<TripHistoryEntry[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([
      readJson<unknown>(StorageKeys.favoriteStations, []),
      readJson<unknown>(StorageKeys.recentStations, []),
      readJson<unknown>(StorageKeys.tripHistory, []),
      readJson<unknown>(StorageKeys.savedRoutes, []),
    ]).then(([f, r, h, s]) => {
      if (isFavoriteList(f)) setFavorites(f);
      if (isRecentList(r)) setRecents(r);
      if (isHistoryList(h)) setHistory(h);
      if (isSavedRouteList(s)) setSavedRoutes(s);
      setReady(true);
    });
  }, []);

  const saveFavorites = useCallback((next: FavoriteStation[]) => {
    setFavorites(next);
    void writeJson(StorageKeys.favoriteStations, next);
  }, []);

  const isFavorite = useCallback((key: string) => favorites.some((f) => f.key === key), [favorites]);

  const toggleFavorite = useCallback(
    (key: string) => {
      const exists = favorites.some((f) => f.key === key);
      saveFavorites(
        exists ? favorites.filter((f) => f.key !== key) : [...favorites, { key, label: null, addedAt: Date.now() }],
      );
    },
    [favorites, saveFavorites],
  );

  const setFavoriteLabel = useCallback(
    (key: string, label: FavoriteLabel) => {
      // 순서를 유지합니다 — 라벨을 붙였다고 목록 끝으로 옮기지 않습니다.
      const existing = favorites.find((f) => f.key === key);
      const next = favorites.map((f) => {
        if (f.key === key) return { ...f, label };
        return label && f.label === label ? { ...f, label: null } : f;
      });
      saveFavorites(existing ? next : [...next, { key, label, addedAt: Date.now() }]);
    },
    [favorites, saveFavorites],
  );

  const removeFavorite = useCallback(
    (key: string) => saveFavorites(favorites.filter((f) => f.key !== key)),
    [favorites, saveFavorites],
  );

  const pushRecent = useCallback((search: Omit<RecentSearch, 'at'>) => {
    setRecents((prev) => {
      const next = [
        { ...search, at: Date.now() },
        ...prev.filter(
          (r) => !(r.originKey === search.originKey && r.destinationKey === search.destinationKey),
        ),
      ].slice(0, MAX_RECENTS);
      void writeJson(StorageKeys.recentStations, next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    void writeJson(StorageKeys.recentStations, []);
  }, []);

  const pushHistory = useCallback((entry: Omit<TripHistoryEntry, 'at'>) => {
    setHistory((prev) => {
      const next = [{ ...entry, at: Date.now() }, ...prev].slice(0, MAX_HISTORY);
      void writeJson(StorageKeys.tripHistory, next);
      return next;
    });
  }, []);

  const writeSavedRoutes = useCallback((updater: (prev: SavedRoute[]) => SavedRoute[]) => {
    setSavedRoutes((prev) => {
      const next = updater(prev);
      void writeJson(StorageKeys.savedRoutes, next);
      return next;
    });
  }, []);

  const saveRoute = useCallback(
    (input: SavedRouteInput) => {
      const created = newSavedRoute(input);
      writeSavedRoutes((prev) => [created, ...prev]);
      return created;
    },
    [writeSavedRoutes],
  );

  const updateSavedRoute = useCallback(
    (id: string, patch: Partial<Omit<SavedRoute, 'id'>>) =>
      writeSavedRoutes((prev) => prev.map((route) => (route.id === id ? { ...route, ...patch } : route))),
    [writeSavedRoutes],
  );

  const removeSavedRoute = useCallback(
    (id: string) => writeSavedRoutes((prev) => prev.filter((route) => route.id !== id)),
    [writeSavedRoutes],
  );

  const touchSavedRoute = useCallback(
    (id: string) =>
      writeSavedRoutes((prev) =>
        prev.map((route) =>
          route.id === id ? { ...route, useCount: route.useCount + 1, lastUsedAt: Date.now() } : route,
        ),
      ),
    [writeSavedRoutes],
  );

  const value = useMemo(
    () => ({
      favorites,
      recents,
      history,
      savedRoutes,
      ready,
      isFavorite,
      toggleFavorite,
      setFavoriteLabel,
      removeFavorite,
      pushRecent,
      clearRecents,
      pushHistory,
      saveRoute,
      updateSavedRoute,
      removeSavedRoute,
      touchSavedRoute,
    }),
    [
      favorites,
      recents,
      history,
      savedRoutes,
      ready,
      isFavorite,
      toggleFavorite,
      setFavoriteLabel,
      removeFavorite,
      pushRecent,
      clearRecents,
      pushHistory,
      saveRoute,
      updateSavedRoute,
      removeSavedRoute,
      touchSavedRoute,
    ],
  );

  return <UserDataContext value={value}>{children}</UserDataContext>;
}

export function useUserData(): UserDataContextValue {
  return use(UserDataContext);
}
