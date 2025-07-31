// app/api/notifications/ws/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { wsNotificationService } from '@/lib/services/websocket-notification-service';

export async function GET(request: NextRequest) {
  try {
    // Extraire userId des query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    // Vérifier si c'est une requête de WebSocket upgrade
    const upgrade = request.headers.get('upgrade');
    const connection = request.headers.get('connection');

    if (upgrade !== 'websocket' || !connection?.toLowerCase().includes('upgrade')) {
      return NextResponse.json(
        { 
          error: 'This endpoint requires WebSocket upgrade',
          info: 'Use WebSocket client to connect to this endpoint',
          usage: 'ws://localhost:3000/api/notifications/ws?userId=' + userId
        },
        { status: 426 } // Upgrade Required
      );
    }

    // Le serveur WebSocket gère déjà les connexions via server-ws.js
    // Cette route sert principalement à valider les paramètres et fournir des infos
    return NextResponse.json(
      {
        message: 'WebSocket endpoint is available',
        websocketUrl: `ws://localhost:3000/ws?userId=${userId}`,
        info: 'Connect using WebSocket client'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ [WebSocket API] Erreur:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, data } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'connect':
        // Informations sur la connexion WebSocket
        return NextResponse.json({
          message: 'WebSocket connection info',
          websocketUrl: `ws://localhost:3000/ws?userId=${userId}`,
          activeConnections: wsNotificationService.getActiveConnections().length,
          status: 'ready'
        });

      case 'status':
        // Statut des connexions pour cet utilisateur
        const userConnections = wsNotificationService.getActiveConnections()
          .filter((conn: any) => conn.userId === userId);
        
        return NextResponse.json({
          userId,
          connected: userConnections.length > 0,
          connectionCount: userConnections.length,
          totalConnections: wsNotificationService.getActiveConnections().length
        });

      case 'disconnect':
        // Déconnecter toutes les connexions de cet utilisateur
        wsNotificationService.disconnectUser(userId);
        return NextResponse.json({
          message: `Disconnected all connections for user ${userId}`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: connect, status, disconnect' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ [WebSocket API POST] Erreur:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
