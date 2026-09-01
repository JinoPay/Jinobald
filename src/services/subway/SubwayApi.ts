import type { ArrivalsResult } from './types';

/**
 * 도착정보 제공자. 실 API 구현과 모의 구현이 이 인터페이스를 공유하며,
 * 인증키 유무에 따라 런타임에 하나가 선택됩니다.
 */
export interface SubwayApi {
  readonly kind: 'seoul-open-api' | 'mock';
  getArrivals(stationName: string, options?: { signal?: AbortSignal }): Promise<ArrivalsResult>;
}
