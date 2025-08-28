import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { logAuthEvent } from '../../../../lib/services/authLog';
import { revalidatePath } from 'next/cache';
import { notificationService } from '@/lib/services/notification-service';
import { loadAppSettings } from '@/lib/services/app-settings';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  const record = await prisma.emailChangeRequest.findUnique({ where: { token } });
  if (!record) return NextResponse.json({ error: 'Token invalide' }, { status: 400 });
  if (record.usedAt) return NextResponse.json({ error: 'Token déjà utilisé' }, { status: 400 });
  if (record.expiresAt < new Date())
    return NextResponse.json({ error: 'Token expiré' }, { status: 400 });

  const user = await prisma.utilisateur.findUnique({ where: { id: record.userId } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  if (user.email === record.newEmail) {
    // Already applied (idempotent) -> mark used if not yet
    if (!record.usedAt)
      await prisma.emailChangeRequest.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
    return NextResponse.redirect(new URL('/profil?email-changed=1', req.url));
  }
  const conflict = await prisma.utilisateur.findFirst({ where: { email: record.newEmail } });
  if (conflict) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 });

  await prisma.$transaction([
    prisma.utilisateur.update({ where: { id: user.id }, data: { email: record.newEmail } }),
    prisma.emailChangeRequest.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  await logAuthEvent(user.id, 'EMAIL_CHANGE_VERIFY', {
    oldEmail: record.oldEmail,
    newEmail: record.newEmail,
  });
  // Notify the user that email has been changed if enabled
  try {
    const settings = await loadAppSettings();
    if (settings.accountNotifications?.emailChanged) {
      await notificationService.createAndDispatch({
        module: 'ACCOUNT',
        actionType: 'EMAIL_CHANGED',
        severity: 'medium',
        message: `Votre adresse email a été changée: ${record.oldEmail} → ${record.newEmail}`,
        data: { userId: user.id, oldEmail: record.oldEmail, newEmail: record.newEmail },
        targetUserIds: [user.id],
      });
    }
  } catch {}
  revalidatePath('/profil');
  return NextResponse.redirect(new URL('/profil?email-changed=1', req.url));
}
