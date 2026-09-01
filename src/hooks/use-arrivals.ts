import { useCallback, useEffect, useRef, useState } from 'react';

import { env } from '@/config/env';
import { getSubwayApi } from '@/services/subway';
import { SubwayApiError, type ArrivalsResult } from '@/services/subway/types';

interface State {
  data: ArrivalsResult | null;
  error: SubwayApiError | null;
  loading: boolean;
}

/**
 * 도착정보 폴링.
 *
 * 일일 호출 한도를 고려해 화면이 활성일 때만 돌고, 다음 열차가 멀면 주기를 늦춥니다.
 * 매 요청은 AbortController 로 취소 가능해서 화면을 빠르게 오가도 요청이 쌓이지 않습니다.
 */
export function useArrivals(stationName: string | null, active = true) {
  const [state, setState] = useState<State>({ data: null, error: null, loading: false });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!stationName) return null;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, loading: true }));
    try {
      const data = await getSubwayApi().getArrivals(stationName, { signal: controller.signal });
      if (controller.signal.aborted) return null;
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (controller.signal.aborted) return null;
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof SubwayApiError
            ? error
            : new SubwayApiError('unknown', (error as Error).message),
      }));
      return null;
    }
  }, [stationName]);

  useEffect(() => {
    if (!stationName || !active) return;
    let cancelled = false;

    const loop = async () => {
      const result = await fetchOnce();
      if (cancelled) return;
      const soonest = result?.arrivals.reduce<number | null>((min, a) => {
        if (a.secondsUntilArrival == null) return min;
        return min === null ? a.secondsUntilArrival : Math.min(min, a.secondsUntilArrival);
      }, null) ?? null;
      const delay =
        soonest !== null && soonest > env.nearArrivalSeconds
          ? env.slowPollIntervalMs
          : env.pollIntervalMs;
      timerRef.current = setTimeout(loop, delay);
    };

    void loop();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [stationName, active, fetchOnce]);

  return { ...state, refresh: fetchOnce };
}
