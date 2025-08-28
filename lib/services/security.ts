import { prisma } from './db';

export interface LockSettings {
  lockThreshold: number;
  lockWindowMinutes: number;
  lockDurationMinutes: number;
}

/**
 * Evaluate whether an account must be locked after a failed attempt.
 * Returns lock status and metadata. Idempotent if already locked beyond new lockedUntil.
 */
export async function maybeLockAccount(userId: number, email: string, settings: LockSettings) {
  const since = new Date(Date.now() - settings.lockWindowMinutes * 60 * 1000);
  const fails = await prisma.authLog.count({
    where: { email, success: false, createdAt: { gte: since } },
  });
  if (fails >= settings.lockThreshold) {
    const lockedUntil = new Date(Date.now() + settings.lockDurationMinutes * 60 * 1000);
    await prisma.utilisateur.update({ where: { id: userId }, data: { lockedUntil } });
    await prisma.authLog.create({ data: { email, userId, success: false, kind: 'LOCKED' } });
    return { locked: true, lockedUntil, fails };
  }
  return { locked: false, fails };
}
