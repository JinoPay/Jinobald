import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LineBadge } from '@/components/subway/LineBadge';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { getUniqueStation, type UniqueStation } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import type { RecentSearch } from '@/store/UserDataContext';

export type Slot = 'origin' | 'destination';

interface Props {
  origin: UniqueStation | null;
  destination: UniqueStation | null;
  active: Slot | null;
  recents: RecentSearch[];
  onFocusSlot: (slot: Slot) => void;
  onClear: (slot: Slot) => void;
  onSwap: () => void;
  onPickRecent: (search: RecentSearch) => void;
}

/** 출발·도착 슬롯과 최근 검색. 홈의 주인공이라 카드 하나로 묶어 그림자를 줍니다. */
export function RouteSearchCard({ origin, destination, active, recents, onFocusSlot, onClear, onSwap, onPickRecent }: Props) {
  const theme = useTheme();
  const pairs = recents.filter((r) => r.destinationKey).slice(0, 6);
  return (
    <View style={[styles.card, Shadow, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.slots}>
        <View style={styles.slotColumn}>
          <StationSlot
            label="출발"
            placeholder="출발역 검색"
            station={origin}
            active={active === 'origin'}
            onPress={() => onFocusSlot('origin')}
            onClear={() => onClear('origin')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <StationSlot
            label="도착"
            placeholder="도착역 검색"
            station={destination}
            active={active === 'destination'}
            onPress={() => onFocusSlot('destination')}
            onClear={() => onClear('destination')}
          />
        </View>
        <Pressable
          onPress={onSwap}
          disabled={!origin && !destination}
          hitSlop={8}
          accessibilityLabel="출발역과 도착역 바꾸기"
          style={({ pressed }) => [
            styles.swap,
            { borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.6 : 1 },
          ]}>
          <Text style={[styles.swapIcon, { color: theme.text }]}>⇅</Text>
        </Pressable>
      </View>

      {pairs.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recents}>
          {pairs.map((r) => {
            const a = getUniqueStation(r.originKey);
            const b = getUniqueStation(r.destinationKey!);
            if (!a || !b) return null;
            return (
              <Pressable
                key={`${r.originKey}>${r.destinationKey}`}
                onPress={() => onPickRecent(r)}
                style={({ pressed }) => [
                  styles.recent,
                  { borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.6 : 1 },
                ]}>
                <Text style={[Typography.caption, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                  {a.displayName} → {b.displayName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
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

export function StationSlot({ label, placeholder, station, active, onPress, onClear }: SlotProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.slot, pressed && { opacity: 0.7 }]}>
      <Text style={[Typography.caption, { color: active ? theme.accent : theme.textSecondary, fontWeight: '700', width: 30 }]}>
        {label}
      </Text>
      <Text
        style={[styles.slotValue, { color: station ? theme.text : theme.textSecondary }]}
        numberOfLines={1}>
        {station?.displayName ?? placeholder}
      </Text>
      {station ? (
        <View style={styles.slotBadges}>
          {station.groupIds.slice(0, 3).map((id) => (
            <LineBadge key={id} groupId={id} size="sm" />
          ))}
          <Pressable onPress={onClear} hitSlop={10} accessibilityLabel={`${label}역 지우기`} style={styles.clear}>
            <Text style={{ color: theme.textSecondary, fontSize: 15 }}>✕</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    padding: Spacing.two + 4,
    gap: Spacing.two + 2,
  },
  slots: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  slotColumn: { flex: 1 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 10, paddingHorizontal: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 38 },
  slotValue: { flex: 1, fontSize: 17, fontWeight: '600' },
  slotBadges: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clear: { paddingLeft: 6 },
  swap: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  swapIcon: { fontSize: 18, fontWeight: '700' },
  recents: { gap: Spacing.two, paddingTop: 2 },
  recent: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
});
