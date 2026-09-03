#!/usr/bin/env node
/**
 * scripts/data/raw 의 데이터셋을 점검하고 작업 사본을 만듭니다.
 *
 * 네트워크는 쓰지 않습니다 — 파일은 저장소에 커밋되어 있고, 다시 받는 방법은
 * scripts/data/raw/README.md 에 있습니다. 여기서는
 *   1. 파일이 있는지, 헤더가 기대와 같은지, 행수가 그럴듯한지 확인하고
 *   2. 시각표(gzip)를 timetable.unpacked.csv 로 풀어 둡니다 (git 제외, 로컬 도구용).
 */
import { createReadStream, createWriteStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAW = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'raw');

const DATASETS = [
  {
    file: 'transfer-guides.csv',
    header: '"고유번호","환승시작역","환승시작 코드","환승시작 호선","하차 열차 방면","하차위치(호차)","하차위치(문)","환승종료역","환승 열차 방면","환승 승차위치(호차)","환승 승차위치(문)","소요시간"',
    minRows: 900,
  },
  {
    file: 'transfer-walk-times.csv',
    header: '연번,호선,환승역명,환승노선,환승거리,환승소요시간',
    minRows: 100,
  },
  {
    file: 'segment-times.csv',
    header: '연번,호선,역명,소요시간,역간거리(km),호선별누계(km)',
    minRows: 250,
  },
  {
    file: 'timetable.csv.gz',
    gz: true,
    header: '"고유번호","호선","역사코드","역사명","주중주말","방향","급행여부","열차코드","열차도착시간","열차출발시간","출발역","도착역"',
    minRows: 400_000,
  },
];

let failed = false;
const ok = (msg) => console.log(`✔ ${msg}`);
const bad = (msg) => {
  failed = true;
  console.log(`✘ ${msg}`);
};

for (const ds of DATASETS) {
  const full = path.join(RAW, ds.file);
  if (!existsSync(full)) {
    bad(`${ds.file} 이 없습니다. scripts/data/raw/README.md 의 절차로 받아 주세요.`);
    continue;
  }
  let text;
  if (ds.gz) {
    const unpacked = path.join(RAW, 'timetable.unpacked.csv');
    const stale = !existsSync(unpacked) || statSync(unpacked).mtimeMs < statSync(full).mtimeMs;
    if (stale) {
      await pipeline(createReadStream(full), createGunzip(), createWriteStream(unpacked));
    }
    text = readFileSync(unpacked, 'utf8');
  } else {
    text = readFileSync(full, 'utf8');
  }
  if (text.charCodeAt(0) === 0xfeff) bad(`${ds.file}: BOM 이 남아 있습니다 (UTF-8 without BOM 이어야 합니다).`);
  if (text.includes('\r')) bad(`${ds.file}: CRLF 가 남아 있습니다.`);
  const firstLine = text.slice(0, text.indexOf('\n'));
  if (firstLine !== ds.header) {
    bad(`${ds.file}: 헤더가 다릅니다.\n   기대: ${ds.header}\n   실제: ${firstLine}`);
    continue;
  }
  const rows = text.split('\n').filter((l) => l.length > 0).length - 1;
  if (rows < ds.minRows) bad(`${ds.file}: 행수가 너무 적습니다 (${rows} < ${ds.minRows}).`);
  else ok(`${ds.file} — ${rows.toLocaleString()} 행`);
}

if (failed) {
  console.log('\n일부 데이터셋에 문제가 있습니다.');
  process.exit(1);
}
console.log('\n모든 데이터셋이 준비되어 있습니다.');
