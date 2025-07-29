import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications/notification-service';
import { NotificationFilter } from '@/types/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || (session.user as any).id;
    
    // Vérifier que l'utilisateur peut accéder à ces notifications
    if (userId !== (session.user as any).id && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const filter: NotificationFilter = {
      module: searchParams.get('module') || undefined,
      actionType: searchParams.get('actionType') || undefined,
      severity: searchParams.get('severity') || undefined,
      isRead: searchParams.get('isRead') ? searchParams.get('isRead') === 'true' : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const notifications = await notificationService.getNotificationsByUser(userId, filter);

    return NextResponse.json({ 
      notifications,
      total: notifications.length,
      hasMore: notifications.length === filter.limit
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}