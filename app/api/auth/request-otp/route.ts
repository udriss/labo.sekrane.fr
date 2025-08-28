import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { sendEmail } from '@/lib/services/email';
import { alpha } from '@mui/material';
import { lightModeColors } from '@/lib/theme/colors';
import { loadAppSettings } from '@/lib/services/app-settings';

const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_REQUESTS_WINDOW = 3;
const memoryRate: Record<string, number[]> = {};

function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string')
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const inputEmail = email.trim();

    // Basic rate limit per email
    const now = Date.now();
    const key = inputEmail.toLowerCase();
    memoryRate[key] = (memoryRate[key] || []).filter((t) => now - t < RATE_WINDOW_MS);

    if (memoryRate[key].length >= MAX_REQUESTS_WINDOW) {
      return NextResponse.json({ error: 'Trop de demandes, réessayez plus tard' }, { status: 429 });
    }
    memoryRate[key].push(now);

    const user = await prisma.utilisateur.findUnique({ where: { email: inputEmail } });
    // Do not reveal existence
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const code = generate6DigitCode();

    // expiresAt without timezone drift: construct from local parts
    const nowDate = new Date();
    const expires = new Date(nowDate.getTime() + 15 * 60 * 1000);
    const expiresAt = new Date(
      expires.getFullYear(),
      expires.getMonth(),
      expires.getDate(),
      expires.getHours(),
      expires.getMinutes(),
      expires.getSeconds(),
      0,
    );

    await prisma.passwordResetToken.create({
      data: { email: inputEmail, token: code, expiresAt, isOTP: true, isActive: true },
    });

    // Email styling using requested gradient
    const primaryColor = lightModeColors.primary.main;
    const secondaryColor = lightModeColors.secondary.main;
    const primaryTransparent = alpha(primaryColor, 0.12);
    const secondaryTransparent = alpha(secondaryColor, 0.08);
    const settings = await loadAppSettings();
    const footerBrand = settings.NOM_ETABLISSEMENT || settings.brandingName || '';

    const html = `
      <div style="font-family: Inter, Roboto, Helvetica, Arial, sans-serif; background: linear-gradient(135deg, ${primaryTransparent} 0%, ${secondaryTransparent} 100%); padding:32px;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.08);overflow:hidden;border:1px solid rgba(0,0,0,0.06)">
          <div style="padding:24px 28px;border-bottom:1px solid rgba(0,0,0,0.06);background:linear-gradient(45deg, ${primaryColor}, ${secondaryColor});color:#fff">
            <h1 style="margin:0;font-size:20px;">Réinitialisation du mot de passe</h1>
            <p style="margin:6px 0 0 0;opacity:.9;font-size:13px">Code à usage unique valable 15 minutes</p>
          </div>
          <div style="padding:28px 28px 8px 28px;color:#222">
            <p>Bonjour,</p>
            <p>Utilisez le code ci-dessous pour vérifier votre identité et réinitialiser votre mot de passe&nbsp;:</p>
            <div style="margin:20px 0;padding:16px 20px;background:${alpha(primaryColor, 0.06)};border:1px dashed ${alpha(primaryColor, 0.4)};border-radius:12px;text-align:center">
              <span style="display:inline-block;font-size:28px;letter-spacing:10px;font-weight:800;font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;color:${primaryColor};">${code}</span>
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
      subject: 'Votre code de réinitialisation (OTP)',
      html,
      text: `Code: ${code} (valide 15 min)`,
    });

    return NextResponse.json({ ok: true, expiresAt });
  } catch (e: any) {
    return NextResponse.json({ error: 'Echec envoi OTP', message: e?.message }, { status: 500 });
  }
}
