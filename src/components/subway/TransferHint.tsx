import { StyleSheet, Text, View } from 'react-native';

import { Typography } from '@/constants/theme';
import { getLine, groupIdOf } from '@/data/stations';
import { doorLabel, findTransferGuide, transferWalk } from '@/data/transfers';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/services/alerts/eta';
import type { RouteLeg } from '@/services/routing/types';

interface Props {
  /** 내리는 구간. */
  fromLeg: RouteLeg;
  /** 갈아타는 구간 (transferIn 이 있는 쪽). */
  toLeg: RouteLeg;
  /** 한 줄로 줄인 표시 (경로 카드). */
  compact?: boolean;
}

/**
 * 환승 한 번에 대한 안내: 소요시간(실측이면 도보 거리까지)과 빠른 하차·승차 칸.
 * 데이터가 없는 환승은 "약 N분"으로만 보여 줍니다.
 */
export function TransferHint({ fromLeg, toLeg, compact = false }: Props) {
  const theme = useTheme();
  const transfer = toLeg.transferIn;
  if (!transfer) return null;

  const fromGroup = groupIdOf(fromLeg.lineId);
  const toGroup = groupIdOf(toLeg.lineId);
  const isSwitch = transfer.kind === 'switch';
  const walk = isSwitch ? null : transferWalk(transfer.fromStationName, fromGroup, toGroup);
  const guide = isSwitch
    ? null
    : findTransferGuide(transfer.fromStationName, fromGroup, toGroup, fromLeg.direction, toLeg.direction);
  const toLineName = getLine(toLeg.lineId)?.name ?? '';

  const timeText = isSwitch
    ? `${transfer.fromStationName}에서 같은 승강장 열차 갈아타기`
    : walk
      ? `${transfer.fromStationName} 환승 ${formatDuration(transfer.seconds)} · 도보 ${walk.meters}m`
      : `${transfer.fromStationName} 환승 약 ${formatDuration(transfer.seconds)}`;
  const doorText = guide?.alight
    ? `${doorLabel(guide.alight)} 칸 하차${guide.board ? ` → ${toLineName} ${doorLabel(guide.board)} 칸 승차` : ''}`
    : guide
      ? '같은 승강장 · 아무 칸'
      : null;

  if (compact) {
    return (
      <Text style={[Typography.caption, { color: theme.textSecondary, lineHeight: 17 }]} numberOfLines={2}>
        {timeText}
        {doorText ? ` · ${doorText}` : ''}
      </Text>
    );
  }

  return (
    <View style={[styles.box, { borderColor: theme.border }]}>
      <Text style={[Typography.caption, { color: theme.textSecondary }]}>{timeText}</Text>
      {doorText ? (
        <Text style={[Typography.bodyStrong, { color: theme.accent }]}>
          {doorText}
        </Text>
      ) : (
        <Text style={[Typography.caption, { color: theme.textSecondary }]}>이 환승의 빠른 칸 정보는 아직 없습니다.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 10, marginBottom: 2, marginLeft: 4, paddingLeft: 10, borderLeftWidth: 2, gap: 2 },
});
