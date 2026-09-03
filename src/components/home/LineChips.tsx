import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LineBadge } from '@/components/subway/LineBadge';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { getLine, LINE_GROUPS } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';

import { SectionTitle } from './SectionTitle';

/** 노선별 열차 위치 화면으로 가는 칩. 실시간이 없는 노선은 흐리게 두되 들어갈 수는 있게 합니다. */
export function LineChips() {
  const theme = useTheme();
  return (
    <View>
      <SectionTitle title="노선별 열차 위치" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {LINE_GROUPS.map((group) => {
          const main = getLine(group.lineIds[0]);
          const realtime = main?.realtime === true;
          return (
            <Pressable
              key={group.id}
              onPress={() => router.push(`/line/${encodeURIComponent(group.lineIds[0])}`)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : realtime ? 1 : 0.55 },
              ]}>
              <LineBadge groupId={group.id} size="sm" />
              <Text style={[Typography.caption, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                {group.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
});
