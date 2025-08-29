// middleware.ts - Version optimisée

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

// Cache pour les tokens (éviter les appels répétés)
const tokenCache = new Map<string, { token: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 secondes de cache

// Cache pour les settings publics
let settingsCache: { data: any; timestamp: number } | null = null;
const SETTINGS_CACHE_DURATION = 30000; // 30 secondes

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
  // APIs communes accessibles à tous les utilisateurs authentifiés
  '/api/notifications': [
    'ELEVE',
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/rooms': [
    'ELEVE',
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/salles': [
    'ELEVE',
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/events': [
    'ELEVE',
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/classes': [
    'ELEVE',
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/generate-event-pdf': [
    'ELEVE',
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ADMIN',
    'ADMINLABO',
  ],
  '/api/pdf': [
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

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Fonction pour nettoyer le cache périodiquement
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of tokenCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      tokenCache.delete(key);
    }
  }
}

// Fonction pour obtenir le token avec cache
async function getTokenWithCache(req: NextRequest): Promise<any> {
  const cookies = req.headers.get('cookie') || '';
  const cacheKey = `${req.nextUrl.pathname}-${cookies.substring(0, 100)}`; // Clé basée sur le path et début des cookies
  
  // Vérifier le cache
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    if (isDevelopment) {
      console.log(`[MIDDLEWARE] Token trouvé en cache pour ${req.nextUrl.pathname}`);
    }
    return cached.token;
  }

  // Nettoyer le cache si nécessaire
  if (tokenCache.size > 100) {
    cleanupCache();
  }

  let token = null;

  try {
    // En production, utiliser explicitement le nom de cookie configuré
    if (isProduction) {
      token = await getToken({ 
        req, 
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
        cookieName: '__Secure-next-auth.session-token'
      });
      
      if (token && isDevelopment) {
        console.log('[MIDDLEWARE] Token trouvé avec cookie de production');
      }
    }

    // Fallback pour développement ou si production échoue
    if (!token) {
      const secrets = [
        process.env.AUTH_SECRET,
        process.env.NEXTAUTH_SECRET,
      ].filter(Boolean);

      for (const secret of secrets) {
        try {
          token = await getToken({ req, secret });
          if (token) break;
        } catch (error) {
          if (isDevelopment) {
            console.log(`[MIDDLEWARE] Erreur avec secret: ${error}`);
          }
        }
      }
    }

    // Dernière tentative avec différents noms de cookies
    if (!token) {
      const cookieNames = [
        '__Secure-next-auth.session-token',
        '__Secure-authjs.session-token',
        'next-auth.session-token',
        'authjs.session-token'
      ];
      
      for (const cookieName of cookieNames) {
        try {
          token = await getToken({ 
            req, 
            cookieName,
            secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
          });
          if (token) {
            if (isDevelopment) {
              console.log(`[MIDDLEWARE] Token trouvé avec cookie: ${cookieName}`);
            }
            break;
          }
        } catch (error) {
          // Ignorer les erreurs en production
          if (isDevelopment) {
            console.log(`[MIDDLEWARE] Erreur avec cookie ${cookieName}: ${error}`);
          }
        }
      }
    }

  } catch (error) {
    if (isDevelopment) {
      console.error('[MIDDLEWARE] Erreur lors de la récupération du token:', error);
    }
  }

  // Mettre en cache le résultat (même si null)
  tokenCache.set(cacheKey, { token, timestamp: Date.now() });

  return token;
}

// Fonction pour obtenir les settings avec cache
async function getCachedSettings(req: NextRequest) {
  const now = Date.now();

  // Vérifier le cache
  if (settingsCache && now - settingsCache.timestamp < SETTINGS_CACHE_DURATION) {
    return settingsCache.data;
  }

  try {
    // Utiliser l'URL de base du serveur au lieu de req.url pour éviter les boucles
    const baseUrl = process.env.NEXTAUTH_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'http://localhost:3000');
    const url = new URL('/api/public/settings', baseUrl);
    
    // Ajouter des headers pour éviter les boucles de middleware
    const res = await fetch(url.toString(), { 
      cache: 'no-store',
      headers: {
        'x-internal-request': 'true',
        'user-agent': 'middleware-fetch'
      }
    });
    
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      settingsCache = { data, timestamp: now };
      return data;
    }
  } catch (error) {
    // Ne logger l'erreur qu'une fois par minute pour éviter le spam
    const shouldLog = !settingsCache || now - settingsCache.timestamp > 60000;
    if (shouldLog && isDevelopment) {
      console.error('[MIDDLEWARE] Erreur lors de la récupération des settings:', error);
    }
  }

  // Retourner des valeurs par défaut si la récupération échoue
  return {
    maintenanceMode: false,
    maintenanceAllowedUserIds: [1],
    allowRegistrations: true,
    brandingName: 'SGIL',
    NOM_ETABLISSEMENT: '',
    timezone: 'Europe/Paris',
    adminAllowedRoles: ['ADMIN'],
    adminAllowedUserIds: [1],
    inspectionAllowedRoles: ['ADMIN'],
    inspectionAllowedUserIds: [1],
  };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for internal requests (to prevent loops)
  if (req.headers.get('x-internal-request') === 'true') {
    return NextResponse.next();
  }

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

  // Maintenance mode: fetch public settings avec cache
  let maintenanceMode = false;
  let allowedIds: number[] = [1];
  
  if (!pathname.startsWith('/api/public')) {
    const settings = await getCachedSettings(req);
    maintenanceMode = !!settings.maintenanceMode;
    if (Array.isArray(settings.maintenanceAllowedUserIds)) {
      allowedIds = settings.maintenanceAllowedUserIds;
    }
  }

  // If in maintenance, only allow: signin, maintenance page, auth routes, health, public settings
  if (maintenanceMode) {
    const token = await getTokenWithCache(req);
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
    const token = await getTokenWithCache(req);
    
    // If no token, return 401 JSON response instead of redirecting
    if (!token) {
      if (isDevelopment) {
        console.log(`[MIDDLEWARE] No token found for API ${pathname}, returning 401`);
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Logs réduits en production
    if (isDevelopment) {
      console.log(`[MIDDLEWARE] Token trouvé pour API ${pathname}, role: ${(token as any)?.role}`);
    }

    // Check role-based permissions for protected APIs
    const protectedApiBase = Object.keys(PROTECTED_API).find((p) => pathname.startsWith(p));
    if (protectedApiBase) {
      const role = ((token as any)?.role as Role | undefined) ?? 'ELEVE';
      const allowedRoles = PROTECTED_API[protectedApiBase];
      if (!allowedRoles.includes(role)) {
        if (isDevelopment) {
          console.log(`[MIDDLEWARE] Access denied for API ${pathname}, role: ${role}`);
        }
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.next();
  }

  // For admin pages, check admin role (with allowances)
  if (pathname.startsWith('/admin')) {
    const token = await getTokenWithCache(req);

    if (!token) {
      if (isDevelopment) {
        console.log(`[MIDDLEWARE] No token found for admin page ${pathname}, redirecting to signin`);
      }
      return NextResponse.redirect(new URL('/signin', req.url));
    }

    // Check for impersonation header
    const impersonationHeader = req.headers.get('x-impersonation');
    let role: Role;
    let uid: number | undefined;

    if (impersonationHeader) {
      try {
        const impersonatedData = JSON.parse(impersonationHeader);
        role = (impersonatedData.role as Role) || 'ELEVE';
        uid = impersonatedData.id;
        if (isDevelopment) {
          console.log(`[MIDDLEWARE] Impersonation detected: role=${role}, uid=${uid}`);
        }
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
      role = ((token as any)?.role as Role | undefined) ?? 'ELEVE';
      const userIdRaw = (token as any)?.userId ?? (token as any)?.sub;
      if (typeof userIdRaw === 'number') uid = userIdRaw;
      else if (typeof userIdRaw === 'string') {
        const parsed = parseInt(userIdRaw, 10);
        if (!Number.isNaN(parsed)) uid = parsed;
      }
    }

    // Fetch public RBAC allowances avec cache
    const settings = await getCachedSettings(req);
    let adminAllowedRoles: string[] = ['ADMIN'];
    let adminAllowedUserIds: number[] = [1];
    
    if (Array.isArray(settings.adminAllowedRoles)) adminAllowedRoles = settings.adminAllowedRoles;
    if (Array.isArray(settings.adminAllowedUserIds)) adminAllowedUserIds = settings.adminAllowedUserIds;

    const allowed =
      role === 'ADMIN' ||
      adminAllowedRoles.includes(role) ||
      (uid && adminAllowedUserIds.includes(uid));
      
    if (!allowed) {
      if (isDevelopment) {
        console.log(`[MIDDLEWARE] Admin access denied for ${pathname}, role: ${role}, uid=${uid}`);
      }
      return NextResponse.redirect(new URL('/admin/access-denied', req.url));
    }
  }

  // For notifications pages, require authentication
  if (pathname.startsWith('/notifications')) {
    const token = await getTokenWithCache(req);

    if (!token) {
      if (isDevelopment) {
        console.log(`[MIDDLEWARE] No token found for notifications page ${pathname}, redirecting to signin`);
      }
      return NextResponse.redirect(new URL('/signin', req.url));
    }
  }

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
     * - ws (WebSocket connections)
     */
    '/((?!api/auth|api/public|_next/static|_next/image|favicon.ico|ws|.*\\..*$).*)',
  ],
};