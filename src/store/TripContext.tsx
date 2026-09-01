import * as Notifications from 'expo-notifications';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { env } from '@/config/env';
import { findStationRefOnLine, getLine } from '@/data/stations';
import { haversineMeters } from '@/services/alerts/eta';
import {
  computeProgress,
  finishTrip,
  markFired,
  syncAlerts,
  syncGeofence,
  type TripProgress,
} from '@/services/alerts/TripAlertManager';
import { createTrip, type Trip, type TripDraft } from '@/services/alerts/trip';
import { presentTripNotification, type AlertKind } from '@/services/notifications/schedule';
import { readJson, remove, StorageKeys, writeJson } from '@/services/storage/persist';
import { getSubwayApi } from '@/services/subway';
import type { Arrival } from '@/services/subway/types';

interface TripContextValue {
  trip: Trip | null;
  progress: TripProgress | null;
  ready: boolean;
  start: (draft: TripDraft) => Promise<Trip>;
  cancel: () => Promise<void>;
  complete: () => Promise<void>;
  setBoarded: (boarded: boolean) => void;
  /** 포그라운드 위치 보정. 좌표를 알고 있는 하차역에 근접하면 즉시 알립니다. */
  reportPosition: (position: { lat: number; lng: number }) => void;
}

const TripContext = createContext<TripContextValue>({
  trip: null,
  progress: null,
  ready: false,
  start: async () => {
    throw new Error('TripProvider 가 없습니다.');
  },
  cancel: async () => {},
  complete: async () => {},
  setBoarded: () => {},
  reportPosition: () => {},
});

/** 포그라운드 GPS 보정이 하차 알림을 띄우는 거리(m). */
const ARRIVE_RADIUS_METERS = 400;

/** 승차 후에는 네트워크 없이 경과 시간만 다시 계산하므로 자주 돌아도 부담이 없습니다. */
const LOCAL_TICK_MS = 5_000;

export function TripProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [progress, setProgress] = useState<TripProgress | null>(null);
  const [ready, setReady] = useState(false);
  const tripRef = useRef<Trip | null>(null);

  const persist = useCallback((next: Trip | null) => {
    tripRef.current = next;
    setTrip(next);
    if (next && next.status === 'active') void writeJson(StorageKeys.activeTrip, next);
    else void remove(StorageKeys.activeTrip);
  }, []);

  // 앱이 종료됐다 다시 켜져도 진행 중인 여정은 복구되어야 합니다.
  useEffect(() => {
    void readJson<Trip | null>(StorageKeys.activeTrip, null).then((stored) => {
      if (stored && stored.status === 'active') {
        tripRef.current = stored;
        setTrip(stored);
      }
      setReady(true);
    });
  }, []);

  const start = useCallback(
    async (draft: TripDraft) => {
      const created = createTrip(draft);
      const withGeofence = await syncGeofence(created);
      persist(withGeofence);
      return withGeofence;
    },
    [persist],
  );

  const cancel = useCallback(async () => {
    const current = tripRef.current;
    if (!current) return;
    await finishTrip(current, 'cancelled');
    persist(null);
    setProgress(null);
  }, [persist]);

  const complete = useCallback(async () => {
    const current = tripRef.current;
    if (!current) return;
    await finishTrip(current, 'completed');
    persist(null);
    setProgress(null);
  }, [persist]);

  const setBoarded = useCallback(
    (boarded: boolean) => {
      const current = tripRef.current;
      if (!current) return;
      // 승차 시각이 승차 후 진행 계산의 기준점입니다.
      persist({ ...current, boarded, boardedAt: boarded ? Date.now() : null });
    },
    [persist],
  );

  const reportPosition = useCallback(
    (position: { lat: number; lng: number }) => {
      const current = tripRef.current;
      if (!current || current.status !== 'active' || !current.useGps) return;
      if (current.firedKinds.includes('arrive')) return;

      const destination = findStationRefOnLine(current.lineId, current.destinationStationName);
      const { lat, lng } = destination?.station ?? {};
      if (lat == null || lng == null) return;
      if (haversineMeters(position, { lat, lng }) > ARRIVE_RADIUS_METERS) return;

      void (async () => {
        await presentTripNotification(
          `${current.destinationStationName} 도착`,
          '하차 준비하세요.',
          { tripId: current.id, kind: 'arrive' },
        );
        const marked = await markFired(current, 'arrive');
        persist(marked);
      })();
    },
    [persist],
  );

  // 활성 여정이 있는 동안 진행 상황을 갱신하고 알림 시각을 다시 계산합니다.
  //
  // 승차 전에만 네트워크를 씁니다. 승차 후에는 하차역 도착정보가 사용자의 열차와
  // 무관하므로(뒤따라오는 다른 열차입니다) 경과 시간으로 계산하며, 덕분에 일일
  // 호출 한도도 크게 아낍니다.
  //
  // 백그라운드에서는 JS 가 멈춰 이 루프도 멈추지만, 이미 OS 에 예약된 알림은
  // 그대로 발화합니다.
  useEffect(() => {
    if (!trip || trip.status !== 'active') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const current = tripRef.current;
      if (cancelled || !current || current.status !== 'active') return;

      let arrivals: Arrival[] = [];
      if (!current.boarded && AppState.currentState === 'active') {
        try {
          const result = await getSubwayApi().getArrivals(current.originStationName);
          arrivals = result.arrivals;
        } catch {
          // 폴링 실패는 무시합니다. 이미 예약된 알림이 안전망 역할을 합니다.
        }
      }

      if (!cancelled) {
        const next = computeProgress(current, arrivals);
        if (next) {
          setProgress(next);
          const synced = await syncAlerts(tripRef.current ?? current, next);
          if (!cancelled && synced !== current) persist(synced);
        }
      }

      if (!cancelled) {
        timer = setTimeout(tick, current.boarded ? LOCAL_TICK_MS : env.pollIntervalMs);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [trip, persist]);

  // 알림이 실제로 발화하면 중복 방지를 위해 기록하고, 도착 알림이면 여정을 종료합니다.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as
        | { tripId?: string; kind?: AlertKind }
        | undefined;
      const current = tripRef.current;
      if (!data?.kind || !current || data.tripId !== current.id) return;
      void (async () => {
        const marked = await markFired(current, data.kind as AlertKind);
        if (data.kind === 'arrive') {
          const finished = await finishTrip(marked, 'completed');
          persist(null);
          setProgress(null);
          void finished;
        } else {
          persist(marked);
        }
      })();
    });
    return () => subscription.remove();
  }, [persist]);

  const value = useMemo(
    () => ({ trip, progress, ready, start, cancel, complete, setBoarded, reportPosition }),
    [trip, progress, ready, start, cancel, complete, setBoarded, reportPosition],
  );

  return <TripContext value={value}>{children}</TripContext>;
}

export function useTrip(): TripContextValue {
  return use(TripContext);
}

export function getLineName(lineId: string): string {
  return getLine(lineId)?.name ?? lineId;
}
