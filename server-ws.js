// server-ws.js
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 8006;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store WebSocket connections
const wsConnections = new Map();
const notificationQueue = [];
let isProcessing = false;

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server: server,
    path: '/api/notifications/ws'
  });

  console.log('🔌 WebSocket server created on path: /api/notifications/ws');

  // WebSocket connection handling
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId') || uuidv4();
    
    console.log(`[WebSocket] New connection: ${userId}`);
    
    // Store connection with user info
    wsConnections.set(userId, {
      socket: ws,
      userId: userId,
      connectedAt: new Date()
    });

    console.log(`[WebSocket] Total connections: ${wsConnections.size}`);
    
    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'connected',
      userId,
      message: 'Connected to WebSocket',
      timestamp: new Date().toISOString()
    }));
    
    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      } else {
        clearInterval(heartbeatInterval);
        wsConnections.delete(userId);
      }
    }, 30000);
    
    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[WebSocket] Message from ${userId}:`, message);
        
        switch (message.type) {
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
          default:
            console.log(`[WebSocket] Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    });
    
    // Handle connection close
    ws.on('close', (code, reason) => {
      console.log(`[WebSocket] Connection closed: ${userId}, code: ${code}, reason: ${reason}`);
      clearInterval(heartbeatInterval);
      wsConnections.delete(userId);
      console.log(`[WebSocket] Total connections: ${wsConnections.size}`);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for user ${userId}:`, error);
      clearInterval(heartbeatInterval);
      wsConnections.delete(userId);
    });
  });

  // Fonction pour envoyer une notification via WebSocket
  function sendNotificationViaWebSocket(targetUserId, notification) {
    const connection = wsConnections.get(targetUserId);
    if (connection && connection.socket.readyState === connection.socket.OPEN) {
      connection.socket.send(JSON.stringify({
        type: 'notification',
        ...notification
      }));
      console.log(`[WebSocket] Notification sent to user ${targetUserId}`);
      return true;
    } else {
      console.log(`[WebSocket] User ${targetUserId} not connected`);
      return false;
    }
  }

  // Fonction pour diffuser à tous les utilisateurs connectés
  function broadcastNotification(notification) {
    let sentCount = 0;
    wsConnections.forEach((connection, userId) => {
      if (connection.socket.readyState === connection.socket.OPEN) {
        connection.socket.send(JSON.stringify({
          type: 'notification',
          ...notification
        }));
        sentCount++;
      }
    });
    console.log(`[WebSocket] Notification broadcasted to ${sentCount} users`);
    return sentCount;
  }

  // Importer le service WebSocket de manière dynamique pour éviter les problèmes ES modules
  try {
    const { default: wsNotificationService } = await import('./lib/services/websocket-notification-service.js');
    // Initialiser le service WebSocket avec les fonctions de notre serveur
    wsNotificationService.setWebSocketFunctions({
      sendNotificationViaWebSocket,
      broadcastNotification,
      getConnectedUsers: () => Array.from(wsConnections.keys()),
      getConnectionCount: () => wsConnections.size
    });
    console.log('✅ WebSocket notification service initialized');
  } catch (error) {
    console.warn('⚠️ WebSocket notification service not available:', error.message);
  }

  server.listen(port, () => {
    console.log(`✅ Server ready on http://${hostname}:${port}`);
    console.log(`🔔 WebSocket notifications enabled on path: /api/notifications/ws`);
    console.log(`🌐 Environment: ${dev ? 'development' : 'production'}`);
  });

  // Gestion propre de l'arrêt
  process.on('SIGTERM', () => {
    console.log('🔌 SIGTERM received, closing WebSocket connections...');
    wsConnections.forEach((connection, userId) => {
      if (connection.socket.readyState === connection.socket.OPEN) {
        connection.socket.close();
      }
    });
    wsConnections.clear();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('🔌 SIGINT received, closing WebSocket connections...');
    wsConnections.forEach((connection, userId) => {
      if (connection.socket.readyState === connection.socket.OPEN) {
        connection.socket.close();
      }
    });
    wsConnections.clear();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});
