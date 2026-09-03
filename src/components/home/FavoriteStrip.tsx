import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LineBadge } from '@/components/subway/LineBadge';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { getUniqueStation, type UniqueStation } from '@/data/stations';
import type { FavoritePreview } from '@/hooks/use-favorite-arrivals';
import { useTheme } from '@/hooks/use-theme';
import { formatCountdown } from '@/services/alerts/eta';
import type { FavoriteLabel, FavoriteStation } from '@/store/UserDataContext';

interface Props {
  favorites: FavoriteStation[];
  previews: Record<string, FavoritePreview>;
  /** 카운트다운 보간용 현재 시각(ms). 부모가 1초마다 갱신합니다. */
  now: number;
  onPress: (station: UniqueStation) => void;
  onLongPress: (station: UniqueStation) => void;
  /** 집/회사 칩이 비어 있을 때 눌러서 역을 고르게 합니다. */
  onAssign: (label: Exclude<FavoriteLabel, null>) => void;
}

const LABEL_TEXT: Record<Exclude<FavoriteLabel, null>, { icon: string; name: string }> = {
  home: { icon: '⌂', name: '집' },
  work: { icon: '▣', name: '회사' },
};

/**
 * 집·회사·즐겨찾기 칩. 각 칩에는 가장 빨리 오는 열차까지의 시간이 얹힙니다 —
 * 홈에서 탭 한 번 없이 "지금 나가면 되나"를 답하는 것이 이 줄의 역할입니다.
 */
export function FavoriteStrip({ favorites, previews, now, onPress, onLongPress, onAssign }: Props) {
  const theme = useTheme();
  const labelled = (label: Exclude<FavoriteLabel, null>) => favorites.find((f) => f.label === label);
  const others = favorites.filter((f) => f.label === null);

  const renderChip = (fav: FavoriteStation | undefined, label: Exclude<FavoriteLabel, null> | null) => {
    const station = fav ? getUniqueStation(fav.key) : undefined;
    const key = fav?.key ?? `assign-${label}`;
    if (!station) {
      if (!label) return null;
      return (
        <Pressable
          key={key}
          onPress={() => onAssign(label)}
          style={({ pressed }) => [
            styles.chip,
            styles.chipEmpty,
            { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
          ]}>
          <Text style={[Typography.bodyStrong, { color: theme.textSecondary }]}>
            {LABEL_TEXT[label].icon} {LABEL_TEXT[label].name} 설정
          </Text>
        </Pressable>
      );
    }
    const preview = previews[station.displayName];
    const soonest = preview?.soonest;
    const remaining =
      soonest?.secondsUntilArrival != null
        ? Math.max(0, soonest.secondsUntilArrival - Math.floor((now - preview.fetchedAt) / 1000))
        : null;
    return (
      <Pressable
        key={key}
        onPress={() => onPress(station)}
        onLongPress={() => onLongPress(station)}
        style={({ pressed }) => [styles.chip, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 }]}>
        <View style={styles.chipHeader}>
          <Text style={[Typography.caption, { color: theme.textSecondary, fontWeight: '700' }]}>
            {label ? `${LABEL_TEXT[label].icon} ${LABEL_TEXT[label].name}` : '★ 즐겨찾기'}
          </Text>
          <View style={styles.badges}>
            {station.groupIds.slice(0, 3).map((id) => (
              <LineBadge key={id} groupId={id} size="sm" />
            ))}
          </View>
        </View>
        <Text style={[Typography.heading, { color: theme.text }]} numberOfLines={1}>
          {station.displayName}
        </Text>
        <Text style={[Typography.caption, Typography.numeric, { color: soonest ? theme.accent : theme.textSecondary }]} numberOfLines={1}>
          {soonest
            ? remaining === null
              ? `${soonest.terminalStationName}행 도착`
              : `${soonest.terminalStationName}행 ${formatCountdown(remaining)}`
            : '도착 정보 없음'}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {renderChip(labelled('home'), 'home')}
      {renderChip(labelled('work'), 'work')}
      {others.map((f) => renderChip(f, null))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  chip: { width: 156, borderRadius: Radius.lg, padding: Spacing.two + 4, gap: 4 },
  chipEmpty: { borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  chipHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badges: { flexDirection: 'row', gap: 3 },
});
