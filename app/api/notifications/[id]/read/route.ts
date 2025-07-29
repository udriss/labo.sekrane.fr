import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications/notification-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const notificationId = params.id;
    const success = await notificationService.markAsRead(notificationId);

    if (!success) {
      return NextResponse.json(
        { error: 'Notification non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la notification' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const notificationId = params.id;
    const userId = (session.user as any).id;
    
    // Récupérer toutes les notifications de l'utilisateur pour trouver celle demandée
    const userNotifications = await notificationService.getNotificationsByUser(userId);
    const notification = userNotifications.find(n => n.id === notificationId);

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur peut accéder à cette notification
    if (notification.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    return NextResponse.json({ notification });

  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la notification' },
      { status: 500 }
    );
  }
}