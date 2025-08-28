import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';
import { Role } from '@prisma/client';

function isAdmin(role: string | undefined) {
  return role === Role.ADMIN;
}

// GET /api/admin/notification-configs
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  if (!isAdmin((session.user as any).role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const configs = await prisma.notificationConfig.findMany({
    orderBy: [{ module: 'asc' }, { actionType: 'asc' }],
  });
  return NextResponse.json({ configs });
}

// PUT /api/admin/notification-configs { configs: [{id, enabled?, name?, description?, severity?}] }
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  if (!isAdmin((session.user as any).role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await req.json();
    const configs = Array.isArray(body?.configs) ? body.configs : [];
    if (!configs.length) return NextResponse.json({ updated: 0 });
    const updates = configs.map((c: any) =>
      prisma.notificationConfig.update({
        where: { id: c.id },
        data: {
          ...(typeof c.enabled === 'boolean' ? { enabled: c.enabled } : {}),
          ...(c.name ? { name: c.name } : {}),
          ...(c.description !== undefined ? { description: c.description } : {}),
          ...(c.severity ? { severity: c.severity } : {}),
        },
      }),
    );
    const results = await prisma.$transaction(updates).catch(() => []);
    return NextResponse.json({ updated: results.length });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
