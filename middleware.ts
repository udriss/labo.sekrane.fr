// middleware.ts (à la racine du projet)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditMiddleware } from '@/lib/middleware/audit-edge';

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://labo.sekrane.fr', 'http://labo.sekrane.fr']
  : ['http://localhost:3000'];

function applyCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (!origin && process.env.NODE_ENV !== 'production') {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
  
  return response;
}

export async function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return applyCorsHeaders(response, request);
  }

  let response = NextResponse.next();
  const path = request.nextUrl.pathname;
  
  if (path.startsWith('/api') && 
      !path.includes('/health') &&
      !path.includes('/status') &&
      !path.startsWith('/api/audit/log') &&
      !path.startsWith('/api/auth')) {
    await auditMiddleware(request);
  }
  
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

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
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

  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/error', '/', '/api/auth'];
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));
  
  const hasValidSession = token || sessionToken;
  
  if (!isPublicRoute && !hasValidSession) {
    if (!path.startsWith('/api')) {
      response = NextResponse.redirect(new URL('/auth/signin', request.url));
    } else {
      response = NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return applyCorsHeaders(response, request);
  }
  
  if (path.startsWith('/api/auth')) {
    return applyCorsHeaders(response, request);
  }

  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    if (!token || (token.role !== 'ADMIN' && token.role !== 'ADMINLABO')) {
      if (!path.startsWith('/api')) {
        response = NextResponse.redirect(new URL('/', request.url));
      } else {
        response = NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
      }
      return applyCorsHeaders(response, request);
    }
  }

  if (path.startsWith('/teacher') || path.startsWith('/api/teacher')) {
    const allowedRoles = ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'];
    if (!token || !allowedRoles.includes(token.role as string)) {
      if (!path.startsWith('/api')) {
        response = NextResponse.redirect(new URL('/', request.url));
      } else {
        response = NextResponse.json({ error: 'Accès réservé au personnel enseignant' }, { status: 403 });
      }
      return applyCorsHeaders(response, request);
    }
  }

  if (path.startsWith('/lab') || path.startsWith('/api/lab')) {
    const allowedRoles = ['ADMIN', 'ADMINLABO', 'LABORANTIN', 'TEACHER'];
    if (!token || !allowedRoles.includes(token.role as string)) {
      if (!path.startsWith('/api')) {
        response = NextResponse.redirect(new URL('/', request.url));
      } else {
        response = NextResponse.json({ error: 'Accès réservé au personnel du laboratoire' }, { status: 403 });
      }
      return applyCorsHeaders(response, request);
    }
  }

  if (path.startsWith('/api/audit')) {
    if (path === '/api/audit/log') {
      return applyCorsHeaders(response, request);
    }
    
    if (!token) {
      response = NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      return applyCorsHeaders(response, request);
    }

    const auditAllowedRoles = ['ADMIN', 'TEACHER', 'ADMINLABO', 'LABORANTIN'];
    if (!auditAllowedRoles.includes(token.role as string)) {
      response = NextResponse.json({ error: 'Privilèges insuffisants pour accéder aux logs d\'audit' }, { status: 403 });
      return applyCorsHeaders(response, request);
    }
  }

  if (path.startsWith('/student') || path.startsWith('/api/student')) {
    if (!token) {
      if (!path.startsWith('/api')) {
        response = NextResponse.redirect(new URL('/auth/signin', request.url));
      } else {
        response = NextResponse.json({ error: '[MIDDLEWARE] Authentification requise' }, { status: 401 });
      }
      return applyCorsHeaders(response, request);
    }
  }

  if (path.startsWith('/api/')) {
    const publicAPIRoutes = [
      '/api/auth',
      '/api/health',
      '/api/status',
      '/api/audit/log',
      '/api/notifications/ws',
      '/api/notifications/test',
    ];
    
    const isPublicAPI = publicAPIRoutes.some(route => path.startsWith(route));
    
    if (!isPublicAPI && !hasValidSession) {
      response = NextResponse.json({ error: '[MIDDLEWARE] Authentification requise' }, { status: 401 });
      return applyCorsHeaders(response, request);
    }
  }

  return applyCorsHeaders(response, request);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ]
};
