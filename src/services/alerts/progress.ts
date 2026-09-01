import { getLine } from '@/data/stations';
import { isAtStation } from '@/services/subway/mappers';
import type { Arrival } from '@/services/subway/types';

import { currentLeg, type Trip } from './trip';

/**
 * 여정 진행 상황 계산.
 *
 * 정적 데이터와 순수 계산에만 의존합니다 (expo-* 런타임 import 없음). 덕분에 기기
 * 없이 노드로 바로 실행해 확인할 수 있고, 알림 예약 같은 부수효과는 TripAlertManager
 * 쪽에 남습니다.
 *
 * 계산 대상은 항상 **현재 구간**입니다. 정거장 수와 방향은 경로를 만들 때 이미
 * 확정되어 `RouteLeg` 에 들어 있으므로 여기서 다시 역을 조회하지 않습니다 —
 * 그 조회가 다른 구간의 노선에서 유효한 답을 돌려주는 것이 이 코드에서 가장
 * 눈치채기 어려운 오답의 원인이었습니다.
 */
export interface TripProgress {
  /** 계산 대상 구간. 알림 키와 맞춰 보는 데 씁니다. */
  legIndex: number;
  /** 현재 구간의 목표역(하차역 또는 환승역)까지 남은 정거장 수. */
  stationsLeft: number;
  /** 현재 구간의 목표역 도착까지 남은 초. */
  etaSeconds: number;
  /** 승차 전 계산에 사용한 열차. 승차 후에는 null 입니다. */
  matchedArrival: Arrival | null;
  /** 어떤 신호로 계산했는지 — UI 에 그대로 노출합니다. */
  basis: 'arrival' | 'elapsed' | 'static';
}

/**
 * 승차 전과 승차 후는 쓸 수 있는 신호가 다릅니다.
 *
 * - **승차 전**: 승차역의 도착정보가 곧 "언제 탈 수 있는가"입니다. 여기에
 *   승차역→하차역 구간 추정을 더해 전체 소요를 냅니다.
 * - **승차 후**: 하차역의 도착정보는 쓸 수 없습니다. 그 열차는 사용자가 탄 열차가
 *   아니라 뒤이어 하차역으로 향하는 다른 열차이기 때문입니다. 그 값을 쓰면 승차
 *   직후부터 "1정거장 남음"으로 잘못 표시됩니다. 그래서 승차 시각으로부터의 경과
 *   시간으로 계산합니다. 대신 열차 지연은 반영되지 않습니다.
 */
export function computeProgress(
  trip: Trip,
  arrivals: Arrival[],
  now: number = Date.now(),
): TripProgress | null {
  const leg = currentLeg(trip);
  const line = getLine(leg.lineId);
  if (!line) return null;

  const legIndex = trip.plan.legs.indexOf(leg);
  const totalStations = leg.stationCount;
  const avg = line.avgSecondsPerStation;

  if (trip.boarded && trip.boardedAt != null) {
    const elapsed = Math.max(0, (now - trip.boardedAt) / 1000);
    const travelled = Math.min(totalStations, Math.floor(elapsed / avg));
    return {
      legIndex,
      stationsLeft: Math.max(0, totalStations - travelled),
      etaSeconds: Math.max(0, totalStations * avg - elapsed),
      matchedArrival: null,
      basis: 'elapsed',
    };
  }

  const matched =
    arrivals.find((a) => a.lineId === leg.lineId && a.direction === leg.direction) ?? null;
  const secondsToOrigin = matched
    ? (matched.secondsUntilArrival ?? (isAtStation(matched.status) ? 0 : null))
    : null;

  if (secondsToOrigin !== null) {
    return {
      legIndex,
      stationsLeft: totalStations,
      etaSeconds: secondsToOrigin + totalStations * avg,
      matchedArrival: matched,
      basis: 'arrival',
    };
  }

  return {
    legIndex,
    stationsLeft: totalStations,
    etaSeconds: totalStations * avg,
    matchedArrival: matched,
    basis: 'static',
  };
}
