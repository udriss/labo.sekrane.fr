// lib/hooks/useAuditQuery.ts
import { useState, useEffect, useCallback } from 'react';
import { LogEntry, LogFilters } from '@/types/audit';

interface UseAuditQueryResult {
  entries: LogEntry[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
}

export function useAuditQuery(filters: LogFilters): UseAuditQueryResult {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // Ajouter les filtres
      if (filters.module) params.append('module', filters.module);
      if (filters.action) params.append('action', filters.action);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
      if (filters.search) params.append('search', filters.search);

      console.log('Fetching logs with params:', params.toString());

      const response = await fetch(`/api/audit?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la récupération des logs');
      }

      const data = await response.json();
      console.log('Received log data:', data);
      
      setEntries(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    entries,
    loading,
    error,
    total,
    refetch: fetchLogs
  };
}