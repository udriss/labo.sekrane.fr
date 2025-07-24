// app/api/audit/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditLogger } from '@/lib/services/audit-logger';
import { LogFilters } from '@/types/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Check if user has admin privileges
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'TEACHER') {
      return NextResponse.json({ error: 'Privilèges insuffisants' }, { status: 403 });
    }

    const filters: LogFilters = await request.json();

    // Non-admin users can only see their own activity
    if (userRole !== 'ADMIN' && !filters.userId) {
      filters.userId = session.user.id;
    }

    const entries = await auditLogger.query(filters);

    return NextResponse.json({
      success: true,
      entries,
      total: entries.length
    });
  } catch (error) {
    console.error('Error querying audit logs:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
