import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { LineBadge } from '@/components/subway/LineBadge';
import { StationRow } from '@/components/subway/StationRow';
import { findStationRefs, searchStations, type UniqueStation } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { capabilities, notificationNotice } from '@/services/location/capabilities';

type Slot = 'origin' | 'destination';

export default function TripSearchScreen() {
  const theme = useTheme();
  const [origin, setOrigin] = useState<UniqueStation | null>(null);
  const [destination, setDestination] = useState<UniqueStation | null>(null);
  const [active, setActive] = useState<Slot | null>('origin');
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const results = useMemo(() => searchStations(query), [query]);

  /**
   * 승하차 알림은 한 노선 위에서 인덱스 차이로 방향과 남은 정거장을 계산합니다.
   * 그래서 두 역이 같은 운행 계통에 함께 있어야 합니다 (환승 경로는 아직 다루지 않습니다).
   */
  const sharedLines = useMemo(() => {
    if (!origin || !destination) return [];
    const destinationLineIds = new Set(
      findStationRefs(destination.displayName).map((ref) => ref.line.id),
    );
    return findStationRefs(origin.displayName)
      .filter((ref) => destinationLineIds.has(ref.line.id))
      .map((ref) => ref.line);
  }, [origin, destination]);

  const sameStation = origin && destination && origin.key === destination.key;
  const routeOk = origin && destination && !sameStation && sharedLines.length > 0;
  const ready = routeOk && capabilities.localNotifications;

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

  const startTrip = () => {
    if (!origin || !destination) return;
    router.push({
      pathname: '/trip/setup',
      params: { origin: origin.displayName, destination: destination.displayName },
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
        <View style={styles.actions}>
          {sameStation ? (
            <Text style={[styles.notice, { color: theme.danger }]}>
              출발역과 도착역이 같습니다.
            </Text>
          ) : null}

          {origin && destination && !sameStation && sharedLines.length === 0 ? (
            <Text style={[styles.notice, { color: theme.textSecondary }]}>
              두 역을 잇는 단일 노선이 없습니다. 승하차 알림은 환승 없이 한 노선으로 갈 수 있는
              구간만 지원합니다.
            </Text>
          ) : null}

          {sharedLines.length > 0 ? (
            <View style={styles.lineRow}>
              <Text style={[styles.notice, { color: theme.textSecondary }]}>이용 노선</Text>
              {sharedLines.map((line) => (
                <LineBadge key={line.id} groupId={line.groupId} size="sm" />
              ))}
            </View>
          ) : null}

          {notificationNotice ? (
            <Text style={[styles.notice, { color: theme.danger }]}>{notificationNotice}</Text>
          ) : null}

          <Pressable
            disabled={!ready}
            onPress={startTrip}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: ready ? theme.accent : theme.backgroundElement,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Text style={[styles.ctaText, { color: ready ? '#fff' : theme.textSecondary }]}>
              {ready
                ? '승하차 알림 설정'
                : routeOk
                  ? '이 환경에서는 알림을 예약할 수 없습니다'
                  : '출발역과 도착역을 선택해 주세요'}
            </Text>
          </Pressable>

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
        </View>
      )}
    </SafeAreaView>
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
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cta: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
  secondary: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  secondaryText: { fontSize: 15, fontWeight: '600' },
});
