import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';
import { randomBytes } from 'crypto';
import { addHours } from 'date-fns';
import { sendEmail } from '@/lib/services/email';
import { logAuthEvent } from '../../../../lib/services/authLog';
import { notificationService } from '@/lib/services/notification-service';
import { loadAppSettings } from '@/lib/services/app-settings';
import { alpha } from '@mui/material';
import { lightModeColors } from '@/lib/theme/colors';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { newEmail } = await req.json();
  if (!newEmail || typeof newEmail !== 'string') {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!EMAIL_REGEX.test(newEmail)) {
    return NextResponse.json({ error: 'Email invalide (format)' }, { status: 400 });
  }
  const user = await prisma.utilisateur.findUnique({ where: { id: Number(session.user.id) } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.email === newEmail) {
    return NextResponse.json({ error: 'Email unchanged' }, { status: 400 });
  }
  const existing = await prisma.utilisateur.findFirst({ where: { email: newEmail } });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }
  // Invalider les précédentes demandes encore en attente
  await prisma.emailChangeRequest.deleteMany({ where: { userId: user.id, usedAt: null } });
  const token = randomBytes(32).toString('hex');
  const expiresAt = addHours(new Date(), 24);
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL;
  const verifyUrl = `${baseUrl}/api/profile/confirm-email-change?token=${token}`;
  try {
    const primaryColor = lightModeColors.primary.main;
    const secondaryColor = lightModeColors.secondary.main;
    const primaryTransparent = alpha(primaryColor, 0.12);
    const secondaryTransparent = alpha(secondaryColor, 0.08);
    const settings0 = await loadAppSettings();
    const footerBrand = settings0.NOM_ETABLISSEMENT || settings0.brandingName || 'SGIL';
    const html = `
      <div style="font-family: Inter, Roboto, Helvetica, Arial, sans-serif; background: linear-gradient(135deg, ${primaryTransparent} 0%, ${secondaryTransparent} 100%); padding:32px;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.08);overflow:hidden;border:1px solid rgba(0,0,0,0.06)">
          <div style="padding:24px 28px;border-bottom:1px solid rgba(0,0,0,0.06);background:linear-gradient(45deg, ${primaryColor}, ${secondaryColor});color:#fff">
            <h1 style="margin:0;font-size:20px;">Confirmation de nouvelle adresse email</h1>
            <p style="margin:6px 0 0 0;opacity:.9;font-size:13px">Valide 24 heures</p>
          </div>
          <div style="padding:28px 28px 8px 28px;color:#222">
            <p>Bonjour,</p>
            <p>Vous avez demandé à changer votre adresse email pour ce compte. Cliquez sur le lien ci-dessous pour confirmer :</p>
            <p style="margin:16px 0"><a href="${verifyUrl}">Confirmer mon email</a></p>
            <p style="font-size:13px;color:#555;margin-top:0">Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>
          </div>
          <div style="padding:16px 28px;color:#666;border-top:1px solid rgba(0,0,0,0.06);font-size:12px">
            <p style="margin:0">SGIL • ${footerBrand}</p>
          </div>
        </div>
      </div>`;
    await sendEmail({
      to: newEmail,
      subject: `Confirmez votre nouvelle adresse email (${footerBrand})`,
      html,
      text: `Confirmez votre nouvelle adresse email: ${verifyUrl}`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: `SMTP: ${e?.message || 'Erreur envoi email'}` },
      { status: 502 },
    );
  }
  const record = await prisma.emailChangeRequest.create({
    data: { userId: user.id, oldEmail: user.email, newEmail, token, expiresAt },
  });
  await logAuthEvent(user.id, 'EMAIL_CHANGE_REQUEST', { newEmail });
  // Notify the user about the pending email change request if enabled
  try {
    const settings = await loadAppSettings();
    if (settings.accountNotifications?.emailChangeRequested) {
      await notificationService.createAndDispatch({
        module: 'ACCOUNT',
        actionType: 'EMAIL_CHANGE_REQUESTED',
        severity: 'low',
        message: `Demande de changement d'email envoyée pour ${newEmail}. Vérifiez votre boîte de réception.`,
        data: { userId: user.id, newEmail },
        targetUserIds: [user.id],
      });
    }
  } catch {}
  return NextResponse.json({ ok: true, expiresAt: record.expiresAt });
}
