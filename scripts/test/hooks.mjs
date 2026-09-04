/**
 * Node 모듈 해석 훅 — `pnpm test` 전용.
 *
 * 앱 코드는 `@/…` 별칭과 확장자 없는 상대 경로를 쓰는데 Node ESM 은 둘 다 모릅니다.
 * 이 훅이 `@/` → `src/` 로 바꾸고 `.ts`/`.tsx`/`index.ts` 를 붙여 줍니다.
 * 타입 스트리핑은 Node 가 직접 하므로(`--experimental-strip-types`) 트랜스파일러가 없습니다.
 *
 * 그래서 테스트할 수 있는 모듈은 **런타임 import 가 순수 TS 로만 이어지는** 모듈뿐입니다
 * (expo-*, react-native, JSON import 가 끼면 안 됩니다). 그 규율을 지키는 모듈 목록은
 * README 의 "검증" 절에 있습니다.
 */
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const EXTENSIONS = ['.ts', '.tsx', '.mjs', '.js'];

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function withExtension(path) {
  if (isFile(path)) return path;
  for (const ext of EXTENSIONS) if (isFile(path + ext)) return path + ext;
  for (const ext of EXTENSIONS) {
    const index = join(path, `index${ext}`);
    if (isFile(index)) return index;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const resolved = withExtension(join(SRC, specifier.slice(2)));
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const parent = fileURLToPath(context.parentURL);
    if (/\.tsx?$/.test(parent)) {
      const resolved = withExtension(join(dirname(parent), specifier));
      if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
