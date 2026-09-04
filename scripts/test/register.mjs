/** `node --import ./scripts/test/register.mjs` 로 hooks.mjs 를 등록합니다. */
import { register } from 'node:module';

register('./hooks.mjs', import.meta.url);
