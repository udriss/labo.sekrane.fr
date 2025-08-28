import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';
import bcrypt from 'bcryptjs';
import { logAuthEvent } from '@/lib/services/authLog';
import { notificationService } from '@/lib/services/notification-service';
import { loadAppSettings } from '@/lib/services/app-settings';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { currentPassword, newPassword } = await req.json();
  if (typeof newPassword !== 'string' || newPassword.length < 5) {
    return NextResponse.json({ error: 'Mot de passe trop court' }, { status: 400 });
  }
  const user = await prisma.utilisateur.findUnique({ where: { id: Number(session.user.id) } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!user.password) {
    return NextResponse.json(
      { error: 'Password change not allowed for this account' },
      { status: 400 },
    );
  }
  const ok = await bcrypt.compare(currentPassword || '', user.password);
  if (!ok) return NextResponse.json({ error: 'Mot de passe actuel invalide' }, { status: 403 });
  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.utilisateur.update({ where: { id: user.id }, data: { password: newHash } });
  await logAuthEvent(user.id, 'PWD_CHANGE', {});
  // Notify the user about password change (only the owner) if enabled
  try {
    const settings = await loadAppSettings();
    if (settings.accountNotifications?.passwordChanged) {
      await notificationService.createAndDispatch({
        module: 'ACCOUNT',
        actionType: 'PASSWORD_CHANGED',
        severity: 'medium',
        message: 'Votre mot de passe a été modifié avec succès.',
        data: { userId: user.id },
        targetUserIds: [user.id],
      });
    }
  } catch {}
  return NextResponse.json({ ok: true });
}
