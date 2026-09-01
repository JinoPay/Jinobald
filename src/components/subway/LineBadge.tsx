import { StyleSheet, Text, View } from 'react-native';

import { getLineGroup } from '@/data/stations';

interface Props {
  /** 노선 그룹 id ("1", "gyeongui" …). */
  groupId: string;
  size?: 'sm' | 'md';
}

/**
 * 노선을 노선 색 배지로 표시합니다.
 *
 * 라벨이 한 글자면 원, 두 글자 이상이면 알약 모양입니다. 광역철도는 번호가 없어
 * "경의", "수인" 같은 축약 라벨을 쓰기 때문입니다.
 */
export function LineBadge({ groupId, size = 'md' }: Props) {
  const group = getLineGroup(groupId);
  const label = group?.badge ?? '?';
  const height = size === 'sm' ? 20 : 26;
  const fontSize = size === 'sm' ? 11 : 13;
  const wide = label.length > 1;

  return (
    <View
      style={[
        styles.badge,
        {
          height,
          minWidth: height,
          borderRadius: height / 2,
          paddingHorizontal: wide ? height * 0.3 : 0,
          backgroundColor: group?.color ?? '#888',
        },
      ]}>
      <Text style={[styles.text, { fontSize }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' },
});
