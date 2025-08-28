import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 200 });
  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) return NextResponse.json({}, { status: 200 });
  const rec = await prisma.emailChangeRequest.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!rec) return NextResponse.json({}, { status: 200 });
  return NextResponse.json({ newEmail: rec.newEmail, expiresAt: rec.expiresAt });
}
