import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'info', title = 'Test Notification', message, userId } = body;

    // Always use notification service (DB + WS broadcast)
    const result = await notificationService.createAndDispatch({
      module: 'SYSTEM',
      actionType: 'ALERT',
      type,
      severity: type === 'warning' ? 'medium' : 'low',
      title,
      message: message || "Notification de test depuis l'API",
      data: {
        testValue: Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
        source: 'api-test',
      },
      targetUserIds: userId ? [Number(userId)] : undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Notification test envoyée',
      notification: result,
      type: 'database',
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification test:", error);
    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Notification service running',
    note: 'Using unified notificationService.createAndDispatch only',
  });
}
