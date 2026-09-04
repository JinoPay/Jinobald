import { getLine, getLineGroup, LINE_GROUPS } from '@/data/stations';
import { stationCodeOf } from '@/data/transfers';

import { mapArrival, mapPosition } from './mappers';
import type { RawArrival, RawPosition } from './raw-types';
import type { RequestOptions, SubwayApi, SubwayCapabilities, TimetableOptions } from './SubwayApi';
import {
  SubwayApiError,
  type Arrival,
  type ArrivalsResult,
  type DataSourceKind,
  type Direction,
  type DisruptionNotice,
  type DoorGuide,
  type TimetableDayType,
  type TimetableDeparture,
  type TimetableResult,
  type TrainPosition,
  type TrainPositionsResult,
} from './types';

interface ClientOptions {
  baseUrl: string;
  timeoutMs: number;
}

/** 백엔드 실시간 응답 봉투. */
interface RealtimeEnvelope<T> {
  rows: T[];
  fetchedAt: string;
  source: DataSourceKind;
}

interface ErrorBody {
  kind?: string;
  message?: string;
}

interface FastExitRow {
  lineNo: string;
  stationCd: string;
  directionLabel: string;
  door: { car: number; door: number; label: string };
  facilityKind: string;
  facilityLabel: string;
}

interface TimetableEnvelope {
  dayType: TimetableDayType;
  afterSeconds: number;
  entries: {
    direction: string;
    express: boolean;
    trainNo: string;
    depart: string | null;
    arrive: string | null;
    departSeconds: number | null;
    arriveSeconds: number | null;
    destinationStation: string;
  }[];
}

/** 앱 방향 → 시각표 방향 코드. */
const TIMETABLE_DIRECTION: Record<Direction, string> = { up: 'UP', down: 'DOWN', inner: 'IN', outer: 'OUT' };
const DIRECTION_FROM_TIMETABLE: Record<string, Direction> = { UP: 'up', DOWN: 'down', IN: 'inner', OUT: 'outer' };

interface NoticeRow {
  id: string;
  lineNo: string | null;
  title: string;
  content: string;
  category: string;
  startsAt: string;
  endsAt: string | null;
}

/** 백엔드가 쓰는 호선 표기 → 노선 그룹 id. */
const GROUP_BY_LINE_NO: Record<string, string> = {
  1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  경의중앙선: 'gyeongui', 수인분당선: 'suin', 공항철도: 'airport', 경춘선: 'gyeongchun',
  서해선: 'seohae', 신분당선: 'sinbundang', 우이신설선: 'uisinseol', 경강선: 'gyeonggang', 'GTX-A': 'gtxa',
};

/**
 * C# 백엔드(backend/) 클라이언트.
 *
 * 백엔드는 서울 API 원본 행을 캐시해 그대로 내려주므로 매핑은 직접 호출 때와 같은 `mappers.ts` 를 씁니다.
 * 인증키는 서버에 있어 앱 번들에 아무것도 싣지 않습니다.
 */
export class BackendSubwayApi implements SubwayApi {
  readonly kind = 'backend' as const;

  readonly capabilities: SubwayCapabilities = {
    arrivals: true,
    trainPositions: true,
    fastExits: true,
    notices: true,
    timetable: true,
  };

  private readonly options: ClientOptions;

  constructor(options: ClientOptions) {
    this.options = { ...options, baseUrl: options.baseUrl.replace(/\/$/, '') };
  }

  async getArrivals(stationName: string, { signal }: RequestOptions = {}): Promise<ArrivalsResult> {
    const body = await this.fetchJson<RealtimeEnvelope<RawArrival>>(
      `/api/v1/realtime/arrivals/${encodeURIComponent(stationName)}`,
      signal,
    );
    const now = Date.now();
    const arrivals = body.rows
      .map((raw) => mapArrival(raw, stationName, now))
      .filter((a): a is Arrival => a !== null);
    return { arrivals, fetchedAt: now, source: body.source };
  }

  async getTrainPositions(lineId: string, { signal }: RequestOptions = {}): Promise<TrainPositionsResult | null> {
    const subwayId = subwayIdForLine(lineId);
    if (!subwayId) return null;
    const body = await this.fetchJson<RealtimeEnvelope<RawPosition>>(
      `/api/v1/realtime/positions/${encodeURIComponent(subwayId)}`,
      signal,
    );
    const now = Date.now();
    const positions = body.rows
      .map((raw) => mapPosition(raw, now))
      .filter((p): p is TrainPosition => p !== null);
    return { positions, fetchedAt: now, source: body.source };
  }

  async getFastExits(
    lineId: string,
    stationName: string,
    _direction: Direction,
    { signal }: RequestOptions = {},
  ): Promise<DoorGuide[]> {
    const line = getLine(lineId);
    if (!line) return [];
    // 빠른하차 API 는 서울교통공사 1~9호선 역코드로만 조회됩니다.
    if (!/^[1-9]$/.test(line.groupId)) return [];
    const code = stationCodeOf(line.groupId, stationName);
    if (!code) return [];
    const body = await this.fetchJson<RealtimeEnvelope<FastExitRow>>(
      `/api/v1/fast-exit/${line.groupId}/${code.stationCd}?station=${encodeURIComponent(stationName)}`,
      signal,
    );
    return body.rows.map((row) => ({
      car: row.door.car,
      door: row.door.door,
      label: row.door.label,
      purpose: 'exit',
      note: [row.facilityKind, row.facilityLabel].filter(Boolean).join(' ') || null,
    }));
  }

  async getNotices({ signal }: RequestOptions = {}): Promise<DisruptionNotice[]> {
    const rows = await this.fetchJson<NoticeRow[]>('/api/v1/notices?active=true', signal);
    return rows.map((row) => ({
      id: row.id,
      groupId: row.lineNo ? (GROUP_BY_LINE_NO[row.lineNo] ?? null) : null,
      title: row.title,
      content: row.content,
      category: row.category,
      startsAt: Date.parse(row.startsAt),
      endsAt: row.endsAt ? Date.parse(row.endsAt) : null,
    }));
  }

  async getNextDepartures(
    lineId: string,
    stationName: string,
    direction: Direction,
    { signal, afterSeconds, limit = 3 }: TimetableOptions = {},
  ): Promise<TimetableResult | null> {
    const target = timetableTarget(lineId, stationName);
    if (!target) return null;
    const query = new URLSearchParams({ direction: TIMETABLE_DIRECTION[direction], limit: String(limit) });
    if (afterSeconds != null) query.set('after', clock(afterSeconds));
    const body = await this.fetchJson<TimetableEnvelope>(`/api/v1/timetable/${target.lineNo}/${target.stationCd}?${query}`, signal);
    return mapTimetable(body);
  }

  async getLastDeparture(
    lineId: string,
    stationName: string,
    direction: Direction,
    { signal }: RequestOptions = {},
  ): Promise<TimetableDeparture | null> {
    const target = timetableTarget(lineId, stationName);
    if (!target) return null;
    const query = new URLSearchParams({ direction: TIMETABLE_DIRECTION[direction] });
    const body = await this.fetchJson<TimetableEnvelope>(`/api/v1/timetable/${target.lineNo}/${target.stationCd}/last?${query}`, signal);
    return mapTimetable(body).entries[0] ?? null;
  }

  private async fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
    const { baseUrl, timeoutMs } = this.options;
    const timeout = AbortSignal.timeout(timeoutMs);
    const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, { signal: composed, headers: { Accept: 'application/json' } });
    } catch (error) {
      if (timeout.aborted) {
        throw new SubwayApiError('timeout', `백엔드가 ${timeoutMs}ms 안에 응답하지 않았습니다.`);
      }
      throw new SubwayApiError('network', `백엔드에 연결할 수 없습니다: ${(error as Error).message}`);
    }

    if (!response.ok) {
      let body: ErrorBody = {};
      try {
        body = (await response.json()) as ErrorBody;
      } catch {
        // 본문이 JSON 이 아니면 상태 코드만으로 분류합니다.
      }
      const message = body.message ?? `HTTP ${response.status}`;
      if (response.status === 429 || body.kind === 'quota') throw new SubwayApiError('quota', message, body.kind ?? null);
      if (body.kind === 'auth') throw new SubwayApiError('auth', message, body.kind);
      if (response.status === 504 || body.kind === 'timeout') throw new SubwayApiError('timeout', message, body.kind ?? null);
      if (response.status === 400) throw new SubwayApiError('unknown', message, body.kind ?? null);
      throw new SubwayApiError('network', message, body.kind ?? null);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new SubwayApiError('unknown', '백엔드 응답을 JSON 으로 해석하지 못했습니다.');
    }
  }
}

/** 시각표는 서울교통공사 1~9호선 역코드로만 조회됩니다. */
function timetableTarget(lineId: string, stationName: string): { lineNo: string; stationCd: string } | null {
  const line = getLine(lineId);
  if (!line || !/^[1-9]$/.test(line.groupId)) return null;
  const code = stationCodeOf(line.groupId, stationName);
  return code ? { lineNo: line.groupId, stationCd: code.stationCd } : null;
}

/** 운행일 자정 기준 초 → "HH:mm:ss" (24시 이후는 25:10:00 처럼 그대로). */
function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function mapTimetable(body: TimetableEnvelope): TimetableResult {
  const entries = body.entries
    .map((e): TimetableDeparture | null => {
      const seconds = e.departSeconds ?? e.arriveSeconds;
      if (seconds == null) return null;
      return {
        trainNo: e.trainNo,
        direction: DIRECTION_FROM_TIMETABLE[e.direction.toUpperCase()] ?? 'down',
        express: e.express,
        seconds,
        label: clock(seconds).slice(0, 5),
        destinationStation: e.destinationStation,
      };
    })
    .filter((e): e is TimetableDeparture => e !== null);
  return { dayType: body.dayType, afterSeconds: body.afterSeconds, entries };
}

/**
 * 계통 → 서울 API 노선 id. 지선은 subwayId 가 없으므로 그룹 본선의 것을 씁니다.
 */
export function subwayIdForLine(lineId: string): string | null {
  const line = getLine(lineId);
  if (!line) return null;
  if (line.subwayId) return line.subwayId;
  const group = getLineGroup(line.groupId) ?? LINE_GROUPS.find((g) => g.id === line.groupId);
  const main = group ? getLine(group.lineIds[0]) : undefined;
  return main?.subwayId ?? null;
}
