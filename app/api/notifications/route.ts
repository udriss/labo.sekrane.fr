// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET - Récupérer les notifications d'un utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || (session.user as any).id;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Vérifier que l'utilisateur peut accéder à ces notifications
    if (userId !== (session.user as any).id && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer les notifications pour cet utilisateur ou son rôle
    const userRole = (session.user as any).role;
    
    const notifications = await query(`
      SELECT n.id, n.user_id, n.user_role, n.target_roles, n.module, n.action_type,
             CAST(n.message AS CHAR) as message,
             n.details, n.severity, n.entity_type, n.entity_id, n.triggered_by,
             n.reason, n.specific_reason, n.created_at, n.updated_at,
             CASE WHEN nrs.is_read IS NOT NULL THEN nrs.is_read 
                  WHEN n.user_id = ? THEN n.is_read 
                  ELSE FALSE END as isRead,
             nrs.read_at
      FROM notifications n
      LEFT JOIN notification_read_status nrs ON (n.id = nrs.notification_id AND nrs.user_id = ?)
      WHERE (n.user_id = ? OR JSON_SEARCH(n.target_roles, 'one', ?) IS NOT NULL)
      ORDER BY n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [userId, userId, userId, userRole]);

    return NextResponse.json({
      success: true,
      notifications: notifications.map((notif: any) => {
        // Safely parse JSON or handle string message
        let parsedMessage;
        try {
          if (typeof notif.message === 'string') {
            // Check if it's already a JSON string (starts with '{' or '[')
            if ((notif.message.startsWith('{') && notif.message.endsWith('}')) || 
                (notif.message.startsWith('[') && notif.message.endsWith(']'))) {
              parsedMessage = JSON.parse(notif.message);
            } else {
              // It's a plain string that was JSON encoded - remove outer quotes if present
              const cleanedMessage = notif.message.replace(/^"(.*)"$/, '$1');
              // Create a simple object with the message text
              parsedMessage = { text: cleanedMessage };
            }
          } else {
            parsedMessage = notif.message;
          }
        } catch (error) {
          console.warn(`Failed to parse notification message: ${error}. Using as plain text.`);
          parsedMessage = { text: String(notif.message) };
        }
        
        // Parse target_roles safely
        let targetRoles;
        try {
          targetRoles = typeof notif.target_roles === 'string' ? JSON.parse(notif.target_roles) : notif.target_roles;
        } catch (error) {
          console.warn(`Failed to parse target_roles: ${error}`);
          targetRoles = [];
        }

        return {
          id: notif.id,
          userId: notif.user_id,
          role: notif.user_role,
          module: notif.module,
          actionType: notif.action_type,
          message: parsedMessage,
          details: notif.details || '',
          severity: notif.severity || 'medium',
          entityType: notif.entity_type,
          entityId: notif.entity_id,
          triggeredBy: notif.triggered_by,
          target_roles: targetRoles,
          isRead: Boolean(notif.isRead),
          // Assurer que createdAt est présent et valide
          createdAt: notif.created_at || notif.createdAt || new Date().toISOString(),
          timestamp: notif.created_at || notif.createdAt || new Date().toISOString(),
          reason: notif.reason || 'role',
          specificReason: notif.specific_reason || ''
        };
      })
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur lors de la récupération des notifications' 
    }, { status: 500 });
  }
}

// POST - Créer une nouvelle notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const {
      targetRoles,
      userId,
      module,
      actionType,
      message,
      details,
      severity = 'medium',
      entityType,
      entityId,
      triggeredBy
    } = body;

    // Validation des données
    if (!module || !actionType || !message) {
      return NextResponse.json({ 
        error: 'Champs requis manquants: module, actionType, message' 
      }, { status: 400 });
    }

    // Préparer le message en format JSON correct
    let messageToStore;
    if (typeof message === 'string') {
      // Convertir en objet avec propriété text
      messageToStore = JSON.stringify({ text: message });
    } else {
      // Déjà un objet, le stocker tel quel
      messageToStore = JSON.stringify(message);
    }

    const notificationId = uuidv4();
    const currentUserId = (session.user as any).id;
    const currentUserRole = (session.user as any).role;

    // Créer la notification en base de données
    await query(`
      INSERT INTO notifications (
        id, user_id, user_role, target_roles, module, action_type, 
        message, details, severity, entity_type, entity_id, triggered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      notificationId,
      userId || null,
      currentUserRole,
      JSON.stringify(targetRoles || []),
      module,
      actionType,
      messageToStore,
      details || null,
      severity,
      entityType || null,
      entityId || null,
      triggeredBy || currentUserId
    ]);

    // Récupérer la notification créée
    const [notification] = await query(`
      SELECT * FROM notifications WHERE id = ?
    `, [notificationId]);

    console.log('✅ [API] Notification créée:', notificationId);

    // Envoyer la notification via WebSocket si le service est disponible
    try {
      const wsService = (await import('@/lib/services/websocket-notification-service')).default;
      
      await wsService.sendNotification(
        targetRoles || [],
        module,
        actionType,
        message,
        severity,
        entityType,
        entityId,
        triggeredBy || currentUserId,
        userId ? [userId.toString()] : undefined
      );

      console.log('✅ [API] Notification envoyée via WebSocket');
    } catch (wsError) {
      console.warn('⚠️ [API] Erreur envoi WebSocket (non bloquant):', wsError);
    }

    return NextResponse.json({
      success: true,
      notification,
      message: 'Notification créée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur lors de la création de la notification' 
    }, { status: 500 });
  }
}

// PATCH - Marquer des notifications comme lues
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notificationId } = body;
    const userId = (session.user as any).id;

    if (action === 'markAsRead' && notificationId) {
      // Marquer une notification comme lue
      const [notification] = await query(`
        SELECT * FROM notifications WHERE id = ?
      `, [notificationId]);

      if (!notification) {
        return NextResponse.json({ error: 'Notification non trouvée' }, { status: 404 });
      }

      // Vérifier les permissions
      const targetRoles = typeof notification.target_roles === 'string' 
        ? JSON.parse(notification.target_roles) 
        : notification.target_roles;
      
      const canRead = notification.user_id === userId || 
                     (targetRoles && targetRoles.includes((session.user as any).role));

      if (!canRead) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      }

      // Insérer ou mettre à jour le statut de lecture
      await query(`
        INSERT INTO notification_read_status (id, notification_id, user_id, is_read, read_at)
        VALUES (UUID(), ?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE is_read = 1, read_at = NOW()
      `, [notificationId, userId]);

      return NextResponse.json({ 
        success: true,
        message: 'Notification marquée comme lue' 
      });

    } else if (action === 'markAllAsRead') {
      // Marquer toutes les notifications comme lues
      const userRole = (session.user as any).role;
      
      // Obtenir toutes les notifications accessibles à cet utilisateur
      const notifications = await query(`
        SELECT id FROM notifications 
        WHERE user_id = ? OR JSON_SEARCH(target_roles, 'one', ?) IS NOT NULL
      `, [userId, userRole]);

      // Créer les entrées de statut de lecture pour chaque notification
      for (const notif of notifications) {
        await query(`
          INSERT INTO notification_read_status (id, notification_id, user_id, is_read, read_at)
          VALUES (UUID(), ?, ?, 1, NOW())
          ON DUPLICATE KEY UPDATE is_read = 1, read_at = NOW()
        `, [notif.id, userId]);
      }

      return NextResponse.json({ 
        success: true,
        message: 'Toutes les notifications ont été marquées comme lues' 
      });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });

  } catch (error) {
    console.error('Erreur lors de la mise à jour des notifications:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur lors de la mise à jour des notifications' 
    }, { status: 500 });
  }
}
