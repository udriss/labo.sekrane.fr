// lib/hooks/usePermissions.ts

'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { RoleTestConfig } from '@/components/calendar/RoleTester';
import { useImpersonation } from '@/lib/contexts/ImpersonationContext';

interface EventForPermissions {
  id: number;
  ownerId: number;
  owner: { id: number; name: string; email: string };
  title: string;
  discipline: string;
  timeslots: any[];
  classes?: Array<{ classe: { id: number; name: string } }>;
  salles?: Array<{ salle: { id: number; name: string } }>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface UsePermissionsProps {
  roleTestConfig: RoleTestConfig;
  originalCanEditEvent: (event: EventForPermissions) => boolean;
  originalCanValidateEvent: () => boolean;
  originalIsCreator: (event: EventForPermissions) => boolean;
}

export function usePermissions({
  roleTestConfig,
  originalCanEditEvent,
  originalCanValidateEvent,
  originalIsCreator,
}: UsePermissionsProps) {
  const { data: session } = useSession();
  const { impersonatedUser } = useImpersonation();

  // Compute a simulated role/user when role testing or impersonation are active
  const sessionRole = (session?.user as any)?.role as
    | 'ADMIN'
    | 'ADMINLABO'
    | 'ENSEIGNANT'
    | 'LABORANTIN_PHYSIQUE'
    | 'LABORANTIN_CHIMIE'
    | 'ELEVE'
    | undefined;
  const sessionUserId = Number((session?.user as any)?.id || 0);
  const activeSimulatedRole = roleTestConfig.showRoleTest
    ? (roleTestConfig.testRole as any)
    : impersonatedUser && sessionRole === 'ADMIN'
      ? (impersonatedUser.role as any)
      : undefined;
  const activeSimulatedUserId = roleTestConfig.showRoleTest
    ? sessionUserId
    : impersonatedUser && sessionRole === 'ADMIN'
      ? Number(impersonatedUser.id)
      : undefined;

  const isCreator = useCallback(
    (event: EventForPermissions): boolean => {
      if (roleTestConfig.overrideIsOwner === 'forced') return true;
      if (roleTestConfig.overrideIsOwner === 'disabled') return false;
      // When testing or impersonating, use the simulated user id
      if (activeSimulatedRole) {
        const uid = activeSimulatedUserId ?? sessionUserId;
        return event.ownerId === uid;
      }
      return originalIsCreator(event);
    },
    [
      roleTestConfig.overrideIsOwner,
      activeSimulatedRole,
      activeSimulatedUserId,
      sessionUserId,
      originalIsCreator,
    ],
  );

  const canEditEvent = useCallback(
    (event: EventForPermissions): boolean => {
      if (roleTestConfig.overrideCanEdit === 'forced') return true;
      if (roleTestConfig.overrideCanEdit === 'disabled') return false;
      if (activeSimulatedRole) {
        // Logic based on simulated role and ownership
        return (
          activeSimulatedRole === 'ADMIN' || activeSimulatedRole === 'ADMINLABO' || isCreator(event)
        );
      }
      return originalCanEditEvent(event);
    },
    [roleTestConfig.overrideCanEdit, activeSimulatedRole, isCreator, originalCanEditEvent],
  );

  const canValidateEvent = useCallback((): boolean => {
    if (roleTestConfig.overrideCanValidate === 'forced') return true;
    if (roleTestConfig.overrideCanValidate === 'disabled') return false;
    if (activeSimulatedRole) {
      // Logic based on simulated role
      return (
        activeSimulatedRole === 'LABORANTIN_PHYSIQUE' ||
        activeSimulatedRole === 'LABORANTIN_CHIMIE' ||
        activeSimulatedRole === 'ADMINLABO'
      );
    }
    return originalCanValidateEvent();
  }, [roleTestConfig.overrideCanValidate, activeSimulatedRole, originalCanValidateEvent]);

  return {
    isCreator,
    canEditEvent,
    canValidateEvent,
  };
}
