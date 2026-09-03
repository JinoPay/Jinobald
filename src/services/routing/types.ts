/**
 * 경로 탐색 결과 모델 — 순수 타입만 둡니다.
 *
 * `RoutePlan` 은 그대로 `Trip.plan` 에 실려 AsyncStorage 에 저장됩니다.
 * 따라서 모든 필드가 JSON 으로 왕복 가능해야 합니다 (Date·Map·undefined 금지).
 */
import type { Direction } from '@/services/subway/types';

/**
 * 계통이 바뀌는 두 가지 이유.
 *
 * - `transfer`: 다른 노선 그룹으로 갈아탑니다. 사용자가 "환승"이라고 부르는 것.
 * - `switch`: 같은 그룹의 다른 계통으로 갈아탑니다 (구로·성수·신도림·금천구청 …).
 *   대개 같은 승강장에서 다음 열차를 타는 것이라 환승 횟수에 세면 안 됩니다.
 *   광명 → 서울역은 계통이 3번 바뀌지만 환승은 0회입니다.
 */
export type TransferKind = 'transfer' | 'switch';

export interface RouteTransfer {
  /** 하차하는 계통에서의 역 표기. */
  fromStationName: string;
  /** 승차하는 계통에서의 역 표기. 총신대입구 → 이수처럼 다를 수 있습니다. */
  toStationName: string;
  kind: TransferKind;
  /** 이 환승에 배정한 초 (도보 + 대기). */
  seconds: number;
  /** 도보 시간이 서울교통공사 실측 데이터에서 왔는지. false 면 cost.ts 의 추정치입니다. */
  measured: boolean;
}

export interface RouteLeg {
  lineId: string;
  direction: Direction;
  /** 반드시 이 계통에서의 표기여야 합니다 — findStationRefOnLine 이 이 이름으로 조회합니다. */
  boardStationName: string;
  alightStationName: string;
  /** 저장 시점의 인덱스. 복원할 때 데이터셋과 대조해 검증합니다. */
  boardIndex: number;
  alightIndex: number;
  /** 승차역 → 하차역 정거장 수. 항상 1 이상입니다. */
  stationCount: number;
  /** 승차역 → 하차역 운행 초. 구간 실측(`secondsToNext`)이 있으면 그 합, 없으면 정거장 수 × 노선 평균. */
  seconds: number;
  /** 이 구간으로 넘어오는 환승. 첫 구간은 null 입니다. */
  transferIn: RouteTransfer | null;
}

export type RouteLabel = 'fastest' | 'fewest-transfers';

export interface RoutePlan {
  /** 결정적 식별자 — 후보 중복 제거에 씁니다. */
  id: string;
  /** 최소 1개. */
  legs: RouteLeg[];
  totalStations: number;
  /** Σ leg.seconds + Σ transferIn.seconds. 승차 대기는 제외합니다 (실시간 도착정보가 담당). */
  totalSeconds: number;
  /** 사용자에게 보이는 환승 횟수 — kind === 'transfer' 만 셉니다. */
  transferCount: number;
  /** 계통이 바뀌는 횟수 = legs.length - 1. */
  legChangeCount: number;
  /** 실시간 도착정보가 없는 계통이 포함되는지. UI 안내와 정확도 기대치에 씁니다. */
  hasNonRealtimeLine: boolean;
  label: RouteLabel;
}
