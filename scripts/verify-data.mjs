#!/usr/bin/env node
/**
 * 정적 노선 데이터의 불변식 검사.
 *
 * 손으로 시드한 데이터셋이므로 기기나 번들러 없이 확인할 수 있는 검사를 모아 둡니다.
 * 실행: node scripts/verify-data.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lines = JSON.parse(readFileSync(join(root, 'src/data/lines.json'), 'utf8'));

const errors = [];
const warnings = [];
const seenSubwayIds = new Set();
const seenLineIds = new Set();

// 서울 및 수도권 대략 범위. 좌표 오타를 잡기 위한 검사입니다.
const BOUNDS = { minLat: 37.1, maxLat: 37.9, minLng: 126.4, maxLng: 127.4 };

for (const line of lines) {
  const where = `${line.name ?? line.id}`;

  if (seenLineIds.has(line.id)) errors.push(`${where}: 중복된 노선 id "${line.id}"`);
  seenLineIds.add(line.id);

  if (seenSubwayIds.has(line.subwayId)) errors.push(`${where}: 중복된 subwayId "${line.subwayId}"`);
  seenSubwayIds.add(line.subwayId);

  if (!/^\d{4}$/.test(line.subwayId ?? '')) {
    errors.push(`${where}: subwayId 는 4자리 숫자여야 합니다 (현재 "${line.subwayId}")`);
  }
  if (!/^#[0-9A-F]{6}$/i.test(line.color ?? '')) {
    errors.push(`${where}: color 형식 오류 ("${line.color}")`);
  }
  if (!Array.isArray(line.stations) || line.stations.length < 2) {
    errors.push(`${where}: 역이 2개 미만입니다`);
    continue;
  }
  if (!Number.isFinite(line.avgSecondsPerStation) || line.avgSecondsPerStation <= 0) {
    errors.push(`${where}: avgSecondsPerStation 이 유효하지 않습니다`);
  }

  const names = new Set();
  for (const station of line.stations) {
    if (!station.name) {
      errors.push(`${where}: 이름 없는 역 항목이 있습니다`);
      continue;
    }
    if (names.has(station.name)) {
      errors.push(`${where}: 같은 노선에 중복된 역 "${station.name}"`);
    }
    names.add(station.name);

    const hasLat = station.lat != null;
    const hasLng = station.lng != null;
    if (hasLat !== hasLng) {
      errors.push(`${where} / ${station.name}: lat 과 lng 은 함께 있어야 합니다`);
    } else if (hasLat) {
      const { lat, lng } = station;
      if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng) {
        errors.push(`${where} / ${station.name}: 좌표가 수도권 범위를 벗어납니다 (${lat}, ${lng})`);
      }
    }
  }

  const first = line.stations[0].name;
  const last = line.stations[line.stations.length - 1].name;
  if (line.upTerminal !== first) {
    errors.push(`${where}: upTerminal "${line.upTerminal}" 이 첫 역 "${first}" 과 다릅니다`);
  }
  if (line.downTerminal !== last) {
    errors.push(`${where}: downTerminal "${line.downTerminal}" 이 마지막 역 "${last}" 과 다릅니다`);
  }
}

// 환승역 파생 확인 — 두 개 이상의 노선에 등장하는 이름.
const normalize = (name) =>
  name.replace(/\(.*?\)/g, '').replace(/\s+/g, '').replace(/역$/, '').trim();

const byName = new Map();
for (const line of lines) {
  for (const station of line.stations) {
    for (const key of [station.name, ...(station.aliases ?? [])]) {
      const n = normalize(key);
      if (!n) continue;
      const set = byName.get(n) ?? new Set();
      set.add(line.id);
      byName.set(n, set);
    }
  }
}
const transfers = [...byName.entries()].filter(([, set]) => set.size > 1);
if (transfers.length === 0) {
  warnings.push('환승역이 하나도 도출되지 않았습니다 — 역명 표기를 확인하세요.');
}

const totalStations = lines.reduce((sum, l) => sum + l.stations.length, 0);
const withCoords = lines.reduce(
  (sum, l) => sum + l.stations.filter((s) => s.lat != null).length,
  0,
);

console.log('노선별 역 수');
for (const line of lines) {
  console.log(
    `  ${line.name.padEnd(6)} ${String(line.stations.length).padStart(3)}개  ` +
      `${line.upTerminal} ~ ${line.downTerminal}`,
  );
}
console.log('');
console.log(`총 역 항목      : ${totalStations}`);
console.log(`고유 역명       : ${byName.size}`);
console.log(`환승역          : ${transfers.length}`);
console.log(`좌표 보유       : ${withCoords} (${((withCoords / totalStations) * 100).toFixed(1)}%)`);
console.log('');

for (const warning of warnings) console.warn(`경고: ${warning}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`오류: ${error}`);
  console.error(`\n${errors.length}개의 오류가 있습니다.`);
  process.exit(1);
}
console.log('모든 불변식 검사를 통과했습니다.');
