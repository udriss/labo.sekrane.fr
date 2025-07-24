import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditMiddleware } from '@/lib/middleware/audit-edge';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Apply audit middleware for API routes
  if (request.nextUrl.pathname.startsWith('/api') && 
      !request.nextUrl.pathname.includes('/health') &&
      !request.nextUrl.pathname.includes('/status')) {
    await auditMiddleware(request);
  }
  
  // 1. Tracker les sessions actives pour tous les utilisateurs connectés
  const sessionToken = request.cookies.get('next-auth.session-token') || 
                      request.cookies.get('__Secure-next-auth.session-token'); // Pour HTTPS
  
  if (sessionToken) {
    // Enregistrer l'activité de l'utilisateur
    response.cookies.set('last-activity', new Date().toISOString(), {
      maxAge: 60 * 30, // 30 minutes
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    // Optionnel : Vous pouvez aussi stocker l'ID utilisateur si nécessaire
    const token = await getToken({ req: request });
    if (token?.sub) {
      response.cookies.set('active-user-id', token.sub as string, {
        maxAge: 60 * 30, // 30 minutes
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }
  }

  // 2. Protéger les routes API de configuration
  if (request.nextUrl.pathname.startsWith('/api/user/config')) {
    const token = await getToken({ req: request });
    
    if (!token) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }
  }

  // 3. Protéger les routes d'audit (admin/teacher seulement)
  if (request.nextUrl.pathname.startsWith('/api/audit')) {
    const token = await getToken({ req: request });
    
    if (!token) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Check admin/teacher privileges for audit routes
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
    '/api/user/config/:path*',
    '/api/audit/:path*',
    '/api/:path*',
    // Ajouter les routes où vous voulez tracker l'activité
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};