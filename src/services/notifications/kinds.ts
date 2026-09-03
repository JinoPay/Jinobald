/**
 * 알림 종류와 키 — 순수 모듈입니다 (런타임 import 0개).
 *
 * `schedule.ts` 는 expo-notifications 를 끌고 오므로, 알림을 예약하지 않는 쪽
 * (`trip.ts`, `progress.ts`) 이 종류만 알면 될 때 이 파일을 씁니다.
 */

/**
 * 한 구간(leg)에서 보낼 수 있는 알림.
 *
 * - `board`: 승차 대기 중 탈 열차가 곧 도착 (승차 알림). 발화해도 여정 상태는 바뀌지 않습니다.
 * - 마지막 구간은 `pre` → `arrive`, 그 앞 구간들은 `transfer-pre` → `transfer` 를 씁니다.
 *   지오펜스 반경과 발화 후 동작(구간 전진 vs 여정 종료)이 달라서 종류를 나눕니다.
 */
export type AlertKind = 'board' | 'pre' | 'arrive' | 'transfer-pre' | 'transfer';

export const ALERT_KINDS = ['board', 'pre', 'arrive', 'transfer-pre', 'transfer'] as const;

export function isAlertKind(value: unknown): value is AlertKind {
  return typeof value === 'string' && (ALERT_KINDS as readonly string[]).includes(value);
}

/**
 * 예약된 알림의 키 — `${구간 번호}:${종류}`.
 *
 * 같은 종류가 구간마다 반복되므로 종류만으로는 구분할 수 없습니다.
 */
export type AlertKey = `${number}:${AlertKind}`;

export function alertKey(legIndex: number, kind: AlertKind): AlertKey {
  return `${legIndex}:${kind}`;
}

export function parseAlertKey(value: string): { legIndex: number; kind: AlertKind } | null {
  const separator = value.indexOf(':');
  if (separator < 0) return null;
  const legIndex = Number(value.slice(0, separator));
  const kind = value.slice(separator + 1);
  if (!Number.isInteger(legIndex) || legIndex < 0 || !isAlertKind(kind)) return null;
  return { legIndex, kind };
}
