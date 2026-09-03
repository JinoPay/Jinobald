import { useEffect, useState } from 'react';

/**
 * 주기적으로 갱신되는 벽시계. 카운트다운을 렌더 중에 `Date.now()` 로 계산하면
 * 순수성 규칙에 걸리므로 상태로 흘려보냅니다. `active` 가 false 면 멈춥니다.
 */
export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
