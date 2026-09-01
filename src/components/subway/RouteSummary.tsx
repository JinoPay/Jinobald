import { StyleSheet, Text, View } from 'react-native';

import { groupIdOf } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import type { RoutePlan } from '@/services/routing/types';

import { LineBadge } from './LineBadge';

interface Props {
  plan: RoutePlan;
  size?: 'sm' | 'md';
}

/**
 * 경로를 노선 배지의 사슬로 요약합니다.
 *
 * 환승(`transfer`) 경계에만 역 이름을 적습니다. 같은 그룹의 계통 변경(`switch`)은
 * 사용자가 승강장에서 다음 열차를 기다리는 것뿐이라 이름을 적으면 있지도 않은
 * 환승을 안내하게 됩니다 — 광명 → 서울역이 그런 경우입니다.
 */
export function RouteSummary({ plan, size = 'md' }: Props) {
  const theme = useTheme();
  const fontSize = size === 'sm' ? 12 : 13;

  return (
    <View style={styles.row}>
      {plan.legs.map((leg, index) => (
        <View key={`${leg.lineId}-${leg.boardIndex}`} style={styles.item}>
          {index > 0 ? (
            leg.transferIn?.kind === 'transfer' ? (
              <Text style={[styles.transfer, { color: theme.textSecondary, fontSize }]}>
                {`› ${leg.transferIn.fromStationName} ›`}
              </Text>
            ) : (
              <Text style={[styles.transfer, { color: theme.textSecondary, fontSize }]}>·</Text>
            )
          ) : null}
          <LineBadge groupId={groupIdOf(leg.lineId)} size={size} />
          <Text style={[styles.count, { color: theme.textSecondary, fontSize }]}>
            {leg.stationCount}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  transfer: { fontWeight: '600' },
  count: { fontVariant: ['tabular-nums'] },
});
