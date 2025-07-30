import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseNotificationService } from '@/lib/notifications/database-notification-service';
import { NotificationFilter } from '@/types/notifications';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    const { searchParams } = new URL(request.url);

    // Vérifier que l'utilisateur a un rôle
    if (!user.role) {
      return NextResponse.json(
        { error: 'Rôle utilisateur non défini' },
        { status: 400 }
      );
    }

    // Construire les filtres à partir des paramètres de requête
    const filters: Partial<NotificationFilter> = {
      userRole: user.role,
      userEmail: user.email
    };

    // Ajouter les filtres optionnels
    if (searchParams.get('module')) {
      filters.module = searchParams.get('module')!;
    }

    if (searchParams.get('severity')) {
      filters.severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical';
    }

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = searchParams.get('dateFrom')!;
    }

    if (searchParams.get('dateTo')) {
      filters.dateTo = searchParams.get('dateTo')!;
    }

    // Récupérer les statistiques avec le service de base de données
    const stats = await DatabaseNotificationService.getStats(
      user.id,
      user.role,
      filters
    );

    // Retourner les stats dans le format attendu
    return NextResponse.json({
      success: true,
      stats: stats,
      userInfo: {
        userId: user.id,
        userRole: user.role,
        userEmail: user.email
      },
      filters: filters,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('📊 [API] Erreur lors de la récupération des stats:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
