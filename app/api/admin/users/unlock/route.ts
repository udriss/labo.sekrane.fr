import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const idStr = searchParams.get('id');
  if (!idStr) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const id = Number(idStr);
  await prisma.utilisateur.update({ where: { id }, data: { lockedUntil: null } });
  await prisma.authLog.create({ data: { email: null, userId: id, success: true, kind: 'UNLOCK' } });
  return NextResponse.json({ ok: true });
}
