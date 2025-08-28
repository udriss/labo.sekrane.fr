import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';
import { Role } from '@prisma/client';

function isAdmin(role: string | undefined) {
  return role === Role.ADMIN;
}

// GET /api/admin/notification-preferences
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  if (!isAdmin((session.user as any).role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  let preferences = await prisma.notificationPreference.findMany({
    orderBy: [{ role: 'asc' }, { module: 'asc' }, { actionType: 'asc' }],
  });
  return NextResponse.json({ preferences, autoSeeded: false });
}

// PUT /api/admin/notification-preferences { preferences: [{id, enabled}] }
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  if (!isAdmin((session.user as any).role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await req.json();
    const preferences = Array.isArray(body?.preferences) ? body.preferences : [];
    if (!preferences.length) return NextResponse.json({ updated: 0 });
    const updates = preferences.map((p: any) =>
      prisma.notificationPreference.update({
        where: { id: p.id },
        data: { ...(typeof p.enabled === 'boolean' ? { enabled: p.enabled } : {}) },
      }),
    );
    const results = await prisma.$transaction(updates).catch(() => []);
    return NextResponse.json({ updated: results.length });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/notification-preferences -> reset (reseed) preferences according to current configs
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  if (!isAdmin((session.user as any).role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // Strategy: For each config ensure a preference row per role; do not delete existing but update enabled matrix baseline
  const roles = Object.values(Role);
  const configs = await prisma.notificationConfig.findMany();
  let created = 0;
  for (const cfg of configs) {
    for (const role of roles) {
      const roleStr = String(role);
      const exists = await prisma.notificationPreference.findUnique({
        where: { role_module_actionType: { role, module: cfg.module, actionType: cfg.actionType } },
      });
      if (!exists) {
        let enabled = false;
        if (roleStr === 'ADMIN') enabled = true;
        else if (roleStr === 'LABORANTIN_CHIMIE' || roleStr === 'LABORANTIN_PHYSIQUE')
          enabled = cfg.module !== 'USER';
        else if (roleStr === 'ENSEIGNANT')
          enabled = ['MATERIEL', 'REACTIF', 'CHEMICALS'].includes(cfg.module);
        else if (roleStr === 'ELEVE') enabled = cfg.module === 'SYSTEM';
        await prisma.notificationPreference.create({
          data: { role: role as any, module: cfg.module, actionType: cfg.actionType, enabled },
        });
        created++;
      }
    }
  }
  return NextResponse.json({ created });
}
