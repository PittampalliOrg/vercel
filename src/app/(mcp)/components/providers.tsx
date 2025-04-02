'use client';

import { PropsWithChildren, createContext, useState, useEffect } from 'react';
import { InspectorConfig } from '../lib/configurationTypes';
import { DEFAULT_INSPECTOR_CONFIG } from '../lib/constants';
import useTheme from '../lib/useTheme';

type ConfigContextType = {
  config: InspectorConfig;
  setConfig: (config: InspectorConfig) => void;
};

export const ConfigContext = createContext<ConfigContextType>({
  config: DEFAULT_INSPECTOR_CONFIG,
  setConfig: () => {},
});

const CONFIG_LOCAL_STORAGE_KEY = "inspectorConfig_v1";

export function Providers({ children }: PropsWithChildren) {
  const [config, setConfig] = useState<InspectorConfig>(DEFAULT_INSPECTOR_CONFIG);
  const [theme] = useTheme();

  useEffect(() => {
    // Load config from localStorage
    try {
      const savedConfig = localStorage.getItem(CONFIG_LOCAL_STORAGE_KEY);
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (e) {
      console.error('Failed to load config from localStorage', e);
    }
  }, []);

  useEffect(() => {
    // Save config to localStorage when it changes
    localStorage.setItem(CONFIG_LOCAL_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  return (
    <ConfigContext.Provider value={{ config, setConfig }}>
      <div className={theme}>
        {children}
      </div>
    </ConfigContext.Provider>
  );
}