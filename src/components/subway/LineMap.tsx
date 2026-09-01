import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line as SvgLine } from 'react-native-svg';

import { isTransferStation, type Line } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  line: Line;
  onSelectStation: (stationName: string) => void;
}

const ROW_HEIGHT = 44;
const SPINE_X = 22;

/**
 * 세로 노선도.
 *
 * 역 하나당 한 행이고 왼쪽에 노선 색 척추와 역 노드를 SVG 로 그립니다.
 * 환승역은 속이 빈 큰 원으로 구분합니다 (환승 여부는 데이터에서 파생됩니다).
 */
export function LineMap({ line, onSelectStation }: Props) {
  const theme = useTheme();
  const height = line.stations.length * ROW_HEIGHT;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ height }}>
        <Svg width={SPINE_X * 2} height={height} style={StyleSheet.absoluteFill}>
          <SvgLine
            x1={SPINE_X}
            y1={ROW_HEIGHT / 2}
            x2={SPINE_X}
            y2={height - ROW_HEIGHT / 2}
            stroke={line.color}
            strokeWidth={6}
            strokeLinecap="round"
          />
          {line.stations.map((station, i) => {
            const cy = i * ROW_HEIGHT + ROW_HEIGHT / 2;
            const transfer = isTransferStation(station.name);
            return (
              <Circle
                key={`${station.name}-${i}`}
                cx={SPINE_X}
                cy={cy}
                r={transfer ? 7 : 4.5}
                fill={transfer ? theme.background : line.color}
                stroke={line.color}
                strokeWidth={transfer ? 3 : 0}
              />
            );
          })}
        </Svg>

        {line.stations.map((station, i) => (
          <Pressable
            key={`${station.name}-${i}`}
            onPress={() => onSelectStation(station.name)}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: theme.backgroundSelected },
            ]}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {station.name}
            </Text>
            {station.lat == null ? null : (
              <Text style={[styles.gps, { color: theme.textSecondary }]}>GPS</Text>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingRight: 16 },
  row: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingLeft: SPINE_X * 2 + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: { flex: 1, fontSize: 15 },
  gps: { fontSize: 10, fontWeight: '700' },
});
