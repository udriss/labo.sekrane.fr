import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseNotificationService } from '@/lib/notifications/database-notification-service';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const user = session.user as any;
    const body = await request.json();
    const { userId } = body;
    
    // Vérifier que l'utilisateur peut marquer ces notifications
    const targetUserId = userId || user.id;
    if (targetUserId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    console.log('📧 [MARK-ALL-READ] Marquage toutes notifications comme lues:', {
      userId: targetUserId,
      userRole: user.role,
      requestedBy: user.id
    });

    const success = await DatabaseNotificationService.markAllAsRead(targetUserId, user.role);

    if (!success) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues'
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des notifications' },
      { status: 500 }
    );
  }
}