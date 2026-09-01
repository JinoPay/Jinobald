import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { LineBadge } from '@/components/subway/LineBadge';
import { RouteSummary } from '@/components/subway/RouteSummary';
import { StationRow } from '@/components/subway/StationRow';
import { getUniqueStation, searchStations, type UniqueStation } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/services/alerts/eta';
import { notificationNotice } from '@/services/location/capabilities';
import { findRoutes } from '@/services/routing';
import type { RoutePlan } from '@/services/routing/types';

type Slot = 'origin' | 'destination';

export default function TripSearchScreen() {
  const theme = useTheme();
  const [origin, setOrigin] = useState<UniqueStation | null>(null);
  const [destination, setDestination] = useState<UniqueStation | null>(null);
  const [active, setActive] = useState<Slot | null>('origin');
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const results = useMemo(() => searchStations(query), [query]);

  // 실시간 도착 화면에서 "이 역에서 출발"로 넘어온 경우 출발역을 채워 둡니다.
  //
  // 탭 화면은 계속 마운트된 채로 남아 있어서 초기값만으로는 부족하고, 파라미터가
  // 바뀔 때마다 반영해야 합니다. 렌더 중에 조정하는 방식이라 effect 로 한 번 더
  // 그리지 않습니다.
  const { origin: originParam } = useLocalSearchParams<{ origin?: string }>();
  const [appliedOriginParam, setAppliedOriginParam] = useState(originParam);
  if (originParam !== appliedOriginParam) {
    setAppliedOriginParam(originParam);
    const station = originParam ? getUniqueStation(originParam) : null;
    if (station) {
      setOrigin(station);
      setActive('destination');
      setQuery('');
    }
  }

  /** 최소 시간 · 최소 환승 후보. 두 역이 이어져 있지 않으면 빈 배열입니다. */
  const routes = useMemo(
    () => (origin && destination ? findRoutes(origin.key, destination.key) : []),
    [origin, destination],
  );

  const sameStation = origin && destination && origin.key === destination.key;

  const focusSlot = (slot: Slot) => {
    setActive(slot);
    setQuery('');
    inputRef.current?.focus();
  };

  const pick = (station: UniqueStation) => {
    if (active === 'destination') {
      setDestination(station);
      // 출발역이 아직 비어 있으면 자연스럽게 그쪽으로 넘어갑니다.
      if (!origin) return focusSlot('origin');
    } else {
      setOrigin(station);
      if (!destination) return focusSlot('destination');
    }
    setActive(null);
    setQuery('');
  };

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const openArrivals = (station: UniqueStation) => {
    router.push(`/station/${encodeURIComponent(station.key)}`);
  };

  // 경로 객체 대신 후보 번호만 넘깁니다. expo-router 는 params 를 문자열로 만들고,
  // 탐색이 1ms 라 setup 화면에서 다시 찾는 편이 캐시보다 싸고 딥링크에도 안전합니다.
  const openRoute = (index: number) => {
    if (!origin || !destination) return;
    router.push({
      pathname: '/trip/setup',
      params: { origin: origin.key, destination: destination.key, plan: String(index) },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.slots}>
        <View style={styles.slotColumn}>
          <StationSlot
            label="출발역"
            placeholder="출발역을 검색해 주세요"
            station={origin}
            active={active === 'origin'}
            onPress={() => focusSlot('origin')}
            onClear={() => setOrigin(null)}
          />
          <StationSlot
            label="도착역"
            placeholder="도착역을 검색해 주세요"
            station={destination}
            active={active === 'destination'}
            onPress={() => focusSlot('destination')}
            onClear={() => setDestination(null)}
          />
        </View>
        <Pressable
          onPress={swap}
          disabled={!origin && !destination}
          hitSlop={8}
          style={({ pressed }) => [
            styles.swap,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundElement,
              opacity: pressed ? 0.6 : 1,
            },
          ]}>
          <Text style={[styles.swapIcon, { color: theme.text }]}>⇅</Text>
        </Pressable>
      </View>

      {active ? (
        <>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={active === 'origin' ? '출발역을 검색해 주세요' : '도착역을 검색해 주세요'}
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.search,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <FlatList
            data={results}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <StationRow name={item.displayName} groupIds={item.groupIds} onPress={() => pick(item)} />
            )}
            ListEmptyComponent={
              query.trim().length === 0 ? (
                <EmptyState
                  title="역 이름을 입력해 주세요"
                  description="수도권 전철 651개 역을 검색할 수 있습니다."
                />
              ) : (
                <EmptyState
                  title="일치하는 역이 없습니다"
                  description="역 이름의 일부만 입력해도 찾을 수 있습니다."
                />
              )
            }
          />
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.actions} keyboardShouldPersistTaps="handled">
          {sameStation ? (
            <Text style={[styles.notice, { color: theme.danger }]}>
              출발역과 도착역이 같습니다.
            </Text>
          ) : null}

          {!origin || !destination ? (
            <Text style={[styles.notice, { color: theme.textSecondary }]}>
              출발역과 도착역을 선택하면 경로를 찾아 드립니다.
            </Text>
          ) : null}

          {origin && destination && !sameStation && routes.length === 0 ? (
            <Text style={[styles.notice, { color: theme.textSecondary }]}>
              두 역을 잇는 경로를 찾지 못했습니다.
            </Text>
          ) : null}

          {notificationNotice ? (
            <Text style={[styles.notice, { color: theme.danger }]}>{notificationNotice}</Text>
          ) : null}

          {routes.map((plan, index) => (
            <RouteCard key={plan.id} plan={plan} onPress={() => openRoute(index)} />
          ))}

          {origin ? (
            <Pressable
              onPress={() => openArrivals(origin)}
              style={({ pressed }) => [
                styles.secondary,
                { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}>
              <Text style={[styles.secondaryText, { color: theme.text }]}>
                {origin.displayName} 실시간 도착 보기
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const ROUTE_LABEL: Record<RoutePlan['label'], string> = {
  fastest: '최소 시간',
  'fewest-transfers': '최소 환승',
};

/**
 * 알림을 못 쓰는 환경(웹)에서도 카드는 누를 수 있습니다. 경로 자체는 볼 수 있어야
 * 하고, 알림 예약 불가는 다음 화면의 버튼이 막아 줍니다.
 */
function RouteCard({ plan, onPress }: { plan: RoutePlan; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.routeCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <View style={styles.routeHeader}>
        <Text style={[styles.routeDuration, { color: theme.text }]}>
          {formatDuration(plan.totalSeconds)}
        </Text>
        <Text style={[styles.routeMeta, { color: theme.textSecondary }]}>
          {plan.transferCount === 0 ? '환승 없음' : `환승 ${plan.transferCount}회`} ·{' '}
          {plan.totalStations}정거장
        </Text>
        <View style={styles.routeSpacer} />
        <Text style={[styles.routeLabel, { color: theme.accent, borderColor: theme.accent }]}>
          {ROUTE_LABEL[plan.label]}
        </Text>
      </View>

      <RouteSummary plan={plan} size="sm" />

      {plan.hasNonRealtimeLine ? (
        <Text style={[styles.routeNotice, { color: theme.textSecondary }]}>
          실시간 도착정보가 없는 노선이 포함되어 노선 평균으로 추정합니다.
        </Text>
      ) : null}
    </Pressable>
  );
}

interface SlotProps {
  label: string;
  placeholder: string;
  station: UniqueStation | null;
  active: boolean;
  onPress: () => void;
  onClear: () => void;
}

function StationSlot({ label, placeholder, station, active, onPress, onClear }: SlotProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.slot,
        {
          borderColor: active ? theme.accent : theme.border,
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
        },
      ]}>
      <Text style={[styles.slotLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.slotValueRow}>
        <Text
          style={[
            styles.slotValue,
            { color: station ? theme.text : theme.textSecondary },
          ]}
          numberOfLines={1}>
          {station?.displayName ?? placeholder}
        </Text>
        {station ? (
          <View style={styles.slotBadges}>
            {station.groupIds.map((id) => (
              <LineBadge key={id} groupId={id} size="sm" />
            ))}
            <Pressable onPress={onClear} hitSlop={8} style={styles.clear}>
              <Text style={{ color: theme.textSecondary, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slots: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  slotColumn: { flex: 1, gap: 8 },
  slot: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  slotLabel: { fontSize: 12, fontWeight: '600' },
  slotValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotValue: { flex: 1, fontSize: 17, fontWeight: '600' },
  slotBadges: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clear: { paddingLeft: 4 },
  swap: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  swapIcon: { fontSize: 20, fontWeight: '700' },
  search: {
    height: 44,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  actions: { padding: 16, gap: 12 },
  notice: { fontSize: 13, lineHeight: 18 },
  routeCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDuration: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  routeMeta: { fontSize: 13 },
  routeSpacer: { flex: 1 },
  routeLabel: {
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  routeNotice: { fontSize: 12, lineHeight: 16 },
  secondary: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  secondaryText: { fontSize: 15, fontWeight: '600' },
});
