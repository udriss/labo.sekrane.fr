import { NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const tokens = await prisma.activationToken.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ tokens });
}
