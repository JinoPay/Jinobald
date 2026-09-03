import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

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

/** 끝난 여정 요약. 홈의 "자주 가는 경로"에 씁니다. */
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
  ready: boolean;
  isFavorite: (key: string) => boolean;
  toggleFavorite: (key: string) => void;
  /** 집/회사 라벨 지정. 같은 라벨을 가진 다른 역은 라벨을 잃습니다. */
  setFavoriteLabel: (key: string, label: FavoriteLabel) => void;
  removeFavorite: (key: string) => void;
  pushRecent: (search: Omit<RecentSearch, 'at'>) => void;
  clearRecents: () => void;
  pushHistory: (entry: Omit<TripHistoryEntry, 'at'>) => void;
}

const UserDataContext = createContext<UserDataContextValue>({
  favorites: [],
  recents: [],
  history: [],
  ready: false,
  isFavorite: () => false,
  toggleFavorite: () => {},
  setFavoriteLabel: () => {},
  removeFavorite: () => {},
  pushRecent: () => {},
  clearRecents: () => {},
  pushHistory: () => {},
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
 * 즐겨찾기·최근 검색·여정 이력. 전부 기기 로컬(AsyncStorage)에만 있습니다.
 * 저장은 항상 낙관적으로 — 화면을 먼저 바꾸고 뒤에서 씁니다.
 */
export function UserDataProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [history, setHistory] = useState<TripHistoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([
      readJson<unknown>(StorageKeys.favoriteStations, []),
      readJson<unknown>(StorageKeys.recentStations, []),
      readJson<unknown>(StorageKeys.tripHistory, []),
    ]).then(([f, r, h]) => {
      if (isFavoriteList(f)) setFavorites(f);
      if (isRecentList(r)) setRecents(r);
      if (isHistoryList(h)) setHistory(h);
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
      const without = favorites
        .filter((f) => f.key !== key)
        .map((f) => (label && f.label === label ? { ...f, label: null } : f));
      const existing = favorites.find((f) => f.key === key);
      saveFavorites([...without, { key, label, addedAt: existing?.addedAt ?? Date.now() }]);
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

  const value = useMemo(
    () => ({
      favorites,
      recents,
      history,
      ready,
      isFavorite,
      toggleFavorite,
      setFavoriteLabel,
      removeFavorite,
      pushRecent,
      clearRecents,
      pushHistory,
    }),
    [favorites, recents, history, ready, isFavorite, toggleFavorite, setFavoriteLabel, removeFavorite, pushRecent, clearRecents, pushHistory],
  );

  return <UserDataContext value={value}>{children}</UserDataContext>;
}

export function useUserData(): UserDataContextValue {
  return use(UserDataContext);
}
