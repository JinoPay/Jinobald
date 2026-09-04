#!/usr/bin/env node
/**
 * 알람음 생성 — `assets/sounds/alarm.wav`.
 *
 * 저작권 걱정 없는 합성음입니다. 880Hz 삐 소리 4회 + 쉼을 약 8초 반복합니다.
 * iOS 로컬 알림 사운드는 30초 이내 PCM 이어야 하고, Android 채널 사운드는 res/raw 로
 * 복사됩니다 (둘 다 app.config.ts 의 expo-notifications 플러그인 `sounds` 가 처리).
 *
 * 실행: node scripts/generate-alarm-sound.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22_050;
const TONE_HZ = 880;
const BEEP_MS = 160;
const GAP_MS = 110;
const BEEPS_PER_BURST = 4;
const BURST_PAUSE_MS = 650;
const BURSTS = 6;

const samples = [];
const push = (ms, fn) => {
  const count = Math.round((SAMPLE_RATE * ms) / 1000);
  for (let i = 0; i < count; i += 1) samples.push(fn(i / SAMPLE_RATE, i / count));
};
const silence = (ms) => push(ms, () => 0);
const beep = (ms) =>
  push(ms, (t, progress) => {
    // 짧은 페이드로 딱딱 끊기는 클릭 노이즈를 없앱니다.
    const envelope = Math.min(1, progress * 12, (1 - progress) * 12);
    return Math.sin(2 * Math.PI * TONE_HZ * t) * 0.85 * envelope;
  });

for (let burst = 0; burst < BURSTS; burst += 1) {
  for (let i = 0; i < BEEPS_PER_BURST; i += 1) {
    beep(BEEP_MS);
    if (i < BEEPS_PER_BURST - 1) silence(GAP_MS);
  }
  silence(BURST_PAUSE_MS);
}

const dataBytes = samples.length * 2;
const buffer = Buffer.alloc(44 + dataBytes);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataBytes, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataBytes, 40);
samples.forEach((s, i) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32_767), 44 + i * 2));

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds', 'alarm.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buffer);
console.log(`${out}: ${(samples.length / SAMPLE_RATE).toFixed(1)}초, ${(buffer.length / 1024).toFixed(0)}KB`);
