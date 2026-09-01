/**
 * 경로 탐색 비용 모델 — 순수 데이터만 둡니다.
 *
 * 이 저장소에는 환승 소요시간 데이터가 없습니다. 구간별 소요시간도, 시각표도,
 * 급행 운행 계통도 없습니다. 있는 것은 노선당 `avgSecondsPerStation` 상수 하나뿐입니다.
 * 그래서 추정에 쓰는 숫자를 전부 이 파일 한 곳에 모으고 근거를 적어 둡니다 —
 * 나중에 실측 데이터가 생기면 여기만 고치면 됩니다.
 *
 * 이 파일은 위상(topology)이 아니라 비용 모델입니다. `lines.json` 에 넣으면
 * `build-lines.mjs` 가 덮어쓰므로 넣지 마세요.
 */

export interface RouteCostConfig {
  /** 다른 노선 그룹으로 갈아타기: 도보 ~2분 + 열차 대기 ~2분. */
  transferSeconds: number;
  /** 같은 그룹의 다른 계통(지선·셔틀)으로 갈아타기: 대개 같은 승강장이라 대기만. */
  sameGroupSwitchSeconds: number;
  /**
   * 실시간 도착정보가 없는 계통에 구간당 한 번 붙이는 가산.
   * 소요시간이 비슷하면 진행 상황을 실제로 추적할 수 있는 쪽을 고릅니다.
   */
  nonRealtimeBiasSeconds: number;
  /**
   * 환승 1회당 **탐색 전용** 가산치.
   * 표시하는 소요시간에는 반영하지 않습니다 — 후보를 갈라내기 위한 손잡이일 뿐입니다.
   */
  transferBiasSeconds: number;
  /**
   * 실측 환승 시간(초) 오버라이드. 정규화된 역명이 키입니다.
   * kind === 'transfer' 인 경계에만 적용합니다 (같은 승강장 열차 변경에는 무의미).
   */
  transferSecondsOverride: Record<string, number>;
}

/**
 * 실측 환승 시간 (초).
 *
 * 데이터셋을 늘리지 않고 악명 높은 몇 곳만 보정합니다. 비어 있어도 앱은 동작합니다.
 * 값은 환승 통로 도보 + 평균 대기의 대략치이고 정확한 측정치가 아닙니다.
 */
export const TRANSFER_SECONDS_OVERRIDE: Record<string, number> = {
  고속터미널: 420,
  종로3가: 360,
  왕십리: 330,
  디지털미디어시티: 360,
  신도림: 300,
  동대문역사문화공원: 300,
  서울: 360,
  공덕: 300,
  청량리: 300,
  노원: 300,
};

/** 소요시간 최소화. 표시 소요시간의 기준이기도 합니다. */
export const FASTEST_COST: RouteCostConfig = {
  transferSeconds: 240,
  sameGroupSwitchSeconds: 90,
  nonRealtimeBiasSeconds: 60,
  transferBiasSeconds: 0,
  transferSecondsOverride: TRANSFER_SECONDS_OVERRIDE,
};

/**
 * 환승 최소화.
 *
 * 가산치 420초는 "환승 1회를 줄이려고 7분까지는 더 탄다"는 뜻입니다.
 * `switch` 경계에는 붙이지 않습니다 — 그건 사용자에게 환승이 아니기 때문입니다.
 */
export const FEWEST_TRANSFER_COST: RouteCostConfig = {
  ...FASTEST_COST,
  transferBiasSeconds: 420,
};

/**
 * 표시용 비용 — 탐색 전용 가산치를 벗겨 냅니다.
 *
 * 이걸 거치지 않으면 "최소 환승" 후보의 소요시간이 가산치만큼 부풀어 표시됩니다.
 */
export function displayCost(cost: RouteCostConfig): RouteCostConfig {
  return { ...cost, transferBiasSeconds: 0, nonRealtimeBiasSeconds: 0 };
}
