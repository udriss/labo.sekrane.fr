// lib/utils/permissions.ts
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'ADMINLABO' | 'LABORANTIN';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  ADMINLABO: 90,
  TEACHER: 50,
  LABORANTIN: 40,
  STUDENT: 10
};

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/admin': ['ADMIN', 'ADMINLABO'],
  '/teacher': ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'],
  '/lab': ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'],
  '/student': ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN', 'STUDENT'],
  '/api/admin': ['ADMIN', 'ADMINLABO'],
  '/api/teacher': ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'],
  '/api/lab': ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'],
  '/api/audit': ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'],
  '/api/student': ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN', 'STUDENT']
};

export function hasPermission(userRole: UserRole | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

export function hasMinimumRole(userRole: UserRole | undefined, minimumRole: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

export function getRoutePermissions(path: string): UserRole[] | null {
  for (const [route, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
    if (path.startsWith(route)) {
      return permissions;
    }
  }
  return null;
}