import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TrainPosition } from '@/services/subway/types';

export interface TrackRow {
  index: number;
  name: string;
  trains: TrainPosition[];
}

interface Props {
  row: TrackRow;
  color: string;
  first: boolean;
  last: boolean;
  /** 현재 여정의 승차역·하차역처럼 강조할 역. */
  highlight?: 'board' | 'alight' | null;
  onPressTrain?: (train: TrainPosition) => void;
}

/**
 * 세로 노선 트랙의 한 행. 왼쪽에 노선색 선과 역 점, 가운데 역명, 오른쪽에 열차 마커.
 * 역 사이를 달리는 열차(출발·접근)는 점 위쪽에 살짝 띄워 "아직 안 왔다"가 보이게 합니다.
 */
export function TrainTrack({ row, color, first, last, highlight = null, onPressTrain }: Props) {
  const theme = useTheme();
  const atStation = row.trains.filter((t) => t.status === 'arrived' || t.status === 'entering');
  const between = row.trains.filter((t) => t.status !== 'arrived' && t.status !== 'entering');
  return (
    <View style={styles.row}>
      <View style={styles.trackColumn}>
        <View style={[styles.line, { backgroundColor: first ? 'transparent' : color }]} />
        <View
          style={[
            styles.dot,
            { borderColor: color, backgroundColor: highlight ? color : theme.background },
            highlight && styles.dotHighlight,
          ]}
        />
        <View style={[styles.line, { backgroundColor: last ? 'transparent' : color }]} />
      </View>
      <View style={styles.body}>
        {between.length > 0 ? (
          <View style={styles.markers}>
            {between.map((t) => (
              <TrainMarker key={t.trainNo} train={t} color={color} faded onPress={onPressTrain} />
            ))}
          </View>
        ) : null}
        <View style={styles.stationRow}>
          <Text
            style={[
              highlight ? Typography.bodyStrong : Typography.body,
              { color: highlight ? theme.text : theme.text, flex: 1 },
            ]}
            numberOfLines={1}>
            {row.name}
            {highlight === 'board' ? '  · 승차' : highlight === 'alight' ? '  · 하차' : ''}
          </Text>
          <View style={styles.markers}>
            {atStation.map((t) => (
              <TrainMarker key={t.trainNo} train={t} color={color} onPress={onPressTrain} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function TrainMarker({
  train,
  color,
  faded = false,
  onPress,
}: {
  train: TrainPosition;
  color: string;
  faded?: boolean;
  onPress?: (train: TrainPosition) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress?.(train)}
      hitSlop={6}
      style={[styles.marker, { backgroundColor: color, opacity: faded ? 0.55 : 1 }]}>
      <Text style={styles.markerText} numberOfLines={1}>
        {train.express ? '급행 ' : ''}
        {train.trainNo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: Spacing.three, minHeight: 44 },
  trackColumn: { width: 20, alignItems: 'center' },
  line: { flex: 1, width: 4 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  dotHighlight: { width: 18, height: 18, borderRadius: 9 },
  body: { flex: 1, paddingLeft: Spacing.two + 4, justifyContent: 'center' },
  stationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 8 },
  markers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4 },
  marker: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 120 },
  markerText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
