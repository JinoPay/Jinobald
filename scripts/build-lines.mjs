#!/usr/bin/env node
/**
 * src/data/lines.json 생성기.
 *
 * 입력
 *   scripts/data/lines.def.mjs           운행 계통과 역 순서 (손으로 관리)
 *   scripts/data/station-coords.csv      역명 → 위경도 (공개 데이터에서 추출)
 *   scripts/data/raw/segment-times.csv   역간 표준 운행시간 (서울교통공사, 선택)
 *
 * 좌표는 선택 항목입니다. 붙지 않은 역은 GPS 지오펜싱 보정만 비활성화되고
 * 노선도·검색·실시간 도착은 그대로 동작합니다. 붙지 않은 역은 아래에 보고합니다.
 *
 * 실행: node scripts/build-lines.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALIASES, LINE_DEFS } from './data/lines.def.mjs';
import { parseClockSeconds, parseCsvRecords } from './lib/csv.mjs';

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

/**
 * 역간 표준 운행시간 (scripts/data/raw/segment-times.csv, 서울교통공사 1~8호선 운영 구간).
 * 각 행은 "직전 역 → 이 역" 소요시간이라 호선별로 앞 행과 짝지어 (역A, 역B) → 초 로 만듭니다.
 * 파일이 없으면 조용히 건너뛰고 노선 평균만 남습니다.
 */
function readSegmentSeconds() {
  const path = join(root, 'scripts/data/raw/segment-times.csv');
  if (!existsSync(path)) return new Map();
  const rows = parseCsvRecords(readFileSync(path, 'utf8'));
  const map = new Map(); // `${호선}|${역A}|${역B}` (정규화, 양방향) → 초
  let prev = null;
  for (const r of rows) {
    const seconds = parseClockSeconds(r['소요시간']);
    const current = { line: r['호선'], key: normalize(r['역명']) };
    if (prev && prev.line === current.line && seconds != null && seconds > 0) {
      map.set(`${current.line}|${prev.key}|${current.key}`, seconds);
      map.set(`${current.line}|${current.key}|${prev.key}`, seconds);
    }
    prev = current;
  }
  return map;
}

const coords = readCoords();
const segmentSeconds = readSegmentSeconds();
const aliasByStation = new Map(Object.entries(ALIASES).map(([k, v]) => [normalize(k), v]));
let segmentHits = 0;

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

  // 인접 역 사이의 실측 소요시간. 그룹 id 가 호선 번호("1"~"9")인 계통만 데이터가 있습니다.
  // 순환선의 마지막→첫 역 구간도 같은 방식으로 찾습니다.
  const total = stations.length;
  const wrap = def.loop && total > 2 ? total : total - 1;
  for (let i = 0; i < wrap; i += 1) {
    const a = normalize(names[i]);
    const b = normalize(names[(i + 1) % total]);
    const seconds = segmentSeconds.get(`${def.groupId}|${a}|${b}`);
    if (seconds != null) {
      stations[i].secondsToNext = seconds;
      segmentHits += 1;
    }
  }

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
console.log(`구간 소요시간 보유 ${segmentHits}개 구간 (원본 ${segmentSeconds.size / 2}개 중)`);
if (missing.size > 0) {
  console.log(`\n좌표 없는 역 ${missing.size}개 (GPS 보정만 비활성화됩니다):`);
  console.log(`  ${[...missing].join(' ')}`);
}
