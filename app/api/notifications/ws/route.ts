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
function broadcastToConnections(message: NotificationMessage, targetUserId?: string, targetRoles?: string[]) {
  let sentCount = 0;
  const encoder = new TextEncoder();
  
  console.log(`📢 [SSE] Diffusion message type: ${message.type}, targetUserId: ${targetUserId}, targetRoles: ${targetRoles?.join(',')}`);
  
  for (const [userId, connection] of sseConnections) {
    // Si un utilisateur spécifique est ciblé
    if (targetUserId && userId !== targetUserId) {
      continue;
    }
    
    // Si des rôles spécifiques sont ciblés
    if (targetRoles && targetRoles.length > 0 && !targetRoles.includes(connection.userRole)) {
      continue;
    }
    
    try {
      const data = `data: ${JSON.stringify(message)}\n\n`;
      connection.controller.enqueue(encoder.encode(data));
      sentCount++;
      console.log(`✅ [SSE] Message envoyé à ${userId} (${connection.userRole})`);
    } catch (error) {
      console.error(`❌ [SSE] Erreur envoi message à ${userId}:`, error);
      // Nettoyer les connexions fermées
      sseConnections.delete(userId);
    }
  }
  
  console.log(`📊 [SSE] Messages envoyés: ${sentCount}/${sseConnections.size} connexions`);
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

  console.log(`🔗 [SSE] Nouvelle connexion pour utilisateur: ${userId} (${userRole})`);

  const encoder = new TextEncoder();
  let isConnected = true;
  let heartbeatInterval: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      // Fermer toute connexion existante pour cet utilisateur
      const existingConnection = sseConnections.get(userId);
      if (existingConnection) {
        try {
          existingConnection.controller.close();
        } catch (error) {
          // Ignorer les erreurs de fermeture
        }
        sseConnections.delete(userId);
      }

      // Enregistrer cette nouvelle connexion SSE
      sseConnections.set(userId, {
        controller,
        userRole,
        userEmail: userEmail,
        lastHeartbeat: Date.now()
      });

      console.log(`✅ [SSE] Connexion établie pour ${userId}. Total connexions: ${sseConnections.size}`);

      // Message de connexion réussie
      const connectMessage: NotificationMessage = {
        type: 'connected',
        userId,
        userRole,
        timestamp: Date.now(),
        data: { 
          message: 'Connexion SSE établie',
          activeConnections: sseConnections.size,
          userId,
          userRole
        }
      };

      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectMessage)}\n\n`));
      } catch (error) {
        console.error('🔗 [SSE] Erreur message de connexion:', error);
      }

      // Heartbeat périodique (réduit à 15 secondes pour plus de réactivité)
      heartbeatInterval = setInterval(() => {
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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeatMessage)}\n\n`));
          
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
      }, 15000); // Heartbeat toutes les 15 secondes
    },

    cancel() {
      console.log(`🔗 [SSE] Connexion fermée pour utilisateur: ${userId}`);
      isConnected = false;
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      sseConnections.delete(userId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Authorization',
      'Access-Control-Allow-Credentials': 'true'
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

        const testSentCount = broadcastToConnections(testMessage, undefined, [testUserRole]);

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

        console.log('🔔 [SSE] Création notification:', { targetRoles, module, actionType, severity });

        // Gérer les deux formats de message (string ou objet { fr, en })
        const notifMessage = typeof rawMessage === 'string' 
          ? rawMessage 
          : rawMessage?.fr || rawMessage?.en || 'Notification';

        // Créer la notification en base
        const createNotificationId = await DatabaseNotificationService.createNotification(
          targetRoles || [user.role],
          module || 'system',
          actionType || 'notification',
          rawMessage || 'Notification créée via SSE',
          details || 'Notification créée et diffusée en temps réel',
          severity || 'medium',
          entityType || null,
          entityId || null,
          user.id
        );

        if (!createNotificationId) {
          throw new Error('Impossible de créer la notification');
        }

        // Récupérer la notification complète
        const fullNotification = await DatabaseNotificationService.getNotificationById(createNotificationId);
        
        if (!fullNotification) {
          throw new Error('Impossible de récupérer la notification créée');
        }

        // Diffuser la notification via SSE aux utilisateurs concernés
        const createNotificationMessage: NotificationMessage = {
          type: 'notification',
          data: fullNotification,
          timestamp: Date.now()
        };

        const createNotifSentCount = broadcastToConnections(
          createNotificationMessage, 
          undefined, 
          targetRoles || [user.role]
        );

        console.log(`✅ [SSE] Notification ${createNotificationId} diffusée à ${createNotifSentCount} connexions`);

        return NextResponse.json({
          success: true,
          notificationId: createNotificationId,
          message: 'Notification créée et diffusée',
          sentToConnections: createNotifSentCount,
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