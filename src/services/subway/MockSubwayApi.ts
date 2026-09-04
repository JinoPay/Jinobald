import {
  findStationRefs,
  getLine,
  getLineGroup,
  isTransferStation,
  type Line,
  type StationRef,
} from '@/data/stations';

import type { RequestOptions, SubwayApi, SubwayCapabilities } from './SubwayApi';
import type {
  Arrival,
  ArrivalsResult,
  Direction,
  DisruptionNotice,
  DoorGuide,
  TimetableDeparture,
  TimetableResult,
  TrainPosition,
  TrainPositionsResult,
} from './types';

/**
 * 결정적 모의 구현.
 *
 * 무작위가 아니라 벽시계에서 유도한 고정 위상을 쓰기 때문에 폴링할 때마다 도착 시간이
 * 눈에 띄게 줄어들고, 노선 뷰의 열차도 한 정거장씩 앞으로 갑니다. 값이 매번 튀면 ETA
 * 재계산과 승차 후 추적을 손으로 확인할 수 없어서 이렇게 만들었습니다.
 *
 * 열차 모델: 방향마다 `TRAIN_SPACING` 정거장 간격으로 열차가 늘어서 있고, 노선 평균
 * 소요시간마다 한 정거장씩 전진합니다 (비순환선도 끝에서 처음으로 감아 돕니다).
 * 도착정보와 열차 위치가 **같은 모델**에서 나오므로 승차한 열차번호로 위치를 찾을 수 있습니다.
 */
export class MockSubwayApi implements SubwayApi {
  readonly kind = 'mock' as const;

  readonly capabilities: SubwayCapabilities = {
    arrivals: true,
    trainPositions: true,
    fastExits: true,
    notices: true,
    timetable: false,
  };

  async getArrivals(stationName: string, _options?: RequestOptions): Promise<ArrivalsResult> {
    const now = Date.now();
    const arrivals: Arrival[] = [];
    for (const ref of findStationRefs(stationName)) {
      const directions: Direction[] = ref.line.loop ? ['inner', 'outer'] : ['up', 'down'];
      for (const direction of directions) {
        const approaching = trainsOn(ref.line, direction, now)
          .map((train) => ({ train, ...distanceTo(ref.line, train, direction, ref.index, now) }))
          .filter((t) => t.stationsAway >= 0)
          .sort((a, b) => a.seconds - b.seconds)
          .slice(0, 2);
        for (const { train, seconds, stationsAway } of approaching) {
          arrivals.push(buildArrival(ref, direction, train, seconds, stationsAway, now));
        }
      }
    }
    return { arrivals, fetchedAt: now, source: 'mock' };
  }

  async getTrainPositions(lineId: string, _options?: RequestOptions): Promise<TrainPositionsResult | null> {
    const line = getLine(lineId);
    if (!line) return null;
    const now = Date.now();
    const directions: Direction[] = line.loop ? ['inner', 'outer'] : ['up', 'down'];
    const positions: TrainPosition[] = directions.flatMap((direction) =>
      trainsOn(line, direction, now).map((train): TrainPosition => ({
        lineId: line.id,
        trainNo: train.trainNo,
        stationName: line.stations[train.index].name,
        stationIndex: train.index,
        direction,
        terminalStationName: terminalOf(line, direction),
        status: train.status,
        express: false,
        lastTrain: false,
        receivedAt: now,
      })),
    );
    return { positions, fetchedAt: now, source: 'mock' };
  }

  async getFastExits(lineId: string, stationName: string, direction: Direction): Promise<DoorGuide[]> {
    // 화면·알림 문구를 오프라인에서 확인할 수 있도록 환승역에는 고정된 칸을 돌려줍니다.
    if (!isTransferStation(stationName)) return [];
    const forward = direction === 'down' || direction === 'outer';
    return [
      {
        car: forward ? 3 : 8,
        door: 2,
        label: forward ? '3-2' : '8-2',
        purpose: 'exit',
        note: '계단 · 모의 데이터',
      },
    ];
  }

  async getNotices(): Promise<DisruptionNotice[]> {
    const groupId = '2';
    const group = getLineGroup(groupId);
    const now = Date.now();
    return [
      {
        id: 'mock-notice-1',
        groupId,
        title: `${group?.name ?? '2호선'} 일부 구간 서행 (모의 공지)`,
        content: '모의 데이터 모드에서 표시되는 예시 공지입니다. 백엔드에 공공데이터포털 키를 넣으면 실제 운행 공지가 나옵니다.',
        category: '지연',
        startsAt: now - 10 * 60 * 1000,
        endsAt: null,
      },
    ];
  }

  /** 시각표는 백엔드에만 있습니다. */
  async getNextDepartures(): Promise<TimetableResult | null> {
    return null;
  }

  async getLastDeparture(): Promise<TimetableDeparture | null> {
    return null;
  }
}

/** 열차 사이 정거장 간격. */
const TRAIN_SPACING = 4;

interface MockTrain {
  trainNo: string;
  /** 열차가 있거나 향하는 역 인덱스. */
  index: number;
  /** 다음 역까지의 진행률 0~1. 0 이면 방금 도착. */
  progress: number;
  status: TrainPosition['status'];
  /** 이 열차의 "머리" 위치(정거장 단위, 소수). */
  head: number;
}

/** 모의 열차는 노선 평균 소요시간에 한 정거장씩 갑니다. */
function stepMs(line: Line): number {
  return line.avgSecondsPerStation * 1000;
}

/**
 * 시각 `now` 의 열차 목록. 머리 위치 = 열차 기준 오프셋 + 경과 정거장 수 (노선 길이로 감음).
 * 상행/내선은 인덱스가 줄어드는 방향으로 갑니다.
 */
function trainsOn(line: Line, direction: Direction, now: number): MockTrain[] {
  const n = line.stations.length;
  const count = Math.max(1, Math.round(n / TRAIN_SPACING));
  const travelled = now / stepMs(line); // 정거장 단위 (소수)
  const forward = direction === 'down' || direction === 'outer';
  const trains: MockTrain[] = [];
  for (let t = 0; t < count; t += 1) {
    const phase = (t * n) / count;
    const raw = forward ? phase + travelled : phase - travelled;
    const head = ((raw % n) + n) % n;
    const base = Math.floor(head);
    const progress = head - base;
    // 진행률로 상태를 정합니다: 정차 → 출발 → 전역출발 → 진입.
    let index = base;
    let status: TrainPosition['status'];
    if (progress < 0.25) status = 'arrived';
    else if (progress < 0.45) status = 'departed';
    else {
      index = forward ? (base + 1) % n : (base - 1 + n) % n;
      status = progress < 0.8 ? 'prevDeparted' : 'entering';
    }
    trains.push({ trainNo: `M${line.id}-${direction[0].toUpperCase()}${t + 1}`, index, progress, status, head });
  }
  return trains;
}

/** 열차가 `stationIndex` 에 도착하기까지의 정거장 수·초. 이미 지난 열차는 stationsAway < 0. */
function distanceTo(
  line: Line,
  train: MockTrain,
  direction: Direction,
  stationIndex: number,
  _now: number,
): { stationsAway: number; seconds: number } {
  const n = line.stations.length;
  const forward = direction === 'down' || direction === 'outer';
  const ahead = forward ? stationIndex - train.head : train.head - stationIndex;
  const wrapped = ((ahead % n) + n) % n;
  // 비순환선에서 끝을 넘어 감아 오는 열차는 다음 열차로 치지 않습니다.
  if (!line.loop && wrapped > n - 1) return { stationsAway: -1, seconds: 0 };
  const seconds = Math.max(15, Math.round(wrapped * line.avgSecondsPerStation));
  return { stationsAway: Math.ceil(wrapped - 0.0001), seconds };
}

function terminalOf(line: Line, direction: Direction): string {
  if (line.loop) return direction === 'inner' ? '내선순환' : '외선순환';
  return direction === 'down' ? line.downTerminal : line.upTerminal;
}

function buildArrival(
  ref: StationRef,
  direction: Direction,
  train: MockTrain,
  seconds: number,
  stationsAway: number,
  now: number,
): Arrival {
  const { line, station } = ref;
  const position = line.stations[train.index]?.name ?? station.name;
  const atStation = stationsAway === 0;
  return {
    id: `mock|${line.id}|${direction}|${train.trainNo}`,
    lineId: line.id,
    stationName: station.name,
    direction,
    terminalStationName: terminalOf(line, direction),
    trainKind: 'local',
    trainNo: train.trainNo,
    secondsUntilArrival: atStation ? null : seconds,
    statusMessage: atStation ? `${station.name} 도착` : formatKoreanEta(seconds, position),
    currentPositionStationName: position,
    status: atStation ? 'arrived' : seconds <= 30 ? 'entering' : 'running',
    receivedAt: now,
  };
}

function formatKoreanEta(seconds: number, position: string): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const time = m > 0 ? `${m}분 ${s}초 후` : `${s}초 후`;
  return `${time} (${position})`;
}
