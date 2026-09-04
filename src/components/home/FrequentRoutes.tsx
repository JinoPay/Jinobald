import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { getUniqueStation } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import type { SavedRoute } from '@/services/routes/saved';
import type { TripHistoryEntry } from '@/store/UserDataContext';

interface Props {
  history: TripHistoryEntry[];
  savedRoutes: SavedRoute[];
  onPress: (originKey: string, destinationKey: string) => void;
}

/** 끝낸 여정 이력에서 자주 간 출발·도착 쌍. 이미 저장한 경로는 뺍니다 — 그건 위 "내 경로"에 있습니다. */
export function frequentPairs(history: TripHistoryEntry[], savedRoutes: SavedRoute[], limit = 4) {
  const counts = new Map<string, { originKey: string; destinationKey: string; count: number; last: number }>();
  for (const entry of history) {
    const key = `${entry.originKey}>${entry.destinationKey}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      existing.last = Math.max(existing.last, entry.at);
    } else {
      counts.set(key, { originKey: entry.originKey, destinationKey: entry.destinationKey, count: 1, last: entry.at });
    }
  }
  const saved = new Set(savedRoutes.map((route) => `${route.originKey}>${route.destinationKey}`));
  return [...counts.entries()]
    .filter(([key, value]) => value.count >= 2 && !saved.has(key))
    .sort(([, a], [, b]) => b.count - a.count || b.last - a.last)
    .slice(0, limit)
    .map(([, value]) => value);
}

export function FrequentRoutes({ history, savedRoutes, onPress }: Props) {
  const theme = useTheme();
  const pairs = frequentPairs(history, savedRoutes);
  if (pairs.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {pairs.map((pair) => {
        const a = getUniqueStation(pair.originKey);
        const b = getUniqueStation(pair.destinationKey);
        if (!a || !b) return null;
        return (
          <Pressable
            key={`${pair.originKey}>${pair.destinationKey}`}
            onPress={() => onPress(pair.originKey, pair.destinationKey)}
            style={({ pressed }) => [
              styles.pill,
              { borderColor: theme.border, backgroundColor: theme.backgroundElement, opacity: pressed ? 0.6 : 1 },
            ]}>
            <Text style={[Typography.caption, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
              {a.displayName} → {b.displayName}
            </Text>
            <Text style={[Typography.caption, { color: theme.textSecondary }]}>{pair.count}회</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingVertical: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
});
