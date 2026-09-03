import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { readJson, StorageKeys, writeJson } from '@/services/storage/persist';
import { setDataSource, type DataSource } from '@/services/subway';

export interface Settings {
  /** 실시간 데이터 소스. `auto` 가 기본이며 백엔드 → 서울 직접 → 모의 순으로 고릅니다. */
  dataSource: DataSource;
  /** 하차 몇 정거장 전에 예비 알림을 보낼지의 기본값. */
  alertNStationsBefore: number;
  /** GPS 보정 사용 여부의 기본값. */
  useGps: boolean;
}

const DEFAULTS: Settings = { dataSource: 'auto', alertNStationsBefore: 2, useGps: true };

const DATA_SOURCES: DataSource[] = ['auto', 'backend', 'seoul-direct', 'mock'];

/** 이전 버전의 `forceMock` 불리언을 `dataSource` 로 올립니다. 모르는 값은 기본값으로. */
function migrate(stored: unknown): Settings {
  const raw = (stored ?? {}) as Partial<Settings> & { forceMock?: boolean };
  const dataSource: DataSource = DATA_SOURCES.includes(raw.dataSource as DataSource)
    ? (raw.dataSource as DataSource)
    : raw.forceMock === true
      ? 'mock'
      : DEFAULTS.dataSource;
  return {
    dataSource,
    alertNStationsBefore:
      typeof raw.alertNStationsBefore === 'number' && raw.alertNStationsBefore >= 1 && raw.alertNStationsBefore <= 5
        ? raw.alertNStationsBefore
        : DEFAULTS.alertNStationsBefore,
    useGps: typeof raw.useGps === 'boolean' ? raw.useGps : DEFAULTS.useGps,
  };
}

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
    void readJson<unknown>(StorageKeys.settings, null).then((stored) => {
      const merged = migrate(stored);
      setSettings(merged);
      setDataSource(merged.dataSource);
      setReady(true);
    });
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.dataSource !== undefined) setDataSource(patch.dataSource);
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
