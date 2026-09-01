#!/usr/bin/env node
/**
 * src/data/lines.json 생성기.
 *
 * 입력
 *   scripts/data/lines.def.mjs      운행 계통과 역 순서 (손으로 관리)
 *   scripts/data/station-coords.csv 역명 → 위경도 (공개 데이터에서 추출)
 *
 * 좌표는 선택 항목입니다. 붙지 않은 역은 GPS 지오펜싱 보정만 비활성화되고
 * 노선도·검색·실시간 도착은 그대로 동작합니다. 붙지 않은 역은 아래에 보고합니다.
 *
 * 실행: node scripts/build-lines.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALIASES, LINE_DEFS } from './data/lines.def.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 역명 정규화 — src/data/stations.ts 의 normalizeStationName 과 같은 규칙이어야 합니다. */
function normalize(name) {
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .replace(/역$/, '')
    .trim();
}

function readCoords() {
  const text = readFileSync(join(root, 'scripts/data/station-coords.csv'), 'utf8');
  const map = new Map();
  for (const line of text.split('\n').slice(1)) {
    const [name, lat, lng] = line.split(',');
    if (!name) continue;
    map.set(normalize(name), { lat: Number(lat), lng: Number(lng) });
  }
  return map;
}

const coords = readCoords();
const aliasByStation = new Map(Object.entries(ALIASES).map(([k, v]) => [normalize(k), v]));

const missing = new Set();
const lines = LINE_DEFS.map((def) => {
  const names = def.stations.trim().split(/\s+/);
  const stations = names.map((name) => {
    const station = { name };
    const point = coords.get(normalize(name));
    if (point) {
      // 소수점 6자리는 약 0.1m 로 지오펜싱에 충분하고 번들 크기를 줄여 줍니다.
      station.lat = Number(point.lat.toFixed(6));
      station.lng = Number(point.lng.toFixed(6));
    } else {
      missing.add(name);
    }
    const aliases = aliasByStation.get(normalize(name));
    if (aliases) station.aliases = aliases;
    return station;
  });

  return {
    id: def.id,
    name: def.name,
    subwayId: def.subwayId ?? null,
    color: def.color,
    loop: def.loop ?? false,
    realtime: def.realtime,
    groupId: def.groupId,
    badge: def.badge,
    avgSecondsPerStation: def.avgSecondsPerStation,
    note: def.note,
    upTerminal: names[0],
    downTerminal: names[names.length - 1],
    stations,
  };
});

writeFileSync(join(root, 'src/data/lines.json'), `${JSON.stringify(lines, null, 2)}\n`, 'utf8');

const total = lines.reduce((sum, l) => sum + l.stations.length, 0);
const withCoords = lines.reduce(
  (sum, l) => sum + l.stations.filter((s) => s.lat != null).length,
  0,
);
console.log(`계통 ${lines.length}개, 역 항목 ${total}개 → src/data/lines.json`);
console.log(`좌표 보유 ${withCoords}/${total} (${((withCoords / total) * 100).toFixed(1)}%)`);
if (missing.size > 0) {
  console.log(`\n좌표 없는 역 ${missing.size}개 (GPS 보정만 비활성화됩니다):`);
  console.log(`  ${[...missing].join(' ')}`);
}
