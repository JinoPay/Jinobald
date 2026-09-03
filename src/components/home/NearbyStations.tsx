import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { StationRow } from '@/components/subway/StationRow';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { type UniqueStation } from '@/data/stations';
import { useNearbyStations } from '@/hooks/use-nearby-stations';
import { useTheme } from '@/hooks/use-theme';

import { SectionTitle } from './SectionTitle';

interface Props {
  onPress: (station: UniqueStation) => void;
}

/** 내 주변 역. 위치 권한은 버튼을 눌렀을 때만 요청합니다. */
export function NearbyStations({ onPress }: Props) {
  const theme = useTheme();
  const { status, stations, locate } = useNearbyStations();
  if (status === 'unavailable' && stations.length === 0) return null;

  return (
    <View>
      <SectionTitle
        title="내 주변"
        action={status === 'ready' ? { label: '다시 찾기', onPress: () => void locate() } : undefined}
      />
      {status === 'idle' || status === 'requesting' ? (
        <Pressable
          onPress={() => void locate()}
          disabled={status === 'requesting'}
          style={({ pressed }) => [
            styles.button,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text style={[Typography.bodyStrong, { color: theme.accent }]}>
            {status === 'requesting' ? '위치 확인 중…' : '가까운 역 찾기'}
          </Text>
          <Text style={[Typography.caption, { color: theme.textSecondary }]}>
            현재 위치에서 가까운 역과 도착 정보를 봅니다. 위치는 기기 안에서만 씁니다.
          </Text>
        </Pressable>
      ) : status === 'denied' ? (
        <Pressable onPress={() => void Linking.openSettings()} style={[styles.button, { borderColor: theme.border }]}>
          <Text style={[Typography.bodyStrong, { color: theme.text }]}>위치 권한이 꺼져 있습니다</Text>
          <Text style={[Typography.caption, { color: theme.textSecondary }]}>시스템 설정에서 허용하면 주변 역을 보여 드립니다.</Text>
        </Pressable>
      ) : (
        <View style={[styles.list, { backgroundColor: theme.backgroundElement }]}>
          {stations.map(({ station, meters }) => (
            <StationRow
              key={station.key}
              name={station.displayName}
              groupIds={station.groupIds}
              subtitle={meters < 1000 ? `${Math.round(meters / 10) * 10}m` : `${(meters / 1000).toFixed(1)}km`}
              onPress={() => onPress(station)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 4,
  },
  list: { marginHorizontal: Spacing.three, borderRadius: Radius.lg, overflow: 'hidden' },
});
