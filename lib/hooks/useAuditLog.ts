// lib/hooks/useAuditLog.ts
import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { AuditAction } from '@/types/audit';

interface LogActionParams {
  action: AuditAction;
  details?: any;
  context?: any;
}

export const useAuditLog = () => {
  const { data: session } = useSession();

  const logAction = useCallback(async ({ action, details, context }: LogActionParams) => {
    if (!session?.user) {
      console.warn('Cannot log action: no active session');
      return;
    }

    try {
      const response = await fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          details,
          context
        }),
      });

      if (!response.ok) {
        throw new Error(`Audit log failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw error to avoid disrupting user flow
    }
  }, [session]);

  // Helper methods for common actions
  const logCreate = useCallback((module: AuditAction['module'], entity: string, entityId?: string, details?: any) => {
    return logAction({
      action: { type: 'CREATE', module, entity, entityId },
      details
    });
  }, [logAction]);

  const logUpdate = useCallback((module: AuditAction['module'], entity: string, entityId: string, before: any, after: any, changes: string[]) => {
    return logAction({
      action: { type: 'UPDATE', module, entity, entityId },
      details: { before, after, changes }
    });
  }, [logAction]);

  const logDelete = useCallback((module: AuditAction['module'], entity: string, entityId: string, details?: any) => {
    return logAction({
      action: { type: 'DELETE', module, entity, entityId },
      details
    });
  }, [logAction]);

  const logRead = useCallback((module: AuditAction['module'], entity: string, entityId?: string, details?: any) => {
    return logAction({
      action: { type: 'READ', module, entity, entityId },
      details
    });
  }, [logAction]);

  const logLogin = useCallback(() => {
    return logAction({
      action: { type: 'LOGIN', module: 'SECURITY', entity: 'session' }
    });
  }, [logAction]);

  const logLogout = useCallback(() => {
    return logAction({
      action: { type: 'LOGOUT', module: 'SECURITY', entity: 'session' }
    });
  }, [logAction]);

  const logExport = useCallback((module: AuditAction['module'], entity: string, format: string, details?: any) => {
    return logAction({
      action: { type: 'EXPORT', module, entity },
      details: { format, ...details }
    });
  }, [logAction]);

  const logImport = useCallback((module: AuditAction['module'], entity: string, details?: any) => {
    return logAction({
      action: { type: 'IMPORT', module, entity },
      details
    });
  }, [logAction]);

  return {
    logAction,
    logCreate,
    logUpdate,
    logDelete,
    logRead,
    logLogin,
    logLogout,
    logExport,
    logImport
  };
};
