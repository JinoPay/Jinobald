#!/usr/bin/env node
/**
 * scripts/data/raw 의 환승·역코드 데이터를 앱이 번들하는 JSON 으로 만듭니다.
 *
 *   src/data/generated/transfer-guides.json   환승역별 최단 환승 경로 (하차 칸 "3-2", 승차 칸, 소요시간)
 *   src/data/generated/transfer-times.json    (역, 노선그룹 A, 노선그룹 B) → 환승 도보 초·거리
 *   src/data/generated/station-codes.json     (노선그룹, 역) → 서울교통공사 역코드
 *   src/data/generated/manifest.json          행수·생성일
 *
 * 원본은 역코드와 "… 방면" 역명으로 노선·방향을 표현하므로, lines.json 의 역 순서에서
 * 노선 그룹·계통·방향을 되찾습니다. 못 찾은 행은 조용히 버리지 않고 끝에 보고합니다.
 *
 * 실행: node scripts/build-transfer-data.mjs
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalize, parseClockSeconds, parseCsvRecords } from './lib/csv.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'scripts/data/raw');
const outDir = join(root, 'src/data/generated');
mkdirSync(outDir, { recursive: true });

const lines = JSON.parse(readFileSync(join(root, 'src/data/lines.json'), 'utf8'));

/** 원본 데이터의 노선 표기 → lines.json groupId. 두 데이터셋의 표기가 달라 함께 둡니다. */
const GROUP_BY_LABEL = {
  1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  '1호선': '1', '2호선': '2', '3호선': '3', '4호선': '4', '5호선': '5', '6호선': '6', '7호선': '7', '8호선': '8', '9호선': '9',
  경인선: '1', 경부선: '1',
  // "국철"·"경원선" 은 코레일 노선의 옛 통칭이라 역마다 다른 노선(1호선·분당선·경의중앙선·경춘선)을 뜻합니다.
  // 아래 resolveAmbiguousGroup 이 역에 실제로 있는 노선으로 풉니다.
  국철: null, 경원선: null,
  경의선: 'gyeongui', 경의중앙선: 'gyeongui',
  수인분당선: 'suin', 분당선: 'suin', 수인선: 'suin',
  공항철도: 'airport',
  경춘선: 'gyeongchun',
  서해선: 'seohae',
  신분당선: 'sinbundang',
  인천선: 'incheon1', 인천1호선: 'incheon1',
  인천2: 'incheon2', 인천2호선: 'incheon2',
  신림선: 'sillim',
  우이신설경전철: 'uisinseol', 우이신설선: 'uisinseol',
  경강선: 'gyeonggang',
  의정부경전철: 'uijeongbu',
  김포골드라인: 'gimpo',
  'GTX-A': 'gtxa',
  용인에버라인: 'everline', 에버라인: 'everline',
};

/** 원본 역명 → lines.json 역명 보정. 정규화로도 안 맞는 잔여 표기만 둡니다. */
const ALIAS_OVERRIDES = {
  '4.19민주묘지': '419민주묘지',
  '4·19민주묘지': '419민주묘지',
  이수: '총신대입구',
  '전대·에버랜드': '전대.에버랜드',
  '시청·용인대': '시청.용인대',
  '운동장·송담대': '운동장.송담대',
  '남한산성입구(성남법원·검찰청)': '남한산성입구',
  '올림픽공원(한국체대)': '올림픽공원',
};

function key(name) {
  const trimmed = name.trim();
  return normalize(ALIAS_OVERRIDES[trimmed] ?? trimmed);
}

/** groupId → 그 그룹의 계통들. 각 계통은 정규화 역명 → 인덱스 맵을 가집니다. */
const linesByGroup = new Map();
for (const line of lines) {
  const index = new Map();
  line.stations.forEach((s, i) => {
    for (const n of [s.name, ...(s.aliases ?? [])]) index.set(normalize(n), i);
  });
  const list = linesByGroup.get(line.groupId) ?? [];
  list.push({ line, index });
  linesByGroup.set(line.groupId, list);
}

/**
 * 그룹 안에서 station → bound(옆 역) 가 인접한 계통을 찾아 방향을 돌려줍니다.
 * "… 방면" 은 바로 다음 역이라 인접(±1)이 정상이지만, 지선 분기 등으로 2~3역 떨어진
 * 표기도 있어 가까운 것을 허용하되 가장 가까운 계통을 고릅니다.
 */
function resolveDirection(groupId, stationKey, boundKey) {
  const candidates = linesByGroup.get(groupId) ?? [];
  let best = null;
  for (const { line, index } of candidates) {
    const i = index.get(stationKey);
    const j = index.get(boundKey);
    if (i == null || j == null || i === j) continue;
    const n = line.stations.length;
    let delta = j - i;
    if (line.loop) {
      // 순환선은 짧은 쪽으로 감습니다.
      const forward = ((delta % n) + n) % n;
      delta = forward <= n / 2 ? forward : forward - n;
    }
    const distance = Math.abs(delta);
    if (!best || distance < best.distance) {
      best = {
        distance,
        lineId: line.id,
        direction: delta > 0 ? (line.loop ? 'outer' : 'down') : line.loop ? 'inner' : 'up',
      };
    }
  }
  return best;
}

/** 이 역을 지나는 그룹 중 bound 역과 인접한 그룹 (환승 도착 노선 찾기). */
function resolveGroupByBound(stationKey, boundKey, excludeGroupId) {
  let best = null;
  for (const groupId of linesByGroup.keys()) {
    const hit = resolveDirection(groupId, stationKey, boundKey);
    if (!hit) continue;
    // 같은 그룹(본선↔지선 계통 변경)은 다른 그룹 후보가 없을 때만 씁니다.
    const penalty = groupId === excludeGroupId ? 100 : 0;
    const score = hit.distance + penalty;
    if (!best || score < best.score) best = { groupId, score, ...hit };
  }
  return best;
}

/** 역에 실제로 있는 그룹 가운데 코레일 계열을 골라 "국철" 같은 모호한 표기를 풉니다. */
function resolveAmbiguousGroup(stationKey, excludeGroupId) {
  const present = [...linesByGroup.entries()]
    .filter(([groupId, list]) => groupId !== excludeGroupId && list.some(({ index }) => index.has(stationKey)))
    .map(([groupId]) => groupId);
  for (const preferred of ['suin', 'gyeongui', 'gyeongchun', '1']) {
    if (present.includes(preferred)) return preferred;
  }
  return present[0] ?? null;
}

const problems = [];

// ---------- 환승 가이드 ----------
const guideRows = parseCsvRecords(readFileSync(join(rawDir, 'transfer-guides.csv'), 'utf8'));
const guides = {};
let guideCount = 0;
let sameGroupCount = 0;
for (const r of guideRows) {
  const stationName = r['환승시작역'];
  const stationKey = key(stationName);
  const fromGroupId = GROUP_BY_LABEL[r['환승시작 호선']];
  const seconds = parseClockSeconds(r['소요시간']);
  if (!fromGroupId) {
    problems.push(`환승정보 #${r['고유번호']} ${stationName}: 모르는 호선 표기 "${r['환승시작 호선']}"`);
    continue;
  }
  if (seconds == null) {
    problems.push(`환승정보 #${r['고유번호']} ${stationName}: 소요시간 없음`);
    continue;
  }
  const fromBound = key(r['하차 열차 방면'].replace(/방면$/, ''));
  const toBound = key(r['환승 열차 방면'].replace(/방면$/, ''));
  const from = resolveDirection(fromGroupId, stationKey, fromBound);
  if (!from) {
    problems.push(`환승정보 #${r['고유번호']} ${stationName}(${fromGroupId}): 하차 방면 "${r['하차 열차 방면']}" 을 노선에서 못 찾음`);
    continue;
  }
  const to = resolveGroupByBound(stationKey, toBound, fromGroupId);
  if (!to) {
    problems.push(`환승정보 #${r['고유번호']} ${stationName}: 환승 방면 "${r['환승 열차 방면']}" 을 어느 노선에서도 못 찾음`);
    continue;
  }
  if (to.groupId === fromGroupId) sameGroupCount += 1;
  const door = (car, d) => {
    const c = Number.parseInt(car, 10);
    const n = Number.parseInt(d, 10);
    return Number.isFinite(c) && Number.isFinite(n) && c > 0 && n > 0 ? { car: c, door: n } : null;
  };
  const entry = {
    fromGroupId,
    fromLineId: from.lineId,
    fromDirection: from.direction,
    toGroupId: to.groupId,
    toLineId: to.lineId,
    toDirection: to.direction,
    alight: door(r['하차위치(호차)'], r['하차위치(문)']),
    board: door(r['환승 승차위치(호차)'], r['환승 승차위치(문)']),
    seconds,
  };
  (guides[stationKey] ??= []).push(entry);
  guideCount += 1;
}

// ---------- 환승 도보 시간 ----------
const walkRows = parseCsvRecords(readFileSync(join(rawDir, 'transfer-walk-times.csv'), 'utf8'));
const times = {};
for (const r of walkRows) {
  const stationKey = key(r['환승역명']);
  const a = GROUP_BY_LABEL[r['호선']];
  const rawB = r['환승노선'];
  const b = rawB in GROUP_BY_LABEL && GROUP_BY_LABEL[rawB] === null
    ? resolveAmbiguousGroup(stationKey, a)
    : GROUP_BY_LABEL[rawB];
  const seconds = parseClockSeconds(r['환승소요시간']);
  const meters = Number.parseInt(r['환승거리'], 10);
  if (!a || !b) {
    problems.push(`환승시간 #${r['연번']} ${r['환승역명']}: 모르는 노선 표기 "${r['호선']}" / "${r['환승노선']}"`);
    continue;
  }
  if (!linesByGroup.get(a)?.some(({ index }) => index.has(stationKey))) {
    problems.push(`환승시간 #${r['연번']} ${r['환승역명']}: ${a} 노선에 없는 역`);
    continue;
  }
  if (seconds == null || !Number.isFinite(meters)) {
    problems.push(`환승시간 #${r['연번']} ${r['환승역명']}: 값 없음`);
    continue;
  }
  const value = { seconds, meters };
  times[`${stationKey}|${a}|${b}`] = value;
  // 통로는 양방향이므로 반대 방향이 원본에 없으면 같은 값을 씁니다.
  times[`${stationKey}|${b}|${a}`] ??= value;
}

// ---------- 역코드 ----------
function groupFromCode(code, external) {
  const padded = code.padStart(4, '0');
  if (external && !/^\d/.test(external)) {
    return {
      K: 'gyeongui', P: 'suin', A: 'airport', D: 'sinbundang', S: 'seohae', B: 'gyeongchun',
      U: 'uisinseol', I: 'incheon1', G: 'gyeonggang', Y: 'everline', E: 'uijeongbu',
    }[external[0]] ?? null;
  }
  return { '01': '1', '02': '2', '03': '3', '04': '4', 25: '5', 26: '6', 27: '7', 28: '8', 41: '9' }[padded.slice(0, 2)] ?? null;
}
const codeRows = parseCsvRecords(readFileSync(join(root, 'scripts/data/station_code.raw.csv'), 'utf8'));
const codes = {};
for (const r of codeRows) {
  const groupId = groupFromCode(r.seoulmetro_code, r.external_code);
  const stationKey = key(r['station_name(kor)']);
  if (!groupId) continue;
  if (!linesByGroup.get(groupId)?.some(({ index }) => index.has(stationKey))) continue;
  codes[`${groupId}|${stationKey}`] = { stationCd: r.seoulmetro_code.padStart(4, '0'), externalCode: r.external_code || null };
}

// ---------- 쓰기 ----------
const sortedGuides = Object.fromEntries(Object.keys(guides).sort((a, b) => a.localeCompare(b, 'ko')).map((k) => [k, guides[k]]));
const sortedTimes = Object.fromEntries(Object.keys(times).sort((a, b) => a.localeCompare(b, 'ko')).map((k) => [k, times[k]]));
const sortedCodes = Object.fromEntries(Object.keys(codes).sort((a, b) => a.localeCompare(b, 'ko')).map((k) => [k, codes[k]]));

function write(name, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(join(outDir, name), text, 'utf8');
  return { sha256: createHash('sha256').update(text).digest('hex').slice(0, 16), bytes: Buffer.byteLength(text) };
}

/**
 * 생성 날짜 — **데이터가 그대로면 이전 값을 유지합니다.**
 *
 * 항상 오늘 날짜를 쓰면 입력이 하나도 안 바뀌어도 산출물이 매일 달라집니다. 그러면 CI 의
 * "생성 파일이 커밋된 것과 같은지"(`git diff --exit-code -- src/data`) 검사가 커밋한 다음 날부터
 * 무조건 실패합니다 — 실제로 그렇게 됐습니다.
 *
 * 설정 화면에 "데이터 생성일"로 보이는 값이기도 한데, 스크립트를 언제 돌렸는지보다
 * **데이터가 언제 바뀌었는지**가 사용자에게 맞는 정보입니다. 세 파일의 체크섬이 모두 같으면
 * 데이터가 그대로이므로 날짜도 그대로 둡니다.
 */
function resolveGeneratedAt(fingerprints) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const previous = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
    if (typeof previous.generatedAt !== 'string') return today;
    const unchanged = Object.entries(fingerprints).every(([name, sha256]) => previous[name]?.sha256 === sha256);
    return unchanged ? previous.generatedAt : today;
  } catch {
    // 처음 생성하거나 이전 매니페스트가 깨진 경우.
    return today;
  }
}

const transferGuides = { stations: Object.keys(sortedGuides).length, rows: guideCount, ...write('transfer-guides.json', sortedGuides) };
const transferTimes = { rows: Object.keys(sortedTimes).length, ...write('transfer-times.json', sortedTimes) };
const stationCodes = { rows: Object.keys(sortedCodes).length, ...write('station-codes.json', sortedCodes) };

const manifest = {
  generatedAt: resolveGeneratedAt({
    transferGuides: transferGuides.sha256,
    transferTimes: transferTimes.sha256,
    stationCodes: stationCodes.sha256,
  }),
  transferGuides,
  transferTimes,
  stationCodes,
};
write('manifest.json', manifest);

const transferStations = new Set();
for (const [k, refs] of (() => {
  const m = new Map();
  for (const line of lines) for (const s of line.stations) (m.get(normalize(s.name)) ?? m.set(normalize(s.name), new Set()).get(normalize(s.name))).add(line.groupId);
  return m;
})()) if (refs.size > 1) transferStations.add(k);
const covered = [...transferStations].filter((k) => sortedGuides[k]).length;

console.log(`환승 가이드 ${guideCount}건 / ${Object.keys(sortedGuides).length}역 (같은 그룹 계통 변경 ${sameGroupCount}건 포함)`);
console.log(`환승 도보 시간 ${Object.keys(sortedTimes).length}건 (양방향)`);
console.log(`역코드 ${Object.keys(sortedCodes).length}건`);
console.log(`환승역 커버리지: ${covered}/${transferStations.size} 역에 환승 가이드 있음`);
if (problems.length > 0) {
  console.log(`\n반영하지 못한 행 ${problems.length}건:`);
  for (const p of problems) console.log(`  ! ${p}`);
}
