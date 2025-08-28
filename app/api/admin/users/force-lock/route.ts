import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const userIdStr = searchParams.get('id');
  if (!userIdStr) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const id = Number(userIdStr);
  const durationMinutes = Math.min(1440, Math.max(1, Number(searchParams.get('minutes') || '60')));
  const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
  await prisma.utilisateur.update({ where: { id }, data: { lockedUntil } });
  await prisma.authLog.create({
    data: { email: null, userId: id, success: false, kind: 'LOCKED' },
  });
  return NextResponse.json({ ok: true, lockedUntil });
}
