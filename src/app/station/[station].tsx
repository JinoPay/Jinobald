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

  const { data, error, loading, refresh } = useArrivals(station?.displayName ?? null);
  const [elapsed, setElapsed] = useState(0);

  // 폴링 사이에도 카운트다운이 멈춰 보이지 않도록 초 단위로 로컬 보간합니다.
  useEffect(() => {
    setElapsed(0);
    if (!data) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - data.fetchedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [data]);

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
        description="현재 데이터셋은 서울 1~9호선 본선만 포함합니다."
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
          {station.lineIds.map((id) => (
            <LineBadge key={id} lineId={id} />
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

      {grouped.length === 0 && !loading ? (
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
          router.push({
            pathname: '/trip/setup',
            params: { origin: station.displayName },
          })
        }
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
        ]}>
        <Text style={styles.ctaText}>이 역에서 승차 알림 설정</Text>
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
