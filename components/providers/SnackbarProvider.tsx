'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface SnackbarContextType {
  showSnackbar: (message: string, severity?: AlertColor, duration?: number) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}

interface SnackItem {
  id: number;
  open: boolean;
  message: string;
  severity: AlertColor;
  duration: number;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  // Queue of snackbars to allow stacking
  const [snacks, setSnacks] = useState<SnackItem[]>([]);
  const maxStack = 5;

  const showSnackbar = (
    message: string,
    severity: AlertColor = 'info',
    duration: number = 4000,
  ) => {
    setSnacks((prev) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const next = [...prev, { id, open: true, message, severity, duration }];
      // Limit stack size by dropping the oldest
      return next.length > maxStack ? next.slice(next.length - maxStack) : next;
    });
  };

  const handleClose = (id: number) => {
    setSnacks((prev) => prev.map((s) => (s.id === id ? { ...s, open: false } : s)));
    // Remove after transition ends
    setTimeout(() => {
      setSnacks((prev) => prev.filter((s) => s.id !== id));
    }, 200);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {snacks.map((snack, index) => (
        <Snackbar
          key={snack.id}
          open={snack.open}
          autoHideDuration={snack.duration}
          onClose={() => handleClose(snack.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{
            // Stack upward without overlap by offsetting each snackbar
            bottom: `${16 + index * 76}px`,
            zIndex: (theme) => theme.zIndex.snackbar || 1400,
          }}
        >
          <Alert
            onClose={() => handleClose(snack.id)}
            severity={snack.severity}
            sx={{
              width: '100%',
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {snack.message}
          </Alert>
        </Snackbar>
      ))}
    </SnackbarContext.Provider>
  );
}
