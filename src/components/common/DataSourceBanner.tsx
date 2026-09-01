import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface Props {
  source: 'live' | 'mock';
}

/**
 * 지금 보고 있는 값이 실제 도착정보인지 모의 데이터인지 항상 드러냅니다.
 * 인증키 없이도 앱이 동작하기 때문에, 이 표시가 없으면 사용자가 혼동합니다.
 */
export function DataSourceBanner({ source }: Props) {
  const theme = useTheme();
  if (source === 'live') return null;
  return (
    <View style={[styles.banner, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        모의 데이터 · 실시간 정보를 보려면 설정에서 API 키를 등록하세요
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 12 },
  text: { fontSize: 13 },
});
