import { env } from '@/config/env';

import { MockSubwayApi } from './MockSubwayApi';
import { SeoulOpenApiClient } from './SeoulOpenApiClient';
import type { SubwayApi } from './SubwayApi';

export type { SubwayApi } from './SubwayApi';
export * from './types';

let cached: SubwayApi | null = null;
let forceMock = false;

/**
 * 인증키가 있으면 실 API, 없으면 모의 구현을 돌려줍니다.
 * 설정 화면의 "모의 데이터 강제 사용" 토글이 켜지면 키가 있어도 모의로 갑니다.
 */
export function getSubwayApi(): SubwayApi {
  if (!cached) {
    cached = !forceMock && env.seoulApiKey
      ? new SeoulOpenApiClient({
          apiKey: env.seoulApiKey,
          baseUrl: env.baseUrl,
          timeoutMs: env.requestTimeoutMs,
        })
      : new MockSubwayApi();
  }
  return cached;
}

export function setForceMock(value: boolean): void {
  if (forceMock === value) return;
  forceMock = value;
  cached = null;
}

export function isForceMock(): boolean {
  return forceMock;
}

/** 인증키가 설정되어 있는지 (값 자체는 노출하지 않습니다). */
export function hasApiKey(): boolean {
  return env.seoulApiKey !== null;
}
