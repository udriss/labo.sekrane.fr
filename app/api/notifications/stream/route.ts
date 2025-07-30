import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Store des connexions SSE actives
const connections = new Map<string, Response>();

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response('Non autorisé', { status: 401 });
    }

    const user = session.user as any;
    const userId = user.id;

    console.log('🔄 [SSE] Nouvelle connexion SSE pour utilisateur:', userId);

    // Créer le stream SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Message de connexion initial
        const initMessage = `data: ${JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString(),
          userId
        })}\n\n`;
        
        controller.enqueue(encoder.encode(initMessage));

        // Stocker la connexion (nous stockerons le controller pour pouvoir envoyer des messages)
        connections.set(userId, controller as any);

        // Heartbeat pour maintenir la connexion
        const heartbeat = setInterval(() => {
          try {
            const heartbeatMessage = `data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`;
            
            controller.enqueue(encoder.encode(heartbeatMessage));
          } catch (error) {
            console.error('❌ [SSE] Erreur heartbeat:', error);
            clearInterval(heartbeat);
            connections.delete(userId);
          }
        }, 30000); // Heartbeat toutes les 30 secondes

        // Nettoyer lors de la fermeture
        const cleanup = () => {
          console.log('🔄 [SSE] Connexion fermée pour utilisateur:', userId);
          clearInterval(heartbeat);
          connections.delete(userId);
        };

        // Écouter la fermeture de la connexion
        request.signal.addEventListener('abort', cleanup);
      },
      
      cancel() {
        connections.delete(userId);
        console.log('🔄 [SSE] Connexion annulée pour utilisateur:', userId);
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

  } catch (error) {
    console.error('❌ [SSE] Erreur lors de la création du stream:', error);
    return new Response('Erreur serveur', { status: 500 });
  }
}

// Fonction utilitaire pour envoyer une notification à un utilisateur spécifique
export function sendNotificationToUser(userId: string, notification: any) {
  const connection = connections.get(userId);
  if (connection) {
    try {
      const encoder = new TextEncoder();
      const message = `data: ${JSON.stringify({
        type: 'notification',
        timestamp: new Date().toISOString(),
        data: notification
      })}\n\n`;
      
      (connection as any).enqueue(encoder.encode(message));
      console.log('✅ [SSE] Notification envoyée à:', userId);
      return true;
    } catch (error) {
      console.error('❌ [SSE] Erreur envoi notification:', error);
      connections.delete(userId);
      return false;
    }
  }
  return false;
}

// Fonction utilitaire pour diffuser à tous les utilisateurs connectés
export function broadcastNotification(notification: any) {
  let sentCount = 0;
  for (const [userId, connection] of connections.entries()) {
    if (sendNotificationToUser(userId, notification)) {
      sentCount++;
    }
  }
  console.log(`✅ [SSE] Notification diffusée à ${sentCount} utilisateurs`);
  return sentCount;
}
