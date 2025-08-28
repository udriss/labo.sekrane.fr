import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import bcrypt from 'bcryptjs';
import { notificationService } from '@/lib/services/notification-service';
import { loadAppSettings } from '@/lib/services/app-settings';

// Step 1 (not implemented here): separate route to request a token emailed to user.
// This route handles POST with { token, email, newPassword }
export async function POST(req: NextRequest) {
  try {
    const { token, email, newPassword, method } = await req.json();
    if (!token || !email || !newPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const now = new Date();
    
    // Pour les tokens admin, on accepte les tokens déjà vérifiés récemment
    // Pour les tokens OTP email, on garde la logique habituelle
    const isAdminToken = method === 'admin-token';
    
    let whereClause;
    if (isAdminToken) {
      // Token admin : accepter non utilisé OU utilisé dans les 10 dernières minutes
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      whereClause = {
        email,
        token,
        expiresAt: { gt: now },
        isOTP: false,
        OR: [
          { usedAt: null }, // Pas encore utilisé
          { 
            usedAt: { gt: tenMinutesAgo }, // Utilisé récemment (vérification admin)
            isActive: true 
          }
        ]
      };
    } else {
      // Token OTP email : logique habituelle
      whereClause = {
        email,
        token,
        expiresAt: { gt: now },
        usedAt: null,
        OR: [{ AND: [{ isOTP: true }, { isActive: true }] }, { isOTP: false }],
      };
    }
    
    const prt = await prisma.passwordResetToken.findFirst({ where: whereClause });
    if (!prt) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }
    const user = await prisma.utilisateur.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.utilisateur.update({ 
        where: { id: user.id }, 
        data: { 
          password: hashed,
          isActive: true  // Activer le compte lors de la réinitialisation du mot de passe
        } 
      }),
      prisma.passwordResetToken.update({
        where: { id: prt.id },
        data: { usedAt: now, isActive: false },
      }),
      // @ts-ignore
      prisma.authLog.create({ data: { email, userId: user.id, success: true, kind: 'RESET' } }),
    ]);
    // Targeted account notification to the user if enabled
    try {
      const settings = await loadAppSettings();
      if (settings.accountNotifications?.passwordResetCompleted) {
        await notificationService.createAndDispatch({
          module: 'ACCOUNT',
          actionType: 'PASSWORD_RESET_COMPLETED',
          severity: 'medium',
          message: 'Votre mot de passe a été réinitialisé avec succès.',
          data: { userId: user.id, email },
          targetUserIds: [user.id],
        });
      }
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Reset failed', message: e.message }, { status: 500 });
  }
}
