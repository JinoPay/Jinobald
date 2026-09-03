import type {
  ArrivalsResult,
  Direction,
  DisruptionNotice,
  DoorGuide,
  TrainPositionsResult,
} from './types';

export type SubwayApiKind = 'backend' | 'seoul-open-api' | 'mock';

/** 구현이 실제로 낼 수 있는 데이터. 호출자는 호출 전에 이 표를 보고 화면을 정합니다. */
export interface SubwayCapabilities {
  arrivals: boolean;
  trainPositions: boolean;
  fastExits: boolean;
  notices: boolean;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface SubwayApi {
  readonly kind: SubwayApiKind;
  readonly capabilities: SubwayCapabilities;
  getArrivals(stationName: string, options?: RequestOptions): Promise<ArrivalsResult>;
  /** 노선 위 열차 위치. 미지원 구현이나 미지원 노선은 null 입니다. */
  getTrainPositions(lineId: string, options?: RequestOptions): Promise<TrainPositionsResult | null>;
  /** 하차역의 빠른 하차 칸. 데이터가 없으면 빈 배열. */
  getFastExits(
    lineId: string,
    stationName: string,
    direction: Direction,
    options?: RequestOptions,
  ): Promise<DoorGuide[]>;
  /** 운행 공지. 없으면 빈 배열. */
  getNotices(options?: RequestOptions): Promise<DisruptionNotice[]>;
}
