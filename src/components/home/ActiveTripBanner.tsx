import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LineBadge } from '@/components/subway/LineBadge';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { getLineGroup, groupIdOf } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { formatCountdown } from '@/services/alerts/eta';
import { currentLeg, isFinalLeg, tripDestinationName } from '@/services/alerts/trip';
import { useTrip } from '@/store/TripContext';

/**
 * 진행 중인 여정을 홈 맨 위에 보여 줍니다. 여정이 없으면 아무것도 그리지 않습니다.
 * 탭을 옮기지 않아도 "몇 정거장 남았는지"가 보이는 것이 목적입니다.
 */
export function ActiveTripBanner() {
  const theme = useTheme();
  const { trip, progress } = useTrip();
  if (!trip) return null;

  const leg = currentLeg(trip);
  const groupId = groupIdOf(leg.lineId);
  const color = getLineGroup(groupId)?.color ?? theme.accent;
  const final = isFinalLeg(trip);
  const target = final ? tripDestinationName(trip) : leg.alightStationName;
  const status = !trip.boarded
    ? `${leg.boardStationName}에서 승차 대기`
    : progress
      ? `${progress.stationsLeft}정거장 · ${formatCountdown(progress.etaSeconds)} 남음`
      : '진행 상황 계산 중';

  return (
    <Pressable
      onPress={() => router.push('/alerts')}
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: theme.accentSoft, borderLeftColor: color, opacity: pressed ? 0.85 : 1 },
      ]}>
      <LineBadge groupId={groupId} />
      <View style={styles.text}>
        <Text style={[Typography.bodyStrong, { color: theme.text }]} numberOfLines={1}>
          {target} {final ? '하차' : '환승'}까지
        </Text>
        <Text style={[Typography.caption, Typography.numeric, { color: theme.textSecondary }]} numberOfLines={1}>
          {status}
        </Text>
      </View>
      <Text style={[Typography.caption, { color: theme.accent, fontWeight: '700' }]}>여정 보기 ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
  },
  text: { flex: 1, gap: 2 },
});
