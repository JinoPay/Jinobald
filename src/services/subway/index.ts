import { env } from '@/config/env';

import { BackendSubwayApi } from './BackendSubwayApi';
import { MockSubwayApi } from './MockSubwayApi';
import { SeoulOpenApiClient } from './SeoulOpenApiClient';
import type { SubwayApi, SubwayApiKind } from './SubwayApi';

export type { RequestOptions, SubwayApi, SubwayApiKind, SubwayCapabilities, TimetableOptions } from './SubwayApi';
export * from './types';

/**
 * 데이터 소스 선택.
 * - auto: 백엔드 URL 이 있으면 백엔드 → 서울 인증키가 있으면 직접 호출 → 모의
 * - backend / seoul-direct: 명시 선택. 설정이 없으면 모의로 떨어집니다.
 * - mock: 인증키·백엔드가 있어도 모의. 데모·호출 한도 절약용.
 */
export type DataSource = 'auto' | 'backend' | 'seoul-direct' | 'mock';

let cached: SubwayApi | null = null;
let mode: DataSource = 'auto';

/** 현재 모드에서 실제로 쓰일 구현 종류. */
export function resolveSourceKind(current: DataSource = mode): SubwayApiKind {
  switch (current) {
    case 'backend':
      return env.backendUrl ? 'backend' : 'mock';
    case 'seoul-direct':
      return env.seoulApiKey ? 'seoul-open-api' : 'mock';
    case 'mock':
      return 'mock';
    default:
      return env.backendUrl ? 'backend' : env.seoulApiKey ? 'seoul-open-api' : 'mock';
  }
}

export function getSubwayApi(): SubwayApi {
  if (!cached) {
    switch (resolveSourceKind()) {
      case 'backend':
        cached = new BackendSubwayApi({ baseUrl: env.backendUrl!, timeoutMs: env.requestTimeoutMs });
        break;
      case 'seoul-open-api':
        cached = new SeoulOpenApiClient({
          apiKey: env.seoulApiKey!,
          baseUrl: env.baseUrl,
          timeoutMs: env.requestTimeoutMs,
        });
        break;
      default:
        cached = new MockSubwayApi();
    }
  }
  return cached;
}

export function setDataSource(next: DataSource): void {
  if (mode === next) return;
  mode = next;
  cached = null;
}

export function getDataSource(): DataSource {
  return mode;
}

/** 이전 설정(`forceMock`)과의 호환용 별칭. */
export function setForceMock(value: boolean): void {
  setDataSource(value ? 'mock' : 'auto');
}

export function isForceMock(): boolean {
  return mode === 'mock';
}

/** 인증키가 설정되어 있는지 (값 자체는 노출하지 않습니다). */
export function hasApiKey(): boolean {
  return env.seoulApiKey !== null;
}

export function hasBackendUrl(): boolean {
  return env.backendUrl !== null;
}

export const SOURCE_KIND_LABEL: Record<SubwayApiKind, string> = {
  backend: '백엔드',
  'seoul-open-api': '서울 API 직접',
  mock: '모의 데이터',
};

/** 설정·홈 화면에 보여줄 현재 소스 설명. */
export function describeSource(): { kind: SubwayApiKind; label: string; detail: string } {
  const kind = resolveSourceKind();
  const detail =
    kind === 'backend'
      ? env.backendUrl!
      : kind === 'seoul-open-api'
        ? env.baseUrl
        : mode === 'mock'
          ? '설정에서 모의 데이터를 선택함'
          : '백엔드 URL 과 인증키가 없어 모의 데이터로 동작';
  return { kind, label: SOURCE_KIND_LABEL[kind], detail };
}
