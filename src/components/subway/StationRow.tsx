import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { LineBadge } from './LineBadge';

interface Props {
  name: string;
  lineIds: string[];
  subtitle?: string;
  onPress?: () => void;
}

export function StationRow({ name, lineIds, subtitle, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <View style={styles.text}>
        <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={styles.badges}>
        {lineIds.map((id) => (
          <LineBadge key={id} lineId={id} size="sm" />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13 },
  badges: { flexDirection: 'row', gap: 4 },
});
