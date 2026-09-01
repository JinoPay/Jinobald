#!/usr/bin/env node
/**
 * iOS / Android 네이티브 빌드 사전 점검.
 *
 * `pnpm expo run:ios` / `pnpm expo run:android` 는 툴체인이 하나라도 빠지면
 * 빌드가 한참 진행된 뒤에야 실패합니다. 그 전에 무엇이 없는지 한 번에 알려 줍니다.
 *
 *   pnpm check:native
 *
 * 종료 코드: 필수 항목이 하나라도 빠지면 1, 아니면 0 (경고만 있어도 0).
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:process';

const isMac = platform === 'darwin';

const results = [];
const ok = (name, detail) => results.push({ level: 'ok', name, detail });
const warn = (name, detail, hint) => results.push({ level: 'warn', name, detail, hint });
const fail = (name, detail, hint) => results.push({ level: 'fail', name, detail, hint });

/** 명령을 실행하고 stdout 을 돌려줍니다. 실패하면 null. */
function run(cmd, args = [], options = {}) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 60_000,
      ...options,
    }).trim();
  } catch {
    return null;
  }
}

/** major.minor.patch 의 major 만 뽑습니다. */
function major(version) {
  const match = /(\d+)/.exec(version ?? '');
  return match ? Number(match[1]) : null;
}

// ── 공통 ────────────────────────────────────────────────────────────────────

const NODE_MIN = 20;
const nodeMajor = major(process.versions.node);
if (nodeMajor !== null && nodeMajor >= NODE_MIN) {
  ok('Node.js', `v${process.versions.node}`);
} else {
  fail('Node.js', `v${process.versions.node}`, `Node ${NODE_MIN} 이상이 필요합니다.`);
}

const pnpmVersion = run('pnpm', ['--version']);
if (pnpmVersion) {
  ok('pnpm', `v${pnpmVersion}`);
} else {
  fail('pnpm', '없음', 'corepack enable 을 실행하거나 npm i -g pnpm 으로 설치하세요.');
}

if (existsSync('node_modules')) {
  ok('의존성', 'node_modules 존재');
} else {
  fail('의존성', 'node_modules 없음', 'pnpm install 을 먼저 실행하세요.');
}

if (existsSync('.env')) {
  ok('.env', '존재 (없어도 모의 데이터로 동작합니다)');
} else {
  warn('.env', '없음', 'cp .env.example .env — 없으면 앱이 모의 데이터로 동작합니다.');
}

if (run('watchman', ['--version'])) {
  ok('watchman', '설치됨');
} else {
  warn('watchman', '없음', 'brew install watchman — 대규모 파일 감시가 안정적이 됩니다.');
}

// ── iOS (macOS 전용) ────────────────────────────────────────────────────────

if (!isMac) {
  warn('iOS 툴체인', `건너뜀 (현재 ${platform})`, 'iOS 빌드는 macOS 에서만 가능합니다.');
} else {
  const xcodeSelect = run('xcode-select', ['-p']);
  if (xcodeSelect && !xcodeSelect.includes('CommandLineTools')) {
    ok('Xcode', xcodeSelect);
  } else if (xcodeSelect) {
    fail(
      'Xcode',
      'Command Line Tools 만 선택됨',
      'App Store 에서 Xcode 를 설치한 뒤 ' +
        'sudo xcode-select -s /Applications/Xcode.app/Contents/Developer 를 실행하세요.',
    );
  } else {
    fail('Xcode', '없음', 'App Store 에서 Xcode 를 설치하세요.');
  }

  const xcodebuild = run('xcodebuild', ['-version']);
  if (xcodebuild) {
    ok('xcodebuild', xcodebuild.split('\n')[0]);
  } else {
    fail('xcodebuild', '실행 불가', 'Xcode 를 한 번 실행해 라이선스에 동의하세요 (sudo xcodebuild -license accept).');
  }

  const runtimes = run('xcrun', ['simctl', 'list', 'runtimes', '--json']);
  let iosRuntimeCount = 0;
  if (runtimes) {
    try {
      iosRuntimeCount = (JSON.parse(runtimes).runtimes ?? []).filter(
        (runtime) => runtime.isAvailable && runtime.identifier?.includes('iOS'),
      ).length;
    } catch {
      // JSON 형식이 바뀐 경우 — 아래에서 0 으로 처리합니다.
    }
  }
  if (iosRuntimeCount > 0) {
    ok('iOS 시뮬레이터 런타임', `${iosRuntimeCount}개`);
  } else {
    fail(
      'iOS 시뮬레이터 런타임',
      '없음',
      'Xcode > Settings > Components 에서 iOS 시뮬레이터 런타임을 내려받으세요.',
    );
  }

  const pod = run('pod', ['--version']);
  if (pod) {
    ok('CocoaPods', `v${pod}`);
  } else {
    fail(
      'CocoaPods',
      '없음',
      'brew install cocoapods (또는 sudo gem install cocoapods) 로 설치하세요.',
    );
  }

  // 코드 서명 신원. 무료 Apple ID(Personal Team)로도 하나 만들어지므로,
  // 유료 개발자 계정 여부와는 무관하게 "하나라도 있는지"만 봅니다.
  const identities = run('security', ['find-identity', '-v', '-p', 'codesigning']);
  const identityCount = identities
    ? (identities.match(/Apple Development|iPhone Developer/g) ?? []).length
    : 0;
  if (identityCount > 0) {
    ok('코드 서명 신원', `${identityCount}개 (실기기 빌드 가능)`);
  } else {
    warn(
      '코드 서명 신원',
      '없음',
      'Xcode > Settings > Accounts 에서 Apple ID 로 로그인하세요. ' +
        '무료 계정도 본인 기기용 서명이 됩니다 (7일마다 재빌드 — README 참고).',
    );
  }

  // 실기기: 연결돼 있지 않아도 빌드 설정 점검에는 문제가 없으므로 경고로 둡니다.
  const devices = run('xcrun', ['devicectl', 'list', 'devices']);
  if (devices && /connected/i.test(devices)) {
    ok('iOS 실기기', '연결됨');
  } else {
    warn(
      'iOS 실기기',
      '연결 안 됨',
      '실기기 빌드는 케이블 연결 + Apple 개발자 계정(무료 계정도 7일 서명 가능)이 필요합니다.',
    );
  }
}

// ── Android ─────────────────────────────────────────────────────────────────

const JAVA_MIN = 17;
const javaRaw = run('java', ['-version'], { stdio: ['ignore', 'ignore', 'pipe'] })
  ?? run('bash', ['-c', 'java -version 2>&1']);
const javaMajor = major(javaRaw?.replace(/^[^"]*"/, ''));
if (javaMajor !== null && javaMajor >= JAVA_MIN) {
  ok('JDK', `v${javaMajor}`);
} else if (javaMajor !== null) {
  fail('JDK', `v${javaMajor}`, `JDK ${JAVA_MIN} 이상이 필요합니다 (brew install --cask zulu@17).`);
} else {
  fail('JDK', '없음', `JDK ${JAVA_MIN} 을 설치하세요 (brew install --cask zulu@17).`);
}

const androidHome = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
if (androidHome && existsSync(androidHome)) {
  ok('Android SDK', androidHome);
} else {
  fail(
    'Android SDK',
    androidHome ? `경로 없음: ${androidHome}` : 'ANDROID_HOME 미설정',
    'Android Studio 설치 후 셸 프로필에 ' +
      'export ANDROID_HOME=$HOME/Library/Android/sdk 와 ' +
      'export PATH=$PATH:$ANDROID_HOME/platform-tools 를 추가하세요.',
  );
}

const adbPath = androidHome ? `${androidHome}/platform-tools/adb` : 'adb';
const adbDevices = run(adbPath, ['devices']);
if (adbDevices === null) {
  fail('adb', '실행 불가', '$ANDROID_HOME/platform-tools 를 PATH 에 추가하세요.');
} else {
  const attached = adbDevices
    .split('\n')
    .slice(1)
    .filter((line) => /\t(device|emulator)$/.test(line.trim()) || /\tdevice$/.test(line));
  if (attached.length > 0) {
    ok('Android 기기/에뮬레이터', `${attached.length}개 연결됨`);
  } else {
    warn(
      'Android 기기/에뮬레이터',
      '연결 안 됨',
      '에뮬레이터를 켜거나(Android Studio > Device Manager), ' +
        '실기기에서 USB 디버깅을 켜고 연결하세요.',
    );
  }
}

const avdPath = androidHome ? `${androidHome}/emulator/emulator` : 'emulator';
const avds = run(avdPath, ['-list-avds']);
if (avds) {
  const list = avds.split('\n').filter(Boolean);
  if (list.length > 0) {
    ok('Android 에뮬레이터(AVD)', `${list.length}개: ${list.join(', ')}`);
  } else {
    warn('Android 에뮬레이터(AVD)', '없음', 'Android Studio > Device Manager 에서 AVD 를 만드세요.');
  }
} else if (androidHome) {
  warn('Android 에뮬레이터(AVD)', '확인 불가', 'SDK Manager 에서 Android Emulator 를 설치하세요.');
}

// ── 출력 ────────────────────────────────────────────────────────────────────

const MARK = { ok: '✔', warn: '!', fail: '✘' };
const failures = results.filter((result) => result.level === 'fail');
const warnings = results.filter((result) => result.level === 'warn');

console.log('\n네이티브 빌드 사전 점검\n');
for (const result of results) {
  console.log(`  ${MARK[result.level]} ${result.name.padEnd(22)} ${result.detail}`);
  if (result.hint && result.level !== 'ok') console.log(`      → ${result.hint}`);
}

console.log(
  `\n통과 ${results.length - failures.length - warnings.length} · ` +
    `경고 ${warnings.length} · 실패 ${failures.length}\n`,
);

if (failures.length > 0) {
  console.log('필수 항목이 빠져 있습니다. 위의 → 안내를 먼저 처리하세요.\n');
  process.exit(1);
}
console.log('네이티브 빌드를 진행할 수 있습니다.\n');
