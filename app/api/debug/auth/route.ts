// app/api/debug/auth/route.ts
import { auth } from '@/auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const cookies = request.headers.get('cookie');
    
    return Response.json({
      session: session ? {
        user: {
          id: session.user?.id,
          email: session.user?.email,
          role: (session.user as any)?.role
        },
        expires: session.expires
      } : null,
      cookies: cookies ? cookies.split(';').map(c => c.trim().split('=')[0]) : [],
      env: {
        AUTH_SECRET: !!process.env.AUTH_SECRET,
        NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NODE_ENV: process.env.NODE_ENV,
      }
    });
  } catch (error) {
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}