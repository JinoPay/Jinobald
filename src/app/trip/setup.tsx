import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { SaveRouteSheet } from '@/components/home/SaveRouteSheet';
import { DepartureTimesCard } from '@/components/subway/DepartureTimesCard';
import { LineBadge } from '@/components/subway/LineBadge';
import { RouteSummary } from '@/components/subway/RouteSummary';
import { TransferHint } from '@/components/subway/TransferHint';
import { directionLabel, getLine, getUniqueStation, groupIdOf, normalizeStationName } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { buildDoorGuides } from '@/services/alerts/door-guides';
import { formatDuration } from '@/services/alerts/eta';
import {
  capabilities,
  capabilityNotice,
  notificationNotice,
} from '@/services/location/capabilities';
import { requestLocationPermission } from '@/services/location/geofence';
import { requestNotificationPermission } from '@/services/notifications/setup';
import { resolveSavedRoute } from '@/services/routes/saved';
import { findRoutes, isPlanValid, ROUTE_LABEL } from '@/services/routing';
import type { RoutePlan } from '@/services/routing/types';
import { useSettings } from '@/store/SettingsContext';
import { useTrip } from '@/store/TripContext';
import { useUserData } from '@/store/UserDataContext';

/**
 * 경로 확인 · 알림 설정.
 *
 * 들어오는 길이 둘입니다.
 * - 검색 결과 카드: `origin` `destination` `planId` (+`via`). 같은 탐색을 다시 돌려 그 후보를 고릅니다.
 * - 저장 경로 / 출퇴근 루틴: `saved` (저장 경로 id). 저장소에서 꺼내 현재 데이터셋에 맞춥니다.
 *
 * 어느 쪽이든 화면에서 추천·최소 시간·최소 환승·최소 정거장 칩으로 다른 후보로 바꿀 수 있습니다.
 */
export default function TripSetupScreen() {
  const theme = useTheme();
  const { settings } = useSettings();
  const { start } = useTrip();
  const { savedRoutes, saveRoute, updateSavedRoute, touchSavedRoute } = useUserData();
  const params = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    planId?: string;
    via?: string;
    saved?: string;
  }>();

  const savedRoute = params.saved ? savedRoutes.find((route) => route.id === params.saved) ?? null : null;
  const originKey = savedRoute?.originKey ?? params.origin ?? null;
  const destinationKey = savedRoute?.destinationKey ?? params.destination ?? null;

  const resolved = useMemo(
    () => (savedRoute ? resolveSavedRoute(savedRoute, isPlanValid, (o, d) => findRoutes(o, d)) : null),
    [savedRoute],
  );

  /** 고를 수 있는 후보: 저장 경로(있으면) + 계산된 주요 후보. 대안은 검색 화면에서만 고릅니다. */
  const candidates = useMemo(() => {
    if (!originKey || !destinationKey) return [];
    const computed = findRoutes(originKey, destinationKey, params.via ? { viaKey: params.via } : {});
    const savedPlan = resolved?.plan ?? null;
    const main = computed.filter((plan) => plan.label !== 'alternative' || plan.id === params.planId);
    return savedPlan ? [savedPlan, ...main.filter((plan) => plan.id !== savedPlan.id)] : main;
  }, [originKey, destinationKey, params.via, params.planId, resolved]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const plan: RoutePlan | null =
    candidates.find((candidate) => candidate.id === (selectedId ?? resolved?.plan?.id ?? params.planId)) ??
    candidates[0] ??
    null;

  const [alertN, setAlertN] = useState(savedRoute?.alertNStationsBefore ?? settings.alertNStationsBefore);
  const [useGps, setUseGps] = useState((savedRoute?.useGps ?? settings.useGps) && capabilities.backgroundGeofencing);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  // 출발 시각. "지금"이 기본이고, 나중 시각을 고르면 시각표(다음 열차·막차)만 그 시각 기준으로 봅니다.
  const [departAt, setDepartAt] = useState<'now' | Date>('now');
  const departValue = departAt === 'now' ? new Date() : departAt;
  const onDepartChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setDepartAt(date);
  };
  const pickDepartTime = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ mode: 'time', value: departValue, is24Hour: true, onChange: onDepartChange });
    } else {
      setDepartAt(departValue);
    }
  };

  // 데이터셋이 바뀌어 저장 경로를 다시 찾았으면 저장값을 갱신합니다.
  useEffect(() => {
    if (savedRoute && resolved?.status === 'refreshed') updateSavedRoute(savedRoute.id, { plan: resolved.plan });
  }, [savedRoute, resolved, updateSavedRoute]);

  if (params.saved && !savedRoute) {
    return <Message theme={theme} text="저장한 경로를 찾을 수 없습니다. 홈에서 다시 골라 주세요." />;
  }
  if (resolved?.status === 'unavailable') {
    return (
      <Message
        theme={theme}
        text={`노선 데이터가 바뀌어 "${savedRoute?.name}" 경로를 더 이상 만들 수 없습니다. 홈에서 같은 출발·도착을 검색해 다시 저장해 주세요.`}
      />
    );
  }
  if (!plan) {
    return <Message theme={theme} text="경로를 찾을 수 없습니다." />;
  }

  const canStart = capabilities.localNotifications;
  const originName = getUniqueStation(originKey ?? '')?.displayName ?? plan.legs[0].boardStationName;
  const destinationName =
    getUniqueStation(destinationKey ?? '')?.displayName ?? plan.legs[plan.legs.length - 1].alightStationName;
  const isSavedPlan = plan.label === 'saved';

  const submit = async (planToStart: RoutePlan = plan) => {
    if (!canStart) return;
    setSubmitting(true);
    try {
      const permission = await requestNotificationPermission();
      if (!permission.granted) {
        Alert.alert(
          '알림 권한이 필요합니다',
          '승하차 알림을 받으려면 시스템 설정에서 알림을 허용해 주세요.',
        );
        return;
      }
      // GPS 보정은 "항상 허용" 권한이 있어야 동작합니다. 못 받았으면 조용히 끄지 않고 알려 줍니다.
      let gps = useGps;
      if (useGps) {
        const location = await requestLocationPermission();
        if (!location.background) {
          gps = false;
          Alert.alert(
            'GPS 보정 없이 시작합니다',
            '위치 권한이 "항상 허용"이 아니라 지오펜스를 걸 수 없습니다. 도착예정 기반 알림은 정상 동작합니다.',
          );
        }
      }

      const doorGuides = await buildDoorGuides(planToStart);
      await start({ plan: planToStart, alertNStationsBefore: alertN, useGps: gps, doorGuides });
      if (savedRoute && isSavedPlan) touchSavedRoute(savedRoute.id);
      router.replace('/alerts');
    } catch {
      Alert.alert('여정을 시작할 수 없습니다', '경로를 다시 선택해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveAndStart = (name: string) => {
    if (!originKey || !destinationKey) return;
    const created = saveRoute({
      name,
      originKey: normalizeStationName(originKey),
      destinationKey: normalizeStationName(destinationKey),
      plan,
      alertNStationsBefore: alertN,
      useGps,
    });
    touchSavedRoute(created.id);
    void submit(created.plan);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}>
      {notificationNotice ? (
        <View style={[styles.banner, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.bannerText, { color: theme.danger }]}>{notificationNotice}</Text>
        </View>
      ) : null}
      {resolved?.status === 'refreshed' ? (
        <View style={[styles.banner, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.bannerText, { color: theme.accent }]}>
            노선 데이터가 갱신되어 저장한 경로를 같은 모양으로 다시 찾았습니다.
          </Text>
        </View>
      ) : null}

      {candidates.length > 1 ? (
        <View style={styles.chips}>
          {candidates.map((candidate) => {
            const selected = candidate.id === plan.id;
            return (
              <Pressable
                key={candidate.id}
                onPress={() => setSelectedId(candidate.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? theme.accent : theme.border,
                    backgroundColor: selected ? theme.accent : theme.backgroundElement,
                  },
                ]}>
                <Text style={{ color: selected ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>
                  {candidate.label === 'saved' && savedRoute ? savedRoute.name : ROUTE_LABEL[candidate.label]} ·{' '}
                  {formatDuration(candidate.totalSeconds)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.summary, { backgroundColor: theme.backgroundElement }, isSavedPlan && { borderWidth: 1, borderColor: theme.accent }]}>
        <Text style={[styles.duration, { color: theme.text }]}>
          {formatDuration(plan.totalSeconds)}
        </Text>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          {isSavedPlan && savedRoute ? `내 경로 "${savedRoute.name}" · ` : `${ROUTE_LABEL[plan.label]} · `}
          {plan.transferCount === 0 ? '환승 없음' : `환승 ${plan.transferCount}회`} ·{' '}
          {plan.totalStations}정거장
        </Text>
        <RouteSummary plan={plan} />
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>경로</Text>
      {plan.legs.map((leg, index) => (
        <View key={`${leg.lineId}-${leg.boardIndex}`}>
          {index > 0 ? <TransferHint fromLeg={plan.legs[index - 1]} toLeg={leg} /> : null}
          <LegRow leg={leg} first={index === 0} />
        </View>
      ))}

      <Text style={[styles.label, { color: theme.textSecondary }]}>출발 시각</Text>
      <View style={styles.chips}>
        <Pressable
          onPress={() => setDepartAt('now')}
          style={[
            styles.chip,
            {
              borderColor: departAt === 'now' ? theme.accent : theme.border,
              backgroundColor: departAt === 'now' ? theme.accent : theme.backgroundElement,
            },
          ]}>
          <Text style={{ color: departAt === 'now' ? '#fff' : theme.text }}>지금</Text>
        </Pressable>
        <Pressable
          onPress={pickDepartTime}
          style={[
            styles.chip,
            {
              borderColor: departAt !== 'now' ? theme.accent : theme.border,
              backgroundColor: departAt !== 'now' ? theme.accent : theme.backgroundElement,
            },
          ]}>
          <Text style={{ color: departAt !== 'now' ? '#fff' : theme.text }}>
            {departAt === 'now'
              ? '시각 지정'
              : `${String(departAt.getHours()).padStart(2, '0')}:${String(departAt.getMinutes()).padStart(2, '0')} 출발`}
          </Text>
        </Pressable>
      </View>
      {Platform.OS === 'ios' && departAt !== 'now' ? (
        <DateTimePicker value={departAt} mode="time" display="spinner" onChange={onDepartChange} locale="ko-KR" />
      ) : null}
      <DepartureTimesCard plan={plan} departAt={departAt} />

      <Text style={[styles.label, { color: theme.textSecondary }]}>알림</Text>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        탈 열차가 1분 안에 오면 승차 알림, 하차·환승역은 아래 시점의 예비 알림과 도착 1분 전 알림을 전용 알람음으로 보냅니다.
        빠른 하차 칸을 아는 역은 알림 문구에 칸 번호가 함께 나옵니다.
      </Text>

      <Text style={[styles.label, { color: theme.textSecondary }]}>예비 알림 시점</Text>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        하차역과 환승역 모두에 같은 시점으로 적용됩니다.
      </Text>
      <View style={styles.chips}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => setAlertN(n)}
            style={[
              styles.chip,
              {
                borderColor: n === alertN ? theme.accent : theme.border,
                backgroundColor: n === alertN ? theme.accent : theme.backgroundElement,
              },
            ]}>
            <Text style={{ color: n === alertN ? '#fff' : theme.text }}>{n}정거장 전</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.switchRow, { borderColor: theme.border }]}>
        <View style={styles.switchText}>
          <Text style={[styles.value, { color: theme.text }]}>GPS 보정 사용</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            {capabilities.backgroundGeofencing
              ? '역 좌표를 아는 경우 지오펜스로 하차·환승 시점을 보정합니다.'
              : (capabilityNotice ?? '이 환경에서는 사용할 수 없습니다.')}
          </Text>
        </View>
        <Switch
          value={useGps}
          onValueChange={setUseGps}
          disabled={!capabilities.backgroundGeofencing}
        />
      </View>

      <Pressable
        disabled={!canStart || submitting}
        onPress={() => void submit()}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: canStart ? theme.accent : theme.backgroundElement,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Text style={[styles.ctaText, { color: canStart ? '#fff' : theme.textSecondary }]}>
          {canStart
            ? `${plan.legs[plan.legs.length - 1].alightStationName} 하차 알림 시작`
            : '이 환경에서는 알림을 예약할 수 없습니다'}
        </Text>
      </Pressable>

      {canStart && !isSavedPlan ? (
        <Pressable disabled={submitting} onPress={() => setSaving(true)} style={[styles.secondary, { borderColor: theme.border }]}>
          <Text style={[styles.secondaryText, { color: theme.accent }]}>☆ 내 경로로 저장하고 시작</Text>
        </Pressable>
      ) : null}
      {isSavedPlan && savedRoute ? (
        <Pressable
          disabled={submitting}
          onPress={() => updateSavedRoute(savedRoute.id, { alertNStationsBefore: alertN, useGps })}
          style={[styles.secondary, { borderColor: theme.border }]}>
          <Text style={[styles.secondaryText, { color: theme.accent }]}>이 알림 설정을 ‘{savedRoute.name}’ 기본값으로 저장</Text>
        </Pressable>
      ) : null}

      <SaveRouteSheet
        visible={saving}
        originName={originName}
        destinationName={destinationName}
        onSave={saveAndStart}
        onClose={() => setSaving(false)}
      />
    </ScrollView>
  );
}

function Message({ theme, text }: { theme: ReturnType<typeof useTheme>; text: string }) {
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text, lineHeight: 22 }}>{text}</Text>
      <Pressable onPress={() => router.back()} style={[styles.secondary, { borderColor: theme.border }]}>
        <Text style={[styles.secondaryText, { color: theme.accent }]}>돌아가기</Text>
      </Pressable>
    </View>
  );
}

function LegRow({ leg, first }: { leg: RoutePlan['legs'][number]; first: boolean }) {
  const theme = useTheme();
  const line = getLine(leg.lineId);
  return (
    <View style={[styles.leg, { borderColor: theme.border }]}>
      <LineBadge groupId={groupIdOf(leg.lineId)} />
      <View style={styles.legText}>
        <Text style={[styles.value, { color: theme.text }]}>
          {leg.boardStationName} → {leg.alightStationName}
        </Text>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          {line ? `${line.name} ${directionLabel(line, leg.direction)} · ` : ''}
          {leg.stationCount}정거장 · 약 {formatDuration(leg.seconds)}
          {first ? ' · 여기서 승차' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, paddingBottom: 48 },
  banner: { borderRadius: 10, padding: 12 },
  bannerText: { fontSize: 13, lineHeight: 18 },
  summary: { borderRadius: 12, padding: 14, gap: 6 },
  duration: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16 },
  value: { fontSize: 17, fontWeight: '600' },
  hint: { fontSize: 12, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  leg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  legText: { flex: 1, gap: 2 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchText: { flex: 1, gap: 2 },
  cta: { marginTop: 24, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
  secondary: { marginTop: 10, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  secondaryText: { fontSize: 14, fontWeight: '600' },
});
