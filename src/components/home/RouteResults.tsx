import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteSummary } from '@/components/subway/RouteSummary';
import { TransferHint } from '@/components/subway/TransferHint';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { getLine } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/services/alerts/eta';
import { ROUTE_LABEL } from '@/services/routing';
import type { RoutePlan } from '@/services/routing/types';

interface Props {
  routes: RoutePlan[];
  onPress: (plan: RoutePlan) => void;
  /** "이 경로 저장". 없으면 저장 버튼을 그리지 않습니다. */
  onSave?: (plan: RoutePlan) => void;
}

/**
 * 후보 목록. 추천·최소 시간·최소 환승·최소 정거장(·내 경로)은 바로 보이고,
 * 추천 경로의 노선을 하나씩 피한 대안은 접혀 있습니다 — "늘 타던 길"이 어느 기준에도
 * 안 잡힐 때 여기서 찾아 저장하면 다음부터는 맨 앞에 옵니다.
 */
export function RouteResults({ routes, onPress, onSave }: Props) {
  const theme = useTheme();
  const [showAlternatives, setShowAlternatives] = useState(false);
  const main = routes.filter((plan) => plan.label !== 'alternative');
  const alternatives = routes.filter((plan) => plan.label === 'alternative');

  return (
    <View style={styles.list}>
      {main.map((plan) => (
        <RouteCard key={plan.id} plan={plan} onPress={() => onPress(plan)} onSave={onSave ? () => onSave(plan) : undefined} />
      ))}
      {alternatives.length > 0 ? (
        <Pressable onPress={() => setShowAlternatives((v) => !v)} hitSlop={8} style={styles.more}>
          <Text style={[Typography.bodyStrong, { color: theme.accent }]}>
            {showAlternatives ? '대안 접기' : `다른 노선으로 가는 대안 ${alternatives.length}개 더 보기`}
          </Text>
        </Pressable>
      ) : null}
      {showAlternatives
        ? alternatives.map((plan) => (
            <RouteCard key={plan.id} plan={plan} onPress={() => onPress(plan)} onSave={onSave ? () => onSave(plan) : undefined} />
          ))
        : null}
    </View>
  );
}

/**
 * 알림을 못 쓰는 환경(웹)에서도 카드는 누를 수 있습니다. 경로 자체는 볼 수 있어야
 * 하고, 알림 예약 불가는 다음 화면의 버튼이 막아 줍니다.
 */
export function RouteCard({ plan, onPress, onSave }: { plan: RoutePlan; onPress: () => void; onSave?: () => void }) {
  const theme = useTheme();
  const saved = plan.label === 'saved';
  const avoided = plan.avoidedLineId ? getLine(plan.avoidedLineId)?.name : null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        Shadow,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
        saved && { borderWidth: 1, borderColor: theme.accent },
      ]}>
      <View style={styles.header}>
        <Text style={[Typography.heading, Typography.numeric, { color: theme.text }]}>
          {formatDuration(plan.totalSeconds)}
        </Text>
        <Text style={[Typography.caption, { color: theme.textSecondary }]}>
          {plan.transferCount === 0 ? '환승 없음' : `환승 ${plan.transferCount}회`} · {plan.totalStations}정거장
        </Text>
        <View style={styles.spacer} />
        <Text style={[styles.label, { color: theme.accent, borderColor: theme.accent }, saved && { backgroundColor: theme.accent, color: '#fff' }]}>
          {[plan.label, ...(plan.alsoLabels ?? [])].map((label) => ROUTE_LABEL[label]).join(' · ')}
          {avoided ? ` · ${avoided} 제외` : ''}
        </Text>
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

      {onSave && !saved ? (
        <Pressable onPress={onSave} hitSlop={8} style={styles.save} accessibilityLabel="이 경로 저장">
          <Text style={[Typography.caption, { color: theme.accent, fontWeight: '700' }]}>☆ 이 경로 저장</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { marginHorizontal: Spacing.three, gap: Spacing.two + 2 },
  card: { borderRadius: Radius.lg, padding: Spacing.two + 6, gap: Spacing.two + 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  spacer: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  more: { alignItems: 'center', paddingVertical: 6 },
  save: { alignSelf: 'flex-end', paddingVertical: 2 },
});
