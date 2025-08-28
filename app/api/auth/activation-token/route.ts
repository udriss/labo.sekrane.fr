import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';

// GET /api/auth/activation-token?email=...
// Returns the freshest (most recent), still-valid activation token for that email.
export async function GET(req: NextRequest) {
  const emailRaw = new URL(req.url).searchParams.get('email');
  if (!emailRaw) return NextResponse.json({ ok: false, error: 'Email requis' }, { status: 400 });
  const email = emailRaw.trim().toLowerCase();
  try {
    const user = await prisma.utilisateur.findUnique({
      where: { email },
      select: { isActive: true },
    });
    if (!user)
      return NextResponse.json({ ok: false, error: 'Utilisateur introuvable' }, { status: 404 });
    if (user.isActive)
      return NextResponse.json({ ok: false, error: 'Déjà actif' }, { status: 400 });

    const now = new Date();
    const tokenRow = await prisma.activationToken.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: { token: true, expiresAt: true, createdAt: true },
    });
    if (!tokenRow)
      return NextResponse.json({ ok: false, error: 'Aucun jeton actif' }, { status: 404 });
    return NextResponse.json({ ok: true, token: tokenRow.token, expiresAt: tokenRow.expiresAt });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
