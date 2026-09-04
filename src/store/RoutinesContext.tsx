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
import { Alert, AppState } from 'react-native';

import { getUniqueStation } from '@/data/stations';
import { buildDoorGuides } from '@/services/alerts/door-guides';
import { capabilities } from '@/services/location/capabilities';
import { interpretResponse } from '@/services/notifications/response';
import { resolveSavedRoute } from '@/services/routes/saved';
import { cancelRoutineReminders, syncRoutineReminders } from '@/services/routines/reminders';
import { shouldArm, todayKey } from '@/services/routines/schedule';
import { isRoutineList, newRoutine, type CommuteRoutine, type CommuteRoutineInput } from '@/services/routines/types';
import { findRoutes, isPlanValid } from '@/services/routing';
import { readJson, StorageKeys, writeJson } from '@/services/storage/persist';
import { useSettings } from '@/store/SettingsContext';
import { useTrip } from '@/store/TripContext';
import { useUserData } from '@/store/UserDataContext';

interface RoutinesContextValue {
  routines: CommuteRoutine[];
  ready: boolean;
  /** 시작 창 안에 들어왔는데 자동 시작이 꺼진 루틴 — 홈에서 "시작할까요?" 를 묻습니다. */
  pendingRoutine: CommuteRoutine | null;
  upsertRoutine: (input: CommuteRoutineInput, id?: string) => Promise<CommuteRoutine>;
  removeRoutine: (id: string) => Promise<void>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  /** 저장 경로로 여정을 시작합니다. 진행 중인 여정이 있으면 묻습니다. */
  startRoutineTrip: (id: string, options?: { replaceActive?: boolean }) => Promise<void>;
  skipToday: (id: string) => void;
}

const RoutinesContext = createContext<RoutinesContextValue>({
  routines: [],
  ready: false,
  pendingRoutine: null,
  upsertRoutine: async () => {
    throw new Error('RoutinesProvider 가 없습니다.');
  },
  removeRoutine: async () => {},
  setEnabled: async () => {},
  startRoutineTrip: async () => {},
  skipToday: () => {},
});

/**
 * 출퇴근 루틴.
 *
 * TripProvider·UserDataProvider 안쪽에 있어야 합니다 — 여정 시작과 저장 경로가 필요합니다.
 * 리마인더는 OS 가 발화하고, 응답(탭·"여정 시작"·"오늘은 건너뛰기")은 여기서 받습니다.
 */
export function RoutinesProvider({ children }: { children: ReactNode }) {
  const [routines, setRoutines] = useState<CommuteRoutine[]>([]);
  const [ready, setReady] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const routinesRef = useRef<CommuteRoutine[]>([]);
  const handledResponsesRef = useRef(new Set<string>());
  const { savedRoutes, touchSavedRoute, ready: userDataReady } = useUserData();
  const { trip, ready: tripReady, start, cancel } = useTrip();
  const { settings } = useSettings();
  // 콜백들이 최신 저장 경로·여정을 보되 매번 다시 만들어지지 않도록 ref 로 둡니다.
  const savedRoutesRef = useRef(savedRoutes);
  const tripRef = useRef(trip);
  useEffect(() => {
    savedRoutesRef.current = savedRoutes;
  }, [savedRoutes]);
  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);
  // Alert 콜백 안에서 자기 자신을 다시 부르기 위한 ref.
  const startRef = useRef<(id: string, options?: { replaceActive?: boolean }) => Promise<void>>(async () => {});

  const persist = useCallback((next: CommuteRoutine[]) => {
    routinesRef.current = next;
    setRoutines(next);
    void writeJson(StorageKeys.routines, next);
  }, []);

  const labelsFor = useCallback((routine: CommuteRoutine) => {
    const saved = savedRoutesRef.current.find((route) => route.id === routine.savedRouteId);
    return {
      originName: (saved && getUniqueStation(saved.originKey)?.displayName) ?? saved?.originKey ?? '출발',
      destinationName: (saved && getUniqueStation(saved.destinationKey)?.displayName) ?? saved?.destinationKey ?? '도착',
    };
  }, []);

  // 복구. 리마인더는 식별자가 결정적이라 매번 다시 맞춰도 됩니다 — 재설치·OS 초기화 뒤에도 살아납니다.
  useEffect(() => {
    if (!userDataReady) return;
    void (async () => {
      const stored = await readJson<unknown>(StorageKeys.routines, []);
      const list = isRoutineList(stored) ? stored : [];
      const synced: CommuteRoutine[] = [];
      for (const routine of list) {
        const ids = await syncRoutineReminders(routine, labelsFor(routine));
        synced.push({ ...routine, reminderNotificationIds: ids });
      }
      persist(synced);
      setReady(true);
    })();
  }, [userDataReady, labelsFor, persist]);

  const upsertRoutine = useCallback(
    async (input: CommuteRoutineInput, id?: string) => {
      const existing = id ? routinesRef.current.find((r) => r.id === id) : undefined;
      const base: CommuteRoutine = existing ? { ...existing, ...input } : newRoutine(input);
      const ids = await syncRoutineReminders(base, labelsFor(base));
      const next = { ...base, reminderNotificationIds: ids };
      persist(existing ? routinesRef.current.map((r) => (r.id === next.id ? next : r)) : [...routinesRef.current, next]);
      return next;
    },
    [labelsFor, persist],
  );

  const removeRoutine = useCallback(
    async (id: string) => {
      const target = routinesRef.current.find((r) => r.id === id);
      if (target) await cancelRoutineReminders(target);
      persist(routinesRef.current.filter((r) => r.id !== id));
    },
    [persist],
  );

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const target = routinesRef.current.find((r) => r.id === id);
      if (!target) return;
      await upsertRoutine({ ...target, enabled }, id);
    },
    [upsertRoutine],
  );

  const markArmed = useCallback(
    (id: string) => {
      const today = todayKey(new Date());
      persist(routinesRef.current.map((r) => (r.id === id ? { ...r, lastArmedDate: today } : r)));
    },
    [persist],
  );

  const skipToday = useCallback(
    (id: string) => {
      const today = todayKey(new Date());
      persist(routinesRef.current.map((r) => (r.id === id ? { ...r, skippedDate: today } : r)));
      setPendingId((current) => (current === id ? null : current));
    },
    [persist],
  );

  const startRoutineTrip = useCallback(
    async (id: string, options: { replaceActive?: boolean } = {}) => {
      const routine = routinesRef.current.find((r) => r.id === id);
      if (!routine) return;
      const saved = savedRoutesRef.current.find((route) => route.id === routine.savedRouteId);
      if (!saved) {
        Alert.alert('저장 경로가 없습니다', `"${routine.name}" 루틴이 가리키는 경로가 지워졌습니다. 루틴을 다시 설정해 주세요.`);
        router.navigate({ pathname: '/routines/[id]', params: { id } });
        return;
      }
      const resolved = resolveSavedRoute(saved, isPlanValid, (o, d) => findRoutes(o, d));
      if (!resolved.plan) {
        Alert.alert('경로를 만들 수 없습니다', '노선 데이터가 바뀌었습니다. 홈에서 경로를 다시 저장해 주세요.');
        router.navigate({ pathname: '/trip/setup', params: { saved: saved.id } });
        return;
      }

      const active = tripRef.current;
      if (active && active.status === 'active' && !options.replaceActive) {
        const sameRoute = active.plan.id === resolved.plan.id;
        if (sameRoute) {
          setPendingId(null);
          router.navigate('/alerts');
          return;
        }
        Alert.alert('진행 중인 여정이 있습니다', `지금 여정을 끝내고 "${routine.name}" 여정을 시작할까요?`, [
          { text: '아니요', style: 'cancel' },
          { text: '시작', style: 'destructive', onPress: () => void startRef.current(id, { replaceActive: true }) },
        ]);
        return;
      }
      if (active && active.status === 'active') await cancel();

      if (!capabilities.localNotifications) {
        Alert.alert('이 환경에서는 알림을 예약할 수 없습니다', 'iOS/Android 빌드에서 사용해 주세요.');
        return;
      }
      try {
        const doorGuides = await buildDoorGuides(resolved.plan);
        await start({
          plan: resolved.plan,
          alertNStationsBefore: routine.alertNStationsBefore ?? saved.alertNStationsBefore ?? settings.alertNStationsBefore,
          useGps: (routine.useGps ?? saved.useGps ?? settings.useGps) && capabilities.backgroundGeofencing,
          doorGuides,
        });
        touchSavedRoute(saved.id);
        markArmed(id);
        setPendingId(null);
        router.navigate('/alerts');
      } catch {
        Alert.alert('여정을 시작할 수 없습니다', '경로를 다시 골라 주세요.');
      }
    },
    [cancel, markArmed, settings.alertNStationsBefore, settings.useGps, start, touchSavedRoute],
  );

  useEffect(() => {
    startRef.current = startRoutineTrip;
  }, [startRoutineTrip]);

  // 시작 창 안에서 앱이 활성화되면 자동 시작하거나 묻습니다. 하루 한 번만.
  const armCheck = useCallback(() => {
    if (!ready || !tripReady) return;
    if (tripRef.current && tripRef.current.status === 'active') return;
    const now = new Date();
    const candidate = routinesRef.current.find((routine) => shouldArm(routine, now));
    if (!candidate) return;
    if (candidate.autoStart) void startRoutineTrip(candidate.id);
    else setPendingId(candidate.id);
  }, [ready, tripReady, startRoutineTrip]);

  useEffect(() => {
    armCheck();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') armCheck();
    });
    return () => subscription.remove();
  }, [armCheck]);

  // 리마인더 탭·버튼.
  useEffect(() => {
    if (!capabilities.localNotifications) return;
    const handle = (response: Notifications.NotificationResponse) => {
      const request = response.notification.request;
      const dedupeKey = `${request.identifier}|${response.actionIdentifier}|${response.notification.date}`;
      if (handledResponsesRef.current.has(dedupeKey)) return;
      handledResponsesRef.current.add(dedupeKey);
      const intent = interpretResponse(request.content.data, response.actionIdentifier, Notifications.DEFAULT_ACTION_IDENTIFIER);
      if (!intent || intent.type !== 'routine') return;
      if (intent.action === 'skip') {
        skipToday(intent.routineId);
        return;
      }
      if (intent.action === 'start') {
        void startRoutineTrip(intent.routineId, { replaceActive: true });
        return;
      }
      // 알림 본체 탭: 홈에서 시작할지 묻습니다. 루틴이 여전히 창 안이 아니어도 사용자가 원한 것이므로 보여 줍니다.
      setPendingId(intent.routineId);
      router.navigate('/');
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) handle(last);
    });
    return () => subscription.remove();
  }, [skipToday, startRoutineTrip]);

  const pendingRoutine = useMemo(() => routines.find((r) => r.id === pendingId) ?? null, [routines, pendingId]);

  const value = useMemo(
    () => ({ routines, ready, pendingRoutine, upsertRoutine, removeRoutine, setEnabled, startRoutineTrip, skipToday }),
    [routines, ready, pendingRoutine, upsertRoutine, removeRoutine, setEnabled, startRoutineTrip, skipToday],
  );

  return <RoutinesContext value={value}>{children}</RoutinesContext>;
}

export function useRoutines(): RoutinesContextValue {
  return use(RoutinesContext);
}
