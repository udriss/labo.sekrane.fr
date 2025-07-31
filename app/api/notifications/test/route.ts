// app/api/notifications/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { wsNotificationService } from '@/lib/services/websocket-notification-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Seuls les admins peuvent envoyer des notifications de test
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { message, targetRoles, severity } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message requis" }, { status: 400 });
    }

    await wsNotificationService.sendNotification(
      targetRoles || ['ADMIN', 'TEACHER', 'ADMINLABO', 'LABORANTIN'],
      'SYSTEM',
      'TEST_NOTIFICATION',
      message,
      severity || 'low',
      'test',
      undefined,
      (session.user as any).id
    );

    return NextResponse.json({
      success: true,
      message: 'Notification de test envoyée',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [WebSocket Test] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de la notification de test' },
      { status: 500 }
    );
  }
}
