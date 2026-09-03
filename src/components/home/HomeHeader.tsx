import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeSource } from '@/services/subway';

/** 앱 이름과 지금 어떤 데이터로 동작 중인지. 모의·시간표 모드는 항상 눈에 띄어야 합니다. */
export function HomeHeader() {
  const theme = useTheme();
  const source = describeSource();
  const dot = source.kind === 'mock' ? theme.textSecondary : source.kind === 'backend' ? theme.success : theme.accent;
  return (
    <View style={styles.row}>
      <Text style={[Typography.title, { color: theme.text }]}>지노발드 지하철</Text>
      <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={[Typography.caption, { color: theme.textSecondary, fontWeight: '600' }]}>{source.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
