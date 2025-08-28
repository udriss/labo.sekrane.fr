import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    const now = new Date();
    const row = await prisma.passwordResetToken.findFirst({
      where: {
        email,
        token: code,
        usedAt: null,
        isOTP: true,
        isActive: true,
        expiresAt: { gt: now },
      },
    });
    if (!row) return NextResponse.json({ ok: false, valid: false }, { status: 400 });
    // Do not deactivate here; allow final reset to consume. But we can return ok
    return NextResponse.json({ ok: true, valid: true, expiresAt: row.expiresAt });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Vérification impossible', message: e?.message },
      { status: 500 },
    );
  }
}
