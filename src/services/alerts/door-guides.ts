import { getLine, groupIdOf } from '@/data/stations';
import { doorLabel, findTransferGuide } from '@/data/transfers';
import type { RouteLeg, RoutePlan } from '@/services/routing/types';
import { getSubwayApi } from '@/services/subway';
import type { DoorGuide } from '@/services/subway/types';

import { doorGuideKey, type DoorGuideKey } from './trip';

/**
 * 경로의 환승마다 번들 데이터에서 "내릴 칸 · 탈 칸"을 찾아 구간별 안내로 만듭니다.
 *
 * 마지막 구간의 하차 칸(빠른하차)은 서버 데이터라 여기서 만들지 않습니다 — 호출자가
 * `fetchFastExitWithin` 결과를 `${마지막 구간}:alight` 에 덧붙입니다 (`buildDoorGuides` 참고).
 */
export function buildTransferDoorGuides(plan: RoutePlan): Partial<Record<DoorGuideKey, DoorGuide | null>> {
  const guides: Partial<Record<DoorGuideKey, DoorGuide | null>> = {};
  for (let i = 0; i + 1 < plan.legs.length; i += 1) {
    const leg = plan.legs[i];
    const next = plan.legs[i + 1];
    if (next.transferIn?.kind !== 'transfer') continue;
    const guide = findTransferGuide(
      leg.alightStationName,
      groupIdOf(leg.lineId),
      groupIdOf(next.lineId),
      leg.direction,
      next.direction,
    );
    if (!guide) continue;
    const nextLineName = getLine(next.lineId)?.name ?? '다음 노선';
    if (guide.alight) {
      guides[doorGuideKey(i, 'alight')] = {
        car: guide.alight.car,
        door: guide.alight.door,
        label: doorLabel(guide.alight),
        purpose: 'transfer',
        note: `${nextLineName} 환승 통로 가까운 칸`,
      };
    }
    if (guide.board) {
      guides[doorGuideKey(i + 1, 'board')] = {
        car: guide.board.car,
        door: guide.board.door,
        label: doorLabel(guide.board),
        purpose: 'transfer',
        note: plan.legs[i + 2] ? '다음 환승에 가까운 칸' : '하차역 출구에 가까운 칸',
      };
    }
  }
  return guides;
}

/** 최종 하차역의 빠른하차 칸. 서버가 느리면 기다리지 않고 없이 진행합니다. */
export async function fetchFastExitWithin(leg: RouteLeg, timeoutMs: number): Promise<DoorGuide | null> {
  const api = getSubwayApi();
  if (!api.capabilities.fastExits) return null;
  try {
    const exits = await Promise.race([
      api.getFastExits(leg.lineId, leg.alightStationName, leg.direction),
      new Promise<DoorGuide[]>((resolve) => setTimeout(() => resolve([]), timeoutMs)),
    ]);
    return exits[0] ?? null;
  } catch {
    return null;
  }
}

/** 환승 칸은 번들 데이터에서 바로, 최종 하차역의 빠른하차 칸은 서버에서 (제한 시간 안에 못 받으면 없이). */
export async function buildDoorGuides(
  plan: RoutePlan,
  timeoutMs = 3_000,
): Promise<Partial<Record<DoorGuideKey, DoorGuide | null>>> {
  const guides = buildTransferDoorGuides(plan);
  const lastIndex = plan.legs.length - 1;
  const exit = await fetchFastExitWithin(plan.legs[lastIndex], timeoutMs);
  if (exit) guides[doorGuideKey(lastIndex, 'alight')] = exit;
  return guides;
}
