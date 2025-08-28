'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

interface Toast {
  id: number;
  message: string;
  severity?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}
interface ToastContextValue {
  push: (t: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    setQueue((q) => [
      ...q,
      { id: Date.now() + Math.random(), severity: 'info', duration: 4000, ...t },
    ]);
  }, []);
  const handleClose = (id: number) => () => setQueue((q) => q.filter((t) => t.id !== id));
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {queue.map((t) => (
        <Snackbar
          key={t.id}
          open
          onClose={handleClose(t.id)}
          autoHideDuration={t.duration}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={t.severity}
            onClose={handleClose(t.id)}
            variant="filled"
            sx={{ boxShadow: 2 }}
          >
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
