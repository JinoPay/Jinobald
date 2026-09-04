import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { EmptyState } from '@/components/common/EmptyState';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { getUniqueStation } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { notificationNotice } from '@/services/location/capabilities';
import { nextOccurrence } from '@/services/routines/schedule';
import { timeLabel, weekdaysLabel } from '@/services/routines/types';
import { useRoutines } from '@/store/RoutinesContext';
import { useUserData } from '@/store/UserDataContext';

export default function RoutinesScreen() {
  const theme = useTheme();
  const { routines, setEnabled } = useRoutines();
  const { savedRoutes } = useUserData();
  const now = new Date();

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      <Text style={[Typography.caption, { color: theme.textSecondary, lineHeight: 18 }]}>
        정해 둔 요일·시각에 ‘여정을 시작할 시간’ 알림이 옵니다. 알림의 [여정 시작] 을 누르면 저장한 경로로
        하차 알림이 바로 시작됩니다. 그 시간대에 앱을 열어도 시작할지 묻습니다.
      </Text>
      {notificationNotice ? (
        <Text style={[Typography.caption, { color: theme.danger }]}>{notificationNotice}</Text>
      ) : null}

      {savedRoutes.length === 0 ? (
        <EmptyState
          title="먼저 경로를 저장하세요"
          description="홈에서 출발·도착을 검색한 뒤 경로 카드의 ☆ 이 경로 저장 을 누르면 루틴에서 고를 수 있습니다."
        />
      ) : null}

      {routines.map((routine) => {
        const saved = savedRoutes.find((route) => route.id === routine.savedRouteId);
        const origin = saved ? getUniqueStation(saved.originKey)?.displayName ?? saved.originKey : '(지워진 경로)';
        const destination = saved ? getUniqueStation(saved.destinationKey)?.displayName ?? saved.destinationKey : '';
        const next = routine.enabled ? nextOccurrence(routine, now) : null;
        return (
          <Pressable
            key={routine.id}
            onPress={() => router.push({ pathname: '/routines/[id]', params: { id: routine.id } })}
            style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 }]}>
            <View style={styles.cardText}>
              <Text style={[Typography.heading, { color: theme.text }]}>
                {routine.name} · {timeLabel(routine.time)}
              </Text>
              <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                {weekdaysLabel(routine.weekdays)} · {origin}
                {destination ? ` → ${destination}` : ''}
              </Text>
              <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                {routine.enabled
                  ? `${routine.remindMinutesBefore}분 전 알림${routine.autoStart ? ' · 자동 시작' : ''}${
                      next ? ` · 다음 ${next.toLocaleString('ko-KR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''
                    }`
                  : '꺼짐'}
              </Text>
            </View>
            <Switch value={routine.enabled} onValueChange={(v) => void setEnabled(routine.id, v)} />
          </Pressable>
        );
      })}

      {savedRoutes.length > 0 ? (
        <Pressable
          onPress={() => router.push({ pathname: '/routines/[id]', params: { id: 'new' } })}
          style={({ pressed }) => [styles.add, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
          <Text style={[Typography.bodyStrong, { color: '#fff' }]}>+ 루틴 추가</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.two + 2, paddingBottom: 48 },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.lg, padding: Spacing.two + 6 },
  cardText: { flex: 1, gap: 3 },
  add: { alignItems: 'center', paddingVertical: 14, borderRadius: Radius.md, marginTop: Spacing.two },
});
