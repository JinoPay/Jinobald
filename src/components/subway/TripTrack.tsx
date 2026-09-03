import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { getLine } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { rideSegmentsBetween } from '@/services/routing/graph';
import type { RouteLeg } from '@/services/routing/types';
import type { TrainPosition } from '@/services/subway/types';

import { TrainTrack, type TrackRow } from './TrainTrack';

interface Props {
  leg: RouteLeg;
  /** 승차 후 열차 위치로 계산 중일 때 그 위치. */
  livePosition: TrainPosition | null;
  /** 경과 시간·도착정보 기준일 때 지나온 정거장 수 (열차 마커 없이 강조만). */
  stationsTravelled: number;
}

/**
 * 현재 구간(승차역 → 하차역)만 잘라 그린 미니 트랙. 열차 위치가 있으면 그 역에 마커를 얹고,
 * 없으면 지나온 역을 흐리게 해 진행 정도를 보여 줍니다.
 */
export function TripTrack({ leg, livePosition, stationsTravelled }: Props) {
  const theme = useTheme();
  const line = getLine(leg.lineId);
  if (!line) return null;
  const total = line.stations.length;
  const step = leg.direction === 'down' || leg.direction === 'outer' ? 1 : -1;
  const count = rideSegmentsBetween(line, leg.boardIndex, leg.alightIndex).length;

  const rows: TrackRow[] = [];
  for (let k = 0, at = leg.boardIndex; k <= count; k += 1, at = (at + step + total) % total) {
    const trains = livePosition && livePosition.stationIndex === at ? [livePosition] : [];
    rows.push({ index: at, name: line.stations[at].name, trains });
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[Typography.section, { color: theme.textSecondary, marginBottom: Spacing.two }]}>이 구간</Text>
      {rows.map((row, i) => (
        <View key={row.index} style={{ opacity: !livePosition && i < stationsTravelled ? 0.4 : 1 }}>
          <TrainTrack
            row={row}
            color={line.color}
            first={i === 0}
            last={i === rows.length - 1}
            highlight={i === 0 ? 'board' : i === rows.length - 1 ? 'alight' : null}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, paddingVertical: Spacing.two + 4, paddingRight: Spacing.two },
});
