import { NextRequest } from 'next/server';
import { notificationService } from '@/lib/notifications/notification-service';

// Interface pour les messages de notification
interface NotificationMessage {
  type: 'notification' | 'connected' | 'heartbeat';
  userId?: string;
  data?: any;
  timestamp?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('Missing userId parameter', { status: 400 });
  }

  const encoder = new TextEncoder();
  let isConnected = true;
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Enregistrer cette connexion dans le notificationService
      notificationService.registerSSEConnection(userId, controller);

      // Envoyer un message de connexion initial
      const connectMessage: NotificationMessage = {
        type: 'connected',
        userId,
        timestamp: Date.now()
      };
      
      const data = `data: ${JSON.stringify(connectMessage)}\n\n`;
      controller.enqueue(encoder.encode(data));

      console.log(`User ${userId} connected via SSE`);

      // Heartbeat pour maintenir la connexion
      const heartbeatInterval = setInterval(() => {
        if (isConnected) {
          try {
            const heartbeat: NotificationMessage = {
              type: 'heartbeat',
              timestamp: Date.now()
            };
            const heartbeatData = `data: ${JSON.stringify(heartbeat)}\n\n`;
            controller.enqueue(encoder.encode(heartbeatData));
          } catch (error) {
            console.error('Error sending heartbeat:', error);
            cleanup();
          }
        }
      }, 30000); // Heartbeat toutes les 30 secondes

      // Fonction de nettoyage
      const cleanup = () => {
        isConnected = false;
        clearInterval(heartbeatInterval);
        
        // Désenregistrer la connexion du notificationService
        notificationService.unregisterSSEConnection(userId, controller);
        
        try {
          controller.close();
        } catch (error) {
          // Controller déjà fermé
        }
        
        console.log(`User ${userId} disconnected from SSE`);
      };

      // Écouter l'annulation de la requête (déconnexion du client)
      request.signal.addEventListener('abort', cleanup);
    },

    cancel() {
      isConnected = false;
      // Le nettoyage sera fait par l'event listener 'abort'
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET',
      'X-Accel-Buffering': 'no', // Pour Nginx
    },
  });
}

// Endpoint pour les actions de test et de gestion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'status') {
      const status = notificationService.getSSEConnectionStatus();
      return Response.json(status);
    }
    
    if (body.action === 'send' && body.userId && body.notification) {
      // Créer une notification via le service (qui enverra automatiquement via SSE)
      try {
        const notification = await notificationService.createNotification(
          body.userId,
          body.notification.role || 'user',
          body.notification.module || 'SYSTEM',
          body.notification.actionType || 'NOTIFICATION',
          body.notification.message || 'Test notification',
          body.notification.details || {},
          body.notification.severity || 'medium',
          body.notification.entityType,
          body.notification.entityId,
          body.notification.triggeredBy
        );
        return Response.json({ success: true, notificationId: notification.id });
      } catch (error) {
        console.error('Error creating notification:', error);
        return Response.json({ success: false, error: 'Failed to create notification' }, { status: 500 });
      }
    }
    
    if (body.action === 'broadcast' && body.notification) {
      // Diffuser une notification à tous les utilisateurs connectés
      const count = notificationService.broadcastSSE(body.notification);
      return Response.json({ sent: count });
    }

    if (body.action === 'test-sse' && body.userId) {
      // Test direct d'envoi SSE (pour debug)
      const testMessage: NotificationMessage = {
        type: 'notification',
        userId: body.userId,
        data: {
          id: crypto.randomUUID(),
          message: 'Test SSE message',
          type: 'info',
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };

      // Utiliser la méthode de diffusion du service
      const count = notificationService.broadcastSSE(testMessage);
      return Response.json({ sent: count, message: 'Test SSE sent' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST handler:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Fonction utilitaire pour créer une notification de test
export async function createTestNotification(
  userId: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  message?: string
): Promise<boolean> {
  try {
    const testMessages = {
      success: 'Opération réussie avec succès !',
      error: 'Une erreur est survenue lors de l\'opération.',
      warning: 'Attention : cette action nécessite votre confirmation.',
      info: 'Information : nouvelle mise à jour disponible.'
    };

    const severityMap = {
      success: 'low' as const,
      error: 'high' as const,
      warning: 'medium' as const,
      info: 'low' as const
    };

    await notificationService.createNotification(
      userId,
      'user',
      'SYSTEM',
      'TEST_NOTIFICATION',
      message || testMessages[type],
      { testType: type, timestamp: Date.now() },
      severityMap[type],
      'test',
      crypto.randomUUID()
    );

    return true;
  } catch (error) {
    console.error('Error creating test notification:', error);
    return false;
  }
}

// Fonction utilitaire pour obtenir le statut des connexions
export function getConnectionStatus(): { totalUsers: number; totalConnections: number } {
  return notificationService.getSSEConnectionStatus();
}