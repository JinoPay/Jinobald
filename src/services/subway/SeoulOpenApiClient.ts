import { mapArrival } from './mappers';
import type { RawArrivalResponse } from './raw-types';
import type { SubwayApi } from './SubwayApi';
import { SubwayApiError, type Arrival, type ArrivalsResult } from './types';

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

export class SeoulOpenApiClient implements SubwayApi {
  readonly kind = 'seoul-open-api' as const;

  private readonly options: ClientOptions;

  constructor(options: ClientOptions) {
    this.options = options;
  }

  async getArrivals(
    stationName: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ArrivalsResult> {
    const { apiKey, baseUrl, timeoutMs } = this.options;
    const url =
      `${baseUrl.replace(/\/$/, '')}/api/subway/${encodeURIComponent(apiKey)}` +
      `/json/realtimeStationArrival/0/20/${encodeURIComponent(stationName)}`;

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

    let body: RawArrivalResponse;
    try {
      body = (await response.json()) as RawArrivalResponse;
    } catch {
      // 인증 실패 시 JSON 이 아닌 본문이 오는 경우가 있습니다.
      throw new SubwayApiError('unknown', '응답을 JSON 으로 해석하지 못했습니다.');
    }

    const code = body.errorMessage?.code ?? body.code ?? '';
    const message = body.errorMessage?.message ?? body.message ?? '알 수 없는 오류';
    const error = classify(code, message);
    if (error) {
      if (error.kind === 'no-data') {
        return { arrivals: [], fetchedAt: Date.now(), source: 'live' };
      }
      throw error;
    }

    const now = Date.now();
    const arrivals = (body.realtimeArrivalList ?? [])
      .map((raw) => mapArrival(raw, stationName, now))
      .filter((a): a is Arrival => a !== null);

    return { arrivals, fetchedAt: now, source: 'live' };
  }
}
