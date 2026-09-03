import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { env } from '@/config/env';
import { getSubwayApi } from '@/services/subway';
import type { Arrival, DataSourceKind } from '@/services/subway/types';

export interface FavoritePreview {
  /** 가장 빨리 오는 열차. 정보가 없으면 null. */
  soonest: Arrival | null;
  source: DataSourceKind;
  fetchedAt: number;
}

/** 한 번에 미리보기를 받을 즐겨찾기 수 상한 — 호출 한도를 지키기 위한 값입니다. */
const MAX_PREVIEWS = 3;

/**
 * 즐겨찾기 칩에 얹을 "N분" 미리보기.
 * 홈 탭이 포커스된 동안만 60초 주기로 폴링하고, 탭을 벗어나면 즉시 멈춥니다.
 */
export function useFavoriteArrivals(stationNames: string[]) {
  const [previews, setPreviews] = useState<Record<string, FavoritePreview>>({});
  const key = stationNames.slice(0, MAX_PREVIEWS).join('|');

  useFocusEffect(
    useCallback(() => {
      const names = key ? key.split('|') : [];
      if (names.length === 0 || !getSubwayApi().capabilities.arrivals) return;
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const tick = async () => {
        const results = await Promise.all(
          names.map(async (name) => {
            try {
              const result = await getSubwayApi().getArrivals(name);
              const soonest = result.arrivals
                .filter((a) => a.secondsUntilArrival !== null)
                .sort((a, b) => a.secondsUntilArrival! - b.secondsUntilArrival!)[0] ?? null;
              return [name, { soonest, source: result.source, fetchedAt: result.fetchedAt }] as const;
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        setPreviews((prev) => {
          const next = { ...prev };
          for (const entry of results) if (entry) next[entry[0]] = entry[1];
          return next;
        });
        if (!cancelled) timer = setTimeout(tick, env.favoritesPollIntervalMs);
      };
      void tick();

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }, [key]),
  );

  return previews;
}
