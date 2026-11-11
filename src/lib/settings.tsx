import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

export type TextModel = 'gemini-3.5-flash-lite' | 'gemini-3.1-flash-lite';
export type ImageEngine = 'auto' | 'gemini';

export interface Settings {
  nvidiaKey: string;
  geminiKey: string;
  cseKey: string;
  cseCx: string;
  textModel: TextModel;
  imageEngine: ImageEngine;
}

const STORAGE_KEY = 'atelier.settings.v1';

const DEFAULTS: Settings = {
  nvidiaKey: '',
  geminiKey: '',
  cseKey: '',
  cseCx: '',
  textModel: 'gemini-3.5-flash-lite',
  imageEngine: 'auto',
};

interface SettingsValue {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
  hasGemini: boolean;
  hasNvidia: boolean;
  hasWebSearch: boolean;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw) as Partial<Settings>;
          setSettings({ ...DEFAULTS, ...parsed });
        } catch {
          // A corrupt settings blob falls back to empty keys, never crashes.
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings)).catch(() => undefined);
  }, [settings, loaded]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      loaded,
      update,
      hasGemini: settings.geminiKey.trim().length > 0,
      hasNvidia: settings.nvidiaKey.trim().length > 0,
      hasWebSearch:
        settings.cseKey.trim().length > 0 && settings.cseCx.trim().length > 0,
    }),
    [settings, loaded, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
