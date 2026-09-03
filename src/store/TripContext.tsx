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

import { env } from '@/config/env';
import { getLine } from '@/data/stations';
import { haversineMeters } from '@/services/alerts/eta';
import {
  advanceLeg,
  computeProgress,
  finishTrip,
  legAlertContent,
  markFired,
  syncAlerts,
  syncGeofence,
  type TripProgress,
} from '@/services/alerts/TripAlertManager';
import { migrateStoredTrip } from '@/services/alerts/trip-migrate';
import {
  createTrip,
  currentLeg,
  currentLegIndex,
  legAlertKinds,
  type Trip,
  type TripDraft,
} from '@/services/alerts/trip';
import { capabilities, isForeground } from '@/services/location/capabilities';
import { alertKey, isAlertKind } from '@/services/notifications/kinds';
import { presentTripNotification } from '@/services/notifications/schedule';
import { isPlanValid } from '@/services/routing';
import { readJson, remove, StorageKeys, writeJson } from '@/services/storage/persist';
import { getSubwayApi } from '@/services/subway';
import type { Arrival, TrainPosition } from '@/services/subway/types';
import { useUserData } from '@/store/UserDataContext';

interface TripContextValue {
  trip: Trip | null;
  progress: TripProgress | null;
  ready: boolean;
  start: (draft: TripDraft) => Promise<Trip>;
  cancel: () => Promise<void>;
  complete: () => Promise<void>;
  setBoarded: (boarded: boolean) => void;
  /** 다음 구간으로 넘어갑니다 (환승 완료). 마지막 구간이면 아무 일도 하지 않습니다. */
  advance: () => Promise<void>;
  /** 포그라운드 위치 보정. 좌표를 알고 있는 목표역에 근접하면 즉시 알립니다. */
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
  advance: async () => {},
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
  // 승차 버튼을 누르는 순간 "지금 들어오는 열차"를 알아야 하므로 최신 진행 상황도 ref 로 둡니다.
  const progressRef = useRef<TripProgress | null>(null);
  const { pushHistory } = useUserData();

  const updateProgress = useCallback((next: TripProgress | null) => {
    progressRef.current = next;
    setProgress(next);
  }, []);

  const recordHistory = useCallback(
    (finished: Trip) => {
      const first = finished.plan.legs[0];
      const last = finished.plan.legs[finished.plan.legs.length - 1];
      pushHistory({
        originKey: first.boardStationName,
        destinationKey: last.alightStationName,
        totalSeconds: finished.plan.totalSeconds,
        transferCount: finished.plan.transferCount,
      });
    },
    [pushHistory],
  );

  const persist = useCallback((next: Trip | null) => {
    tripRef.current = next;
    setTrip(next);
    if (next && next.status === 'active') void writeJson(StorageKeys.activeTrip, next);
    else void remove(StorageKeys.activeTrip);
  }, []);

  // 앱이 종료됐다 다시 켜져도 진행 중인 여정은 복구되어야 합니다.
  //
  // 저장된 값은 그대로 믿지 않습니다. 이전 버전의 스키마일 수도 있고, 그사이
  // 노선 데이터가 바뀌어 경로가 더 이상 맞지 않을 수도 있습니다. 올릴 수 없으면
  // 지웁니다 — 낡은 값 하나로 화면이 죽는 것보다 낫습니다.
  useEffect(() => {
    void readJson<unknown>(StorageKeys.activeTrip, null).then((stored) => {
      const migrated = migrateStoredTrip(stored);
      if (migrated?.status === 'active') {
        tripRef.current = migrated;
        setTrip(migrated);
      } else if (stored != null) {
        void remove(StorageKeys.activeTrip);
      }
      setReady(true);
    });
  }, []);

  const start = useCallback(
    async (draft: TripDraft) => {
      // 경로가 지금의 데이터셋과 맞는지 여기서 한 번에 확인합니다. 미루면 뒤쪽 구간의
      // 오류가 여정 중반에야 드러나고, 그때는 진행 계산이 조용히 멈추기만 합니다.
      if (!isPlanValid(draft.plan)) throw new Error('경로가 현재 노선 데이터와 맞지 않습니다.');
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
    updateProgress(null);
  }, [persist, updateProgress]);

  const complete = useCallback(async () => {
    const current = tripRef.current;
    if (!current) return;
    await finishTrip(current, 'completed');
    recordHistory(current);
    persist(null);
    updateProgress(null);
  }, [persist, recordHistory, updateProgress]);

  const setBoarded = useCallback(
    (boarded: boolean) => {
      const current = tripRef.current;
      if (!current) return;
      // 승차 시각이 승차 후 진행 계산의 기준점입니다. 열차번호는 지금 들어오는 열차의 것을
      // 기록해 두고, 열차 위치 API 가 있으면 이 번호로 사용자의 열차를 따라갑니다.
      const trainNo = boarded ? (progressRef.current?.matchedArrival?.trainNo ?? null) : null;
      persist({ ...current, boarded, boardedAt: boarded ? Date.now() : null, boardedTrainNo: trainNo });
    },
    [persist],
  );

  const advance = useCallback(async () => {
    const current = tripRef.current;
    if (!current || current.status !== 'active') return;
    const next = await advanceLeg(current);
    if (next !== current) {
      persist(next);
      updateProgress(null);
    }
  }, [persist, updateProgress]);

  const reportPosition = useCallback(
    (position: { lat: number; lng: number }) => {
      const current = tripRef.current;
      if (!current || current.status !== 'active' || !current.useGps) return;

      const legIndex = currentLegIndex(current);
      const kind = legAlertKinds(current)[1];
      const key = alertKey(legIndex, kind);
      if (current.firedKeys.includes(key)) return;

      const leg = currentLeg(current);
      const { lat, lng } = getLine(leg.lineId)?.stations[leg.alightIndex] ?? {};
      if (lat == null || lng == null) return;
      if (haversineMeters(position, { lat, lng }) > ARRIVE_RADIUS_METERS) return;

      void (async () => {
        const { title, body } = legAlertContent(current, legIndex, kind, 0, null);
        await presentTripNotification(title, body, { tripId: current.id, legIndex, kind });
        // 알림 수신 리스너가 이어받아 여정을 종료하거나 다음 구간으로 넘깁니다.
        persist(await markFired(current, key));
      })();
    },
    [persist],
  );

  // 활성 여정이 있는 동안 진행 상황을 갱신하고 알림 시각을 다시 계산합니다.
  //
  // 승차 전에는 승차역 도착정보를, 승차 후에는 (구현이 지원하면) 노선 열차 위치를 씁니다.
  // 하차역 도착정보는 승차 후에 쓰지 않습니다 — 그 열차는 사용자의 열차가 아니라
  // 뒤따라오는 다른 열차입니다. 열차 위치를 못 받으면 경과 시간으로 계산합니다.
  //
  // 백그라운드에서는 JS 가 멈춰 이 루프도 멈추지만, 이미 OS 에 예약된 알림은
  // 그대로 발화합니다.
  useEffect(() => {
    if (!trip || trip.status !== 'active') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let positions: TrainPosition[] = [];
    let positionsAt = 0;

    const tick = async () => {
      const current = tripRef.current;
      if (cancelled || !current || current.status !== 'active') return;
      const api = getSubwayApi();
      const foreground = isForeground();

      let arrivals: Arrival[] = [];
      if (!current.boarded && foreground) {
        try {
          const result = await api.getArrivals(currentLeg(current).boardStationName);
          arrivals = result.arrivals;
        } catch {
          // 폴링 실패는 무시합니다. 이미 예약된 알림이 안전망 역할을 합니다.
        }
      }

      const wantsPositions =
        current.boarded && current.boardedTrainNo !== null && api.capabilities.trainPositions && foreground;
      if (wantsPositions && Date.now() - positionsAt >= env.positionsPollIntervalMs) {
        try {
          const result = await api.getTrainPositions(currentLeg(current).lineId);
          positions = result?.positions ?? [];
          positionsAt = Date.now();
        } catch {
          // 위치를 못 받으면 마지막 값을 잠시 쓰고, 오래되면 경과 시간 계산으로 내려갑니다.
          if (Date.now() - positionsAt > env.positionsPollIntervalMs * 3) positions = [];
        }
      }

      if (!cancelled) {
        const next = computeProgress(current, arrivals, current.boarded ? positions : []);
        if (next) {
          updateProgress(next);
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
  }, [trip, persist, updateProgress]);

  // 알림이 실제로 발화하면 중복 방지를 위해 기록하고, 도착 알림이면 여정을 종료합니다.
  useEffect(() => {
    // 알림을 예약할 수 없는 환경(웹)에서는 발화할 알림도 없으므로 구독하지 않습니다.
    if (!capabilities.localNotifications) return;
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as
        | { tripId?: string; legIndex?: number; kind?: unknown }
        | undefined;
      const current = tripRef.current;
      if (!current || !data || data.tripId !== current.id) return;
      if (!isAlertKind(data.kind)) return;
      // 지난 구간의 늦은 알림이 지금 구간의 진행을 건드리면 안 됩니다.
      const legIndex = currentLegIndex(current);
      if (data.legIndex !== legIndex) return;

      const kind = data.kind;
      void (async () => {
        const marked = await markFired(current, alertKey(legIndex, kind));
        if (kind === 'arrive') {
          await finishTrip(marked, 'completed');
          recordHistory(marked);
          persist(null);
          updateProgress(null);
        } else if (kind === 'transfer') {
          // 환승역 도착 = 이 구간의 끝. 다음 구간의 승차 대기로 넘어갑니다.
          persist(await advanceLeg(marked));
          updateProgress(null);
        } else {
          // 예비·승차 알림은 기록만 합니다.
          persist(marked);
        }
      })();
    });
    return () => subscription.remove();
  }, [persist, recordHistory, updateProgress]);

  const value = useMemo(
    () => ({ trip, progress, ready, start, cancel, complete, setBoarded, advance, reportPosition }),
    [trip, progress, ready, start, cancel, complete, setBoarded, advance, reportPosition],
  );

  return <TripContext value={value}>{children}</TripContext>;
}

export function useTrip(): TripContextValue {
  return use(TripContext);
}
