import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notification-service';

// POST /api/notifications/read { notificationId }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  try {
    const { notificationId } = await req.json();
    if (!notificationId)
      return NextResponse.json({ error: 'notificationId requis' }, { status: 400 });
    await notificationService.markRead(Number(session.user.id), Number(notificationId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/notifications/read/all  (mark all read)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  try {
    await notificationService.markAllRead(Number(session.user.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
