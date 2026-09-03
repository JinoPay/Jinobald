import { useEffect, useState } from 'react';

import { env } from '@/config/env';
import { getSubwayApi } from '@/services/subway';
import type { DisruptionNotice } from '@/services/subway/types';

/** 화면 여러 곳이 같은 공지를 쓰므로 모듈 수준에서 한 번만 받아 공유합니다. */
let cache: { notices: DisruptionNotice[]; at: number; kind: string } | null = null;
let inflight: Promise<DisruptionNotice[]> | null = null;

async function load(): Promise<DisruptionNotice[]> {
  const api = getSubwayApi();
  if (!api.capabilities.notices) return [];
  if (cache && cache.kind === api.kind && Date.now() - cache.at < env.noticesPollIntervalMs) return cache.notices;
  if (!inflight) {
    inflight = api
      .getNotices()
      .then((notices) => {
        cache = { notices, at: Date.now(), kind: api.kind };
        return notices;
      })
      .catch(() => cache?.notices ?? [])
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** 운행 공지. 실패는 조용히 빈 목록입니다 — 공지는 없는 것이 정상입니다. */
export function useNotices() {
  const [notices, setNotices] = useState<DisruptionNotice[]>(cache?.notices ?? []);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      void load().then((next) => {
        if (!cancelled) setNotices(next);
      });
    };
    tick();
    const timer = setInterval(tick, env.noticesPollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  return notices;
}
