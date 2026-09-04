import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { getUniqueStation } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { capabilities } from '@/services/location/capabilities';
import {
  timeLabel,
  WEEKDAY_LABEL,
  WEEKDAY_PRESETS,
  WEEKDAYS,
  type CommuteRoutineInput,
} from '@/services/routines/types';
import { useRoutines } from '@/store/RoutinesContext';
import { useUserData } from '@/store/UserDataContext';

const REMIND_OPTIONS = [5, 10, 15, 20, 30];

export default function RoutineEditScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { routines, upsertRoutine, removeRoutine } = useRoutines();
  const { savedRoutes } = useUserData();
  const existing = id && id !== 'new' ? routines.find((r) => r.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? (routines.length === 0 ? '출근' : '퇴근'));
  const [savedRouteId, setSavedRouteId] = useState(existing?.savedRouteId ?? savedRoutes[0]?.id ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? [...WEEKDAY_PRESETS.평일]);
  const [time, setTime] = useState(existing?.time ?? { hour: routines.length === 0 ? 7 : 18, minute: 30 });
  const [remind, setRemind] = useState(existing?.remindMinutesBefore ?? 10);
  const [autoStart, setAutoStart] = useState(existing?.autoStart ?? false);
  const [alertN, setAlertN] = useState<number | null>(existing?.alertNStationsBefore ?? null);
  const [useGps, setUseGps] = useState<boolean | null>(existing?.useGps ?? null);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [saving, setSaving] = useState(false);

  const timeValue = new Date(2000, 0, 1, time.hour, time.minute);
  const onTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setTime({ hour: date.getHours(), minute: date.getMinutes() });
  };
  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({ mode: 'time', value: timeValue, is24Hour: true, onChange: onTimeChange });

  const toggleWeekday = (day: number) =>
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));

  const canSave = name.trim().length > 0 && savedRouteId !== '' && weekdays.length > 0;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const input: CommuteRoutineInput = {
        name: name.trim(),
        savedRouteId,
        weekdays,
        time,
        remindMinutesBefore: remind,
        enabled: existing?.enabled ?? true,
        autoStart,
        alertNStationsBefore: alertN,
        useGps,
      };
      await upsertRoutine(input, existing?.id);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = () => {
    if (!existing) return;
    Alert.alert(existing.name, '이 루틴을 지울까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => {
          void removeRoutine(existing.id).then(() => router.back());
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: theme.textSecondary }]}>이름</Text>
      <View style={styles.chips}>
        {['출근', '퇴근'].map((preset) => (
          <Chip key={preset} label={preset} selected={name === preset} onPress={() => setName(preset)} theme={theme} />
        ))}
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="루틴 이름"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>경로</Text>
      {savedRoutes.length === 0 ? (
        <Text style={[Typography.caption, { color: theme.danger }]}>저장한 경로가 없습니다. 홈에서 먼저 경로를 저장하세요.</Text>
      ) : null}
      <View style={styles.chips}>
        {savedRoutes.map((route) => {
          const origin = getUniqueStation(route.originKey)?.displayName ?? route.originKey;
          const destination = getUniqueStation(route.destinationKey)?.displayName ?? route.destinationKey;
          return (
            <Chip
              key={route.id}
              label={`${route.name} · ${origin} → ${destination}`}
              selected={savedRouteId === route.id}
              onPress={() => setSavedRouteId(route.id)}
              theme={theme}
            />
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>요일</Text>
      <View style={styles.chips}>
        {(Object.keys(WEEKDAY_PRESETS) as (keyof typeof WEEKDAY_PRESETS)[]).map((preset) => (
          <Chip
            key={preset}
            label={preset}
            selected={WEEKDAY_PRESETS[preset].length === weekdays.length && WEEKDAY_PRESETS[preset].every((d) => weekdays.includes(d))}
            onPress={() => setWeekdays([...WEEKDAY_PRESETS[preset]])}
            theme={theme}
          />
        ))}
      </View>
      <View style={styles.chips}>
        {WEEKDAYS.map((day) => (
          <Chip key={day} label={WEEKDAY_LABEL[day]} selected={weekdays.includes(day)} onPress={() => toggleWeekday(day)} theme={theme} round />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>나서는 시각</Text>
      <Text style={[Typography.caption, { color: theme.textSecondary }]}>
        집이나 회사에서 출발하는 시각입니다. 이 시각 {remind}분 전에 알림이 오고, 이 시각 전후로 앱을 열면 시작할지 묻습니다.
      </Text>
      {Platform.OS === 'android' ? (
        <Pressable onPress={openAndroidPicker} style={[styles.timeButton, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[Typography.heading, Typography.numeric, { color: theme.text }]}>{timeLabel(time)}</Text>
          <Text style={[Typography.caption, { color: theme.accent }]}>바꾸기</Text>
        </Pressable>
      ) : showPicker ? (
        <DateTimePicker value={timeValue} mode="time" display="spinner" onChange={onTimeChange} locale="ko-KR" style={styles.picker} />
      ) : null}

      <Text style={[styles.label, { color: theme.textSecondary }]}>미리 알림</Text>
      <View style={styles.chips}>
        {REMIND_OPTIONS.map((minutes) => (
          <Chip key={minutes} label={`${minutes}분 전`} selected={remind === minutes} onPress={() => setRemind(minutes)} theme={theme} />
        ))}
      </View>

      <View style={[styles.switchRow, { borderColor: theme.border }]}>
        <View style={styles.switchText}>
          <Text style={[Typography.bodyStrong, { color: theme.text }]}>앱을 열면 바로 시작</Text>
          <Text style={[Typography.caption, { color: theme.textSecondary }]}>
            시작 창(출발 20분 전 ~ 60분 후) 안에 앱을 열면 묻지 않고 여정을 시작합니다. 알림의 [여정 시작] 버튼은 이 설정과 무관하게 항상 바로 시작합니다.
          </Text>
        </View>
        <Switch value={autoStart} onValueChange={setAutoStart} />
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>이 루틴의 예비 알림 시점</Text>
      <View style={styles.chips}>
        <Chip label="경로 기본값" selected={alertN === null} onPress={() => setAlertN(null)} theme={theme} />
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} label={`${n}정거장 전`} selected={alertN === n} onPress={() => setAlertN(n)} theme={theme} />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>GPS 보정</Text>
      <View style={styles.chips}>
        <Chip label="경로 기본값" selected={useGps === null} onPress={() => setUseGps(null)} theme={theme} />
        <Chip label="사용" selected={useGps === true} onPress={() => setUseGps(true)} theme={theme} disabled={!capabilities.backgroundGeofencing} />
        <Chip label="사용 안 함" selected={useGps === false} onPress={() => setUseGps(false)} theme={theme} />
      </View>

      <Pressable
        disabled={!canSave || saving}
        onPress={() => void save()}
        style={({ pressed }) => [styles.cta, { backgroundColor: canSave ? theme.accent : theme.backgroundElement, opacity: pressed ? 0.85 : 1 }]}>
        <Text style={[Typography.bodyStrong, { color: canSave ? '#fff' : theme.textSecondary }]}>{existing ? '저장' : '루틴 만들기'}</Text>
      </Pressable>
      {existing ? (
        <Pressable onPress={confirmRemove} style={[styles.secondary, { borderColor: theme.danger }]}>
          <Text style={[Typography.bodyStrong, { color: theme.danger }]}>루틴 지우기</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
  theme,
  round = false,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  round?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        round && styles.roundChip,
        {
          borderColor: selected ? theme.accent : theme.border,
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          opacity: disabled ? 0.4 : 1,
        },
      ]}>
      <Text style={{ color: selected ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.two, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', marginTop: Spacing.two },
  input: { height: 44, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, maxWidth: '100%' },
  roundChip: { width: 40, height: 40, borderRadius: 20, paddingHorizontal: 0, alignItems: 'center', justifyContent: 'center' },
  timeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  picker: { alignSelf: 'stretch' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Spacing.two + 4, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  switchText: { flex: 1, gap: 2 },
  cta: { marginTop: Spacing.three, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  secondary: { marginTop: Spacing.two, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
});
