// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // 생성물은 검사하지 않습니다. ios/android 는 prebuild 산출물이라 git 에도 없습니다.
    // backend/ 는 .NET 프로젝트라 이 앱의 lint 규칙과 무관합니다.
    ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*', 'backend/*'],
  },
]);
