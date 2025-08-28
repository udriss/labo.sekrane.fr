import nodemailer from 'nodemailer';

export type EmailPayload = { to: string; subject: string; html: string; text?: string };

export type EmailResult = {
  ok: boolean;
  transport: 'smtp' | 'memory';
  info?: any;
  error?: string;
};

const sent: EmailPayload[] = [];
let transporter: nodemailer.Transporter | null = null;

function getTransport() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env as any;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  sent.push(payload);
  const from = `${process.env.EMAIL_FROM_NAME || 'SGIL'} <${process.env.EMAIL_FROM || process.env.SMTP_FROM || 'no-reply@example.com'}>`;
  const tx = getTransport();
  if (tx) {
    try {
      const info = await tx.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      return { ok: true, transport: 'smtp', info };
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      console.error('[email] send failed (fallback to memory only)', msg);
      // keep stored in memory-only for visibility
      return { ok: false, transport: 'smtp', error: msg };
    }
  } else {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[email] SMTP not configured, email not sent over network.');
    }
    return {
      ok: true,
      transport: 'memory',
      info: { note: 'SMTP not configured; stored in memory only' },
    };
  }
}

export function getSentEmails() {
  return sent;
}
export function clearSentEmails() {
  sent.length = 0;
}
