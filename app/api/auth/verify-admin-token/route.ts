import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { isExpired } from '@/lib/utils/datetime';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Token requis' }, { status: 400 });

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        isActive: true,
        usedAt: null
      }
    });

    if (!resetToken || isExpired(resetToken.expiresAt)) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 400 });
    }

    // Ne pas marquer le token comme utilisé ici, 
    // cela sera fait dans reset-password pour éviter le double usage
    
    return NextResponse.json({
      valid: true,
      email: resetToken.email,
      tokenId: resetToken.id // Passer l'ID pour validation ultérieure
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Erreur de vérification', message: e.message }, { status: 500 });
  }
}
