// app/api/audit/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditLogger } from '@/lib/services/audit-logger';
import { LogFilters } from '@/types/audit';

export async function POST(request: NextRequest) {
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

    const filters: LogFilters = await request.json();
    
    // Récupérer tous les logs pour l'export
    const entries = await auditLogger.query({
      ...filters,
      limit: 10000 // Limite raisonnable pour l'export
    });

    // Créer le CSV
    const headers = [
      'Date',
      'Heure',
      'Utilisateur',
      'Email',
      'Action',
      'Module',
      'Entité',
      'ID Entité',
      'Statut',
      'IP',
      'User Agent',
      'Détails'
    ];

    const rows = entries.map(entry => {
      const date = new Date(entry.timestamp);
      return [
        date.toLocaleDateString('fr-FR'),
        date.toLocaleTimeString('fr-FR'),
        entry.user.name,
        entry.user.email,
        entry.action.type,
        entry.action.module,
        entry.action.entity,
        entry.action.entityId || '',
        entry.status,
        entry.context.ip,
        entry.context.userAgent.substring(0, 50),
        entry.details ? JSON.stringify(entry.details) : ''
      ];
    });

    // Construire le CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Retourner le CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'export des logs' },
      { status: 500 }
    );
  }
}