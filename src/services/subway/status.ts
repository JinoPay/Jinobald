/**
 * 도착 상태 판정 — 순수 모듈입니다 (런타임 import 0개).
 *
 * `mappers.ts` 는 `@/data/stations` 를 끌고 오므로, 알림·진행 계산처럼 Node 로 검증하는
 * 모듈이 상태 판정만 필요할 때 이 파일을 씁니다.
 */
import type { ArrivalStatus } from './types';

/** 열차가 이미 승강장에 있거나 진입 중인 상태. */
export function isAtStation(status: ArrivalStatus): boolean {
  return status === 'arrived' || status === 'entering';
}
