import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { env } from '@/config/env';
import { isForeground } from '@/services/location/capabilities';
import { getSubwayApi } from '@/services/subway';
import { SubwayApiError, type TrainPositionsResult } from '@/services/subway/types';

interface State {
  data: TrainPositionsResult | null;
  error: SubwayApiError | null;
  loading: boolean;
  /** 현재 구현이 이 노선의 열차 위치를 제공하는지. false 면 폴링하지 않습니다. */
  supported: boolean;
}

/**
 * 노선 열차 위치 폴링. 화면이 활성이고 앱이 포그라운드일 때만 돕니다.
 * 백엔드 캐시 TTL 과 같은 30초 주기라 더 자주 물어도 새 값이 없습니다.
 */
export function useTrainPositions(lineId: string | null, active = true) {
  const supported = lineId !== null && getSubwayApi().capabilities.trainPositions;
  const [state, setState] = useState<State>({ data: null, error: null, loading: false, supported });
  const abortRef = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!lineId || !supported) return null;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState((prev) => ({ ...prev, loading: true, supported }));
    try {
      const data = await getSubwayApi().getTrainPositions(lineId, { signal: controller.signal });
      if (controller.signal.aborted) return null;
      setState({ data, error: null, loading: false, supported: data !== null });
      return data;
    } catch (error) {
      if (controller.signal.aborted) return null;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof SubwayApiError ? error : new SubwayApiError('unknown', (error as Error).message),
      }));
      return null;
    }
  }, [lineId, supported]);

  useEffect(() => {
    if (!lineId || !active || !supported) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loop = async () => {
      if (cancelled) return;
      if (isForeground()) await fetchOnce();
      if (!cancelled) timer = setTimeout(loop, env.positionsPollIntervalMs);
    };
    void loop();

    // 백그라운드에서 돌아오면 바로 한 번 갱신합니다.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !cancelled) void fetchOnce();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      abortRef.current?.abort();
      subscription.remove();
    };
  }, [lineId, active, supported, fetchOnce]);

  return { ...state, refresh: fetchOnce };
}
