import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { getUniqueStation } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { timeLabel } from '@/services/routines/types';
import { useRoutines } from '@/store/RoutinesContext';
import { useUserData } from '@/store/UserDataContext';

/** 출퇴근 시간대에 앱을 열면 "지금 시작할까요?" 를 묻습니다. 하루 한 번, 시작하거나 건너뛰면 사라집니다. */
export function RoutinePromptBanner() {
  const theme = useTheme();
  const { pendingRoutine, startRoutineTrip, skipToday } = useRoutines();
  const { savedRoutes } = useUserData();
  if (!pendingRoutine) return null;

  const saved = savedRoutes.find((route) => route.id === pendingRoutine.savedRouteId);
  const origin = saved ? getUniqueStation(saved.originKey)?.displayName ?? saved.originKey : '';
  const destination = saved ? getUniqueStation(saved.destinationKey)?.displayName ?? saved.destinationKey : '';

  return (
    <View style={[styles.banner, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
      <Text style={[Typography.bodyStrong, { color: theme.text }]}>
        {pendingRoutine.name} 여정을 시작할까요?
      </Text>
      <Text style={[Typography.caption, { color: theme.textSecondary }]}>
        {timeLabel(pendingRoutine.time)} 출발 · {origin} → {destination}
      </Text>
      <View style={styles.actions}>
        <Pressable
          onPress={() => void startRoutineTrip(pendingRoutine.id)}
          style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
          <Text style={[Typography.bodyStrong, { color: '#fff' }]}>시작</Text>
        </Pressable>
        <Pressable
          onPress={() => skipToday(pendingRoutine.id)}
          style={({ pressed }) => [styles.button, { borderWidth: 1, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[Typography.bodyStrong, { color: theme.text }]}>오늘은 건너뛰기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: Spacing.three, marginBottom: Spacing.two, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.two + 6, gap: 4 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  button: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md },
});
