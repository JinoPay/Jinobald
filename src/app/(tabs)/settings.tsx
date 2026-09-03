import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LINES, LINE_GROUPS } from '@/data/stations';
import { TRANSFER_DATA_MANIFEST } from '@/data/transfers';
import { useTheme } from '@/hooks/use-theme';
import {
  capabilities,
  capabilityNotice,
  isExpoGo,
  notificationNotice,
} from '@/services/location/capabilities';
import { getLocationPermission, type LocationPermissionState } from '@/services/location/geofence';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '@/services/notifications/setup';
import { describeSource, hasApiKey, hasBackendUrl, type DataSource } from '@/services/subway';
import { useSettings } from '@/store/SettingsContext';

const DATA_SOURCE_OPTIONS: { value: DataSource; label: string }[] = [
  { value: 'auto', label: '자동' },
  { value: 'backend', label: '백엔드' },
  { value: 'seoul-direct', label: '서울 직접' },
  { value: 'mock', label: '모의' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, update } = useSettings();
  const [notification, setNotification] = useState<NotificationPermissionState | null>(null);
  const [location, setLocation] = useState<LocationPermissionState | null>(null);

  useEffect(() => {
    void getNotificationPermission().then(setNotification);
    void getLocationPermission().then(setLocation);
  }, []);

  const source = describeSource();
  const stationCount = LINES.reduce((sum, line) => sum + line.stations.length, 0);
  const segmentCount = LINES.reduce(
    (sum, line) => sum + line.stations.filter((s) => s.secondsToNext != null).length,
    0,
  );
  const coordCount = LINES.reduce(
    (sum, line) => sum + line.stations.filter((s) => s.lat != null).length,
    0,
  );

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      <Section title="데이터 소스" theme={theme}>
        <Row label="백엔드" value={hasBackendUrl() ? source.kind === 'backend' ? source.detail : '설정됨' : '미설정'} theme={theme} />
        <Row label="서울 인증키" value={hasApiKey() ? '설정됨' : '미설정'} theme={theme} />
        <Row label="현재 사용 중" value={source.label} theme={theme} />
        <ChipRow
          options={DATA_SOURCE_OPTIONS}
          value={settings.dataSource}
          onChange={(v) => update({ dataSource: v })}
          theme={theme}
        />
        <Text style={[styles.note, { color: theme.textSecondary }]}>
          자동은 백엔드 → 서울 직접 호출 → 모의 데이터 순으로 고릅니다. 설정이 없는 항목을 고르면 모의
          데이터로 동작합니다. 백엔드 주소는 .env 의 EXPO_PUBLIC_BACKEND_URL, 서울 인증키는
          EXPO_PUBLIC_SEOUL_SUBWAY_API_KEY 에 넣고 앱을 다시 시작하면 적용됩니다.
        </Text>
      </Section>

      <Section title="알림" theme={theme}>
        <Row
          label="알림 권한"
          value={
            !capabilities.localNotifications
              ? '사용 불가'
              : notification === null
                ? '확인 중'
                : notification.granted
                  ? '허용됨'
                  : notification.canAskAgain
                    ? '미허용'
                    : '거부됨 (시스템 설정 필요)'
          }
          theme={theme}
        />
        {notificationNotice ? (
          <Text style={[styles.note, { color: theme.textSecondary }]}>{notificationNotice}</Text>
        ) : null}
        {capabilities.localNotifications && notification && !notification.isPhysicalDevice ? (
          <Text style={[styles.note, { color: theme.textSecondary }]}>
            시뮬레이터/에뮬레이터에서는 알림이 전달되지 않을 수 있습니다.
          </Text>
        ) : null}
        {/* 예약 자체가 불가능한 환경에서는 권한 요청도, 시스템 설정 열기도 의미가 없습니다. */}
        {capabilities.localNotifications ? (
          <Pressable
            onPress={() => {
              if (notification?.canAskAgain !== false) {
                void requestNotificationPermission().then(setNotification);
              } else {
                void Linking.openSettings();
              }
            }}
            style={[styles.button, { borderColor: theme.border }]}>
            <Text style={{ color: theme.accent, fontWeight: '600' }}>
              {notification?.canAskAgain === false ? '시스템 설정 열기' : '알림 권한 요청'}
            </Text>
          </Pressable>
        ) : null}
      </Section>

      <Section title="위치 / GPS 보정" theme={theme}>
        <Row
          label="위치 권한 (앱 사용 중)"
          value={location === null ? '확인 중' : location.foreground ? '허용됨' : '미허용'}
          theme={theme}
        />
        <Row
          label="위치 권한 (항상)"
          value={location === null ? '확인 중' : location.background ? '허용됨' : '미허용'}
          theme={theme}
        />
        {capabilityNotice ? (
          <Text style={[styles.note, { color: theme.textSecondary }]}>{capabilityNotice}</Text>
        ) : null}
      </Section>

      <Section title="실행 환경" theme={theme}>
        <Row label="런타임" value={isExpoGo ? 'Expo Go' : '개발/릴리스 빌드'} theme={theme} />
        <Row label="예약 로컬 알림" value={capabilities.localNotifications ? '사용 가능' : '불가'} theme={theme} />
        <Row label="포그라운드 위치 보정" value={capabilities.foregroundLocation ? '사용 가능' : '불가'} theme={theme} />
        <Row
          label="백그라운드 지오펜싱"
          value={capabilities.backgroundGeofencing ? '사용 가능' : '개발 빌드 필요'}
          theme={theme}
        />
      </Section>

      <Section title="데이터셋" theme={theme}>
        <Row label="노선" value={`${LINE_GROUPS.length}개 노선 · ${LINES.length}개 운행 계통`} theme={theme} />
        <Row label="역 항목" value={`${stationCount}개`} theme={theme} />
        <Row
          label="좌표 보유"
          value={`${coordCount}개 (${Math.round((coordCount / stationCount) * 100)}%)`}
          theme={theme}
        />
        <Row label="구간 실측 소요시간" value={`${segmentCount}개 구간`} theme={theme} />
        <Row
          label="환승 칸 안내"
          value={`${TRANSFER_DATA_MANIFEST.transferGuides.rows}건 · ${TRANSFER_DATA_MANIFEST.transferGuides.stations}역`}
          theme={theme}
        />
        <Row label="환승 도보 시간" value={`${TRANSFER_DATA_MANIFEST.transferTimes.rows}건`} theme={theme} />
        <Row label="데이터 생성일" value={TRANSFER_DATA_MANIFEST.generatedAt} theme={theme} />
        <Text style={[styles.note, { color: theme.textSecondary }]}>
          수도권 전철 전 노선을 포함합니다. 좌표가 없는 역은 GPS 보정이 자동으로 비활성화되고
          도착예정 기반 알림만 사용합니다. 환승 칸·환승 시간·구간 소요시간은 서울교통공사 공공데이터이며,
          없는 구간은 노선 평균으로 추정합니다.
        </Text>
      </Section>

      <Section title="앱" theme={theme}>
        <Row label="버전" value={Constants.expoConfig?.version ?? '—'} theme={theme} />
      </Section>
    </ScrollView>
  );
}

type Theme = ReturnType<typeof useTheme>;

function Section({ title, theme, children }: { title: string; theme: Theme; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionBody, { backgroundColor: theme.backgroundElement }]}>{children}</View>
    </View>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{value}</Text>
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
  theme,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  theme: Theme;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                borderColor: selected ? theme.accent : theme.border,
                backgroundColor: selected ? theme.accent : 'transparent',
              },
            ]}>
            <Text style={{ color: selected ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20, paddingBottom: 48 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  sectionBody: { borderRadius: 12, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 14, flexShrink: 1, textAlign: 'right' },
  note: { fontSize: 12, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  button: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
});
