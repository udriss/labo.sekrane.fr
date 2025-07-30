// middleware.ts (à la racine du projet)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditMiddleware } from '@/lib/middleware/audit-edge';



export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const path = request.nextUrl.pathname;
  
  // Apply audit middleware for API routes
  if (path.startsWith('/api') && 
      !path.includes('/health') &&
      !path.includes('/status') &&
      !path.startsWith('/api/audit/log') &&
      !path.startsWith('/api/auth')) { // Exclure auth pour éviter les boucles
    await auditMiddleware(request);
  }
  
  // Gestion des cookies de session et d'activité avec compatibilité Safari
  const sessionToken = request.cookies.get('next-auth.session-token') || 
                      request.cookies.get('__Secure-next-auth.session-token');
  
  if (sessionToken) {
    const cookieOptions = {
      maxAge: 60 * 30,
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    };

    response.cookies.set('last-activity', new Date().toISOString(), cookieOptions);
  }

  // Obtenir le token pour vérifier les permissions
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  

  // Gestion des cookies utilisateur si token disponible
  if (token?.sub) {
    const cookieOptions = {
      maxAge: 60 * 120,
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    };
    response.cookies.set('active-user-id', token.sub as string, cookieOptions);
  }

  // Protection des routes selon les rôles
  // Routes publiques - pas besoin d'authentification
  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/error', '/', '/api/auth'];
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));
  
  // Pour Safari avec contournement, ou sessions normales
  const hasValidSession = token || sessionToken;
  
  if (!isPublicRoute && !hasValidSession) {
    // Rediriger vers la page de connexion si non authentifié
    if (!path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    } else {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
  }
  
  // Pour les routes API auth, laisser toujours passer
  if (path.startsWith('/api/auth')) {
    return response;
  }

  // Protection des routes admin
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    if (!token || (token.role !== 'ADMIN' && token.role !== 'ADMINLABO')) {
      if (!path.startsWith('/api')) {
        return NextResponse.redirect(new URL('/', request.url));
      } else {
        return NextResponse.json(
          { error: 'Accès réservé aux administrateurs' },
          { status: 403 }
        );
      }
    }
  }

  // Protection des routes enseignants
  if (path.startsWith('/teacher') || path.startsWith('/api/teacher')) {
    const allowedRoles = ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'];
    if (!token || !allowedRoles.includes(token.role as string)) {
      if (!path.startsWith('/api')) {
        return NextResponse.redirect(new URL('/', request.url));
      } else {
        return NextResponse.json(
          { error: 'Accès réservé au personnel enseignant' },
          { status: 403 }
        );
      }
    }
  }

  // Protection des routes laboratoire
  if (path.startsWith('/lab') || path.startsWith('/api/lab')) {
    const allowedRoles = ['ADMIN', 'ADMINLABO', 'LABORANTIN', 'TEACHER'];
    if (!token || !allowedRoles.includes(token.role as string)) {
      if (!path.startsWith('/api')) {
        return NextResponse.redirect(new URL('/', request.url));
      } else {
        return NextResponse.json(
          { error: 'Accès réservé au personnel du laboratoire' },
          { status: 403 }
        );
      }
    }
  }

  // Protection des routes d'audit
  if (path.startsWith('/api/audit')) {
    if (path === '/api/audit/log') {
      return response;
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const auditAllowedRoles = ['ADMIN', 'TEACHER', 'ADMINLABO', 'LABORANTIN'];
    if (!auditAllowedRoles.includes(token.role as string)) {
      return NextResponse.json(
        { error: 'Privilèges insuffisants pour accéder aux logs d\'audit' },
        { status: 403 }
      );
    }
  }

  // Protection des routes étudiants
  if (path.startsWith('/student') || path.startsWith('/api/student')) {
    // Tous les utilisateurs authentifiés peuvent accéder aux routes étudiants
    if (!token) {
      if (!path.startsWith('/api')) {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      } else {
        return NextResponse.json(
          { error: '[MIDDLEWARE] Authentification requise' },
          { status: 401 }
        );
      }
    }
  }

  // Protection des routes API générales (sauf exceptions)
  if (path.startsWith('/api/')) {
    const publicAPIRoutes = [
      '/api/auth',
      '/api/health',
      '/api/status',
      '/api/audit/log'
    ];
    
    const isPublicAPI = publicAPIRoutes.some(route => path.startsWith(route));
    
    if (!isPublicAPI && !hasValidSession) {
      return NextResponse.json(
        { error: '[MIDDLEWARE] Authentification requise' },
        { status: 401 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ]
};
