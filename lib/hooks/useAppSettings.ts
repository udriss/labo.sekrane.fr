// lib/hooks/useAppSettings.ts
import { createContext, useContext } from 'react';

// Context pour les paramètres de l'application
interface AppSettingsContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
}
