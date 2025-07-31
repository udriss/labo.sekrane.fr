// server.js - Simple Express server with SSE support for Next.js
const express = require('express');
const next = require('next');
const { v4: uuidv4 } = require('uuid');

// Environment configuration
const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev });
const handle = app.getRequestHandler();

// Global variables for SSE management
const sseConnections = new Map();
const notificationQueue = [];
let isProcessing = false;

// Prepare Next.js
app.prepare().then(() => {
  const server = express();

  // Middleware - IMPORTANT: Apply only to specific routes
  const sseRouter = express.Router();
  sseRouter.use(express.json());

  // SSE endpoint for notifications
  sseRouter.get('/events', (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Get user ID from query or generate one
    const userId = req.query.userId || uuidv4();
    
    console.log(`[SSE] New connection: ${userId}`);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      userId, 
      message: 'Connected to SSE' 
    })}\n\n`);
    
    // Store connection
    sseConnections.set(userId, res);
    
    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({ 
          type: 'heartbeat', 
          time: new Date().toISOString() 
        })}\n\n`);
      } catch (error) {
        clearInterval(heartbeatInterval);
        sseConnections.delete(userId);
      }
    }, 30000);
    
    // Clean up on disconnect
    req.on('close', () => {
      console.log(`[SSE] Connection closed: ${userId}`);
      clearInterval(heartbeatInterval);
      sseConnections.delete(userId);
    });
  });

  // API endpoint to send notifications
  sseRouter.post('/notify', (req, res) => {
    const { message, targetUserId } = req.body;
    
    // Create notification with unique ID
    const notification = {
      id: uuidv4(),
      type: 'notification',
      message,
      timestamp: new Date().toISOString()
    };
    
    // Add to queue
    notificationQueue.push({
      notification,
      targetUserId,
      status: 'pending'
    });
    
    // Process queue
    processQueue();
    
    res.json({ 
      success: true, 
      notificationId: notification.id,
      queueSize: notificationQueue.length 
    });
  });

  // Process notification queue
  async function processQueue() {
    if (isProcessing || notificationQueue.length === 0) return;
    
    isProcessing = true;
    
    while (notificationQueue.length > 0) {
      const item = notificationQueue.shift();
      
      try {
        // Send to specific user or broadcast to all
        if (item.targetUserId) {
          const connection = sseConnections.get(item.targetUserId);
          if (connection) {
            connection.write(`data: ${JSON.stringify(item.notification)}\n\n`);
            console.log(`[Queue] Sent to user: ${item.targetUserId}`);
          }
        } else {
          // Broadcast to all connections
          let sentCount = 0;
          sseConnections.forEach((connection, userId) => {
            try {
              connection.write(`data: ${JSON.stringify(item.notification)}\n\n`);
              sentCount++;
            } catch (error) {
              // Remove dead connections
              sseConnections.delete(userId);
            }
          });
          console.log(`[Queue] Broadcast to ${sentCount} connections`);
        }
        
        item.status = 'sent';
      } catch (error) {
        console.error('[Queue] Error processing notification:', error);
        item.status = 'failed';
      }
      
      // Small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    isProcessing = false;
  }

  // Status endpoint
  sseRouter.get('/status', (req, res) => {
    res.json({
      connections: sseConnections.size,
      queueSize: notificationQueue.length,
      isProcessing
    });
  });

  // Mount SSE router under /api/sse
  server.use('/api/sse', sseRouter);

  // IMPORTANT: Let Next.js handle ALL other routes including its own API routes
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> SSE endpoint: http://localhost:${port}/api/sse/events`);
    console.log(`> Notify endpoint: http://localhost:${port}/api/sse/notify`);
    console.log(`> Status endpoint: http://localhost:${port}/api/sse/status`);
  });
});