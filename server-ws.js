// server-ws.js
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Importer le service WebSocket de manière dynamique pour éviter les problèmes ES modules
  const { wsNotificationService } = await import('./lib/services/websocket-notification-service.ts');

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

  // Initialiser le service WebSocket
  wsNotificationService.initialize(server);

  server.listen(port, () => {
    console.log(`✅ Server ready on http://${hostname}:${port}`);
    console.log(`🔔 WebSocket notifications enabled`);
  });

  // Gestion propre de l'arrêt
  process.on('SIGTERM', () => {
    console.log('🔌 SIGTERM received, closing WebSocket connections...');
    wsNotificationService.closeAll();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('🔌 SIGINT received, closing WebSocket connections...');
    wsNotificationService.closeAll();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});
