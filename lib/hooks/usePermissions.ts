// hooks/usePermissions.ts
import { useSession } from 'next-auth/react';
import { hasPermission, hasMinimumRole, UserRole } from '@/lib/utils/permissions';

export function usePermissions() {
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole | undefined;

  return {
    hasRole: (roles: UserRole[]) => hasPermission(userRole, roles),
    hasMinRole: (minRole: UserRole) => hasMinimumRole(userRole, minRole),
    isAdmin: () => hasPermission(userRole, ['ADMIN', 'ADMINLABO']),
    isTeacher: () => hasPermission(userRole, ['TEACHER', 'LABORANTIN']),
    isStudent: () => userRole === 'STUDENT',
    userRole
  };
}