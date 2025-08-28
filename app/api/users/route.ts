import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/auth';

const toLocalLiteral = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const toLocal = (dt: Date) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  if (typeof d === 'string') {
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(d)) return d.replace(/\.\d{3}$/, '');
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? d : toLocal(parsed);
  }
  return toLocal(d);
};

const createSchema = z.object({
  email: z.email(),
  name: z.string().optional().default(''),
  role: z
    .enum(['ADMIN', 'ADMINLABO', 'ENSEIGNANT', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE', 'ELEVE'])
    .default('ELEVE'),
  password: z.string().min(0).optional(),
});
const updateSchema = z.object({
  id: z.number().int(),
  name: z.string().optional(),
  role: z
    .enum(['ADMIN', 'ADMINLABO', 'ENSEIGNANT', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE', 'ELEVE'])
    .optional(),
});

export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== 'ADMIN' && role !== 'ADMINLABO'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const users = await prisma.utilisateur.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      password: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const mapped = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    hasPassword: !!u.password,
    createdAt: toLocalLiteral(u.createdAt),
    updatedAt: toLocalLiteral(u.updatedAt),
  }));
  return NextResponse.json({ users: mapped });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== 'ADMIN' && role !== 'ADMINLABO'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const raw = await req.json();
  const data = createSchema.parse(raw);
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
  const created = await prisma.utilisateur.create({
    data: {
      email: data.email,
      name: data.name || null,
      role: data.role,
      password: passwordHash,
      // Politique: toujours inactif à l\'ajout, même si un mot de passe est défini
      isActive: false,
    },
  });
  return NextResponse.json(
    {
      user: {
        ...created,
        createdAt: toLocalLiteral((created as any).createdAt),
        updatedAt: toLocalLiteral((created as any).updatedAt),
      },
    },
    { status: 201 },
  );
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== 'ADMIN' && role !== 'ADMINLABO'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const data = updateSchema.parse(await req.json());
  const updated = await prisma.utilisateur.update({
    where: { id: data.id },
    data: { name: data.name, role: data.role },
  });

  // Try to notify the affected user via WS server to refresh their session/role live
  try {
    const base = process.env.INTERNAL_WS_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
    const url = base
      ? `${base.replace(/\/$/, '')}/internal/notify-users`
      : `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${process.env.PORT || process.env.WS_PORT}/internal/notify-users`;
    const notification = {
      id: Date.now(),
      module: 'ACCOUNT',
      actionType: 'ROLE_CHANGED',
      severity: 'low',
      title: 'Rôle mis à jour',
      message: `Votre rôle a été mis à jour: ${updated.role}`,
      data: { userId: updated.id, newRole: updated.role },
      createdAt: new Date().toISOString(),
    };
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification, recipientIds: [updated.id] }),
    }).catch(() => {});
  } catch {}
  return NextResponse.json({
    ok: true,
    user: {
      ...updated,
      createdAt: toLocalLiteral((updated as any).createdAt),
      updatedAt: toLocalLiteral((updated as any).updatedAt),
    },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== 'ADMIN' && role !== 'ADMINLABO'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  // Protection: ne jamais supprimer le compte ID=1
  if (id === 1) {
    return NextResponse.json({ error: 'Protected account cannot be deleted' }, { status: 403 });
  }
  // Récupérer l'email pour désactiver d'éventuels jetons d'activation actifs
  const user = await prisma.utilisateur.findUnique({ where: { id }, select: { email: true } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const now = new Date();
  await prisma.$transaction([
    // Désactiver (marquer comme utilisés) les jetons d'activation encore valides pour cet utilisateur
    prisma.activationToken.updateMany({
      where: { email: user.email, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    }),
    // Supprimer l'utilisateur
    prisma.utilisateur.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
