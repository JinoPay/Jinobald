#!/usr/bin/env node
/**
 * C# 백엔드(backend/)를 빌드·실행하기 위한 툴체인 사전 점검.
 * check-native-setup.mjs 와 같은 형식으로 ✔ / ! / ✘ 를 찍고, 필수 항목이 빠지면 1 로 종료합니다.
 */
import { execFileSync } from 'node:child_process';

let hardFailure = false;
const ok = (msg) => console.log(`✔ ${msg}`);
const warn = (msg) => console.log(`! ${msg}`);
const fail = (msg) => {
  hardFailure = true;
  console.log(`✘ ${msg}`);
};

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const sdks = run('dotnet', ['--list-sdks']);
if (!sdks) {
  fail('dotnet SDK 가 없습니다. https://dotnet.microsoft.com/download 에서 .NET 10 SDK 를 설치하세요 (brew install dotnet).');
} else if (!/^10\./m.test(sdks)) {
  fail(`.NET 10 SDK 가 필요합니다. 설치된 SDK:\n${sdks}`);
} else {
  ok(`.NET SDK: ${sdks.split('\n').find((l) => l.startsWith('10.'))}`);
}

const docker = run('docker', ['--version']);
if (docker) ok(docker);
else warn('docker 가 없습니다. 컨테이너 실행(docker compose)만 못 하고 dotnet run 은 됩니다.');

if (hardFailure) process.exit(1);
console.log('\n백엔드를 빌드할 준비가 되어 있습니다:  pnpm backend:build');
