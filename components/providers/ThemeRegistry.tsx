// components/providers/ThemeRegistry.tsx

'use client';

import React from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { AppSettingsProvider, useAppSettingsContext } from '@/lib/contexts/AppSettingsContext';
import { SessionProvider } from 'next-auth/react';
import { getTheme } from '@/lib/theme';

function InnerTheme({ children }: { children: React.ReactNode }) {
  const ctx = useAppSettingsContext();
  const mode = ctx?.theme ?? 'light';

  // Memoization plus stable pour éviter les re-renders inutiles
  const theme = React.useMemo(() => {
    try {
      return getTheme(mode);
    } catch (error) {
      console.warn('Error creating theme, falling back to default:', error);
      return getTheme('light');
    }
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Éviter la re-initialisation fréquente de la session
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <AppSettingsProvider>
        <InnerTheme>{children}</InnerTheme>
      </AppSettingsProvider>
    </SessionProvider>
  );
}
