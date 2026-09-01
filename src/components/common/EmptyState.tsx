import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface Props {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 6 },
  title: { fontSize: 16, fontWeight: '600' },
  description: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
