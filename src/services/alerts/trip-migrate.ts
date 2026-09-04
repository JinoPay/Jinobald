import { alertKey, parseAlertKey, type AlertKey } from '@/services/notifications/kinds';
import { isPlanValid, planFromSingleLeg } from '@/services/routing';
import type { RoutePlan } from '@/services/routing/types';

import type { DoorGuide } from '@/services/subway/types';

import { TRIP_SCHEMA_VERSION, type DoorGuideKey, type ScheduledAlert, type Trip } from './trip';

/**
 * 저장된 여정을 현재 스키마로 올립니다.
 *
 * 절대 예외를 던지지 않습니다. 올릴 수 없으면 null 을 돌려주고, 호출자는 저장된
 * 값을 지웁니다 — 앱을 켰을 때 낡은 값 하나 때문에 화면이 죽는 것보다 여정을
 * 잃는 편이 낫습니다.
 *
 * 형태 검사만으로는 부족합니다. 앱 버전 사이에 노선 데이터가 바뀌어 인덱스가
 * 밀렸을 수 있으므로, 경로가 지금의 데이터셋과 여전히 맞는지도 확인합니다.
 */
export function migrateStoredTrip(raw: unknown): Trip | null {
  if (!isRecord(raw)) return null;
  // v2 와 v3 는 경로 표현이 같습니다. v3 는 열차번호·칸 안내가 더 있을 뿐입니다.
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  const plan = version >= 2 ? readPlan(raw.plan) : planFromV1(raw);
  if (!plan || !isPlanValid(plan)) return null;

  const status = raw.status;
  if (status !== 'active' && status !== 'completed' && status !== 'cancelled') return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;

  const scheduled = readScheduled(raw);
  const legIndex = Number(raw.currentLegIndex ?? 0);

  return {
    schemaVersion: TRIP_SCHEMA_VERSION,
    id: raw.id,
    plan,
    currentLegIndex:
      Number.isInteger(legIndex) && legIndex >= 0 && legIndex < plan.legs.length ? legIndex : 0,
    alertNStationsBefore: positiveInt(raw.alertNStationsBefore, 2),
    useGps: raw.useGps === true,
    createdAt: positiveInt(raw.createdAt, Date.now()),
    status,
    boarded: raw.boarded === true,
    boardedAt: typeof raw.boardedAt === 'number' ? raw.boardedAt : null,
    boardedTrainNo: typeof raw.boardedTrainNo === 'string' && raw.boardedTrainNo ? raw.boardedTrainNo : null,
    boardedBy: raw.boardedBy === 'auto' ? 'auto' : raw.boarded === true ? 'manual' : null,
    doorGuides: readDoorGuides(raw),
    firedKeys: readFiredKeys(raw),
    scheduled,
    geofenceActive: raw.geofenceActive === true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

/** v2 저장값의 경로. 구조 검사는 isPlanValid 가 이어서 합니다. */
function readPlan(value: unknown): RoutePlan | null {
  if (!isRecord(value) || !Array.isArray(value.legs)) return null;
  return value as unknown as RoutePlan;
}

/** v1 = 단일 노선 여정. 1구간 경로로 바꿔 담습니다. */
function planFromV1(raw: Record<string, unknown>): RoutePlan | null {
  const { lineId, originStationName, destinationStationName } = raw;
  if (
    typeof lineId !== 'string' ||
    typeof originStationName !== 'string' ||
    typeof destinationStationName !== 'string'
  ) {
    return null;
  }
  return planFromSingleLeg(lineId, originStationName, destinationStationName);
}

/** v1 의 `firedKinds: ['pre']` 는 v2 에서 `['0:pre']` 입니다. */
function readFiredKeys(raw: Record<string, unknown>): AlertKey[] {
  const source = raw.firedKeys ?? raw.firedKinds;
  if (!Array.isArray(source)) return [];
  const keys: AlertKey[] = [];
  for (const entry of source) {
    if (typeof entry !== 'string') continue;
    const key = toAlertKey(entry);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

function readScheduled(raw: Record<string, unknown>): Partial<Record<AlertKey, ScheduledAlert>> {
  if (!isRecord(raw.scheduled)) return {};
  const result: Partial<Record<AlertKey, ScheduledAlert>> = {};
  for (const [rawKey, value] of Object.entries(raw.scheduled)) {
    const key = toAlertKey(rawKey);
    if (!key || !isRecord(value) || typeof value.atMs !== 'number') continue;
    result[key] = {
      notificationId: typeof value.notificationId === 'string' ? value.notificationId : null,
      atMs: value.atMs,
    };
  }
  return result;
}

/** v3 의 칸 안내. 모양이 조금이라도 다르면 그 항목만 버립니다. */
function readDoorGuides(raw: Record<string, unknown>): Partial<Record<DoorGuideKey, DoorGuide | null>> {
  if (!isRecord(raw.doorGuides)) return {};
  const result: Partial<Record<DoorGuideKey, DoorGuide | null>> = {};
  for (const [key, value] of Object.entries(raw.doorGuides)) {
    if (!/^\d+:(alight|board)$/.test(key)) continue;
    if (value === null) {
      result[key as DoorGuideKey] = null;
      continue;
    }
    if (!isRecord(value) || typeof value.car !== 'number' || typeof value.door !== 'number') continue;
    result[key as DoorGuideKey] = {
      car: value.car,
      door: value.door,
      label: typeof value.label === 'string' ? value.label : `${value.car}-${value.door}`,
      purpose: value.purpose === 'exit' ? 'exit' : 'transfer',
      note: typeof value.note === 'string' ? value.note : null,
    };
  }
  return result;
}

/** 구간 번호가 없는 v1 키("pre")는 0번 구간의 키로 봅니다. */
function toAlertKey(value: string): AlertKey | null {
  const parsed = parseAlertKey(value);
  if (parsed) return alertKey(parsed.legIndex, parsed.kind);
  const legacy = parseAlertKey(`0:${value}`);
  return legacy ? alertKey(0, legacy.kind) : null;
}
