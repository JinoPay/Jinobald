/**
 * 알림 탭·액션 해석 — 순수 함수입니다.
 *
 * expo-notifications 의 응답 객체에서 payload 와 actionIdentifier 만 받아 앱이 할 일로 바꿉니다.
 * 컨텍스트마다 자기 종류(`trip` / `routine`)만 처리하고 나머지는 무시합니다.
 */
import { ACTION } from './action-ids';
import { isAlertKind, type AlertKind } from './kinds';

export type TripResponseAction = 'open' | 'ack' | 'boarded' | 'not-this-train' | 'advanced';
export type RoutineResponseAction = 'open' | 'start' | 'skip';

export type ResponseIntent =
  | { type: 'trip'; tripId: string; legIndex: number; kind: AlertKind; action: TripResponseAction }
  | { type: 'routine'; routineId: string; action: RoutineResponseAction }
  | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * @param data 알림 content.data
 * @param actionIdentifier 누른 버튼. 알림 본체를 탭했으면 `defaultActionIdentifier` 입니다.
 */
export function interpretResponse(
  data: unknown,
  actionIdentifier: string,
  defaultActionIdentifier: string,
): ResponseIntent {
  if (!isRecord(data)) return null;
  const tapped = actionIdentifier === defaultActionIdentifier;

  if (typeof data.routineId === 'string' && data.routineId) {
    const action: RoutineResponseAction | null = tapped
      ? 'open'
      : actionIdentifier === ACTION.startRoutine
        ? 'start'
        : actionIdentifier === ACTION.skipToday
          ? 'skip'
          : null;
    return action ? { type: 'routine', routineId: data.routineId, action } : null;
  }

  if (typeof data.tripId !== 'string' || !data.tripId) return null;
  if (!isAlertKind(data.kind)) return null;
  const legIndex = typeof data.legIndex === 'number' && Number.isInteger(data.legIndex) ? data.legIndex : null;
  if (legIndex === null || legIndex < 0) return null;

  const action: TripResponseAction | null = tapped
    ? 'open'
    : actionIdentifier === ACTION.ack
      ? 'ack'
      : actionIdentifier === ACTION.boarded
        ? 'boarded'
        : actionIdentifier === ACTION.notThisTrain
          ? 'not-this-train'
          : actionIdentifier === ACTION.advanced
            ? 'advanced'
            : null;
  return action ? { type: 'trip', tripId: data.tripId, legIndex, kind: data.kind, action } : null;
}
