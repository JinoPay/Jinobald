import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { LineBadge } from '@/components/subway/LineBadge';
import {
  directionBetween,
  directionLabel,
  downstreamStations,
  findStationRefs,
  getLine,
} from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import { capabilities, capabilityNotice } from '@/services/location/capabilities';
import { requestLocationPermission } from '@/services/location/geofence';
import { requestNotificationPermission } from '@/services/notifications/setup';
import { useSettings } from '@/store/SettingsContext';
import { useTrip } from '@/store/TripContext';

export default function TripSetupScreen() {
  const theme = useTheme();
  const { settings } = useSettings();
  const { start } = useTrip();
  const { origin } = useLocalSearchParams<{ origin?: string }>();

  const originRefs = useMemo(() => findStationRefs(origin ?? ''), [origin]);
  const [lineId, setLineId] = useState(originRefs[0]?.line.id ?? '');
  const [destination, setDestination] = useState<string | null>(null);
  const [alertN, setAlertN] = useState(settings.alertNStationsBefore);
  const [useGps, setUseGps] = useState(settings.useGps && capabilities.backgroundGeofencing);
  const [submitting, setSubmitting] = useState(false);

  const originRef = originRefs.find((r) => r.line.id === lineId) ?? originRefs[0];
  const line = originRef ? getLine(originRef.line.id) : undefined;

  // 선택한 하차역이 정해지기 전에는 양방향 목록을 모두 보여 줍니다.
  const options = useMemo(() => {
    if (!line || !originRef) return [];
    const directions = line.loop ? (['outer', 'inner'] as const) : (['down', 'up'] as const);
    return directions.map((direction) => ({
      direction,
      label: directionLabel(line, direction),
      stations: downstreamStations(line, originRef.index, direction),
    }));
  }, [line, originRef]);

  if (!originRef || !line) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>승차역을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const submit = async () => {
    if (!destination) return;
    setSubmitting(true);
    try {
      const permission = await requestNotificationPermission();
      if (!permission.granted) {
        Alert.alert(
          '알림 권한이 필요합니다',
          '승하차 알림을 받으려면 시스템 설정에서 알림을 허용해 주세요.',
        );
        return;
      }
      if (useGps) await requestLocationPermission();

      const destinationRef = findStationRefs(destination).find((r) => r.line.id === line.id);
      if (!destinationRef) return;

      await start({
        lineId: line.id,
        direction: directionBetween(line, originRef.index, destinationRef.index),
        originStationName: originRef.station.name,
        destinationStationName: destinationRef.station.name,
        alertNStationsBefore: alertN,
        useGps,
      });
      router.replace('/alerts');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>승차역</Text>
      <Text style={[styles.value, { color: theme.text }]}>{originRef.station.name}</Text>

      {originRefs.length > 1 ? (
        <>
          <Text style={[styles.label, { color: theme.textSecondary }]}>노선 선택</Text>
          <View style={styles.chips}>
            {originRefs.map((ref) => (
              <Pressable
                key={ref.line.id}
                onPress={() => {
                  setLineId(ref.line.id);
                  setDestination(null);
                }}
                style={[
                  styles.chip,
                  {
                    borderColor: ref.line.id === lineId ? ref.line.color : theme.border,
                    backgroundColor:
                      ref.line.id === lineId ? ref.line.color : theme.backgroundElement,
                  },
                ]}>
                <Text
                  style={{ color: ref.line.id === lineId ? '#fff' : theme.text, fontWeight: '600' }}>
                  {ref.line.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text style={[styles.label, { color: theme.textSecondary }]}>하차역</Text>
      {options.map((option) => (
        <View key={option.direction} style={styles.directionBlock}>
          <Text style={[styles.directionTitle, { color: theme.text }]}>{option.label}</Text>
          <View style={styles.chips}>
            {option.stations.map((station) => {
              const selected = destination === station.name;
              return (
                <Pressable
                  key={`${option.direction}-${station.name}`}
                  onPress={() => setDestination(station.name)}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? theme.accent : theme.border,
                      backgroundColor: selected ? theme.accent : theme.backgroundElement,
                    },
                  ]}>
                  <Text style={{ color: selected ? '#fff' : theme.text }}>{station.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Text style={[styles.label, { color: theme.textSecondary }]}>예비 알림 시점</Text>
      <View style={styles.chips}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => setAlertN(n)}
            style={[
              styles.chip,
              {
                borderColor: n === alertN ? theme.accent : theme.border,
                backgroundColor: n === alertN ? theme.accent : theme.backgroundElement,
              },
            ]}>
            <Text style={{ color: n === alertN ? '#fff' : theme.text }}>{n}정거장 전</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.switchRow, { borderColor: theme.border }]}>
        <View style={styles.switchText}>
          <Text style={[styles.value, { color: theme.text }]}>GPS 보정 사용</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            {capabilities.backgroundGeofencing
              ? '하차역 좌표를 아는 경우 지오펜스로 도착을 보정합니다.'
              : (capabilityNotice ?? '이 환경에서는 사용할 수 없습니다.')}
          </Text>
        </View>
        <Switch
          value={useGps}
          onValueChange={setUseGps}
          disabled={!capabilities.backgroundGeofencing}
        />
      </View>

      <Pressable
        disabled={!destination || submitting}
        onPress={() => void submit()}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: destination ? theme.accent : theme.backgroundElement,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <View style={styles.ctaInner}>
          <LineBadge lineId={line.id} size="sm" />
          <Text style={[styles.ctaText, { color: destination ? '#fff' : theme.textSecondary }]}>
            {destination ? `${destination} 하차 알림 시작` : '하차역을 선택하세요'}
          </Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16 },
  value: { fontSize: 17, fontWeight: '600' },
  hint: { fontSize: 12, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  directionBlock: { marginTop: 10 },
  directionTitle: { fontSize: 14, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchText: { flex: 1, gap: 2 },
  cta: { marginTop: 24, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
