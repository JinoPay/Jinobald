import { getLine } from '@/data/stations';

import { subwayIdForLine } from './BackendSubwayApi';
import { mapArrival, mapPosition } from './mappers';
import type { RawArrivalResponse, RawPositionResponse } from './raw-types';
import type { RequestOptions, SubwayApi, SubwayCapabilities } from './SubwayApi';
import {
  SubwayApiError,
  type Arrival,
  type ArrivalsResult,
  type DisruptionNotice,
  type DoorGuide,
  type TrainPosition,
  type TrainPositionsResult,
  type TimetableDeparture,
  type TimetableResult,
} from './types';

interface ClientOptions {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

/** 정상 처리 코드. 그 외는 아래 분류에 따라 에러로 승격합니다. */
const OK_CODE = 'INFO-000';
/** 해당 역에 도착 예정 열차가 없음 — 에러가 아니라 빈 결과입니다. */
const NO_DATA_CODES = new Set(['INFO-200']);
/** 인증키 관련 오류. */
const AUTH_CODE_PREFIX = 'INFO-1';
/** 일일 호출 한도 초과. */
const QUOTA_CODES = new Set(['ERROR-337']);

function classify(code: string, message: string): SubwayApiError | null {
  if (code === OK_CODE) return null;
  if (NO_DATA_CODES.has(code)) return new SubwayApiError('no-data', message, code);
  if (QUOTA_CODES.has(code)) return new SubwayApiError('quota', message, code);
  if (code.startsWith(AUTH_CODE_PREFIX)) return new SubwayApiError('auth', message, code);
  return new SubwayApiError('unknown', message, code);
}

/**
 * 서울 열린데이터광장을 앱에서 직접 호출하는 구현.
 *
 * 인증키가 번들에 들어가고 HTTP 전용 호스트를 써야 하므로, 백엔드가 있으면 그쪽을 씁니다.
 * 빠른하차·운행공지는 공공데이터포털 API 라 여기서는 제공하지 않습니다.
 */
export class SeoulOpenApiClient implements SubwayApi {
  readonly kind = 'seoul-open-api' as const;

  readonly capabilities: SubwayCapabilities = {
    arrivals: true,
    trainPositions: true,
    fastExits: false,
    notices: false,
    timetable: false,
  };

  private readonly options: ClientOptions;

  constructor(options: ClientOptions) {
    this.options = options;
  }

  async getArrivals(stationName: string, { signal }: RequestOptions = {}): Promise<ArrivalsResult> {
    const body = await this.fetchJson<RawArrivalResponse>(
      `realtimeStationArrival/0/20/${encodeURIComponent(stationName)}`,
      signal,
    );
    const now = Date.now();
    if (!body) return { arrivals: [], fetchedAt: now, source: 'live' };
    const arrivals = (body.realtimeArrivalList ?? [])
      .map((raw) => mapArrival(raw, stationName, now))
      .filter((a): a is Arrival => a !== null);
    return { arrivals, fetchedAt: now, source: 'live' };
  }

  async getTrainPositions(lineId: string, { signal }: RequestOptions = {}): Promise<TrainPositionsResult | null> {
    const line = getLine(lineId);
    const subwayId = subwayIdForLine(lineId);
    if (!line || !subwayId) return null;
    // 열차 위치 API 는 노선 **이름**("2호선")으로 조회합니다. 그룹 본선의 이름이 그것입니다.
    const mainName = getLine(lineId)?.groupId === line.id ? line.name : (getLine(line.groupId)?.name ?? line.name);
    const body = await this.fetchJson<RawPositionResponse>(
      `realtimePosition/0/100/${encodeURIComponent(mainName)}`,
      signal,
    );
    const now = Date.now();
    if (!body) return { positions: [], fetchedAt: now, source: 'live' };
    const positions = (body.realtimePositionList ?? [])
      .map((raw) => mapPosition(raw, now))
      .filter((p): p is TrainPosition => p !== null);
    return { positions, fetchedAt: now, source: 'live' };
  }

  async getFastExits(): Promise<DoorGuide[]> {
    return [];
  }

  async getNotices(): Promise<DisruptionNotice[]> {
    return [];
  }

  /** 시각표는 백엔드에만 있습니다. */
  async getNextDepartures(): Promise<TimetableResult | null> {
    return null;
  }

  async getLastDeparture(): Promise<TimetableDeparture | null> {
    return null;
  }

  /** null 은 "해당 데이터 없음"(INFO-200) 입니다. */
  private async fetchJson<T extends { errorMessage?: { code?: string; message?: string }; code?: string; message?: string }>(
    servicePath: string,
    signal?: AbortSignal,
  ): Promise<T | null> {
    const { apiKey, baseUrl, timeoutMs } = this.options;
    const url = `${baseUrl.replace(/\/$/, '')}/api/subway/${encodeURIComponent(apiKey)}/json/${servicePath}`;

    // 서울 API 는 응답이 멈추는 사례가 있어 항상 타임아웃을 겁니다.
    const timeout = AbortSignal.timeout(timeoutMs);
    const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await fetch(url, { signal: composed, headers: { Accept: 'application/json' } });
    } catch (error) {
      if (timeout.aborted) {
        throw new SubwayApiError('timeout', `요청이 ${timeoutMs}ms 안에 끝나지 않았습니다.`);
      }
      throw new SubwayApiError('network', (error as Error).message);
    }

    if (!response.ok) {
      throw new SubwayApiError('network', `HTTP ${response.status}`);
    }

    let body: T;
    try {
      body = (await response.json()) as T;
    } catch {
      // 인증 실패 시 JSON 이 아닌 본문이 오는 경우가 있습니다.
      throw new SubwayApiError('unknown', '응답을 JSON 으로 해석하지 못했습니다.');
    }

    const code = body.errorMessage?.code ?? body.code ?? '';
    const message = body.errorMessage?.message ?? body.message ?? '알 수 없는 오류';
    const error = classify(code, message);
    if (error) {
      if (error.kind === 'no-data') return null;
      throw error;
    }
    return body;
  }
}
