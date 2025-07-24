// middleware.ts (à la racine du projet)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditMiddleware } from '@/lib/middleware/audit-edge';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Debug log
  console.log('Main middleware called for:', request.nextUrl.pathname);
  
  // Apply audit middleware for API routes
  if (request.nextUrl.pathname.startsWith('/api') && 
      !request.nextUrl.pathname.includes('/health') &&
      !request.nextUrl.pathname.includes('/status') &&
      !request.nextUrl.pathname.startsWith('/api/audit/log') &&
      !request.nextUrl.pathname.startsWith('/api/auth')) { // Exclure auth pour éviter les boucles
    console.log('Calling audit middleware for:', request.nextUrl.pathname);
    await auditMiddleware(request);
  }
  
  // Reste du code middleware existant...
  const sessionToken = request.cookies.get('next-auth.session-token') || 
                      request.cookies.get('__Secure-next-auth.session-token');
  
  if (sessionToken) {
    response.cookies.set('last-activity', new Date().toISOString(), {
      maxAge: 60 * 30,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    const token = await getToken({ req: request });
    if (token?.sub) {
      response.cookies.set('active-user-id', token.sub as string, {
        maxAge: 60 * 30,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }
  }

  // Protection des routes d'audit
  if (request.nextUrl.pathname.startsWith('/api/audit')) {
    if (request.nextUrl.pathname === '/api/audit/log') {
      return response;
    }
    
    const token = await getToken({ req: request });
    
    if (!token) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    if (token.role !== 'ADMIN' && token.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Privilèges insuffisants' },
        { status: 403 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};