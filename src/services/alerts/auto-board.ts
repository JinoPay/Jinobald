/**
 * 자동 승차 감지 — 순수 함수입니다.
 *
 * "잠들어도 되는 앱"의 약점은 사용자가 승차 버튼을 눌러야 승차 후 계산이 시작된다는
 * 점입니다. 승강장에서 이미 졸고 있으면 버튼을 못 누릅니다. 그래서 승차역 도착정보와
 * 열차 위치에서 "방금 그 열차가 떠났다"는 신호를 읽어 냅니다.
 *
 * 절대 조용히 승차 상태를 뒤집지 않습니다 — 신뢰도가 높을 때만 자동으로 넘기고,
 * 그 외에는 "타셨나요?" 하고 묻습니다. 잘못 넘기면 하차 알림이 엉뚱한 시각에 갑니다.
 */
import {
  directionBetweenIndices,
  stationsBetweenIndices,
  type RouteLineInput,
} from '@/services/routing/graph';
import type { RouteLeg } from '@/services/routing/types';
import { isAtStation } from '@/services/subway/status';
import type { Arrival, TrainPosition } from '@/services/subway/types';

export interface BoardSuggestion {
  trainNo: string | null;
  /** 열차가 승차역을 떠났다고 추정하는 시각 — 승차 시각으로 씁니다. */
  departedAtMs: number;
  /**
   * high: 열차 위치 API 가 그 열차를 승차역 다음 역(들)에서 봤습니다. 자동 승차.
   * medium: 승강장에 있던 열차가 도착 목록에서 사라졌습니다. 사용자에게 묻습니다.
   */
  confidence: 'high' | 'medium';
}

/**
 * @param previous 직전 폴링에서 승차역에 맞춰 본 열차 (승강장에 있었던 것).
 * @param arrivals 이번 폴링의 승차역 도착정보. 빈 배열이면 폴링 실패로 보고 판단하지 않습니다.
 * @param positions 이번 폴링의 노선 열차 위치 (없으면 빈 배열).
 */
export function suggestBoarding(params: {
  previous: Arrival | null;
  previousSeenAtMs: number;
  arrivals: Arrival[];
  positions: TrainPosition[];
  leg: RouteLeg;
  line: RouteLineInput;
  nowMs: number;
}): BoardSuggestion | null {
  const { previous, previousSeenAtMs, arrivals, positions, leg, line, nowMs } = params;
  if (!previous || !isAtStation(previous.status)) return null;
  // 승강장에 있던 열차를 본 지 오래됐으면 이미 떠난 지 한참이라 지금 승차로 볼 수 없습니다.
  if (nowMs - previousSeenAtMs > 5 * 60_000) return null;

  if (previous.trainNo) {
    const position = positions.find(
      (p) => p.trainNo === previous.trainNo && p.lineId === leg.lineId && p.stationIndex !== null,
    );
    if (position && position.stationIndex !== null && position.stationIndex !== leg.boardIndex) {
      const travelled = stationsBetweenIndices(line, leg.boardIndex, position.stationIndex);
      const ahead = directionBetweenIndices(line, leg.boardIndex, position.stationIndex) === leg.direction;
      if (ahead && travelled >= 1 && travelled <= leg.stationCount) {
        return { trainNo: previous.trainNo, departedAtMs: previousSeenAtMs, confidence: 'high' };
      }
    }
  }

  if (arrivals.length === 0) return null;
  const same = arrivals.find((a) =>
    previous.trainNo ? a.trainNo === previous.trainNo : a.id === previous.id,
  );
  if (!same || same.status === 'departed') {
    return { trainNo: previous.trainNo, departedAtMs: previousSeenAtMs, confidence: 'medium' };
  }
  return null;
}
