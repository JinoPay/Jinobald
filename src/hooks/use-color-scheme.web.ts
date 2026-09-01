import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/** 구독 없는 스토어 — 서버/클라이언트 스냅샷의 차이만으로 하이드레이션을 감지합니다. */
const noopSubscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 *
 * 정적 렌더 시점에는 시스템 테마를 알 수 없으므로 'light' 로 그린 뒤, 하이드레이션이
 * 끝나면 실제 값으로 바꿉니다. useSyncExternalStore 는 서버 스냅샷과 클라이언트
 * 스냅샷을 나눠 주므로 effect 안에서 setState 하지 않고도 같은 결과를 얻습니다.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
