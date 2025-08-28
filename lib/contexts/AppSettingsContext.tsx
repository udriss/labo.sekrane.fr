'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

type AppSettings = {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (m: ThemeMode) => void;
};

const AppSettingsContext = createContext<AppSettings | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('light');

  // Initialize from localStorage or system preference
  useEffect(() => {
    try {
      const saved = (localStorage.getItem('app-theme') as ThemeMode | null) || null;
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }
    } catch {}
  }, []);

  // Persist and reflect on <html>
  useEffect(() => {
    try {
      localStorage.setItem('app-theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);

  const value = useMemo<AppSettings>(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettingsContext() {
  return useContext(AppSettingsContext);
}
