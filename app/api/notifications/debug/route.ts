// app/api/notifications/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { wsNotificationService } from '@/lib/services/websocket-notification-service';

export async function POST(request: NextRequest) {
  try {
    const { message, targetRoles, severity, module, actionType } = await request.json();

    // API de debug - pas d'authentification requise pour les tests
    console.log('🧪 [Debug API] Envoi notification de test:', { message, targetRoles, severity });

    await wsNotificationService.sendNotification(
      targetRoles || ['ADMIN', 'USER', 'TEACHER', 'ADMINLABO', 'LABORANTIN'],
      module || 'SYSTEM',
      actionType || 'DEBUG_TEST',
      message || 'Test notification debug',
      severity || 'medium',
      undefined, // entityType
      undefined, // entityId
      'debug-api' // triggeredBy
    );

    const stats = wsNotificationService.getStats();

    return NextResponse.json({
      success: true,
      message: 'Notification envoyée',
      sentTo: targetRoles || ['ADMIN', 'USER', 'TEACHER', 'ADMINLABO', 'LABORANTIN'],
      connectedClients: stats.totalConnections,
      clientsByRole: stats.roleStats
    });

  } catch (error) {
    console.error('❌ [Debug API] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = wsNotificationService.getStats();
    
    return NextResponse.json({
      status: 'WebSocket Service Status',
      totalConnections: stats.totalConnections,
      connectionsByRole: stats.roleStats,
      connections: stats.connections.map(conn => ({
        connectionId: conn.connectionId,
        userId: conn.userId,
        role: conn.userRole,
        connectedAt: conn.connectedAt,
        lastHeartbeat: conn.lastHeartbeat
      }))
    });

  } catch (error) {
    console.error('❌ [Debug API] Erreur GET:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
