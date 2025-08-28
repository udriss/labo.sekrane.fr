'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface EntityNamesContextValue {
  classes: Record<number, string>;
  salles: Record<number, string>;
  refresh: () => Promise<void>;
}
const EntityNamesContext = createContext<EntityNamesContextValue | null>(null);

export function EntityNamesProvider({
  children,
  initialClasses,
  initialSalles,
}: {
  children: ReactNode;
  initialClasses?: Record<number, string>;
  initialSalles?: Record<number, string>;
}) {
  const [classes, setClasses] = useState<Record<number, string>>(initialClasses || {});
  const [salles, setSalles] = useState<Record<number, string>>(initialSalles || {});
  const refresh = async () => {
    try {
      const [cRes, sRes] = await Promise.all([fetch('/api/classes'), fetch('/api/salles')]);
      if (cRes.ok) {
        const data = await cRes.json();
        const next: Record<number, string> = {};
        [...(data?.predefinedClasses || []), ...(data?.customClasses || [])].forEach((c: any) => {
          if (typeof c?.id === 'number' && c.name) next[c.id] = c.name;
        });
        setClasses(next);
      }
      if (sRes.ok) {
        const data = await sRes.json();
        const next: Record<number, string> = {};
        (data?.salles || []).forEach((s: any) => {
          if (typeof s?.id === 'number' && s.name) next[s.id] = s.name;
        });
        setSalles(next);
      }
    } catch {}
  };
  useEffect(() => {
    if (!Object.keys(classes).length || !Object.keys(salles).length) {
      refresh();
    }
  }, [classes, salles]);
  return (
    <EntityNamesContext.Provider value={{ classes, salles, refresh }}>
      {children}
    </EntityNamesContext.Provider>
  );
}

export function useEntityNames() {
  const ctx = useContext(EntityNamesContext);
  if (!ctx) throw new Error('useEntityNames must be used within EntityNamesProvider');
  return ctx;
}
