import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { LineBadge } from '@/components/subway/LineBadge';
import { RouteSummary } from '@/components/subway/RouteSummary';
import { directionLabel, getLine, groupIdOf } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/services/alerts/eta';
import {
  capabilities,
  capabilityNotice,
  notificationNotice,
} from '@/services/location/capabilities';
import { requestLocationPermission } from '@/services/location/geofence';
import { requestNotificationPermission } from '@/services/notifications/setup';
import { findRoutePlan } from '@/services/routing';
import type { RouteLeg } from '@/services/routing/types';
import { useSettings } from '@/store/SettingsContext';
import { useTrip } from '@/store/TripContext';

export default function TripSetupScreen() {
  const theme = useTheme();
  const { settings } = useSettings();
  const { start } = useTrip();
  const { origin, destination, plan: planIndex } = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    plan?: string;
  }>();

  // 검색 화면에서 경로 객체를 넘기지 않고 후보 번호만 넘깁니다. 같은 탐색을 다시
  // 돌려도 1ms 라, 문자열로 눌린 객체를 되살리는 것보다 안전합니다.
  const plan = useMemo(
    () => (origin && destination ? findRoutePlan(origin, destination, Number(planIndex ?? 0)) : null),
    [origin, destination, planIndex],
  );

  const [alertN, setAlertN] = useState(settings.alertNStationsBefore);
  const [useGps, setUseGps] = useState(settings.useGps && capabilities.backgroundGeofencing);
  const [submitting, setSubmitting] = useState(false);

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>경로를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const canStart = capabilities.localNotifications;

  const submit = async () => {
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
      if (useGps) await requestLocationPermission();

      await start({ plan, alertNStationsBefore: alertN, useGps });
      router.replace('/alerts');
    } catch {
      Alert.alert('여정을 시작할 수 없습니다', '경로를 다시 선택해 주세요.');
    } finally {
      setSubmitting(false);
    }
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

      <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.duration, { color: theme.text }]}>
          {formatDuration(plan.totalSeconds)}
        </Text>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          {plan.transferCount === 0 ? '환승 없음' : `환승 ${plan.transferCount}회`} ·{' '}
          {plan.totalStations}정거장
        </Text>
        <RouteSummary plan={plan} />
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>경로</Text>
      {plan.legs.map((leg, index) => (
        <View key={`${leg.lineId}-${leg.boardIndex}`}>
          {leg.transferIn ? (
            <Text style={[styles.transfer, { color: theme.textSecondary }]}>
              {leg.transferIn.kind === 'transfer'
                ? `${leg.transferIn.fromStationName}에서 환승 (약 ${formatDuration(leg.transferIn.seconds)})`
                : `${leg.transferIn.fromStationName}에서 같은 승강장 열차 갈아타기`}
            </Text>
          ) : null}
          <LegRow leg={leg} first={index === 0} />
        </View>
      ))}

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
    </ScrollView>
  );
}

function LegRow({ leg, first }: { leg: RouteLeg; first: boolean }) {
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
  transfer: { fontSize: 13, marginTop: 10, marginLeft: 4 },
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
});
