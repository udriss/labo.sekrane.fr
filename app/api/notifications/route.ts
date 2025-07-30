import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseNotificationService } from '@/lib/notifications/database-notification-service';
import { NotificationFilter } from '@/types/notifications';
import { sendNotificationToUser } from './stream/route';

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
    const filters: NotificationFilter = {
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
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

    if (searchParams.get('isRead')) {
      filters.isRead = searchParams.get('isRead') === 'true';
    }

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = searchParams.get('dateFrom')!;
    }

    if (searchParams.get('dateTo')) {
      filters.dateTo = searchParams.get('dateTo')!;
    }

    if (searchParams.get('entityType')) {
      filters.entityType = searchParams.get('entityType')!;
    }

    if (searchParams.get('entityId')) {
      filters.entityId = searchParams.get('entityId')!;
    }
    
    console.log('📧 [API] Récupération notifications depuis la base de données pour:', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      filters
    });

    // Récupérer les notifications avec le service de base de données
    const result = await DatabaseNotificationService.getNotifications(user.id, filters);

    return NextResponse.json({
      success: true,
      notifications: result.notifications,
      total: result.total,
      filters: filters,
      userInfo: {
        userId: user.id,
        userRole: user.role,
        userEmail: user.email
      },
      hasMore: (filters.offset! + filters.limit!) < result.total
    });

  } catch (error) {
    console.error('📧 [API] Erreur lors de la récupération des notifications:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const {
      targetRoles,
      module,
      actionType,
      message,
      details = '',
      severity = 'medium',
      entityType,
      entityId,
      triggeredBy,
      specificUsers
    } = body;

    console.log('📧 [API] Création de notification:', {
      targetRoles,
      module,
      actionType,
      severity,
      triggeredBy: user.id
    });

    // Validation des champs requis
    if (!targetRoles || !Array.isArray(targetRoles) || targetRoles.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un rôle cible doit être spécifié (targetRoles)' },
        { status: 400 }
      );
    }

    if (!module || !actionType || !message) {
      return NextResponse.json(
        { error: 'Champs requis manquants: module, actionType, message' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur a les permissions pour créer des notifications
    if (!user.role || !['ADMIN', 'ADMINLABO', 'TEACHER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes pour créer une notification' },
        { status: 403 }
      );
    }

    // Créer la notification avec le service de base de données
    const notificationId = await DatabaseNotificationService.createNotification(
      targetRoles,
      module,
      actionType,
      message,
      details,
      severity,
      entityType,
      entityId,
      triggeredBy || user.id,
      specificUsers
    );

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de la notification' },
        { status: 500 }
      );
    }

    // Récupérer la notification créée pour l'envoyer via SSE
    try {
      const createdNotifications = await DatabaseNotificationService.getNotifications(
        user.id,
        {
          limit: 1,
          userRole: user.role,
          userEmail: user.email
        }
      );

      if (createdNotifications.notifications.length > 0) {
        const newNotification = createdNotifications.notifications[0];
        
        // Envoyer la notification via SSE aux utilisateurs concernés
        if (specificUsers && specificUsers.length > 0) {
          // Envoyer aux utilisateurs spécifiques
          specificUsers.forEach((userId: string) => {
            sendNotificationToUser(userId, newNotification);
          });
        } else {
          // Pour les notifications par rôle, on pourrait implémenter une logique plus complexe
          // Pour l'instant, on ne diffuse que si on a des utilisateurs spécifiques
          console.log('🔔 [API] Notification créée pour des rôles, pas d\'envoi SSE automatique');
        }
      }
    } catch (sseError) {
      console.error('❌ [API] Erreur lors de l\'envoi SSE:', sseError);
      // Ne pas faire échouer la création de notification pour une erreur SSE
    }

    return NextResponse.json({
      success: true,
      notificationId,
      message: 'Notification créée avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('📧 [API] Erreur lors de la création de la notification:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const body = await request.json();
    const { action, notificationId } = body;

    

    if (action === 'markAsRead' && notificationId) {
      const success = await DatabaseNotificationService.markAsRead(notificationId, user.id);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Notification marquée comme lue'
        });
      } else {
        return NextResponse.json(
          { error: 'Erreur lors du marquage comme lu' },
          { status: 500 }
        );
      }
    }

    if (action === 'markAllAsRead') {
      const success = await DatabaseNotificationService.markAllAsRead(user.id, user.role);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Toutes les notifications marquées comme lues'
        });
      } else {
        return NextResponse.json(
          { error: 'Erreur lors du marquage de toutes comme lues' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Action non supportée' },
      { status: 400 }
    );

  } catch (error) {
    console.error('📧 [API] Erreur lors de l action de notification:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
