import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let users: any[] = [];
  try {
    users = await prisma.utilisateur.findMany({
      where: { lockedUntil: { gt: new Date() } },
      select: { id: true, email: true, name: true, lockedUntil: true } as any,
    });
  } catch {
    // Fallback if client not regenerated (no lockedUntil in type)
    const all = await prisma.utilisateur.findMany({
      select: { id: true, email: true, name: true } as any,
    });
    users = (all as any[]).filter(
      (u) => (u as any).lockedUntil && new Date((u as any).lockedUntil) > new Date(),
    );
  }
  return NextResponse.json({ users });
}
