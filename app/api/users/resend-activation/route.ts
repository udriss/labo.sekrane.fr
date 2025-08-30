import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import { sendEmail } from '@/lib/services/email';
import { alpha } from '@mui/material';
import { lightModeColors } from '@/lib/theme/colors';
import { loadAppSettings } from '@/lib/services/app-settings';

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== 'ADMIN' && role !== 'ADMINLABO'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const emails: string[] = Array.isArray(body?.emails) ? body.emails : [];
  if (!emails.length) return NextResponse.json({ error: 'Emails requis' }, { status: 400 });

  // Détecter l'environnement et utiliser la bonne URL de base
  const isProduction = process.env.NODE_ENV === 'production';

  // Récupérer l'URL courante depuis les headers de la requête
  const host = req.headers.get('host') || req.headers.get('origin') || 'localhost:8006';
  const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const currentUrl = `${protocol}://${host}`;

  // Utiliser l'URL courante détectée, ou fallback sur les variables d'environnement
  const baseUrl = currentUrl || 
    (isProduction 
      ? process.env.NEXTAUTH_URL 
      : (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || ''));

  const primaryColor = lightModeColors.primary.main;
  const secondaryColor = lightModeColors.secondary.main;
  const primaryTransparent = alpha(primaryColor, 0.12);
  const secondaryTransparent = alpha(secondaryColor, 0.08);
  const settings = await loadAppSettings();
  const footerBrand = settings.NOM_ETABLISSEMENT || settings.brandingName || '';
  const results: Array<{ email: string; ok: boolean; message?: string }> = [];
  for (const email of emails) {
    try {
      const user = await prisma.utilisateur.findUnique({ where: { email } });
      if (!user) {
        results.push({ email, ok: false, message: 'Utilisateur introuvable' });
        continue;
      }
      // Toujours possible d'envoyer un lien d'activation: on génère un nouveau token (les validations se feront à l'utilisation du lien)
      const token = `${user.id}-${Math.random().toString(36).slice(2)}${Math.random()
        .toString(36)
        .slice(2)}`;
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
      await prisma.activationToken.create({ data: { email: user.email, token, expiresAt } });
      const link = `${baseUrl?.replace(/\/$/, '') || ''}/activate?token=${encodeURIComponent(token)}`;
      const html = `
        <div style="font-family: Inter, Roboto, Helvetica, Arial, sans-serif; background: linear-gradient(135deg, ${primaryTransparent} 0%, ${secondaryTransparent} 100%); padding:32px;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.08);overflow:hidden;border:1px solid rgba(0,0,0,0.06)">
            <div style="padding:24px 28px;border-bottom:1px solid rgba(0,0,0,0.06);background:linear-gradient(45deg, ${primaryColor}, ${secondaryColor});color:#fff">
              <h1 style="margin:0;font-size:20px;">Activation de votre compte</h1>
              <p style="margin:6px 0 0 0;opacity:.9;font-size:13px">Valide 7 jours</p>
            </div>
            <div style="padding:28px 28px 8px 28px;color:#222">
              <p>Bonjour,</p>
              <p>Veuillez activer votre compte et définir votre mot de passe via le lien ci-dessous :</p>
              <p style="margin:16px 0"><a href="${link}">${link}</a></p>
              <p style="font-size:13px;color:#555;margin-top:0">Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>
            </div>
            <div style="padding:16px 28px;color:#666;border-top:1px solid rgba(0,0,0,0.06);font-size:12px">
              <p style="margin:0">SGIL • ${footerBrand}</p>
            </div>
          </div>
        </div>`;
      const result = await sendEmail({
        to: user.email,
        subject: `Activation de votre compte — ${footerBrand}`,
        html,
        text: `Activer votre compte: ${link}`,
      });
      if (result.ok) {
        results.push({
          email: user.email,
          ok: true,
          message:
            result.info?.response ||
            (result.transport === 'memory' ? 'Stocké en mémoire (SMTP non configuré)' : 'OK'),
        });
      } else {
        results.push({ email: user.email, ok: false, message: result.error || 'Erreur envoi' });
      }
    } catch (e: any) {
      results.push({ email, ok: false, message: e?.message || 'Erreur inconnue' });
    }
  }
  const sent = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, sent, results });
}
