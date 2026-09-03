import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteSummary } from '@/components/subway/RouteSummary';
import { TransferHint } from '@/components/subway/TransferHint';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/services/alerts/eta';
import type { RoutePlan } from '@/services/routing/types';

const ROUTE_LABEL: Record<RoutePlan['label'], string> = {
  fastest: '최소 시간',
  'fewest-transfers': '최소 환승',
};

interface Props {
  routes: RoutePlan[];
  onPress: (index: number) => void;
}

export function RouteResults({ routes, onPress }: Props) {
  return (
    <View style={styles.list}>
      {routes.map((plan, index) => (
        <RouteCard key={plan.id} plan={plan} onPress={() => onPress(index)} />
      ))}
    </View>
  );
}

/**
 * 알림을 못 쓰는 환경(웹)에서도 카드는 누를 수 있습니다. 경로 자체는 볼 수 있어야
 * 하고, 알림 예약 불가는 다음 화면의 버튼이 막아 줍니다.
 */
export function RouteCard({ plan, onPress }: { plan: RoutePlan; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        Shadow,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={styles.header}>
        <Text style={[Typography.heading, Typography.numeric, { color: theme.text }]}>
          {formatDuration(plan.totalSeconds)}
        </Text>
        <Text style={[Typography.caption, { color: theme.textSecondary }]}>
          {plan.transferCount === 0 ? '환승 없음' : `환승 ${plan.transferCount}회`} · {plan.totalStations}정거장
        </Text>
        <View style={styles.spacer} />
        <Text style={[styles.label, { color: theme.accent, borderColor: theme.accent }]}>{ROUTE_LABEL[plan.label]}</Text>
      </View>

      <RouteSummary plan={plan} size="sm" />

      {plan.legs.map((leg, index) =>
        index > 0 && leg.transferIn?.kind === 'transfer' ? (
          <TransferHint key={`${leg.lineId}-${leg.boardIndex}`} fromLeg={plan.legs[index - 1]} toLeg={leg} compact />
        ) : null,
      )}

      {plan.hasNonRealtimeLine ? (
        <Text style={[Typography.caption, { color: theme.textSecondary }]}>
          실시간 도착정보가 없는 노선이 포함되어 노선 평균으로 추정합니다.
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { marginHorizontal: Spacing.three, gap: Spacing.two + 2 },
  card: { borderRadius: Radius.lg, padding: Spacing.two + 6, gap: Spacing.two + 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  spacer: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
});
