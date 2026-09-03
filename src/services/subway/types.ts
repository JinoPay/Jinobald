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

/**
 * 데이터가 어디서 왔는지. 화면에 그대로 표시합니다.
 * - live: 서울 API 를 방금 호출한 값 (직접 또는 백엔드 경유)
 * - cached / stale: 백엔드 캐시. stale 은 할당량 보호로 TTL 이 지난 값
 * - timetable: 백엔드가 인증키 없이 시각표로 합성한 값
 * - mock: 앱 자체 모의 데이터
 */
export type DataSourceKind = 'live' | 'cached' | 'stale' | 'timetable' | 'mock';

export interface Arrival {
  id: string;
  lineId: string;
  stationName: string;
  direction: Direction;
  /** 종착역 이름. */
  terminalStationName: string;
  trainKind: TrainKind;
  /**
   * 열차번호 (btrainNo). 승차 후 같은 열차의 위치를 추적하는 키입니다.
   * 서울 API 가 비워 보내는 경우가 있어 null 일 수 있습니다.
   */
  trainNo: string | null;
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
  source: DataSourceKind;
}

/** 열차 위치 API 의 trainSttus: 0 진입, 1 도착, 2 출발, 3 전역출발. */
export type TrainPositionStatus = 'entering' | 'arrived' | 'departed' | 'prevDeparted' | 'unknown';

/** 한 노선 위의 열차 한 대. */
export interface TrainPosition {
  /** 열차가 실제로 달리는 계통 (지선이면 지선 id). */
  lineId: string;
  trainNo: string;
  /** 열차가 있거나 향하고 있는 역. */
  stationName: string;
  /** `stationName` 의 계통 내 인덱스. 데이터셋에 없는 역이면 null. */
  stationIndex: number | null;
  direction: Direction;
  terminalStationName: string;
  status: TrainPositionStatus;
  express: boolean;
  lastTrain: boolean;
  receivedAt: number;
}

export interface TrainPositionsResult {
  positions: TrainPosition[];
  fetchedAt: number;
  source: DataSourceKind;
}

/** 빠른 하차/환승 칸 안내. */
export interface DoorGuide {
  car: number;
  door: number;
  /** "3-2" */
  label: string;
  purpose: 'transfer' | 'exit';
  /** "2번 출구 계단", "7호선 환승 통로" 같은 부연. */
  note: string | null;
}

/** 운행 공지 (지연·사고·무정차). */
export interface DisruptionNotice {
  id: string;
  /** 관련 노선 그룹. 전 노선 공지는 null. */
  groupId: string | null;
  title: string;
  content: string;
  category: string;
  startsAt: number;
  endsAt: number | null;
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
