import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import crypto from 'crypto';
import { sendEmail } from '@/lib/services/email';
import { notificationService } from '@/lib/services/notification-service';
import { loadAppSettings } from '@/lib/services/app-settings';
import { alpha } from '@mui/material';
import { lightModeColors } from '@/lib/theme/colors';
import { createTokenExpiration, TOKEN_EXPIRATION_MINUTES } from '@/lib/utils/datetime';
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_REQUESTS_WINDOW = 3;
const memoryRate: Record<string, number[]> = {};

// POST { email } -> generate token (valid 30m) and store; in real system send via email.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    const now = Date.now();
    const key = email.toLowerCase();
    memoryRate[key] = (memoryRate[key] || []).filter((t) => now - t < RATE_WINDOW_MS);
    if (memoryRate[key].length >= MAX_REQUESTS_WINDOW) {
      return NextResponse.json({ error: 'Trop de demandes, réessayez plus tard' }, { status: 429 });
    }
    memoryRate[key].push(now);
    const user = await prisma.utilisateur.findUnique({ where: { email } });
    if (!user) {
      // Do not reveal existence
      return NextResponse.json({ ok: true });
    }
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = createTokenExpiration();
    await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });
    // Log request (kind=RESET_REQUEST)
    await prisma.authLog.create({
      data: { email, userId: user.id, success: true, kind: 'RESET_REQUEST' },
    });
    // Targeted account notification to the user if enabled
    try {
      const settings = await loadAppSettings();
      if (settings.accountNotifications?.passwordResetRequested) {
        await notificationService.createAndDispatch({
          module: 'ACCOUNT',
          actionType: 'PASSWORD_RESET_REQUESTED',
          severity: 'low',
          message: 'Demande de réinitialisation de mot de passe envoyée. Vérifiez votre email.',
          data: { userId: user.id, email },
          targetUserIds: [user.id],
        });
      }
    } catch {}
    // Styled email
    const primaryColor = lightModeColors.primary.main;
    const secondaryColor = lightModeColors.secondary.main;
    const primaryTransparent = alpha(primaryColor, 0.12);
    const secondaryTransparent = alpha(secondaryColor, 0.08);
    const settings2 = await loadAppSettings();
    const footerBrand = settings2.NOM_ETABLISSEMENT || settings2.brandingName || 'SGIL';
    const html = `
      <div style="font-family: Inter, Roboto, Helvetica, Arial, sans-serif; background: linear-gradient(135deg, ${primaryTransparent} 0%, ${secondaryTransparent} 100%); padding:32px;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.08);overflow:hidden;border:1px solid rgba(0,0,0,0.06)">
          <div style="padding:24px 28px;border-bottom:1px solid rgba(0,0,0,0.06);background:linear-gradient(45deg, ${primaryColor}, ${secondaryColor});color:#fff">
            <h1 style="margin:0;font-size:20px;">Réinitialisation du mot de passe</h1>
            <p style="margin:6px 0 0 0;opacity:.9;font-size:13px">Jeton valable ${TOKEN_EXPIRATION_MINUTES} minutes (5h)</p>
          </div>
          <div style="padding:28px 28px 8px 28px;color:#222">
            <p>Bonjour,</p>
            <p>Utilisez le jeton ci-dessous pour réinitialiser votre mot de passe :</p>
            <div style="margin:20px 0;padding:16px 20px;background:${alpha(primaryColor, 0.06)};border:1px dashed ${alpha(primaryColor, 0.4)};border-radius:12px;text-align:center">
              <span style="display:inline-block;font-size:16px;letter-spacing:1px;font-weight:700;font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;color:${primaryColor};">${token}</span>
            </div>
            <p style="font-size:13px;color:#555;margin-top:0">Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.</p>
          </div>
          <div style="padding:16px 28px;color:#666;border-top:1px solid rgba(0,0,0,0.06);font-size:12px">
            <p style="margin:0">SGIL • ${footerBrand}</p>
          </div>
        </div>
      </div>`;
    await sendEmail({
      to: email,
      subject: `Réinitialisation du mot de passe — ${footerBrand}`,
      html,
      text: `Jeton (${TOKEN_EXPIRATION_MINUTES} min): ${token}`,
    });
    // Return token also in dev for convenience
    const isProd = process.env.NODE_ENV === 'production';
    return NextResponse.json({ ok: true, expiresAt, token: isProd ? undefined : token });
  } catch (e: any) {
    return NextResponse.json({ error: 'Echec génération', message: e.message }, { status: 500 });
  }
}
