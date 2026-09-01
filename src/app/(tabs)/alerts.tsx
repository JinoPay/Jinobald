import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/common/EmptyState';
import { LineBadge } from '@/components/subway/LineBadge';
import { directionLabel, getLine, groupIdOf } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { formatCountdown, formatDuration } from '@/services/alerts/eta';
import type { TripProgress } from '@/services/alerts/progress';
import {
  currentLeg,
  currentLegIndex,
  isFinalLeg,
  tripDestinationName,
  type Trip,
} from '@/services/alerts/trip';
import { capabilities } from '@/services/location/capabilities';
import type { RouteLeg } from '@/services/routing/types';
import { useTrip } from '@/store/TripContext';

export default function AlertsScreen() {
  const theme = useTheme();
  const { trip, progress, cancel, setBoarded, advance, reportPosition } = useTrip();

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

  if (!trip) {
    return (
      <ScrollView contentContainerStyle={styles.center} style={{ backgroundColor: theme.background }}>
        <EmptyState
          title="진행 중인 알림이 없습니다"
          description="길찾기 탭에서 출발역과 도착역을 고른 뒤 경로를 선택하세요."
        />
        <Pressable
          onPress={() => router.push('/')}
          style={[styles.secondary, { borderColor: theme.border }]}>
          <Text style={{ color: theme.accent, fontWeight: '600' }}>길찾기로 이동</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // 노선 조회가 실패해도 진행 중인 여정을 숨기지 않습니다 —
  // 사용자가 알림을 취소할 방법이 사라지기 때문입니다.
  const legIndex = currentLegIndex(trip);
  const leg = currentLeg(trip);
  const line = getLine(leg.lineId);
  const final = isFinalLeg(trip, legIndex);
  const multiLeg = trip.plan.legs.length > 1;
  const nextLeg = trip.plan.legs[legIndex + 1];
  const nextLine = nextLeg ? getLine(nextLeg.lineId) : undefined;

  const nextAlert = Object.values(trip.scheduled)
    .filter((alert) => alert != null)
    .sort((a, b) => a.atMs - b.atMs)[0];

  // 승차 후 경과 시간으로 0정거장에 닿아도 자동으로 넘기지 않습니다.
  // 환승 소요 데이터가 없어서 자동 전진은 조용히 어긋나기 때문입니다.
  const askedToTransfer = !final && trip.boarded && progress?.stationsLeft === 0;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.header}>
          <LineBadge groupId={groupIdOf(leg.lineId)} />
          {line ? (
            <Text style={[styles.direction, { color: theme.textSecondary }]}>
              {directionLabel(line, leg.direction)}
            </Text>
          ) : null}
          {multiLeg ? (
            <Text style={[styles.direction, { color: theme.textSecondary }]}>
              {legIndex + 1}/{trip.plan.legs.length} 구간
            </Text>
          ) : null}
        </View>

        <Text style={[styles.destination, { color: theme.text }]}>
          {final ? `${tripDestinationName(trip)} 하차` : `${leg.alightStationName} 환승`}
        </Text>
        <Text style={[styles.origin, { color: theme.textSecondary }]}>
          {leg.boardStationName}에서 승차
          {final ? '' : ` · 최종 ${tripDestinationName(trip)}`}
        </Text>

        <View style={styles.stats}>
          <Stat label="남은 정거장" value={progress ? `${progress.stationsLeft}` : '—'} />
          <Stat
            label={multiLeg ? '이 구간 예상' : '예상 소요'}
            value={progress ? formatCountdown(progress.etaSeconds) : '—'}
          />
          <Stat
            label={multiLeg ? '전체 예상' : '예비 알림'}
            value={
              multiLeg
                ? progress
                  ? formatDuration(progress.totalEtaSeconds)
                  : '—'
                : `${trip.alertNStationsBefore}정거장 전`
            }
          />
        </View>

        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {nextAlert
            ? `다음 알림 예약: ${new Date(nextAlert.atMs).toLocaleTimeString('ko-KR')}`
            : '알림 예약 계산 중'}
          {trip.geofenceActive ? ' · GPS 지오펜스 활성' : ''}
          {multiLeg ? ` · 예비 알림 ${trip.alertNStationsBefore}정거장 전` : ''}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>{basisLabel(progress?.basis)}</Text>
      </View>

      {multiLeg ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>경로</Text>
          {trip.plan.legs.map((item, index) => (
            <LegRow
              key={`${item.lineId}-${item.boardIndex}`}
              leg={item}
              state={index < legIndex ? 'past' : index === legIndex ? 'current' : 'future'}
            />
          ))}
        </View>
      ) : null}

      {askedToTransfer ? (
        <Text style={[styles.prompt, { color: theme.text }]}>
          {leg.alightStationName}에 도착할 때가 되었습니다. 갈아타셨으면 아래 버튼을 눌러 주세요.
        </Text>
      ) : null}

      <PrimaryAction
        trip={trip}
        final={final}
        nextLineName={nextLine?.name}
        onBoard={() => setBoarded(true)}
        onAdvance={() => void advance()}
        onUnboard={() => setBoarded(false)}
      />

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

/**
 * 주 동작은 세 가지입니다.
 * 아직 안 탔으면 승차, 탔는데 환승이 남았으면 환승 완료, 마지막 구간이면 승차 취소.
 */
function PrimaryAction({
  trip,
  final,
  nextLineName,
  onBoard,
  onAdvance,
  onUnboard,
}: {
  trip: Trip;
  final: boolean;
  nextLineName?: string;
  onBoard: () => void;
  onAdvance: () => void;
  onUnboard: () => void;
}) {
  const theme = useTheme();

  if (!trip.boarded) {
    return (
      <Pressable
        onPress={onBoard}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: theme.accent, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}>
        <Text style={[styles.actionText, { color: '#fff' }]}>승차했습니다</Text>
      </Pressable>
    );
  }

  if (final) {
    return (
      <Pressable
        onPress={onUnboard}
        style={({ pressed }) => [
          styles.action,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Text style={[styles.actionText, { color: theme.text }]}>승차 취소 (아직 안 탔어요)</Text>
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
        onPress={onAdvance}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: theme.accent, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}>
        <Text style={[styles.actionText, { color: '#fff' }]}>
          {nextLineName ? `${nextLineName}(으)로 갈아탔습니다` : '갈아탔습니다'}
        </Text>
      </Pressable>
      <Pressable onPress={onUnboard} hitSlop={8} style={styles.link}>
        <Text style={[styles.linkText, { color: theme.textSecondary }]}>
          아직 안 탔어요 (승차 취소)
        </Text>
      </Pressable>
    </>
  );
}

function LegRow({ leg, state }: { leg: RouteLeg; state: 'past' | 'current' | 'future' }) {
  const theme = useTheme();
  const line = getLine(leg.lineId);
  return (
    <View
      style={[
        styles.leg,
        state === 'current' && { borderColor: theme.accent, borderWidth: 1 },
        state === 'past' && { opacity: 0.45 },
      ]}>
      <LineBadge groupId={groupIdOf(leg.lineId)} size="sm" />
      <View style={styles.legText}>
        <Text style={[styles.legTitle, { color: theme.text }]}>
          {leg.boardStationName} → {leg.alightStationName}
        </Text>
        <Text style={[styles.legHint, { color: theme.textSecondary }]}>
          {line ? `${directionLabel(line, leg.direction)} · ` : ''}
          {leg.stationCount}정거장
          {leg.transferIn?.kind === 'switch' ? ' · 같은 승강장에서 갈아탐' : ''}
        </Text>
      </View>
    </View>
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

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  card: { borderRadius: 14, padding: 16, gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  direction: { fontSize: 13, fontWeight: '600' },
  destination: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  origin: { fontSize: 14 },
  stats: { flexDirection: 'row', marginTop: 14, gap: 8 },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12 },
  meta: { fontSize: 12, marginTop: 12 },
  leg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legText: { flex: 1, gap: 1 },
  legTitle: { fontSize: 15, fontWeight: '600' },
  legHint: { fontSize: 12 },
  prompt: { fontSize: 14, lineHeight: 20, paddingHorizontal: 4 },
  action: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  actionText: { fontSize: 15, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 4 },
  linkText: { fontSize: 13, fontWeight: '600' },
  secondary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
});
