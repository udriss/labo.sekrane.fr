import * as http from 'http';
import * as url from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

// Chargement explicite des variables d'environnement
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger le fichier d'environnement spécifique selon NODE_ENV d'abord
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';
const envPath = path.resolve(process.cwd(), envFile);

console.log(`[env] Loading environment: ${nodeEnv}`);
console.log(`[env] Loading file: ${envPath}`);

dotenv.config({ path: envPath });

// Charger le fichier .env de base (pour les valeurs par défaut)
dotenv.config();

// Maintenant on peut récupérer le port correctement
const PORT = Number(process.env.PORT || process.env.WS_PORT);
console.log(`[server] Starting on port ${PORT}...`);

// Utilisation d'un chemin hors /api pour éviter toute interférence avec le routeur Next
const WS_PATH = '/ws';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Track connections by userId -> Set of client ids
interface TrackedClient {
  id: string;
  userId: string;
  ws: WebSocket;
  heartbeat: NodeJS.Timeout;
}
const clients = new Map<string, TrackedClient>(); // key = client id

// Helper functions for client management
function getActiveConnections() {
  return Array.from(clients.values());
}

function broadcastToAll(message: any) {
  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (error) {
        console.error(`[ws] Error sending to client ${client.id}:`, error);
      }
    }
  });
}

function notifyUser(userId: string, message: any) {
  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (error) {
        console.error(`[ws] Error sending to user ${userId}:`, error);
      }
    }
  });
}

function notifyUsers(userIds: number[], message: any) {
  const payload = JSON.stringify(message);
  const targetUserIds = userIds.map((id) => String(id));

  clients.forEach((client) => {
    if (targetUserIds.includes(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (error) {
        console.error(`[ws] Error sending to user ${client.userId}:`, error);
      }
    }
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url || '', true);

    // Handle notification broadcast endpoint (legacy)
    if (req.method === 'POST' && parsedUrl.pathname === '/internal/notify') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const notification = {
            type: data.type || 'info',
            title: data.title || 'Notification',
            message: data.message || '',
            module: data.module || 'system',
            data: data.data || {},
            ts: Date.now(),
          };

          if (data.userId) {
            notifyUser(String(data.userId), notification);
          } else {
            broadcastToAll(notification);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              activeConnections: getActiveConnections().length,
              sentNotification: notification,
            }),
          );
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // Handle targeted notification broadcast (new endpoint for notificationService)
    if (req.method === 'POST' && parsedUrl.pathname === '/internal/notify-users') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const { notification, recipientIds } = data;

          console.log('[ws][notify-users]', {
            notificationId: notification.id,
            module: notification.module,
            actionType: notification.actionType,
            recipientIds,
            connectedTargets: getActiveConnections()
              .filter((c) => recipientIds.includes(Number(c.userId)))
              .map((c) => c.userId),
          });

          // Send notification to specified users
          notifyUsers(recipientIds, { type: 'notification', notification });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              activeConnections: getActiveConnections().length,
              recipientIds,
              connectedTargets: getActiveConnections()
                .filter((c) => recipientIds.includes(Number(c.userId)))
                .map((c) => c.userId),
            }),
          );
        } catch (error) {
          console.error('[ws][notify-users] Error:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // Expose current online users (for presence UI)
    if (req.method === 'GET' && parsedUrl.pathname === '/internal/online') {
      const ids = Array.from(
        new Set(
          getActiveConnections()
            .map((c) => Number(c.userId))
            .filter((n) => !Number.isNaN(n)),
        ),
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          userIds: ids,
          activeConnections: getActiveConnections().length,
        }),
      );
      return;
    }

    await handle(req, res, parsedUrl as any);
  } catch (err) {
    console.error('[server] handler error', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Attach WebSocketServer directly to HTTP server (simpler, avoids manual upgrade mishaps)
const wss = new WebSocketServer({ server, path: WS_PATH, perMessageDeflate: false });
console.log(`[ws] WebSocketServer created on path ${WS_PATH}`);

// Log d'upgrade bas niveau pour diagnostiquer les fermetures 1006
server.on('upgrade', (req) => {
  try {
    const url = req.url || '';
    if (url.startsWith(WS_PATH)) {
      console.log('[ws][upgrade] Requête upgrade reçue', {
        url,
        connection: req.headers.connection,
        'sec-ws-version': req.headers['sec-websocket-version'],
        'sec-ws-key': (req.headers['sec-websocket-key'] || '').toString().slice(0, 6) + '…',
        ua: req.headers['user-agent'],
      });
    }
  } catch {}
});

wss.on('connection', (ws, req) => {
  try {
    const fullUrl = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = String(fullUrl.searchParams.get('userId') || 'anonymous');
    const id = randomUUID();

    const heartbeat = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.ping();
      } catch (e) {
        console.log('[ws] ping error', e);
      }
    }, 30000);

    clients.set(id, { id, userId, ws, heartbeat });

    try {
      ws.send(JSON.stringify({ type: 'connected', id, userId, ts: Date.now() }));
    } catch {}

    // Broadcast presence online to all clients
    try {
      broadcastToAll({ type: 'presence', status: 'online', userId });
    } catch {}

    console.log(`[ws] connected ${id} (user ${userId}). Active: ${getActiveConnections().length}`);

    ws.on('pong', () => {
      /* passive heartbeat handling */
    });

    ws.on('message', (raw) => {
      try {
        const dataStr = typeof raw === 'string' ? raw : raw.toString();
        if (dataStr === 'ping') {
          try {
            ws.send('pong');
          } catch {}
          return;
        }
        const parsed = dataStr ? JSON.parse(dataStr) : {};
        if (parsed?.type === 'broadcast' && parsed?.data) {
          broadcastToAll({ type: 'broadcast', from: id, data: parsed.data });
        } else if (parsed?.type === 'notify' && parsed?.to && parsed?.data) {
          notifyUser(String(parsed.to), {
            type: 'notify',
            from: id,
            data: parsed.data,
          });
        }
      } catch (e) {
        // ignore malformed
      }
    });

    // Events bas-niveau sur le socket TCP
    // @ts-ignore
    const netSocket = ws._socket;
    if (netSocket) {
      netSocket.on('end', () => console.log(`[ws][net] end id=${id}`));
      netSocket.on('timeout', () => console.log(`[ws][net] timeout id=${id}`));
      netSocket.on('error', (err: any) => console.log(`[ws][net] error id=${id}`, err?.message));
      netSocket.on('close', (hadErr: boolean) =>
        console.log(`[ws][net] close id=${id} hadError=${hadErr}`),
      );
    }

    ws.on('close', (code, reason) => {
      clearInterval(heartbeat);
      clients.delete(id);
      console.log(
        `[ws] closed ${id} (user ${userId}) code=${code} reason=${reason?.toString()} manual=${!!reason} Active: ${getActiveConnections().length}`,
      );

      // Broadcast presence offline to all clients
      try {
        broadcastToAll({ type: 'presence', status: 'offline', userId });
      } catch {}

      // Debug pour comprendre les fermetures 1006
      if (code === 1006) {
        console.log(
          `[ws] DEBUG 1006 closure for ${id}: was socket open when closed?`,
          ws.readyState,
        );
      }
    });

    ws.on('error', (err) => {
      console.error(`[ws] error for ${id}:`, err);
      try {
        ws.close();
      } catch (closeError) {
        console.error(`[ws] error closing WS:`, closeError);
      }
    });
  } catch (err) {
    console.error('[ws] connection handler error', err);
    try {
      ws.close();
    } catch {}
  }
});

app.prepare().then(() => {
  server.listen(PORT, () => {
    console.log(`[server] ready on http://localhost:${PORT}`);
    console.log(`[ws] listening on ws://localhost:${PORT}${WS_PATH}`);
  });
});

function shutdown(signal: string) {
  console.log(`\n[server] ${signal} received, shutting down...`);
  try {
    clients.forEach((c) => {
      try {
        c.ws.terminate();
      } catch {}
      clearInterval(c.heartbeat);
    });
    clients.clear();
  } catch {}
  server.close(() => {
    console.log('[server] HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
// NOTE: This file now serves as the single combined Next + WS server.
