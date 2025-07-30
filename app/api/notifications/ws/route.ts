// app/api/notifications/ws/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseNotificationService } from '@/lib/notifications/database-notification-service';

// Interface pour les messages de notification
interface NotificationMessage {
  type: 'notification' | 'connected' | 'heartbeat' | 'status';
  userId?: string;
  userRole?: string;
  data?: any;
  timestamp?: number;
}

// Stockage des connexions SSE actives
const sseConnections = new Map<string, {
  controller: ReadableStreamDefaultController;
  userRole: string;
  userEmail: string;
  lastHeartbeat: number;
}>();

// Fonction pour envoyer un message à toutes les connexions
function broadcastToConnections(message: NotificationMessage, targetUserId?: string) {
  let sentCount = 0;
  const encoder = new TextEncoder();
  
  for (const [userId, connection] of sseConnections) {
    if (targetUserId && userId !== targetUserId) continue;
    
    try {
      const data = `data: ${JSON.stringify(message)}\n\n`;
      connection.controller.enqueue(encoder.encode(data));
      sentCount++;
    } catch (error) {
      console.error('🔗 [SSE] Erreur envoi message:', error);
      // Nettoyer les connexions fermées
      sseConnections.delete(userId);
    }
  }
  
  return sentCount;
}

// Fonction pour nettoyer les connexions inactives (heartbeat timeout)
function cleanupInactiveConnections() {
  const now = Date.now();
  const timeout = 60000; // 1 minute
  
  for (const [userId, connection] of sseConnections) {
    if (now - connection.lastHeartbeat > timeout) {
      
      try {
        connection.controller.close();
      } catch (error) {
        // Ignorer les erreurs de fermeture
      }
      sseConnections.delete(userId);
    }
  }
}

// Nettoyage périodique des connexions
setInterval(cleanupInactiveConnections, 30000); // Toutes les 30 secondes

export async function GET(request: NextRequest) {
  // Vérifier la session NextAuth
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response('Non authentifié', { status: 401 });
  }
  const user = session.user as any;
  const userId = user.id;
  const userRole = user.role;
  const userEmail = user.email || '';

  if (!userId || !userRole) {
    return new Response('Missing userId or userRole in session', { status: 400 });
  }


  const encoder = new TextEncoder();
  let isConnected = true;
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Enregistrer cette connexion SSE
      sseConnections.set(userId, {
        controller,
        userRole,
        userEmail: userEmail,
        lastHeartbeat: Date.now()
      });

      // Message de connexion réussie
      const connectMessage: NotificationMessage = {
        type: 'connected',
        userId,
        userRole,
        timestamp: Date.now(),
        data: { message: 'Connexion SSE établie', activeConnections: sseConnections.size }
      };

      try {
        const data = `data: ${JSON.stringify(connectMessage)}\n\n`;
        controller.enqueue(encoder.encode(data));
      } catch (error) {
        console.error('🔗 [SSE] Erreur message de connexion:', error);
      }

      // Heartbeat périodique
      const heartbeatInterval = setInterval(() => {
        if (!isConnected) {
          clearInterval(heartbeatInterval);
          return;
        }

        const heartbeatMessage: NotificationMessage = {
          type: 'heartbeat',
          userId,
          timestamp: Date.now()
        };

        try {
          const data = `data: ${JSON.stringify(heartbeatMessage)}\n\n`;
          controller.enqueue(encoder.encode(data));
          // Mettre à jour le timestamp de la connexion
          const connection = sseConnections.get(userId);
          if (connection) {
            connection.lastHeartbeat = Date.now();
          }
        } catch (error) {
          console.error('🔗 [SSE] Erreur heartbeat:', error);
          isConnected = false;
          sseConnections.delete(userId);
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Heartbeat toutes les 30 secondes
    },

    cancel() {
      
      isConnected = false;
      sseConnections.delete(userId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification (sauf pour le test)
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { action } = body;

    // Pour les tests, permettre certaines actions sans authentification
    if (action === 'status' || action === 'test') {
      // Pas besoin d'authentification pour ces actions de test
    } else if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const user = session?.user as any;

    

    switch (action) {
      case 'status':
        // Retourner le statut des connexions SSE
        const connectionList = Array.from(sseConnections.entries()).map(([userId, conn]) => ({
          userId,
          userRole: conn.userRole,
          lastHeartbeat: conn.lastHeartbeat,
          isActive: Date.now() - conn.lastHeartbeat < 60000
        }));

        return NextResponse.json({
          success: true,
          connections: connectionList,
          totalConnections: sseConnections.size,
          timestamp: new Date().toISOString()
        });

      case 'broadcast':
        // Diffuser un message à toutes les connexions
        const { message, targetUserId } = body;
        
        const broadcastMessage: NotificationMessage = {
          type: 'notification',
          data: message,
          timestamp: Date.now()
        };

        const sentCount = broadcastToConnections(broadcastMessage, targetUserId);

        return NextResponse.json({
          success: true,
          message: 'Message diffusé',
          sentToConnections: sentCount,
          timestamp: new Date().toISOString()
        });

      case 'test':
        // Créer une vraie notification de test en base de données
        // Utiliser des valeurs par défaut pour les tests quand pas d'authentification
        const testUserRole = user?.role || 'ADMIN';
        const testUserId = user?.id || 'userID_TEMP_test_ws_route';
        
        const testNotificationId = await DatabaseNotificationService.createNotification(
          [testUserRole], // targetRoles
          'test', // module
          'test_notification', // actionType
          'Message de test SSE avec données complètes', // message
          'Cette notification de test a été créée via SSE avec tous les champs requis', // details
          'medium', // severity
          'test', // entityType
          'test-' + Date.now(), // entityId
          testUserId // actorId
        );

        console.log('🧪 [SSE] Notification de test créée avec ID:', testNotificationId, 'pour userId:', testUserId);

        // Récupérer la notification complète depuis la base
        if (!testNotificationId) {
          throw new Error('Impossible de créer la notification de test');
        }
        const fullTestNotification = await DatabaseNotificationService.getNotificationById(testNotificationId);
        
        if (!fullTestNotification) {
          throw new Error('Impossible de récupérer la notification créée');
        }

        console.log('🧪 [SSE] Notification complète récupérée:', fullTestNotification);

        // Diffuser la notification complète via SSE
        const testMessage: NotificationMessage = {
          type: 'notification',
          data: fullTestNotification,
          timestamp: Date.now()
        };

        const testSentCount = broadcastToConnections(testMessage);

        return NextResponse.json({
          success: true,
          message: 'Notification de test créée et envoyée',
          notificationId: testNotificationId,
          sentToConnections: testSentCount,
          timestamp: new Date().toISOString()
        });

      case 'create-and-notify':
        // Créer une notification et la diffuser via SSE
        const {
          targetRoles,
          module,
          actionType,
          message: rawMessage,
          details,
          severity,
          entityType,
          entityId
        } = body;

        // Gérer les deux formats de message (string ou objet { fr, en })
        const notifMessage = typeof rawMessage === 'string' 
          ? rawMessage 
          : rawMessage?.fr || rawMessage?.en || 'Notification';

        // Créer la notification en base
        const notificationId = await DatabaseNotificationService.createNotification(
          targetRoles || [user.role],
          module || 'sse-test',
          actionType || 'sse_broadcast',
          rawMessage || 'Notification créée via SSE', // Utiliser le message original pour la DB
          details || 'Notification créée et diffusée en temps réel',
          severity || 'medium',
          entityType || null,
          entityId || null,
          user.id
        );

        // Diffuser la notification via SSE aux utilisateurs concernés
        const notificationMessage: NotificationMessage = {
          type: 'notification',
          data: {
            id: notificationId,
            message: notifMessage,
            module,
            severity,
            created_at: new Date().toISOString()
          },
          timestamp: Date.now()
        };

        let notifSentCount = 0;
        for (const targetRole of targetRoles || [user.role]) {
          for (const [userId, connection] of sseConnections) {
            if (connection.userRole === targetRole) {
              broadcastToConnections(notificationMessage, userId);
              notifSentCount++;
            }
          }
        }

        return NextResponse.json({
          success: true,
          notificationId,
          message: 'Notification créée et diffusée',
          sentToConnections: notifSentCount,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          error: 'Action non supportée',
          availableActions: ['status', 'broadcast', 'test', 'create-and-notify']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('🔗 [SSE POST] Erreur:', error);
    return NextResponse.json({
      error: 'Erreur lors du traitement SSE',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}