/**
 * 알림 카테고리·액션 식별자 — 순수 모듈입니다 (런타임 import 0개).
 *
 * `categories.ts` 는 expo-notifications 로 등록하고, `response.ts` 는 응답을 해석합니다.
 * 둘이 같은 문자열을 써야 하고 response.ts 는 Node 로 테스트하므로 상수를 따로 둡니다.
 */
import type { AlertKind } from './kinds';

export const CATEGORY = {
  board: 'trip-board',
  pre: 'trip-pre',
  arrive: 'trip-arrive',
  transfer: 'trip-transfer',
  routine: 'routine',
} as const;

export const ACTION = {
  ack: 'ack',
  boarded: 'boarded',
  notThisTrain: 'not-this-train',
  advanced: 'advanced',
  startRoutine: 'start-routine',
  skipToday: 'skip-today',
} as const;

export function categoryForKind(kind: AlertKind): string {
  switch (kind) {
    case 'board':
      return CATEGORY.board;
    case 'pre':
    case 'transfer-pre':
      return CATEGORY.pre;
    case 'arrive':
      return CATEGORY.arrive;
    case 'transfer':
      return CATEGORY.transfer;
  }
}
