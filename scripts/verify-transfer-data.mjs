#!/usr/bin/env node
/**
 * src/data/generated/*.json 의 불변식 검사.
 *
 * - 모든 역 키가 lines.json 에 존재하고, 노선 그룹·계통 id 가 실재하며, 방향이 계통에 맞는지
 * - 칸/문 번호와 소요시간이 그럴듯한 범위인지
 * - 환승역 커버리지 보고
 * 실행: node scripts/verify-transfer-data.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalize } from './lib/csv.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => JSON.parse(readFileSync(join(root, 'src/data/generated', name), 'utf8'));
const lines = JSON.parse(readFileSync(join(root, 'src/data/lines.json'), 'utf8'));
const guides = read('transfer-guides.json');
const times = read('transfer-times.json');
const codes = read('station-codes.json');
const manifest = read('manifest.json');

const errors = [];
const lineById = new Map(lines.map((l) => [l.id, l]));
const groupIds = new Set(lines.map((l) => l.groupId));
const stationGroups = new Map();
for (const line of lines) {
  for (const s of line.stations) {
    for (const n of [s.name, ...(s.aliases ?? [])]) {
      const k = normalize(n);
      (stationGroups.get(k) ?? stationGroups.set(k, new Set()).get(k)).add(line.groupId);
    }
  }
}

function checkDoor(where, door) {
  if (door == null) return;
  if (!(door.car >= 1 && door.car <= 10)) errors.push(`${where}: 호차 ${door.car} 범위 밖`);
  if (!(door.door >= 1 && door.door <= 8)) errors.push(`${where}: 문 ${door.door} 범위 밖`);
}

let guideCount = 0;
for (const [stationKey, entries] of Object.entries(guides)) {
  const groups = stationGroups.get(stationKey);
  if (!groups) {
    errors.push(`환승 가이드: "${stationKey}" 는 lines.json 에 없는 역`);
    continue;
  }
  for (const e of entries) {
    guideCount += 1;
    const where = `환승 가이드 ${stationKey} ${e.fromGroupId}→${e.toGroupId}`;
    if (!groups.has(e.fromGroupId)) errors.push(`${where}: 이 역을 지나지 않는 출발 그룹`);
    if (!groups.has(e.toGroupId)) errors.push(`${where}: 이 역을 지나지 않는 도착 그룹`);
    for (const [lineId, direction] of [[e.fromLineId, e.fromDirection], [e.toLineId, e.toDirection]]) {
      const line = lineById.get(lineId);
      if (!line) {
        errors.push(`${where}: 없는 계통 ${lineId}`);
        continue;
      }
      const valid = line.loop ? ['inner', 'outer'] : ['up', 'down'];
      if (!valid.includes(direction)) errors.push(`${where}: ${line.name} 에 맞지 않는 방향 ${direction}`);
    }
    checkDoor(where, e.alight);
    checkDoor(where, e.board);
    // 같은 승강장 계통 변경(금천구청 1→1 등)은 0초입니다.
    if (!(e.seconds >= 0 && e.seconds <= 1500)) errors.push(`${where}: 소요시간 ${e.seconds}초 범위 밖`);
  }
}

for (const [key, value] of Object.entries(times)) {
  const [stationKey, a, b] = key.split('|');
  const groups = stationGroups.get(stationKey);
  if (!groups) errors.push(`환승 시간 "${key}": 없는 역`);
  else if (!groups.has(a) || !groups.has(b)) errors.push(`환승 시간 "${key}": 이 역을 지나지 않는 그룹`);
  if (!(value.seconds >= 1 && value.seconds <= 1200)) errors.push(`환승 시간 "${key}": ${value.seconds}초 범위 밖`);
  if (!(value.meters >= 5 && value.meters <= 1500)) errors.push(`환승 시간 "${key}": ${value.meters}m 범위 밖`);
}

for (const [key, value] of Object.entries(codes)) {
  const [groupId, stationKey] = key.split('|');
  if (!groupIds.has(groupId)) errors.push(`역코드 "${key}": 없는 그룹`);
  if (!stationGroups.get(stationKey)?.has(groupId)) errors.push(`역코드 "${key}": 이 역을 지나지 않는 그룹`);
  // 서울교통공사 역은 4자리 숫자, 코레일 일부 역은 "102C" 같은 표기입니다.
  if (!/^[0-9A-Z]{3,5}$/.test(value.stationCd)) errors.push(`역코드 "${key}": 형식 오류 (${value.stationCd})`);
}

if (manifest.transferGuides.rows !== guideCount) {
  errors.push(`manifest 의 환승 가이드 행수(${manifest.transferGuides.rows})와 실제(${guideCount})가 다릅니다`);
}

const transferStations = [...stationGroups].filter(([, g]) => g.size > 1).map(([k]) => k);
const covered = transferStations.filter((k) => guides[k]).length;
const withTimes = transferStations.filter((k) => Object.keys(times).some((t) => t.startsWith(`${k}|`))).length;

console.log(`환승 가이드      : ${guideCount}건 / ${Object.keys(guides).length}역`);
console.log(`환승 도보 시간   : ${Object.keys(times).length}건`);
console.log(`역코드           : ${Object.keys(codes).length}건`);
console.log(`환승역 커버리지  : 가이드 ${covered}/${transferStations.length}, 도보시간 ${withTimes}/${transferStations.length}`);
if (errors.length > 0) {
  console.log(`\n오류 ${errors.length}건:`);
  for (const e of errors.slice(0, 40)) console.log(`  ✘ ${e}`);
  process.exit(1);
}
console.log('\n모든 환승 데이터 불변식 검사를 통과했습니다.');
