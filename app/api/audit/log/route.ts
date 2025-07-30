// app/api/audit/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditLogger } from '@/lib/services/audit-logger';
import { AuditAction, AuditUser, AuditContext } from '@/types/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    

    // Récupérer la session pour l'utilisateur
    const session = await getServerSession(authOptions);
    
    // Si on reçoit directement un log complet (depuis le middleware)
    if (body.id && body.timestamp && body.action && body.user && body.context) {
      // Log complet depuis le middleware
      const { action, user, context, details } = body;
      
      await auditLogger.log(
        action as AuditAction,
        user as AuditUser,
        context as AuditContext,
        details
      );
      
      
      return NextResponse.json({ success: true });
    }
    
    // Sinon, c'est un log depuis l'application
    const { action, details, context } = body;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Session requise pour logger' },
        { status: 401 }
      );
    }

    const auditUser: AuditUser = {
      id: (session.user as any).id,
      email: session.user.email!,
      name: session.user.name || 'Unknown',
      role: (session.user as any).role || 'USER'
    };

    const auditContext: AuditContext = {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
          request.headers.get('x-real-ip') || 
          '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      sessionId: (session as any).sessionId,
      requestId: `api_${Date.now()}`,
      path: context?.path || request.nextUrl.pathname,
      method: context?.method || request.method,
      ...context
    };

    await auditLogger.log(action, auditUser, auditContext, details);
    
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du log' },
      { status: 500 }
    );
  }
}