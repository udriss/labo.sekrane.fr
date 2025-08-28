import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';

// GET /api/admin/users/lookup?email=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const emailRaw = searchParams.get('email');
  if (!emailRaw) return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  const email = emailRaw.trim().toLowerCase();
  try {
    const user = await prisma.utilisateur.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const lastLogin = await prisma.authLog.findFirst({
      where: {
        OR: [{ userId: user.id }, { email: user.email }],
        success: true,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lockedUntil: user.lockedUntil,
        lastLoginAt: lastLogin?.createdAt ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', detail: e?.message }, { status: 500 });
  }
}
