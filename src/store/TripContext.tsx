import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
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
import { getLine, normalizeStationName } from '@/data/stations';
import { suggestBoarding, type BoardSuggestion } from '@/services/alerts/auto-board';
import { haversineMeters } from '@/services/alerts/eta';
import { detectWrongDirection, matchArrival } from '@/services/alerts/progress';
import {
  advanceLeg,
  computeProgress,
  finishTrip,
  legAlertContent,
  markFired,
  reconcileTrip,
  syncAlerts,
  syncGeofence,
  unboardLeg,
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
import { isTripGeofenceActive } from '@/services/location/geofence';
import { alertKey, isAlertKind } from '@/services/notifications/kinds';
import { interpretResponse } from '@/services/notifications/response';
import { presentTripNotification } from '@/services/notifications/schedule';
import { isPlanValid } from '@/services/routing';
import { readJson, remove, StorageKeys, writeJson } from '@/services/storage/persist';
import { getSubwayApi } from '@/services/subway';
import { isAtStation } from '@/services/subway/status';
import type { Arrival, TrainPosition } from '@/services/subway/types';
import { useUserData } from '@/store/UserDataContext';

export interface BoardMeta {
  by?: 'manual' | 'auto';
  /** 승차한 열차번호. 생략하면 지금 승강장의 열차에서 가져옵니다. */
  trainNo?: string | null;
  /** 승차 시각. 생략하면 지금입니다. */
  atMs?: number;
}

interface TripContextValue {
  trip: Trip | null;
  progress: TripProgress | null;
  ready: boolean;
  /** "방금 떠난 열차에 타셨나요?" — 자동 감지가 확신하지 못할 때의 제안. */
  boardSuggestion: BoardSuggestion | null;
  start: (draft: TripDraft) => Promise<Trip>;
  cancel: () => Promise<void>;
  complete: () => Promise<void>;
  setBoarded: (boarded: boolean, meta?: BoardMeta) => void;
  dismissBoardSuggestion: () => void;
  /** 다음 구간으로 넘어갑니다 (환승 완료). 마지막 구간이면 아무 일도 하지 않습니다. */
  advance: () => Promise<void>;
  /** 포그라운드 위치 보정. 좌표를 알고 있는 목표역에 근접하면 즉시 알립니다. */
  reportPosition: (position: { lat: number; lng: number }) => void;
}

const TripContext = createContext<TripContextValue>({
  trip: null,
  progress: null,
  ready: false,
  boardSuggestion: null,
  start: async () => {
    throw new Error('TripProvider 가 없습니다.');
  },
  cancel: async () => {},
  complete: async () => {},
  setBoarded: () => {},
  dismissBoardSuggestion: () => {},
  advance: async () => {},
  reportPosition: () => {},
});

/** 포그라운드 GPS 보정이 하차 알림을 띄우는 거리(m). */
const ARRIVE_RADIUS_METERS = 400;

/** 승차 후에는 네트워크 없이 경과 시간만 다시 계산하므로 자주 돌아도 부담이 없습니다. */
const LOCAL_TICK_MS = 5_000;

/** 열차 위치가 이만큼 연속으로 반대 방향이면 잘못 탄 것으로 봅니다. 한 번은 응답 오류일 수 있습니다. */
const WRONG_DIRECTION_STREAK = 2;

/** 승차 버튼을 눌렀을 때 승강장의 열차를 "탄 열차"로 기록할 수 있는 도착 여유(초). */
const BOARDABLE_SECONDS = 90;

export function TripProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [progress, setProgress] = useState<TripProgress | null>(null);
  const [ready, setReady] = useState(false);
  const [boardSuggestion, setBoardSuggestion] = useState<BoardSuggestion | null>(null);
  const tripRef = useRef<Trip | null>(null);
  // 승차 버튼을 누르는 순간 "지금 들어오는 열차"를 알아야 하므로 최신 진행 상황도 ref 로 둡니다.
  const progressRef = useRef<TripProgress | null>(null);
  // 자동 승차 감지: 직전 폴링에서 승강장에 있던 열차와, 이미 물어본 열차.
  const platformTrainRef = useRef<{ arrival: Arrival; seenAtMs: number } | null>(null);
  const askedTrainRef = useRef<string | null>(null);
  const wrongDirectionStreakRef = useRef(0);
  const handledResponsesRef = useRef(new Set<string>());
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
        // 이력 키는 UniqueStation.key 와 같은 정규화 이름입니다. 계통별 표기(총신대입구(이수))를 그대로 넣으면 조회가 어긋납니다.
        originKey: normalizeStationName(first.boardStationName),
        destinationKey: normalizeStationName(last.alightStationName),
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

  const resetDetectors = useCallback(() => {
    platformTrainRef.current = null;
    askedTrainRef.current = null;
    wrongDirectionStreakRef.current = 0;
    setBoardSuggestion(null);
  }, []);

  /** 여정 종료 공통 처리. */
  const settle = useCallback(
    async (current: Trip, status: 'completed' | 'cancelled') => {
      const finished = await finishTrip(current, status);
      if (status === 'completed') recordHistory(finished);
      persist(null);
      updateProgress(null);
      resetDetectors();
    },
    [persist, recordHistory, resetDetectors, updateProgress],
  );

  // 앱이 종료됐다 다시 켜져도 진행 중인 여정은 복구되어야 합니다.
  //
  // 저장된 값은 그대로 믿지 않습니다. 이전 버전의 스키마일 수도 있고, 그사이
  // 노선 데이터가 바뀌어 경로가 더 이상 맞지 않을 수도 있습니다. 올릴 수 없으면
  // 지웁니다 — 낡은 값 하나로 화면이 죽는 것보다 낫습니다.
  //
  // 복구한 여정은 죽어 있는 동안 OS 가 발화한 알림을 먼저 반영하고(도착했으면 종료),
  // 지오펜스는 다시 겁니다 — 재부팅 뒤 Android 는 region 을 조용히 잃습니다.
  useEffect(() => {
    void (async () => {
      const stored = await readJson<unknown>(StorageKeys.activeTrip, null);
      const migrated = migrateStoredTrip(stored);
      if (migrated?.status === 'active') {
        const { trip: reconciled, outcome } = await reconcileTrip(migrated);
        if (outcome === 'completed') {
          await settle(reconciled, 'completed');
        } else {
          const armed = reconciled.useGps ? await syncGeofence(reconciled) : reconciled;
          persist(armed);
        }
      } else if (stored != null) {
        void remove(StorageKeys.activeTrip);
      }
      setReady(true);
    })();
    // settle/persist 는 안정적인 콜백입니다. 마운트 시 한 번만 복구합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 앱이 다시 활성화될 때 지오펜스가 살아 있는지 확인합니다.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const current = tripRef.current;
      if (!current || current.status !== 'active' || !current.useGps) return;
      void isTripGeofenceActive().then(async (active) => {
        if (active || !current.geofenceActive) return;
        if (tripRef.current !== current) return;
        persist(await syncGeofence(current));
      });
    });
    return () => subscription.remove();
  }, [persist]);

  const start = useCallback(
    async (draft: TripDraft) => {
      // 경로가 지금의 데이터셋과 맞는지 여기서 한 번에 확인합니다. 미루면 뒤쪽 구간의
      // 오류가 여정 중반에야 드러나고, 그때는 진행 계산이 조용히 멈추기만 합니다.
      if (!isPlanValid(draft.plan)) throw new Error('경로가 현재 노선 데이터와 맞지 않습니다.');
      const created = createTrip(draft);
      const withGeofence = await syncGeofence(created);
      // 첫 폴링을 기다리지 않고 정적 추정으로 안전망 알림을 바로 겁니다.
      // 시작 직후 앱이 죽어도 하차 알림은 남습니다.
      const line = getLine(currentLeg(withGeofence).lineId);
      const armed = line ? await syncAlerts(withGeofence, computeProgress(withGeofence, line, [])) : withGeofence;
      resetDetectors();
      persist(armed);
      return armed;
    },
    [persist, resetDetectors],
  );

  const cancel = useCallback(async () => {
    const current = tripRef.current;
    if (!current) return;
    await settle(current, 'cancelled');
  }, [settle]);

  const complete = useCallback(async () => {
    const current = tripRef.current;
    if (!current) return;
    await settle(current, 'completed');
  }, [settle]);

  const setBoarded = useCallback(
    (boarded: boolean, meta: BoardMeta = {}) => {
      const current = tripRef.current;
      if (!current) return;
      setBoardSuggestion(null);
      wrongDirectionStreakRef.current = 0;
      if (!boarded) {
        // 승차 취소는 이 구간의 발화 기록까지 지워야 알림이 다시 잡힙니다.
        void unboardLeg(current).then((next) => {
          if (tripRef.current === current) persist(next);
        });
        return;
      }
      // 승차 시각이 승차 후 진행 계산의 기준점입니다. 열차번호는 **지금 승강장에 있거나 곧 오는**
      // 열차의 것만 기록합니다 — 5분 뒤 열차의 번호를 적어 두면 위치 추적이 엉뚱한 열차를 따라갑니다.
      const matched = progressRef.current?.matchedArrival ?? null;
      const boardable =
        matched != null &&
        (isAtStation(matched.status) ||
          (progressRef.current?.secondsToTrain != null && progressRef.current.secondsToTrain <= BOARDABLE_SECONDS));
      const trainNo = meta.trainNo !== undefined ? meta.trainNo : boardable ? matched?.trainNo ?? null : null;
      persist({
        ...current,
        boarded: true,
        boardedAt: meta.atMs ?? Date.now(),
        boardedTrainNo: trainNo,
        boardedBy: meta.by ?? 'manual',
      });
    },
    [persist],
  );

  const dismissBoardSuggestion = useCallback(() => setBoardSuggestion(null), []);

  const advance = useCallback(async () => {
    const current = tripRef.current;
    if (!current || current.status !== 'active') return;
    const next = await advanceLeg(current);
    if (next !== current) {
      resetDetectors();
      persist(next);
      updateProgress(null);
    }
  }, [persist, resetDetectors, updateProgress]);

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

  // 폴링 루프를 다시 시작해야 하는 변화만 키로 뽑습니다. 알림 재예약 때문에 trip 객체가
  // 바뀔 때마다 루프를 재시작하면 매번 즉시 네트워크를 한 번 더 부르고 위치 폴링 간격이 무너집니다.
  const tripKey = trip && trip.status === 'active'
    ? `${trip.id}:${trip.currentLegIndex}:${trip.boarded}`
    : null;

  // 활성 여정이 있는 동안 진행 상황을 갱신하고 알림 시각을 다시 계산합니다.
  //
  // 승차 전에는 승차역 도착정보를, 승차 후에는 (구현이 지원하면) 노선 열차 위치를 씁니다.
  // 하차역 도착정보는 승차 후에 쓰지 않습니다 — 그 열차는 사용자의 열차가 아니라
  // 뒤따라오는 다른 열차입니다. 열차 위치를 못 받으면 경과 시간으로 계산합니다.
  //
  // iOS 는 백그라운드에서 JS 가 멈춰 이 루프도 멈추지만, Android 는 계속 돕니다. 그래서
  // 승차 전 백그라운드에서는 아무것도 계산하지 않습니다 — 도착정보 없이 계산하면 정적
  // 추정이 되고, 그 값으로 알림을 옮기면 승강장에서 기다리는 동안 알람이 계속 미뤄집니다.
  // 이미 OS 에 예약된 알림은 그대로 발화합니다.
  useEffect(() => {
    if (!tripKey) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let positions: TrainPosition[] = [];
    let positionsAt = 0;

    const schedule = (delay: number) => {
      if (!cancelled) timer = setTimeout(tick, delay);
    };

    const tick = async () => {
      const current = tripRef.current;
      if (cancelled || !current || current.status !== 'active') return;

      // 1. OS 가 이미 발화한 알림 반영 (도착 알림이 지났으면 여정 종료).
      const { trip: reconciled, outcome } = await reconcileTrip(current);
      if (cancelled) return;
      if (outcome === 'completed') {
        await settle(reconciled, 'completed');
        return;
      }
      let working = reconciled;
      if (working !== current) {
        persist(working);
        if (outcome === 'advanced') {
          updateProgress(null);
          return; // tripKey 가 바뀌어 새 루프가 시작됩니다.
        }
      }

      const foreground = isForeground();
      if (!working.boarded && !foreground) {
        schedule(env.pollIntervalMs);
        return;
      }

      const api = getSubwayApi();
      const leg = currentLeg(working);
      const line = getLine(leg.lineId);
      if (!line) {
        schedule(env.pollIntervalMs);
        return;
      }
      const now = Date.now();

      let arrivals: Arrival[] = [];
      if (!working.boarded) {
        try {
          const result = await api.getArrivals(leg.boardStationName);
          arrivals = result.arrivals;
        } catch {
          // 폴링 실패는 무시합니다. 이미 예약된 알림이 안전망 역할을 합니다.
        }
      }

      // 열차 위치: 승차 후에는 탄 열차를 따라가려고, 승차 전에는 방금 승강장에 있던
      // 열차가 떠났는지 확인하려고(자동 승차 감지) 받습니다.
      const platformTrain = platformTrainRef.current;
      const wantsPositions =
        foreground &&
        api.capabilities.trainPositions &&
        ((working.boarded && working.boardedTrainNo !== null) ||
          (!working.boarded && platformTrain !== null && now - platformTrain.seenAtMs < 5 * 60_000));
      if (wantsPositions && now - positionsAt >= env.positionsPollIntervalMs) {
        try {
          const result = await api.getTrainPositions(leg.lineId);
          positions = result?.positions ?? [];
          positionsAt = Date.now();
        } catch {
          // 위치를 못 받으면 마지막 값을 잠시 쓰고, 오래되면 경과 시간 계산으로 내려갑니다.
          if (Date.now() - positionsAt > env.positionsPollIntervalMs * 3) positions = [];
        }
      }
      if (cancelled) return;

      // 2. 진행 계산.
      const latest = tripRef.current ?? working;
      if (latest.status !== 'active') return;
      const next = computeProgress(latest, line, arrivals, latest.boarded ? positions : []);

      // 3. 잘못 탄 열차 감지 (승차 후, 열차 위치가 있을 때만).
      if (latest.boarded && positions.length > 0) {
        const wrong = detectWrongDirection(positions, latest.boardedTrainNo, line, leg);
        wrongDirectionStreakRef.current = wrong ? wrongDirectionStreakRef.current + 1 : 0;
        if (wrongDirectionStreakRef.current >= WRONG_DIRECTION_STREAK) next.warning = 'wrong-direction';
      }

      // 4. 자동 승차 감지 (승차 전).
      if (!latest.boarded) {
        const suggestion = suggestBoarding({
          previous: platformTrain?.arrival ?? null,
          previousSeenAtMs: platformTrain?.seenAtMs ?? 0,
          arrivals,
          positions,
          leg,
          line,
          nowMs: now,
        });
        const matched = matchArrival(arrivals, leg);
        if (matched && isAtStation(matched.status)) {
          platformTrainRef.current = { arrival: matched, seenAtMs: now };
        }
        if (suggestion) {
          const trainId = suggestion.trainNo ?? platformTrain?.arrival.id ?? null;
          if (suggestion.confidence === 'high') {
            setBoarded(true, { by: 'auto', trainNo: suggestion.trainNo, atMs: suggestion.departedAtMs });
            return; // tripKey 가 바뀌어 새 루프가 시작됩니다.
          }
          if (trainId !== askedTrainRef.current) {
            askedTrainRef.current = trainId;
            platformTrainRef.current = null;
            setBoardSuggestion(suggestion);
            void presentTripNotification(
              '방금 출발한 열차에 타셨나요?',
              `${leg.boardStationName}에 있던 열차가 출발했습니다. 타셨으면 알려 주세요 — 하차 알림 시각이 여기서 정해집니다.`,
              { tripId: latest.id, legIndex: currentLegIndex(latest), kind: 'board' },
            );
          }
        }
      }

      updateProgress(next);
      const synced = await syncAlerts(tripRef.current ?? latest, next);
      if (!cancelled && synced !== tripRef.current) persist(synced);

      schedule(latest.boarded ? LOCAL_TICK_MS : env.pollIntervalMs);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [tripKey, persist, setBoarded, settle, updateProgress]);

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
          await settle(marked, 'completed');
        } else if (kind === 'transfer') {
          // 환승역 도착 = 이 구간의 끝. 다음 구간의 승차 대기로 넘어갑니다.
          resetDetectors();
          persist(await advanceLeg(marked));
          updateProgress(null);
        } else {
          // 예비·승차 알림은 기록만 합니다.
          persist(marked);
        }
      })();
    });
    return () => subscription.remove();
  }, [persist, resetDetectors, settle, updateProgress]);

  // 알림을 탭하거나 버튼을 누른 경우. 앱이 죽어 있다가 알림으로 켜진 경우도 여기서 이어받습니다.
  useEffect(() => {
    if (!capabilities.localNotifications) return;

    const handle = (response: Notifications.NotificationResponse) => {
      const request = response.notification.request;
      const dedupeKey = `${request.identifier}|${response.actionIdentifier}|${response.notification.date}`;
      if (handledResponsesRef.current.has(dedupeKey)) return;
      handledResponsesRef.current.add(dedupeKey);

      const intent = interpretResponse(
        request.content.data,
        response.actionIdentifier,
        Notifications.DEFAULT_ACTION_IDENTIFIER,
      );
      if (!intent || intent.type !== 'trip') return;

      const current = tripRef.current;
      if (intent.action === 'open') {
        if (current) router.navigate('/alerts');
        return;
      }
      if (!current || current.id !== intent.tripId || currentLegIndex(current) !== intent.legIndex) return;

      void (async () => {
        switch (intent.action) {
          case 'ack': {
            const marked = await markFired(current, alertKey(intent.legIndex, intent.kind));
            if (intent.kind === 'arrive') await settle(marked, 'completed');
            else if (intent.kind === 'transfer') {
              resetDetectors();
              persist(await advanceLeg(marked));
              updateProgress(null);
            } else persist(marked);
            return;
          }
          case 'boarded': {
            const suggestion = boardSuggestion;
            setBoarded(true, suggestion ? { trainNo: suggestion.trainNo, atMs: suggestion.departedAtMs } : {});
            return;
          }
          case 'not-this-train':
            setBoardSuggestion(null);
            if (current.boarded) setBoarded(false);
            return;
          case 'advanced':
            await advance();
            return;
        }
      })();
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) handle(last);
    });
    return () => subscription.remove();
    // 콜백들은 안정적입니다. boardSuggestion 은 최신값이 필요해 의존성에 둡니다.
  }, [advance, boardSuggestion, persist, resetDetectors, setBoarded, settle, updateProgress]);

  const value = useMemo(
    () => ({
      trip,
      progress,
      ready,
      boardSuggestion,
      start,
      cancel,
      complete,
      setBoarded,
      dismissBoardSuggestion,
      advance,
      reportPosition,
    }),
    [trip, progress, ready, boardSuggestion, start, cancel, complete, setBoarded, dismissBoardSuggestion, advance, reportPosition],
  );

  return <TripContext value={value}>{children}</TripContext>;
}

export function useTrip(): TripContextValue {
  return use(TripContext);
}
