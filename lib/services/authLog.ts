import { prisma } from './db';

// Generic auth/security related logging helper. New kinds can be arbitrary strings.
export async function logAuthEvent(
  userId: number | null,
  kind: string,
  data?: any,
  success?: boolean,
) {
  try {
    // AuthLog ne possède pas de colonne meta actuellement.
    // On sérialise les données dans le champ email si absent pour conserver une trace minimale.
    const serialized = data
      ? typeof data === 'object'
        ? JSON.stringify(data)
        : String(data)
      : undefined;
    await prisma.authLog.create({
      data: {
        userId: userId ?? undefined,
        kind,
        success: success ?? true,
        email: serialized,
      },
    });
  } catch (e) {
    // Silent fail
  }
}

export async function logEmailChangeRequest(userId: number, newEmail: string) {
  return logAuthEvent(userId, 'EMAIL_CHANGE_REQUEST', { newEmail });
}

export async function logEmailChangeVerify(userId: number, oldEmail: string, newEmail: string) {
  return logAuthEvent(userId, 'EMAIL_CHANGE_VERIFY', { oldEmail, newEmail });
}

export async function logPasswordChange(userId: number) {
  return logAuthEvent(userId, 'PWD_CHANGE');
}
