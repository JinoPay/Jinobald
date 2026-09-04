/**
 * 경로 탐색 비용 모델 — 순수 데이터만 둡니다.
 *
 * 실측 데이터는 두 곳에서 옵니다.
 * - 구간별 운행시간: `lines.json` 의 `stations[i].secondsToNext` (build-lines.mjs 가 서울교통공사
 *   역간거리 데이터를 붙임). 없는 구간은 `avgSecondsPerStation` 으로 폴백합니다.
 * - 환승 도보시간: `src/data/generated/transfer-times.json` 을 `routing/index.ts` 가
 *   `transferSecondsByPair` 로 주입합니다. 없는 환승은 아래 상수로 추정합니다.
 *
 * 급행 운행 계통과 시각표는 여전히 없습니다. 손으로 정한 추정치는 전부 이 파일에 모으고 근거를 적어 둡니다.
 * 이 파일은 위상(topology)이 아니라 비용 모델입니다 — 생성기가 덮어쓰는 `lines.json` 에 손 상수를 넣지 마세요.
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
  /**
   * 실측 환승 **도보** 시간(초). 키는 `${정규화 역명}|${출발 노선그룹}|${도착 노선그룹}`.
   * 도보만 잰 값이라 아래 `transferWaitSeconds` 를 더해 씁니다. 역명 오버라이드보다 우선합니다.
   */
  transferSecondsByPair: Record<string, number>;
  /** 실측 도보 시간에 더하는 평균 열차 대기(배차 간격의 절반 남짓). */
  transferWaitSeconds: number;
  /**
   * 승차 간선 비용의 단위. `seconds` 는 실측 운행 초, `stations` 는 정거장마다 `stationCostSeconds` 를 씁니다.
   * 후자가 "최소 정거장" 프로파일입니다 — 노선 데이터에 거리(km)가 없어 정거장 수가 가장 정직한 대용치입니다.
   */
  rideCost: 'seconds' | 'stations';
  /** `rideCost === 'stations'` 일 때 정거장 하나의 비용(초). 환승 비용과 저울이 맞아야 합니다. */
  stationCostSeconds: number;
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
  transferSecondsByPair: {},
  transferWaitSeconds: 120,
  rideCost: 'seconds',
  stationCostSeconds: 120,
};

/**
 * 추천(균형).
 *
 * 최소 시간과 최소 환승 사이입니다: 환승 1회를 줄이려고 3분까지는 더 타고, 실시간 도착정보가
 * 없어 진행을 추적할 수 없는 계통은 2분어치 불이익을 줍니다 — 잠들어도 되는 앱에서는
 * "몇 분 빠른가"보다 "지금 어디쯤인지 아는가"가 더 중요하기 때문입니다.
 */
export const RECOMMENDED_COST: RouteCostConfig = {
  ...FASTEST_COST,
  transferBiasSeconds: 180,
  nonRealtimeBiasSeconds: 120,
};

/** 정거장 수 최소화. 정차가 적어 앉아 갈 확률이 높고, 단순한 경로가 되기 쉽습니다. */
export const FEWEST_STOPS_COST: RouteCostConfig = {
  ...FASTEST_COST,
  rideCost: 'stations',
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
  return { ...cost, transferBiasSeconds: 0, nonRealtimeBiasSeconds: 0, rideCost: 'seconds' };
}

/** 실측 환승 도보 시간을 주입한 비용 모델. */
export function withMeasuredTransfers(
  cost: RouteCostConfig,
  transferSecondsByPair: Record<string, number>,
): RouteCostConfig {
  return { ...cost, transferSecondsByPair };
}
