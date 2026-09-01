import { findStationRefs, type StationRef } from '@/data/stations';

import type { SubwayApi } from './SubwayApi';
import type { Arrival, ArrivalsResult, Direction } from './types';

/**
 * 결정적 모의 구현.
 *
 * 무작위가 아니라 (역명, 방향, 순번) 에서 유도한 고정 위상을 쓰기 때문에
 * 폴링할 때마다 도착 시간이 눈에 띄게 줄어듭니다. 값이 매번 튀면 ETA 재계산
 * 로직을 손으로 확인할 수 없어서 이렇게 만들었습니다.
 */
export class MockSubwayApi implements SubwayApi {
  readonly kind = 'mock' as const;

  async getArrivals(stationName: string): Promise<ArrivalsResult> {
    const now = Date.now();
    const refs = findStationRefs(stationName);
    const arrivals: Arrival[] = [];

    for (const ref of refs) {
      const directions: Direction[] = ref.line.loop ? ['inner', 'outer'] : ['up', 'down'];
      for (const direction of directions) {
        for (let n = 0; n < 2; n += 1) {
          arrivals.push(this.buildArrival(ref, direction, n, now));
        }
      }
    }
    return { arrivals, fetchedAt: now, source: 'mock' };
  }

  private buildArrival(ref: StationRef, direction: Direction, nth: number, now: number): Arrival {
    const { line, index, station } = ref;
    const headway = line.avgSecondsPerStation * 3; // 배차 간격 근사
    const phase = hash(`${station.name}|${direction}`) % headway;
    // 실제 시계에 맞춰 줄어드는 카운트다운.
    const elapsed = Math.floor(now / 1000) % headway;
    let seconds = ((phase - elapsed + headway) % headway) + nth * headway;
    if (seconds < 20) seconds = 20 + nth * headway;

    const forward = direction === 'down' || direction === 'outer';
    // 순환선은 종착역 대신 순환 방향을 행선지로 표시합니다.
    const terminal = line.loop
      ? direction === 'inner'
        ? '내선순환'
        : '외선순환'
      : forward
        ? line.downTerminal
        : line.upTerminal;
    const step = forward ? -1 : 1; // 열차는 반대쪽에서 오고 있습니다.
    const positionIndex = clampIndex(line.stations.length, index + step * (1 + nth), line.loop);
    const position = line.stations[positionIndex]?.name ?? station.name;

    return {
      id: `mock|${line.id}|${direction}|${nth}`,
      lineId: line.id,
      stationName: station.name,
      direction,
      terminalStationName: terminal,
      trainKind: 'local',
      secondsUntilArrival: seconds,
      statusMessage: formatKoreanEta(seconds, position),
      currentPositionStationName: position,
      status: seconds <= 30 ? 'entering' : 'running',
      receivedAt: now,
    };
  }
}

function clampIndex(length: number, index: number, loop: boolean): number {
  if (loop) return ((index % length) + length) % length;
  return Math.min(Math.max(index, 0), length - 1);
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function formatKoreanEta(seconds: number, position: string): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const time = m > 0 ? `${m}분 ${s}초 후` : `${s}초 후`;
  return `${time} (${position})`;
}
