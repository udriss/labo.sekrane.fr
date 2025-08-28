import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';
import { Role } from '@prisma/client';

function isAdmin(role: string | undefined) {
  return role === Role.ADMIN;
}

// GET /api/admin/notifications?limit=50&cursor=123
// Returns raw notifications (system-wide) ordered desc by id with cursor pagination
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  if (!isAdmin((session.user as any).role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') || '50', 10)));
  const cursor = sp.get('cursor') ? Number(sp.get('cursor')) : undefined;
  const items = await prisma.notification.findMany({
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: 'desc' },
  });
  return NextResponse.json({ items });
}
