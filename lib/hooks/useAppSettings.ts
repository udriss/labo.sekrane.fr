'use client';
import { useAppSettingsContext } from '@/lib/contexts/AppSettingsContext';

// Consumer hook for AppSettings context
export function useAppSettings() {
  const ctx = useAppSettingsContext();
  if (!ctx) {
    // Fallback in case used outside provider; defaults to light
    return { theme: 'light' as const, toggleTheme: () => {} };
  }
  return ctx;
}
