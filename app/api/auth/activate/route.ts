import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || '';
  if (!token) return NextResponse.json({ ok: false, error: 'Token manquant' }, { status: 400 });
  const now = new Date();
  const row = await prisma.activationToken.findUnique({ where: { token } });
  if (!row || row.usedAt || row.expiresAt < now) {
    return NextResponse.json({ ok: false, error: 'Token invalide ou expiré' }, { status: 400 });
  }
  // Mask email for UI hint and check if account already active
  const [local, domain] = row.email.split('@');
  const masked = `${local.slice(0, 1)}***@${domain}`;
  const user = await prisma.utilisateur.findUnique({ where: { email: row.email } });
  const alreadyActive = !!user?.isActive;
  return NextResponse.json({
    ok: true,
    emailHint: masked,
    expiresAt: row.expiresAt,
    alreadyActive,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 5) {
      return NextResponse.json({ error: 'Mot de passe trop court (min 5)' }, { status: 400 });
    }
    const now = new Date();
    const row = await prisma.activationToken.findUnique({ where: { token } });
    if (!row || row.usedAt || row.expiresAt < now) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 400 });
    }
    const user = await prisma.utilisateur.findUnique({ where: { email: row.email } });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    const hash = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.utilisateur.update({
        where: { id: user.id },
        data: { password: hash, isActive: true },
      }),
      // Mark the used token
      prisma.activationToken.update({ where: { id: row.id }, data: { usedAt: now } }),
      // Sanity check: disable any other valid tokens for the same user
      prisma.activationToken.updateMany({
        where: { email: row.email, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      }),
    ]);
    // Return email so client can sign in automatically
    return NextResponse.json({ ok: true, email: row.email });
  } catch (e: any) {
    return NextResponse.json({ error: 'Echec activation', message: e.message }, { status: 500 });
  }
}
