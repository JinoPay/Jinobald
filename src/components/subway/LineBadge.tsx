import { StyleSheet, Text, View } from 'react-native';

import { getLine } from '@/data/stations';

interface Props {
  lineId: string;
  size?: 'sm' | 'md';
}

/** 노선 번호를 노선 색 원형 배지로 표시합니다. */
export function LineBadge({ lineId, size = 'md' }: Props) {
  const line = getLine(lineId);
  const dimension = size === 'sm' ? 20 : 26;
  return (
    <View
      style={[
        styles.badge,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: line?.color ?? '#888',
        },
      ]}>
      <Text style={[styles.text, { fontSize: size === 'sm' ? 11 : 13 }]}>{lineId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' },
});
