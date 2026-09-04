import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LineBadge } from '@/components/subway/LineBadge';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { getUniqueStation, groupIdOf } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/services/alerts/eta';
import type { SavedRoute } from '@/services/routes/saved';

interface Props {
  routes: SavedRoute[];
  onPress: (route: SavedRoute) => void;
  onLongPress: (route: SavedRoute) => void;
}

/** 홈 상단의 "내 경로" 칩. 탭하면 바로 알림 설정 화면으로 갑니다 — 출퇴근은 검색 없이 두 번 눌러 시작합니다. */
export function SavedRoutesStrip({ routes, onPress, onLongPress }: Props) {
  const theme = useTheme();
  if (routes.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {routes.map((route) => {
        const origin = getUniqueStation(route.originKey)?.displayName ?? route.originKey;
        const destination = getUniqueStation(route.destinationKey)?.displayName ?? route.destinationKey;
        const groups = [...new Set(route.plan.legs.map((leg) => groupIdOf(leg.lineId)))];
        return (
          <Pressable
            key={route.id}
            onPress={() => onPress(route)}
            onLongPress={() => onLongPress(route)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.backgroundElement, borderColor: theme.accent, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Text style={[Typography.bodyStrong, { color: theme.text }]} numberOfLines={1}>
              {route.name}
            </Text>
            <Text style={[Typography.caption, { color: theme.textSecondary }]} numberOfLines={1}>
              {origin} → {destination} · {formatDuration(route.plan.totalSeconds)}
            </Text>
            <View style={styles.badges}>
              {groups.slice(0, 4).map((id) => (
                <LineBadge key={id} groupId={id} size="sm" />
              ))}
              {route.plan.transferCount > 0 ? (
                <Text style={[Typography.caption, { color: theme.textSecondary }]}>환승 {route.plan.transferCount}</Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingVertical: Spacing.two },
  chip: { minWidth: 168, maxWidth: 240, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
