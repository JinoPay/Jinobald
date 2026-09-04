import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getLine } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';
import type { RoutePlan } from '@/services/routing/types';
import { getSubwayApi } from '@/services/subway';
import type { TimetableDeparture } from '@/services/subway/types';

/** 시각표 조회에 이보다 오래 걸리면 카드 없이 갑니다 — 여정 시작을 막지 않습니다. */
const TIMEOUT_MS = 3_000;

/**
 * 운행일 자정 기준 초. 새벽 3시 이전은 전날 운행일의 24시 이후로 봅니다 (백엔드 KoreaClock 과 같은 규칙).
 * 시각은 기기 로컬 시각을 그대로 씁니다 — 이 앱은 한국에서 쓰는 앱입니다.
 */
export function serviceSeconds(at: Date): number {
  const seconds = at.getHours() * 3600 + at.getMinutes() * 60 + at.getSeconds();
  return at.getHours() < 3 ? seconds + 24 * 3600 : seconds;
}

interface LegTimes {
  legIndex: number;
  lineName: string;
  boardStationName: string;
  next: TimetableDeparture[];
  last: TimetableDeparture | null;
}

interface Props {
  plan: RoutePlan;
  /** 출발 시각. 'now' 면 지금. */
  departAt: 'now' | Date;
}

/**
 * 첫 구간의 다음 열차와 구간별 막차. 백엔드가 있고 1~9호선일 때만 보이고, 없으면 아무것도 그리지 않습니다.
 * 막차 이후 출발이면 경고합니다 — 그래도 여정은 시작할 수 있습니다 (시각표가 틀릴 수도 있으니).
 */
export function DepartureTimesCard({ plan, departAt }: Props) {
  const theme = useTheme();
  const [times, setTimes] = useState<LegTimes[] | null>(null);
  const api = getSubwayApi();
  const supported = api.capabilities.timetable;
  const afterSeconds = departAt === 'now' ? null : serviceSeconds(departAt);
  const planId = plan.id;

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    void (async () => {
      const results: LegTimes[] = [];
      for (const [legIndex, leg] of plan.legs.entries()) {
        const line = getLine(leg.lineId);
        try {
          const [next, last] = await Promise.all([
            legIndex === 0
              ? api.getNextDepartures(leg.lineId, leg.boardStationName, leg.direction, {
                  signal: controller.signal,
                  afterSeconds: afterSeconds ?? undefined,
                  limit: 3,
                })
              : Promise.resolve(null),
            api.getLastDeparture(leg.lineId, leg.boardStationName, leg.direction, { signal: controller.signal }),
          ]);
          if (next === null && last === null) continue;
          results.push({
            legIndex,
            lineName: line?.name ?? leg.lineId,
            boardStationName: leg.boardStationName,
            next: next?.entries ?? [],
            last,
          });
        } catch {
          // 시각표는 부가 정보입니다. 실패하면 그 구간만 비웁니다.
        }
      }
      if (!cancelled) setTimes(results);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
    // plan 객체는 후보를 바꿀 때마다 새로 오므로 id 로만 봅니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, planId, afterSeconds]);

  if (!supported || !times || times.length === 0) return null;

  const first = times.find((t) => t.legIndex === 0);
  const reference = afterSeconds ?? serviceSeconds(new Date());
  const missed = times.filter((t) => t.last !== null && t.last.seconds < reference);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>시각표</Text>
      {first && first.next.length > 0 ? (
        <Text style={[styles.line, { color: theme.text }]}>
          {first.boardStationName} 다음 열차 · {first.next.map((d) => `${d.label}${d.express ? '(급행)' : ''}`).join(' · ')}
        </Text>
      ) : first ? (
        <Text style={[styles.line, { color: theme.textSecondary }]}>
          {first.boardStationName}: {departAt === 'now' ? '오늘' : '그 시각 이후'} 남은 열차가 없습니다.
        </Text>
      ) : null}
      {times.map((t) =>
        t.last ? (
          <Text key={t.legIndex} style={[styles.line, { color: missed.includes(t) ? theme.danger : theme.textSecondary }]}>
            {t.lineName} {t.boardStationName} 막차 {t.last.label}
            {t.last.destinationStation ? ` (${t.last.destinationStation}행)` : ''}
          </Text>
        ) : null,
      )}
      {missed.length > 0 ? (
        <Text style={[styles.warning, { color: theme.danger }]}>
          {departAt === 'now' ? '지금은' : '그 시각에는'} {missed.map((t) => t.lineName).join(', ')} 막차가 지났습니다. 시각표가 틀릴 수 있으니
          역에서 확인하세요.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, gap: 4, marginTop: 8 },
  title: { fontSize: 13, fontWeight: '600' },
  line: { fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  warning: { fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 4 },
});
