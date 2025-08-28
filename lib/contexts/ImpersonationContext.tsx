'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ImpersonatedUser = {
  id: number;
  email: string;
  name?: string | null;
  role: string;
};

type ImpersonationContextType = {
  impersonatedUser: ImpersonatedUser | null;
  startImpersonation: (user: ImpersonatedUser) => void;
  stopImpersonation: () => void;
};

const Ctx = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = 'sgil-impersonation';

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.id === 'number' && parsed.role) setImpersonatedUser(parsed);
      }
    } catch {}
  }, []);

  // Intercept fetch requests to add impersonation header
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);

      if (impersonatedUser) {
        headers.set('x-impersonation', JSON.stringify(impersonatedUser));
      }

      return originalFetch(input, {
        ...init,
        headers,
      });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [impersonatedUser]);

  const startImpersonation = useCallback((user: ImpersonatedUser) => {
    setImpersonatedUser(user);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {}
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ impersonatedUser, startImpersonation, stopImpersonation }),
    [impersonatedUser, startImpersonation, stopImpersonation],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useImpersonation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useImpersonation must be used within ImpersonationProvider');
  return ctx;
}
