import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  title: string;
  /** 오른쪽 끝의 보조 동작 ("전체 보기", "지우기" …). */
  action?: { label: string; onPress: () => void };
}

export function SectionTitle({ title, action }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[Typography.section, { color: theme.textSecondary }]}>{title}</Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={[Typography.caption, { color: theme.accent, fontWeight: '600' }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
});
