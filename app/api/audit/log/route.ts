// app/api/audit/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditLogger } from '@/lib/services/audit-logger';
import { AuditAction, AuditUser, AuditContext } from '@/types/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { action, details, context: additionalContext } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action manquante' }, { status: 400 });
    }

    const user: AuditUser = {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.name || 'Unknown',
      role: (session.user as any).role || 'USER'
    };

    const context: AuditContext = {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      sessionId: session.user.id,
      ...additionalContext
    };

    await auditLogger.log(action, user, context, details);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging audit entry:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
