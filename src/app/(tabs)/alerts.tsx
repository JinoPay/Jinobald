import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/common/EmptyState';
import { LineBadge } from '@/components/subway/LineBadge';
import { groupIdOf, directionLabel, getLine } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { formatCountdown } from '@/services/alerts/eta';
import type { TripProgress } from '@/services/alerts/progress';
import { capabilities } from '@/services/location/capabilities';
import { useTrip } from '@/store/TripContext';

export default function AlertsScreen() {
  const theme = useTheme();
  const { trip, progress, cancel, setBoarded, reportPosition } = useTrip();
  const line = trip ? getLine(trip.lineId) : undefined;

  // 화면이 열려 있는 동안의 포그라운드 위치 보정.
  // 백그라운드 지오펜싱과 달리 Expo Go 에서도 동작합니다.
  useEffect(() => {
    if (!trip || !trip.useGps || !capabilities.foregroundLocation) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    void (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted' || cancelled) return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 100 },
        ({ coords }) => reportPosition({ lat: coords.latitude, lng: coords.longitude }),
      );
      if (cancelled) subscription.remove();
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [trip, reportPosition]);

  if (!trip || !line) {
    return (
      <ScrollView contentContainerStyle={styles.center} style={{ backgroundColor: theme.background }}>
        <EmptyState
          title="진행 중인 알림이 없습니다"
          description="노선도 탭에서 역을 고른 뒤 승하차 알림을 설정하세요."
        />
        <Pressable
          onPress={() => router.push('/')}
          style={[styles.secondary, { borderColor: theme.border }]}>
          <Text style={{ color: theme.accent, fontWeight: '600' }}>노선도로 이동</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const nextAlert = trip.scheduled.pre ?? trip.scheduled.arrive;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.header}>
          <LineBadge groupId={groupIdOf(trip.lineId)} />
          <Text style={[styles.direction, { color: theme.textSecondary }]}>
            {directionLabel(line, trip.direction)}
          </Text>
        </View>

        <Text style={[styles.destination, { color: theme.text }]}>
          {trip.destinationStationName} 하차
        </Text>
        <Text style={[styles.origin, { color: theme.textSecondary }]}>
          {trip.originStationName}에서 승차
        </Text>

        <View style={styles.stats}>
          <Stat
            label="남은 정거장"
            value={progress ? `${progress.stationsLeft}` : '—'}
            color={theme.text}
            labelColor={theme.textSecondary}
          />
          <Stat
            label="예상 소요"
            value={progress ? formatCountdown(progress.etaSeconds) : '—'}
            color={theme.text}
            labelColor={theme.textSecondary}
          />
          <Stat
            label="예비 알림"
            value={`${trip.alertNStationsBefore}정거장 전`}
            color={theme.text}
            labelColor={theme.textSecondary}
          />
        </View>

        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {nextAlert
            ? `다음 알림 예약: ${new Date(nextAlert.atMs).toLocaleTimeString('ko-KR')}`
            : '알림 예약 계산 중'}
          {trip.geofenceActive ? ' · GPS 지오펜스 활성' : ''}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>{basisLabel(progress?.basis)}</Text>
      </View>

      <Pressable
        onPress={() => setBoarded(!trip.boarded)}
        style={({ pressed }) => [
          styles.action,
          {
            backgroundColor: trip.boarded ? theme.backgroundElement : theme.accent,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Text
          style={[styles.actionText, { color: trip.boarded ? theme.text : '#fff' }]}>
          {trip.boarded ? '승차 취소 (아직 안 탔어요)' : '승차했습니다'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => void cancel()}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: 'transparent', borderColor: theme.danger, opacity: pressed ? 0.7 : 1 },
        ]}>
        <Text style={[styles.actionText, { color: theme.danger }]}>알림 취소</Text>
      </Pressable>
    </ScrollView>
  );
}

/** 지금 어떤 신호로 계산 중인지 밝혀 둡니다 — 정확도 기대치가 달라지기 때문입니다. */
function basisLabel(basis: TripProgress['basis'] | undefined): string {
  switch (basis) {
    case 'arrival':
      return '실시간 도착정보로 계산 중';
    case 'elapsed':
      return '승차 후 경과 시간으로 계산 중 (열차 지연은 반영되지 않습니다)';
    case 'static':
      return '노선 평균 소요시간으로 추정 중';
    default:
      return '계산 준비 중';
  }
}

function Stat({
  label,
  value,
  color,
  labelColor,
}: {
  label: string;
  value: string;
  color: string;
  labelColor: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  card: { borderRadius: 14, padding: 16, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  direction: { fontSize: 13, fontWeight: '600' },
  destination: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  origin: { fontSize: 14 },
  stats: { flexDirection: 'row', marginTop: 14, gap: 8 },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12 },
  meta: { fontSize: 12, marginTop: 12 },
  action: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  actionText: { fontSize: 15, fontWeight: '700' },
  secondary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
});
