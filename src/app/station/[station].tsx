import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DataSourceBanner } from '@/components/common/DataSourceBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { ArrivalCard } from '@/components/subway/ArrivalCard';
import { LineBadge } from '@/components/subway/LineBadge';
import { directionLabel, getLine, getUniqueStation } from '@/data/stations';
import { useArrivals } from '@/hooks/use-arrivals';
import { useTheme } from '@/hooks/use-theme';
import type { Arrival, Direction } from '@/services/subway/types';

export default function StationScreen() {
  const theme = useTheme();
  const { station: stationKey } = useLocalSearchParams<{ station: string }>();
  const station = getUniqueStation(decodeURIComponent(stationKey ?? ''));

  // 이 역을 지나는 노선 중 하나라도 실시간 도착 API 범위 안이어야 조회할 값이 있습니다.
  // (인천1·2호선, 경전철, GTX 등은 서울 열린데이터광장이 다루지 않습니다.)
  const hasRealtime = useMemo(
    () => (station?.lineIds ?? []).some((id) => getLine(id)?.realtime === true),
    [station],
  );

  const { data, error, loading, refresh } = useArrivals(
    station && hasRealtime ? station.displayName : null,
  );
  const [now, setNow] = useState(() => Date.now());

  // 폴링 사이에도 카운트다운이 멈춰 보이지 않도록 초 단위로 로컬 보간합니다.
  // 경과 시간을 상태로 두지 않고 벽시계만 흘려보내면, 새 응답이 오는 순간
  // fetchedAt 이 바뀌면서 경과 시간이 저절로 0 으로 돌아갑니다.
  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [data]);

  // now 가 아직 이전 틱이라 응답 직후 음수가 될 수 있어 0 으로 잘라 냅니다.
  const elapsed = data ? Math.max(0, Math.floor((now - data.fetchedAt) / 1000)) : 0;

  const grouped = useMemo(() => {
    const map = new Map<string, Arrival[]>();
    for (const arrival of data?.arrivals ?? []) {
      const key = `${arrival.lineId}|${arrival.direction}`;
      const bucket = map.get(key) ?? [];
      bucket.push(arrival);
      map.set(key, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => (a.secondsUntilArrival ?? 1e9) - (b.secondsUntilArrival ?? 1e9));
    }
    return [...map.entries()];
  }, [data]);

  if (!station) {
    return (
      <EmptyState
        title="역을 찾을 수 없습니다"
        description="수도권 전철 1~9호선과 광역철도를 다룹니다."
      />
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{station.displayName}</Text>
        <View style={styles.badges}>
          {station.groupIds.map((id) => (
            <LineBadge key={id} groupId={id} />
          ))}
        </View>
      </View>

      {data ? <DataSourceBanner source={data.source} /> : null}

      {error ? (
        <View style={[styles.error, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.errorTitle, { color: theme.danger }]}>{errorTitle(error.kind)}</Text>
          <Text style={[styles.errorBody, { color: theme.textSecondary }]}>{error.message}</Text>
        </View>
      ) : null}

      {!hasRealtime ? (
        <EmptyState
          title="실시간 도착 정보를 제공하지 않는 노선입니다"
          description="서울 열린데이터광장 도착정보 API 가 이 노선을 다루지 않습니다. 노선도와 승하차 알림은 그대로 쓸 수 있습니다."
        />
      ) : grouped.length === 0 && !loading ? (
        <EmptyState title="도착 예정 열차가 없습니다" description="잠시 후 다시 시도해 주세요." />
      ) : null}

      {grouped.map(([key, arrivals]) => {
        const [lineId, direction] = key.split('|');
        const line = getLine(lineId);
        return (
          <View key={key} style={styles.group}>
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>
              {line ? directionLabel(line, direction as Direction) : direction}
            </Text>
            {arrivals.slice(0, 3).map((arrival) => (
              <ArrivalCard key={arrival.id} arrival={arrival} elapsedSeconds={elapsed} />
            ))}
          </View>
        );
      })}

      <Pressable
        onPress={() =>
          // 알림을 걸려면 도착역까지 정해져야 경로가 나옵니다. 이 역을 출발역으로
          // 채운 채 길찾기로 돌려보냅니다.
          router.navigate({ pathname: '/', params: { origin: station.key } })
        }
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
        ]}>
        <Text style={styles.ctaText}>이 역에서 출발하는 경로 찾기</Text>
      </Pressable>
    </ScrollView>
  );
}

function errorTitle(kind: string): string {
  switch (kind) {
    case 'auth':
      return '인증키 오류 — 설정에서 키를 확인하세요';
    case 'quota':
      return '일일 호출 한도를 초과했습니다';
    case 'timeout':
      return '응답이 지연되고 있습니다';
    case 'network':
      return '네트워크 오류';
    default:
      return '도착정보를 가져오지 못했습니다';
  }
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700', flex: 1 },
  badges: { flexDirection: 'row', gap: 4 },
  group: { gap: 8, marginBottom: 12 },
  groupTitle: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  error: { borderRadius: 10, padding: 12, gap: 4, marginBottom: 8 },
  errorTitle: { fontSize: 14, fontWeight: '700' },
  errorBody: { fontSize: 13 },
  cta: { marginTop: 8, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
