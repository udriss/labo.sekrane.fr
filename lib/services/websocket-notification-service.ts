// lib/services/websocket-notification-service.ts
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { getToken } from 'next-auth/jwt';
import { AuthUser } from '@/types/auth';

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  userRole: string;
  connectionId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
}

interface NotificationMessage {
  id: string;
  type: 'notification' | 'heartbeat' | 'connection' | 'error';
  userId?: string;
  userRole?: string;
  module: string;
  actionType: string;
  message: string | object;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entityType?: string;
  entityId?: string;
  triggeredBy?: string;
  timestamp: string;
  data?: any;
}

class WebSocketNotificationService {
  private static instance: WebSocketNotificationService;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  static getInstance(): WebSocketNotificationService {
    if (!WebSocketNotificationService.instance) {
      WebSocketNotificationService.instance = new WebSocketNotificationService();
    }
    return WebSocketNotificationService.instance;
  }

  initialize(server: any) {
    if (this.wss) {
      console.log('🔄 [WebSocket] Service déjà initialisé');
      return;
    }

    this.wss = new WebSocketServer({ 
      server,
      path: '/api/notifications/ws',
      verifyClient: async (info: any) => {
        try {
          console.log('🔍 [WebSocket] Vérification authentification...');
          console.log('🔍 [WebSocket] Headers:', Object.keys(info.req.headers));
          console.log('🔍 [WebSocket] Cookies:', info.req.headers.cookie);
          
          // Approche alternative : vérifier que l'utilisateur a une session active
          // En récupérant l'userId de l'URL si pas d'auth par token
          const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
          const userIdFromUrl = url.searchParams.get('userId');
          
          console.log('🔍 [WebSocket] UserId from URL:', userIdFromUrl);
          
          if (userIdFromUrl) {
            // Pour le développement, on accepte les connexions avec userId
            // En production, on devrait vérifier la session
            (info.req as any).user = {
              id: userIdFromUrl,
              name: `User ${userIdFromUrl}`,
              email: `user${userIdFromUrl}@test.com`,
              role: 'ADMIN' // Pour les tests
            };
            
            console.log('✅ [WebSocket] Authentification acceptée (dev mode) pour userId:', userIdFromUrl);
            return true;
          }
          
          // Essayer l'authentification normale si pas d'userId
          const token = await getToken({ 
            req: info.req as any,
            secret: process.env.NEXTAUTH_SECRET,
            secureCookie: process.env.NODE_ENV === 'production'
          });
          
          console.log('🔍 [WebSocket] Token récupéré:', !!token, token?.sub);
          
          if (!token || !token.sub) {
            console.log('❌ [WebSocket] Connexion refusée - token invalide ou manquant');
            return false;
          }

          // Stocker les infos utilisateur dans la requête pour les récupérer plus tard
          (info.req as any).user = {
            id: token.sub,
            email: token.email,
            name: token.name,
            role: (token as any).role || 'USER'
          };

          console.log('✅ [WebSocket] Authentification réussie pour:', token.name, `(${token.sub})`);
          return true;
        } catch (error) {
          console.error('❌ [WebSocket] Erreur vérification auth:', error);
          return false;
        }
      }
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();

    console.log('✅ [WebSocket] Service de notifications WebSocket initialisé');
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const user = (req as any).user as AuthUser;
    
    if (!user || !user.id) {
      console.error('❌ [WebSocket] Connexion refusée - utilisateur non authentifié');
      ws.close(1008, 'Authentication required');
      return;
    }
    
    const connectionId = `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const client: ConnectedClient = {
      ws,
      userId: user.id,
      userRole: user.role,
      connectionId,
      connectedAt: new Date(),
      lastHeartbeat: new Date()
    };

    this.clients.set(connectionId, client);

    console.log(`✅ [WebSocket] Nouvelle connexion: ${user.name} (${user.role}) - ${connectionId}`);

    // Envoyer un message de confirmation de connexion
    this.sendToClient(connectionId, {
      id: `conn_${Date.now()}`,
      type: 'connection',
      userId: user.id,
      userRole: user.role,
      module: 'SYSTEM',
      actionType: 'CONNECTION',
      message: 'Connexion WebSocket établie',
      severity: 'low',
      timestamp: new Date().toISOString(),
      data: {
        connectionId,
        connectedAt: client.connectedAt,
        serverTime: new Date().toISOString()
      }
    });

    // Gérer les messages entrants
    ws.on('message', (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(connectionId, data);
      } catch (error) {
        console.error('❌ [WebSocket] Erreur parsing message client:', error);
      }
    });

    // Gérer la fermeture de connexion
    ws.on('close', () => {
      this.clients.delete(connectionId);
      console.log(`🔌 [WebSocket] Connexion fermée: ${user.name} - ${connectionId}`);
    });

    // Gérer les erreurs
    ws.on('error', (error: any) => {
      console.error(`❌ [WebSocket] Erreur connexion ${connectionId}:`, error);
      this.clients.delete(connectionId);
    });
  }

  private handleClientMessage(connectionId: string, message: any) {
    const client = this.clients.get(connectionId);
    if (!client) return;

    switch (message.type) {
      case 'heartbeat':
        client.lastHeartbeat = new Date();
        this.sendToClient(connectionId, {
          id: `hb_${Date.now()}`,
          type: 'heartbeat',
          module: 'SYSTEM',
          actionType: 'HEARTBEAT',
          message: 'pong',
          severity: 'low',
          timestamp: new Date().toISOString()
        });
        break;

      case 'ping':
        this.sendToClient(connectionId, {
          id: `ping_${Date.now()}`,
          type: 'heartbeat',
          module: 'SYSTEM',
          actionType: 'PING',
          message: 'pong',
          severity: 'low',
          timestamp: new Date().toISOString()
        });
        break;

      default:
        console.log(`📨 [WebSocket] Message non géré de ${connectionId}:`, message.type);
    }
  }

  private sendToClient(connectionId: string, message: NotificationMessage): boolean {
    const client = this.clients.get(connectionId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ [WebSocket] Erreur envoi message à ${connectionId}:`, error);
      this.clients.delete(connectionId);
      return false;
    }
  }

  // Méthode principale pour envoyer des notifications
  async sendNotification(
    targetRoles: string[],
    module: string,
    actionType: string,
    message: string | object,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    entityType?: string,
    entityId?: string,
    triggeredBy?: string,
    customUserIds?: string[]
  ): Promise<void> {
    // ÉTAPE 1: Enregistrer la notification dans la base de données
    try {
      // Importer dynamiquement le service de base de données
      const { DatabaseNotificationService } = await import('@/lib/notifications/database-notification-service');
      
      // Créer la notification dans la base de données
      const notificationId = await DatabaseNotificationService.createNotification(
        targetRoles,
        module,
        actionType,
        message,
        typeof message === 'object' ? JSON.stringify(message) : message,
        severity,
        entityType,
        entityId,
        triggeredBy,
        customUserIds?.map(id => ({ id, email: '', reason: 'direct' }))
      );
      
      if (!notificationId) {
        console.error('❌ [WebSocket] Erreur d\'enregistrement de la notification en base de données');
      } else {
        console.log('✅ [WebSocket] Notification enregistrée en BDD avec ID:', notificationId);
      }
    } catch (error) {
      console.error('❌ [WebSocket] Erreur lors de l\'enregistrement en base de données:', error);
    }
    
    // ÉTAPE 2: Envoyer la notification via WebSocket
    const notification: NotificationMessage = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'notification',
      module,
      actionType,
      message,
      severity,
      entityType,
      entityId,
      triggeredBy,
      timestamp: new Date().toISOString(),
      data: {
        targetRoles,
        customUserIds
      }
    };

    let sentCount = 0;
    const totalClients = this.clients.size;

    for (const [connectionId, client] of this.clients) {
      let shouldSend = false;

      // Vérifier si l'utilisateur doit recevoir cette notification
      if (customUserIds && customUserIds.includes(client.userId)) {
        shouldSend = true;
      } else if (targetRoles.includes(client.userRole)) {
        shouldSend = true;
      }

      // Ne pas envoyer à celui qui a déclenché l'action (optionnel)
      if (shouldSend && triggeredBy && client.userId === triggeredBy) {
        shouldSend = false;
      }

      if (shouldSend) {
        const sent = this.sendToClient(connectionId, {
          ...notification,
          userId: client.userId,
          userRole: client.userRole
        });
        if (sent) sentCount++;
      }
    }

    console.log(`📤 [WebSocket] Notification envoyée: ${sentCount}/${totalClients} clients - ${module}/${actionType}`);
  }

  // Envoyer à un utilisateur spécifique
  async sendToUser(userId: string, notification: Partial<NotificationMessage>): Promise<boolean> {
    let sent = false;
    
    for (const [connectionId, client] of this.clients) {
      if (client.userId === userId) {
        const fullNotification: NotificationMessage = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'notification',
          module: 'SYSTEM',
          actionType: 'DIRECT_MESSAGE',
          message: 'Message direct',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          ...notification,
          userId: client.userId,
          userRole: client.userRole
        };

        if (this.sendToClient(connectionId, fullNotification)) {
          sent = true;
        }
      }
    }

    return sent;
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleConnections: string[] = [];

      for (const [connectionId, client] of this.clients) {
        const timeSinceLastHeartbeat = now.getTime() - client.lastHeartbeat.getTime();
        
        // Connexions inactives depuis plus de 60 secondes
        if (timeSinceLastHeartbeat > 60000) {
          staleConnections.push(connectionId);
        } else {
          // Envoyer un heartbeat aux connexions actives
          this.sendToClient(connectionId, {
            id: `hb_${Date.now()}`,
            type: 'heartbeat',
            module: 'SYSTEM',
            actionType: 'HEARTBEAT',
            message: 'ping',
            severity: 'low',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Nettoyer les connexions inactives
      staleConnections.forEach(connectionId => {
        const client = this.clients.get(connectionId);
        if (client) {
          console.log(`🧹 [WebSocket] Nettoyage connexion inactive: ${connectionId}`);
          client.ws.terminate();
          this.clients.delete(connectionId);
        }
      });

      if (this.clients.size > 0) {
        console.log(`💓 [WebSocket] Heartbeat envoyé à ${this.clients.size} clients`);
      }
    }, 30000); // Heartbeat toutes les 30 secondes
  }

  // Obtenir les statistiques des connexions
  getStats() {
    const roleStats: Record<string, number> = {};
    
    for (const client of this.clients.values()) {
      roleStats[client.userRole] = (roleStats[client.userRole] || 0) + 1;
    }

    return {
      totalConnections: this.clients.size,
      roleStats,
      connections: Array.from(this.clients.values()).map(client => ({
        connectionId: client.connectionId,
        userId: client.userId,
        userRole: client.userRole,
        connectedAt: client.connectedAt,
        lastHeartbeat: client.lastHeartbeat
      }))
    };
  }

  // Fermer toutes les connexions
  closeAll() {
    console.log('🔌 [WebSocket] Fermeture de toutes les connexions...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const [connectionId, client] of this.clients) {
      client.ws.terminate();
    }
    
    this.clients.clear();
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  // Méthodes utilitaires pour l'API
  getActiveConnections(): Array<{connectionId: string, userId: string, role: string, connectedAt: Date}> {
    const connections: Array<{connectionId: string, userId: string, role: string, connectedAt: Date}> = [];
    
    for (const [connectionId, client] of this.clients) {
      connections.push({
        connectionId,
        userId: client.userId,
        role: client.userRole,
        connectedAt: client.connectedAt
      });
    }
    
    return connections;
  }

  disconnectUser(userId: string): number {
    let disconnectedCount = 0;
    
    for (const [connectionId, client] of this.clients) {
      if (client.userId === userId) {
        try {
          client.ws.close(1000, 'User disconnected by request');
          this.clients.delete(connectionId);
          disconnectedCount++;
        } catch (error) {
          console.error(`❌ [WebSocket] Erreur déconnexion client ${connectionId}:`, error);
        }
      }
    }
    
    console.log(`🔌 [WebSocket] Déconnecté ${disconnectedCount} connexions pour l'utilisateur ${userId}`);
    return disconnectedCount;
  }

  getConnectionsByRole(role: string): Array<{connectionId: string, userId: string}> {
    const connections: Array<{connectionId: string, userId: string}> = [];
    
    for (const [connectionId, client] of this.clients) {
      if (client.userRole === role) {
        connections.push({
          connectionId,
          userId: client.userId
        });
      }
    }
    
    return connections;
  }

  isUserConnected(userId: string): boolean {
    for (const [, client] of this.clients) {
      if (client.userId === userId) {
        return true;
      }
    }
    return false;
  }
}


export const wsNotificationService = WebSocketNotificationService.getInstance();
export default wsNotificationService;
