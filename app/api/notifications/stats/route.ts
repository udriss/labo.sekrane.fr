// app/api/notifications/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { wsNotificationService } from '@/lib/services/websocket-notification-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Seuls les admins peuvent voir les statistiques WebSocket
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const stats = wsNotificationService.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [WebSocket Stats] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
