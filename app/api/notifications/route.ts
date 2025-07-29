import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RoleBasedNotificationService } from '@/lib/notifications/role-based-notification-service';
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

    console.log('📧 [API] Récupération notifications basées sur les rôles pour:', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      filters
    });

    // Récupérer les notifications avec le service basé sur les rôles
    const result = await RoleBasedNotificationService.getNotifications(user.id, filters);

    console.log('📧 [API] Résultat:', {
      count: result.notifications.length,
      total: result.total,
      userRole: user.role
    });

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

    console.log('📧 [API] Création d\'une notification:', {
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
    // Pour l'instant, on autorise tous les utilisateurs connectés
    // Vous pouvez ajouter des vérifications de rôle ici si nécessaire
    if (!user.role || !['ADMIN', 'ADMINLABO', 'TEACHER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes pour créer une notification' },
        { status: 403 }
      );
    }

    // Créer la notification avec le service basé sur les rôles
    const notification = await RoleBasedNotificationService.createNotification(
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

    if (!notification) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de la notification' },
        { status: 500 }
      );
    }

    console.log('📧 [API] Notification créée avec succès:', notification.id);

    return NextResponse.json({
      success: true,
      notification,
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
    const { notificationId, action } = body;

    console.log('📧 [API] Action PATCH:', { action, notificationId, userId: user.id });

    if (!notificationId) {
      return NextResponse.json(
        { error: 'ID de notification requis' },
        { status: 400 }
      );
    }

    // Vérifier que la notification existe
    const notification = await RoleBasedNotificationService.getNotificationById(notificationId);
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification non trouvée' },
        { status: 404 }
      );
    }

    if (action === 'markAsRead') {
      const success = await RoleBasedNotificationService.markAsRead(notificationId, user.id);
      
      if (success) {
        console.log('📧 [API] Notification marquée comme lue:', notificationId);
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
      const success = await RoleBasedNotificationService.markAllAsRead(
        user.id, 
        user.role, 
        user.email
      );
      
      if (success) {
        console.log('📧 [API] Toutes les notifications marquées comme lues pour:', user.id);
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
      { error: 'Action non supportée. Actions disponibles: markAsRead, markAllAsRead' },
      { status: 400 }
    );

  } catch (error) {
    console.error('📧 [API] Erreur PATCH:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'ID de notification requis' },
        { status: 400 }
      );
    }

    console.log('📧 [API] Suppression de la notification:', notificationId, 'par:', user.id);

    // Vérifier que la notification existe
    const notification = await RoleBasedNotificationService.getNotificationById(notificationId);
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier les permissions de suppression
    // Seuls les ADMIN peuvent supprimer des notifications, ou le créateur de la notification
    const canDelete = user.role === 'ADMIN' || 
                     notification.metadata?.createdBy === user.id ||
                     notification.metadata?.triggeredBy === user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes pour supprimer cette notification' },
        { status: 403 }
      );
    }

    // Supprimer la notification
    const success = await RoleBasedNotificationService.deleteNotification(notificationId);

    if (!success) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la notification' },
        { status: 500 }
      );
    }

    console.log('📧 [API] Notification supprimée avec succès:', notificationId);

    return NextResponse.json({
      success: true,
      message: 'Notification supprimée avec succès'
    });

  } catch (error) {
    console.error('📧 [API] Erreur lors de la suppression de la notification:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}