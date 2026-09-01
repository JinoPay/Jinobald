import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { readJson, StorageKeys, writeJson } from '@/services/storage/persist';
import { setForceMock } from '@/services/subway';

export interface Settings {
  /** 인증키가 있어도 모의 데이터를 쓰도록 강제. 데모·호출 한도 절약용입니다. */
  forceMock: boolean;
  /** 하차 몇 정거장 전에 예비 알림을 보낼지의 기본값. */
  alertNStationsBefore: number;
  /** GPS 보정 사용 여부의 기본값. */
  useGps: boolean;
}

const DEFAULTS: Settings = { forceMock: false, alertNStationsBefore: 2, useGps: true };

interface SettingsContextValue {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  ready: false,
  update: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void readJson<Settings>(StorageKeys.settings, DEFAULTS).then((stored) => {
      const merged = { ...DEFAULTS, ...stored };
      setSettings(merged);
      setForceMock(merged.forceMock);
      setReady(true);
    });
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.forceMock !== undefined) setForceMock(patch.forceMock);
      void writeJson(StorageKeys.settings, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, ready, update }), [settings, ready, update]);
  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useSettings(): SettingsContextValue {
  return use(SettingsContext);
}
