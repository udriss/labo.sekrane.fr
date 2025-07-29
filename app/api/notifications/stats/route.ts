import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RoleBasedNotificationService } from '@/lib/notifications/role-based-notification-service';

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
    const filters = {
      module: searchParams.get('module') || undefined,
      severity: searchParams.get('severity') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined
    };

    console.log('📊 [API] Récupération stats basées sur les rôles pour:', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      filters
    });

    // Récupérer les statistiques avec le service basé sur les rôles
    const stats = await RoleBasedNotificationService.getStats(
      user.id,
      user.role,
      user.email,
      filters
    );

    console.log('📊 [API] Stats calculées:', stats);

    // Retourner les stats dans le format attendu par le hook
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