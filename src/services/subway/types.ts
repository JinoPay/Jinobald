/** 노선 방향. 2호선(순환선)은 내선/외선을 사용합니다. */
export type Direction = 'up' | 'down' | 'inner' | 'outer';

export type TrainKind = 'express' | 'local';

/**
 * 서울 API 의 arvlCd 를 도메인 값으로 옮긴 것.
 * 0 진입, 1 도착, 2 출발, 3 전역출발, 4 전역진입, 5 전역도착, 99 운행중
 */
export type ArrivalStatus =
  | 'entering'
  | 'arrived'
  | 'departed'
  | 'prevDeparted'
  | 'prevEntering'
  | 'prevArrived'
  | 'running'
  | 'unknown';

export interface Arrival {
  id: string;
  lineId: string;
  stationName: string;
  direction: Direction;
  /** 종착역 이름. */
  terminalStationName: string;
  trainKind: TrainKind;
  /**
   * 도착까지 남은 초.
   *
   * 주의: 원본 `barvlDt` 는 여러 상태에서 "0" 으로 내려오는데 이는 "0초 후 도착"이
   * 아니라 "값 없음"입니다. 그대로 0 으로 쓰면 알림이 즉시·반복 발화하므로
   * 반드시 null 로 매핑합니다.
   */
  secondsUntilArrival: number | null;
  /** 사용자에게 보여줄 주 문구 (arvlMsg2). */
  statusMessage: string;
  /** 열차의 현재 위치 역 (arvlMsg3). ETA 보정의 가장 정확한 신호입니다. */
  currentPositionStationName: string | null;
  status: ArrivalStatus;
  receivedAt: number;
}

export interface ArrivalsResult {
  arrivals: Arrival[];
  fetchedAt: number;
  source: 'live' | 'mock';
}

export type SubwayApiErrorKind =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'quota'
  | 'no-data'
  | 'unknown';

export class SubwayApiError extends Error {
  readonly kind: SubwayApiErrorKind;
  readonly code: string | null;

  constructor(kind: SubwayApiErrorKind, message: string, code: string | null = null) {
    super(message);
    this.name = 'SubwayApiError';
    this.kind = kind;
    this.code = code;
  }
}
