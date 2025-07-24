// lib/hooks/useAuditQuery.ts
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { LogEntry, LogFilters, AuditStats, DateRange } from '@/types/audit';

interface AuditQueryResult {
  entries: LogEntry[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => void;
}

interface AuditStatsResult {
  stats: AuditStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAuditQuery = (filters: LogFilters): AuditQueryResult => {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchEntries = useCallback(async () => {
    if (!session?.user) {
      setError('Session non disponible');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/audit/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de requête';
      setError(errorMessage);
      console.error('Error fetching audit entries:', err);
    } finally {
      setLoading(false);
    }
  }, [session, filters]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading,
    error,
    total,
    refetch: fetchEntries
  };
};

export const useAuditStats = (dateRange?: DateRange): AuditStatsResult => {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!session?.user) {
      setError('Session non disponible');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.start) {
        params.append('startDate', dateRange.start.toISOString());
      }
      if (dateRange?.end) {
        params.append('endDate', dateRange.end.toISOString());
      }

      const response = await fetch(`/api/audit/stats?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de requête';
      setError(errorMessage);
      console.error('Error fetching audit stats:', err);
    } finally {
      setLoading(false);
    }
  }, [session, dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};

export const useUserActivity = (userId: string, dateRange?: DateRange): AuditQueryResult => {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchUserActivity = useCallback(async () => {
    if (!session?.user || !userId) {
      setError('Session ou userId non disponible');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.start) {
        params.append('startDate', dateRange.start.toISOString());
      }
      if (dateRange?.end) {
        params.append('endDate', dateRange.end.toISOString());
      }

      const response = await fetch(`/api/audit/user/${userId}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de requête';
      setError(errorMessage);
      console.error('Error fetching user activity:', err);
    } finally {
      setLoading(false);
    }
  }, [session, userId, dateRange]);

  useEffect(() => {
    fetchUserActivity();
  }, [fetchUserActivity]);

  return {
    entries,
    loading,
    error,
    total,
    refetch: fetchUserActivity
  };
};

export const useModuleActivity = (module: string, dateRange?: DateRange): AuditQueryResult => {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchModuleActivity = useCallback(async () => {
    if (!session?.user || !module) {
      setError('Session ou module non disponible');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.start) {
        params.append('startDate', dateRange.start.toISOString());
      }
      if (dateRange?.end) {
        params.append('endDate', dateRange.end.toISOString());
      }

      const response = await fetch(`/api/audit/module/${module}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de requête';
      setError(errorMessage);
      console.error('Error fetching module activity:', err);
    } finally {
      setLoading(false);
    }
  }, [session, module, dateRange]);

  useEffect(() => {
    fetchModuleActivity();
  }, [fetchModuleActivity]);

  return {
    entries,
    loading,
    error,
    total,
    refetch: fetchModuleActivity
  };
};
