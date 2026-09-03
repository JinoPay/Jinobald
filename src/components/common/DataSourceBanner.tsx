import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { DataSourceKind } from '@/services/subway/types';

/** 실제 값이 아닌 소스만 배너를 띄웁니다. live·cached 는 표시하지 않습니다. */
const NOTICE: Partial<Record<DataSourceKind, string>> = {
  mock: '모의 데이터로 동작 중입니다. 백엔드 URL 이나 서울 열린데이터광장 인증키를 설정하면 실시간 정보로 바뀝니다.',
  timetable: '백엔드에 인증키가 없어 열차 시각표로 합성한 정보입니다. 실제 지연은 반영되지 않습니다.',
  stale: '오늘의 호출 한도를 아끼기 위해 잠시 전 값을 보여 주고 있습니다.',
};

export function DataSourceBanner({ source }: { source: DataSourceKind }) {
  const theme = useTheme();
  const notice = NOTICE[source];
  if (!notice) return null;
  return (
    <View style={[styles.banner, { backgroundColor: theme.backgroundSelected }]}>
      <Text style={[styles.text, { color: theme.textSecondary }]}>{notice}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  text: { fontSize: 12, lineHeight: 17 },
});
