import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notification-service';

// GET /api/notifications?unread=1&limit=50
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const unreadOnly = sp.get('unread') === '1';
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') || '50', 10)));
  const cursor = sp.get('cursor') ? Number(sp.get('cursor')) : undefined;
  const items = await notificationService.listForUser(Number(session.user.id), {
    unreadOnly,
    limit,
    cursor,
  });
  // For accurate totals in UI, include an approximate total count
  let total: number | undefined = undefined;
  let unreadTotal: number | undefined = undefined;
  try {
    // Count all targets for this user, optionally filtering unread
    // @ts-ignore prisma client available at runtime
    const { prisma } = await import('@/lib/services/db');
    total = await prisma.notificationTarget.count({
      where: { userId: Number(session.user.id), ...(unreadOnly ? { readAt: null } : {}) },
    });
    // Always include unread total independently of unreadOnly filter
    unreadTotal = await prisma.notificationTarget.count({
      where: { userId: Number(session.user.id), readAt: null },
    });
  } catch {}
  return NextResponse.json({
    items,
    ...(typeof total === 'number' ? { total } : {}),
    ...(typeof unreadTotal === 'number' ? { unreadTotal } : {}),
  });
}

// POST /api/notifications { module, actionType, message, title?, severity?, data?, targetUserIds? }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.module || !body.actionType || !body.message) {
      return NextResponse.json({ error: 'module, actionType, message requis' }, { status: 400 });
    }
    const created = await notificationService.createAndDispatch(body);
    if (!created) return NextResponse.json({ skipped: true });
    return NextResponse.json({ notification: created });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
