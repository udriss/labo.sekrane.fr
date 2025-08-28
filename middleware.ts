// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Uppercase roles to match Prisma Role enum and NextAuth token
type Role =
  | 'ELEVE'
  | 'ENSEIGNANT'
  | 'LABORANTIN_PHYSIQUE'
  | 'LABORANTIN_CHIMIE'
  | 'ADMIN'
  | 'ADMINLABO';

// Protection des API par rôle
const PROTECTED_API: Record<string, Role[]> = {
  '/api/equipement': [
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/equipment': [
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/equipment-presets': [
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/materiel-presets': [
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/materiel-categories': [
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/materiel-perso': [
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/chemicals': [
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/consommables': [
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/consumables': [
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/timeslots': [
    'ELEVE',
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  // Admin APIs: restricted to ADMIN only
  '/api/admin': ['ADMIN'],
  // Suppliers: lecture par tous les utilisateurs authentifiés; modifications contrôlées côté route
  '/api/suppliers': [
    'ELEVE',
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
};

// Pages publiques qui n'ont pas besoin d'authentification
const PUBLIC_PAGES = ['/signin', '/maintenance', '/api/auth',
   '/api/health', '/health', '/newpass',
  '/docs', '/api/public', '/mentions'
  ];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for WebSocket connections
  if (pathname.startsWith('/ws')) {
    return NextResponse.next();
  }

  // Skip middleware for static files, Next.js internals, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Maintenance mode: fetch public settings (exclude recursion on /api/public)
  let maintenanceMode = false;
  let allowedIds: number[] = [1];
  try {
    if (!pathname.startsWith('/api/public')) {
      const url = new URL('/api/public/settings', req.url);
      const res = await fetch(url.toString(), { cache: 'no-store' });
      const s = await res.json();
      maintenanceMode = !!s.maintenanceMode;
      if (Array.isArray(s.maintenanceAllowedUserIds)) allowedIds = s.maintenanceAllowedUserIds;
    }
  } catch {}

  // If in maintenance, only allow: signin, maintenance page, auth routes, health, public settings
  if (maintenanceMode) {
    // Get token to identify user id
    // Try to decode using configured secret(s), then fallback
    let token = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      token = await getToken({ req });
    }
    let uid: number | undefined;
    const userIdRaw = (token as any)?.userId ?? (token as any)?.sub;
    if (typeof userIdRaw === 'number') {
      uid = userIdRaw;
    } else if (typeof userIdRaw === 'string') {
      const parsed = parseInt(userIdRaw, 10);
      if (!Number.isNaN(parsed)) uid = parsed;
    }
    const isAllowedUser = uid != null && (uid === 1 || allowedIds.includes(uid));
    const isAllowedPath =
      pathname.startsWith('/signin') ||
      pathname.startsWith('/maintenance') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/health') ||
      pathname.startsWith('/api/public') ||
      pathname.startsWith('/newpass');

    if (!isAllowedUser && !isAllowedPath) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Service unavailable (maintenance)' }, { status: 503 });
      }
      return NextResponse.redirect(new URL('/maintenance', req.url));
    }
  }

  // Check if it's a public page
  const isPublicPage = PUBLIC_PAGES.some((page) => pathname.startsWith(page));
  if (isPublicPage) {
    return NextResponse.next();
  }

  // For API routes, check authentication and role-based permissions
  if (pathname.startsWith('/api/')) {
    // Get token for authentication
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });

    // If no token, redirect to signin for API calls
    if (!token) {
      console.log(`[MIDDLEWARE] No token found for API ${pathname}, redirecting to signin`);
      return NextResponse.redirect(new URL('/signin', req.url));
    }

    // Check role-based permissions for protected APIs
    const protectedApiBase = Object.keys(PROTECTED_API).find((p) => pathname.startsWith(p));
    if (protectedApiBase) {
      const role = ((token as any)?.role as Role | undefined) ?? 'ELEVE';
      const allowedRoles = PROTECTED_API[protectedApiBase];
      if (!allowedRoles.includes(role)) {
        console.log(`[MIDDLEWARE] Access denied for API ${pathname}, role: ${role}`);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.next();
  }

  // For admin pages, check admin role (with allowances)
  if (pathname.startsWith('/admin')) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });

    if (!token) {
      console.log(`[MIDDLEWARE] No token found for admin page ${pathname}, redirecting to signin`);
      return NextResponse.redirect(new URL('/signin', req.url));
    }

    // Check for impersonation header
    const impersonationHeader = req.headers.get('x-impersonation');
    let role: Role;
    let uid: number | undefined;

    if (impersonationHeader) {
      // If impersonating, use the impersonated user's role
      try {
        const impersonatedData = JSON.parse(impersonationHeader);
        role = (impersonatedData.role as Role) || 'ELEVE';
        uid = impersonatedData.id;
        console.log(`[MIDDLEWARE] Impersonation detected: role=${role}, uid=${uid}`);
      } catch {
        role = ((token as any)?.role as Role | undefined) ?? 'ELEVE';
        const userIdRaw = (token as any)?.userId ?? (token as any)?.sub;
        if (typeof userIdRaw === 'number') uid = userIdRaw;
        else if (typeof userIdRaw === 'string') {
          const parsed = parseInt(userIdRaw, 10);
          if (!Number.isNaN(parsed)) uid = parsed;
        }
      }
    } else {
      // Normal authentication
      role = ((token as any)?.role as Role | undefined) ?? 'ELEVE';
      const userIdRaw = (token as any)?.userId ?? (token as any)?.sub;
      if (typeof userIdRaw === 'number') uid = userIdRaw;
      else if (typeof userIdRaw === 'string') {
        const parsed = parseInt(userIdRaw, 10);
        if (!Number.isNaN(parsed)) uid = parsed;
      }
    }

    // Fetch public RBAC allowances (safe)
    let adminAllowedRoles: string[] = ['ADMIN'];
    let adminAllowedUserIds: number[] = [1];
    try {
      const url = new URL('/api/public/settings', req.url);
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (res.ok) {
        const s = await res.json();
        if (Array.isArray(s.adminAllowedRoles)) adminAllowedRoles = s.adminAllowedRoles;
        if (Array.isArray(s.adminAllowedUserIds)) adminAllowedUserIds = s.adminAllowedUserIds;
      }
    } catch {}

    const allowed =
      role === 'ADMIN' ||
      adminAllowedRoles.includes(role) ||
      (uid && adminAllowedUserIds.includes(uid));
    if (!allowed) {
      console.log(`[MIDDLEWARE] Admin access denied for ${pathname}, role: ${role}, uid=${uid}`);
      return NextResponse.redirect(new URL('/admin/access-denied', req.url));
    }
  }

  // For notifications pages, require authentication
  if (pathname.startsWith('/notifications')) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });

    if (!token) {
      console.log(
        `[MIDDLEWARE] No token found for notifications page ${pathname}, redirecting to signin`,
      );
      return NextResponse.redirect(new URL('/signin', req.url));
    }
  }

  // For all other pages, let them pass through
  // AuthGuard will handle authentication display client-side
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - api/public (Public settings)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/auth|api/public|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
