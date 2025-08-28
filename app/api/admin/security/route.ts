import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';
import { loadAppSettings } from '@/lib/services/app-settings';

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const settings = await loadAppSettings();
  const [failed24h, success24h, totalUsers, lockedUsers, lastReset] = await Promise.all([
    prisma.authLog.count({ where: { createdAt: { gte: since }, success: false } }),
    prisma.authLog.count({ where: { createdAt: { gte: since }, success: true } }),
    prisma.utilisateur.count(),
    prisma.utilisateur.count({ where: { lockedUntil: { gt: new Date() } } }),
    prisma.authLog.findFirst({
      where: { kind: 'RESET' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  // Last password reset not tracked yet - returning null for now
  return NextResponse.json({
    sslEnabled: true, // assume behind proxy with SSL termination
    failedLogins24h: failed24h,
    successfulLogins24h: success24h,
    lastPasswordReset: lastReset?.createdAt ?? null,
    accountLockThreshold: settings.lockThreshold,
    failedAttemptsWindowMinutes: settings.lockWindowMinutes,
    totalUsers,
    env: process.env.NODE_ENV,
    nodeVersion: process.version,
    lockedUsers,
    lockThreshold: settings.lockThreshold,
    lockWindowMinutes: settings.lockWindowMinutes,
    lockDurationMinutes: settings.lockDurationMinutes,
  });
}
