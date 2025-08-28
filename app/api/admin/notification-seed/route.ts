// api/admin/notification-seed

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';
import { Role } from '@prisma/client';

function isAdmin(role: string | undefined) {
  return role === Role.ADMIN;
}

// POST /api/admin/notification-seed  -> re-génère le catalogue manquant + préférences manquantes
async function runSeed() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  if (!isAdmin((session.user as any).role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const baseline = [
    {
      module: 'MATERIEL',
      actionType: 'CREATE',
      name: 'Création matériel',
      description: 'Un matériel a été ajouté',
    },
    {
      module: 'MATERIEL',
      actionType: 'UPDATE',
      name: 'Modification matériel',
      description: 'Un matériel a été modifié',
    },
    {
      module: 'MATERIEL',
      actionType: 'DELETE',
      name: 'Suppression matériel',
      description: 'Un matériel a été supprimé',
    },
    {
      module: 'CHEMICALS',
      actionType: 'CREATE',
      name: 'Création réactif',
      description: 'Un réactif a été ajouté',
    },
    {
      module: 'CHEMICALS',
      actionType: 'UPDATE',
      name: 'Modification réactif',
      description: 'Un réactif a été modifié',
    },
    {
      module: 'CHEMICALS',
      actionType: 'DELETE',
      name: 'Suppression réactif',
      description: 'Un réactif a été supprimé',
    },
    {
      module: 'SYSTEM',
      actionType: 'ALERT',
      name: 'Alerte système',
      description: 'Notification système importante',
      severity: 'high',
    },
    {
      module: 'USER',
      actionType: 'CREATE',
      name: 'Nouvel utilisateur',
      description: 'Un utilisateur a été ajouté',
    },
  ];

  let createdCfg = 0;
  for (const cfg of baseline) {
    const existing = await prisma.notificationConfig.findUnique({
      where: { module_actionType: { module: cfg.module, actionType: cfg.actionType } },
    });
    if (!existing) {
      await prisma.notificationConfig.create({
        data: {
          module: cfg.module,
          actionType: cfg.actionType,
          name: cfg.name,
          description: cfg.description,
          severity: (cfg as any).severity || 'low',
        },
      });
      createdCfg++;
    }
  }

  const roles = Object.values(Role);
  const configs = await prisma.notificationConfig.findMany();
  let createdPref = 0;
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
          enabled = ['MATERIEL', 'CHEMICALS', 'REACTIF'].includes(cfg.module);
        else if (roleStr === 'ELEVE') enabled = cfg.module === 'SYSTEM';
        await prisma.notificationPreference.create({
          data: { role, module: cfg.module, actionType: cfg.actionType, enabled },
        });
        createdPref++;
      }
    }
  }
  return NextResponse.json({ createdConfigs: createdCfg, createdPreferences: createdPref });
}

export async function POST(req: NextRequest) {
  return runSeed();
}

// GET helper (avoid 405 confusion). Pass ?confirm=1 to execute, else dry run notice.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (sp.get('confirm') === '1') return runSeed();
  return NextResponse.json({
    message: 'Use POST (or GET ?confirm=1) to (re)seed notification configs & preferences.',
  });
}
