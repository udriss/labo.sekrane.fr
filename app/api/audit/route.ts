// app/api/audit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditLogger } from '@/lib/services/audit-logger';
import { LogFilters } from '@/types/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Vérifier les permissions
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'TEACHER' &&
        userRole !== 'ADMINLABO' && userRole !== 'LABORANTIN') {
      return NextResponse.json(
        { error: 'Privilèges insuffisants' },
        { status: 403 }
      );
    }

    // Récupérer les paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    
    const filters: LogFilters = {
      module: searchParams.get('module') || undefined,
      action: searchParams.get('action') as any || undefined,
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') as any || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      search: searchParams.get('search') || undefined
    };

    

    // Récupérer les logs
    const entries = await auditLogger.query(filters);
    
    // Pour obtenir le total, on fait une requête sans limite
    const totalEntries = await auditLogger.query({
      ...filters,
      limit: undefined,
      offset: undefined
    });

    

    return NextResponse.json({
      success: true,
      data: entries,
      total: totalEntries.length,
      limit: filters.limit,
      offset: filters.offset
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des logs' },
      { status: 500 }
    );
  }
}