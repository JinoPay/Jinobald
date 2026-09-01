import { StyleSheet, Text, View } from 'react-native';

import { formatCountdown } from '@/services/alerts/eta';
import { isAtStation } from '@/services/subway/mappers';
import type { Arrival } from '@/services/subway/types';
import { useTheme } from '@/hooks/use-theme';

import { LineBadge } from './LineBadge';

interface Props {
  arrival: Arrival;
  /** 화면이 살아 있는 동안 로컬로 흘려보낸 초. 폴링 사이에도 카운트다운이 움직입니다. */
  elapsedSeconds: number;
}

export function ArrivalCard({ arrival, elapsedSeconds }: Props) {
  const theme = useTheme();
  const remaining =
    arrival.secondsUntilArrival == null
      ? null
      : Math.max(0, arrival.secondsUntilArrival - elapsedSeconds);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.header}>
        <LineBadge lineId={arrival.lineId} size="sm" />
        <Text style={[styles.terminal, { color: theme.text }]} numberOfLines={1}>
          {arrival.terminalStationName || '행선지 미상'}행
        </Text>
        {arrival.trainKind === 'express' ? (
          <Text style={[styles.express, { color: theme.accent }]}>급행</Text>
        ) : null}
      </View>

      <Text style={[styles.eta, { color: isAtStation(arrival.status) ? theme.success : theme.text }]}>
        {isAtStation(arrival.status)
          ? arrival.status === 'arrived'
            ? '도착'
            : '진입 중'
          : remaining !== null
            ? formatCountdown(remaining)
            : '—'}
      </Text>

      <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={1}>
        {arrival.statusMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  terminal: { flex: 1, fontSize: 15, fontWeight: '600' },
  express: { fontSize: 12, fontWeight: '700' },
  eta: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  message: { fontSize: 13 },
});
