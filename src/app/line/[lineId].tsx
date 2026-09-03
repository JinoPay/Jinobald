import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { DataSourceBanner } from '@/components/common/DataSourceBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { TrainTrack, type TrackRow } from '@/components/subway/TrainTrack';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { getLine, getLineGroup, type Line } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { useTrainPositions } from '@/hooks/use-train-positions';
import type { Direction, TrainPosition } from '@/services/subway/types';

/**
 * 노선 열차 위치 화면.
 *
 * 그룹의 본선 계통 하나를 세로 트랙으로 그리고, 선택한 방향의 열차를 역 옆에 얹습니다.
 * 지선 열차는 본선 응답에 섞여 오지만 인덱스가 다른 계통이라 이 화면에서는 걸러냅니다.
 */
export default function LineScreen() {
  const theme = useTheme();
  const { lineId } = useLocalSearchParams<{ lineId: string }>();
  const line = getLine(decodeURIComponent(lineId ?? ''));
  const group = line ? getLineGroup(line.groupId) : undefined;
  const supportedLine = line?.realtime === true;
  const { data, error, loading, supported, refresh } = useTrainPositions(supportedLine && line ? line.id : null);

  const directions: Direction[] = line?.loop ? ['inner', 'outer'] : ['up', 'down'];
  const [direction, setDirection] = useState<Direction>(directions[0]);

  const rows = useMemo(() => (line ? buildRows(line, data?.positions ?? [], direction) : []), [line, data, direction]);
  const count = data?.positions.filter((p) => p.lineId === line?.id && p.direction === direction).length ?? 0;

  if (!line) {
    return <EmptyState title="노선을 찾을 수 없습니다" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: `${group?.name ?? line.name} 열차 위치` }} />
      <View style={[styles.toolbar, { borderBottomColor: theme.border }]}>
        <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
          {directions.map((d) => {
            const selected = d === direction;
            return (
              <Pressable
                key={d}
                onPress={() => setDirection(d)}
                style={[styles.segmentItem, selected && { backgroundColor: line.color }]}>
                <Text style={[Typography.caption, { color: selected ? '#fff' : theme.text, fontWeight: '700' }]}>
                  {directionTitle(line, d)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[Typography.caption, Typography.numeric, { color: theme.textSecondary }]}>
          {data ? `${count}대 · ${new Date(data.fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : loading ? '불러오는 중' : ''}
        </Text>
      </View>

      {data ? <DataSourceBanner source={data.source} /> : null}
      {error ? (
        <View style={[styles.error, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[Typography.bodyStrong, { color: theme.danger }]}>열차 위치를 가져오지 못했습니다</Text>
          <Text style={[Typography.caption, { color: theme.textSecondary }]}>{error.message}</Text>
        </View>
      ) : null}

      {!supportedLine || !supported ? (
        <EmptyState
          title="이 노선은 열차 위치를 제공하지 않습니다"
          description={
            !supportedLine
              ? '서울 열린데이터광장 실시간 API 가 다루지 않는 노선입니다. 역 검색과 승하차 알림은 그대로 쓸 수 있습니다.'
              : '현재 데이터 소스가 열차 위치를 지원하지 않습니다. 설정에서 백엔드 또는 서울 직접 호출을 고르세요.'
          }
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => String(row.index)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <TrainTrack
              row={item}
              color={line.color}
              first={index === 0}
              last={index === rows.length - 1}
              onPressTrain={(train) =>
                Alert.alert(
                  `열차 ${train.trainNo}`,
                  `${train.terminalStationName}행${train.express ? ' · 급행' : ''}${train.lastTrain ? ' · 막차' : ''}\n${train.stationName} ${statusLabel(train.status)}`,
                )
              }
            />
          )}
        />
      )}
    </View>
  );
}

/** 열차 목록을 역 순서에 맞춰 행으로 묶습니다. 선택한 방향은 위에서 아래로 진행하도록 뒤집습니다. */
function buildRows(line: Line, positions: TrainPosition[], direction: Direction): TrackRow[] {
  const byIndex = new Map<number, TrainPosition[]>();
  for (const p of positions) {
    if (p.lineId !== line.id || p.direction !== direction || p.stationIndex === null) continue;
    (byIndex.get(p.stationIndex) ?? byIndex.set(p.stationIndex, []).get(p.stationIndex)!).push(p);
  }
  const rows = line.stations.map((station, index) => ({ index, name: station.name, trains: byIndex.get(index) ?? [] }));
  // 하행/외선은 배열 순서대로 진행하고, 상행/내선은 반대로 갑니다. 진행 방향이 화면 아래쪽이 되게 맞춥니다.
  return direction === 'down' || direction === 'outer' ? rows : rows.reverse();
}

function directionTitle(line: Line, direction: Direction): string {
  if (line.loop) return direction === 'inner' ? '내선순환' : '외선순환';
  return direction === 'up' ? `${line.upTerminal} 방면` : `${line.downTerminal} 방면`;
}

export function statusLabel(status: TrainPosition['status']): string {
  switch (status) {
    case 'entering':
      return '진입';
    case 'arrived':
      return '도착';
    case 'departed':
      return '출발';
    case 'prevDeparted':
      return '접근 중';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segment: { flexDirection: 'row', borderRadius: Radius.pill, padding: 3 },
  segmentItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  error: { marginHorizontal: Spacing.three, marginTop: Spacing.two, borderRadius: Radius.md, padding: Spacing.two + 4, gap: 4 },
  list: { paddingVertical: Spacing.two, paddingBottom: Spacing.six },
});
