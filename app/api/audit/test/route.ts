// app/api/audit/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditLogger } from '@/lib/services/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Créer un log de test
    await auditLogger.log(
      {
        type: 'READ',
        module: 'SYSTEM',
        entity: 'test',
        entityId: 'test-123'
      },
      {
        id: (session.user as any).id,
        email: session.user.email!,
        name: session.user.name || 'Unknown',
        role: (session.user as any).role || 'USER'
      },
      {
        ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: request.headers.get('user-agent') || 'Unknown',
        requestId: `test_${Date.now()}`,
        path: request.nextUrl.pathname,
        method: request.method
      },
      {
        message: 'Test audit log entry',
        timestamp: new Date().toISOString()
      }
    );

    // Forcer l'écriture immédiate
    await auditLogger.forceFlush();

    return NextResponse.json({
      success: true,
      message: 'Log de test créé avec succès'
    });
  } catch (error) {
    console.error('Error creating test log:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du log de test' },
      { status: 500 }
    );
  }
}