import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const pageSize = Math.min(200, Math.max(10, Number(searchParams.get('pageSize') || '50')));
  const kind = searchParams.get('kind') || undefined;
  const successParam = searchParams.get('success');
  const success = successParam === undefined ? undefined : successParam === 'true';
  const email = searchParams.get('email') || undefined;
  const days = Math.min(30, Math.max(1, Number(searchParams.get('days') || '7')));
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const where: any = { createdAt: { gte: since } };
  if (kind) where.kind = kind;
  if (success !== undefined) where.success = success;
  if (email) where.email = email;
  const skip = (page - 1) * pageSize;
  const [total, entries] = await Promise.all([
    prisma.authLog.count({ where }),
    prisma.authLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
  ]);
  const unlocks = entries.filter((e) => e.kind === 'UNLOCK');
  return NextResponse.json({
    entries,
    unlocks,
    page,
    pageSize,
    total,
    pages: Math.ceil(total / pageSize),
  });
}
