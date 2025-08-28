import { prisma } from '@/lib/services/db';

export type ApiLogInput = {
  method: string;
  path: string;
  status: number;
  userId?: number | null;
  role?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  module?: string | null;
  action?: string | null;
  message?: string | null;
  meta?: any;
};

export async function writeApiLog(input: ApiLogInput) {
  try {
    const { method, path, status } = input;
    if (!method || !path || typeof status !== 'number') return;
    await prisma.apiLog.create({
      data: {
        method,
        path,
        status,
        userId: input.userId ?? undefined,
        role: (input.role as any) ?? undefined,
        ip: input.ip ?? undefined,
        userAgent: input.userAgent ?? undefined,
        module: input.module ?? undefined,
        action: input.action ?? undefined,
        message: input.message ?? undefined,
        meta: input.meta ?? undefined,
      },
    });
  } catch (e) {
    // Do not crash API on logging failure
    console.error('[audit-log] writeApiLog failed:', e);
  }
}

export async function listApiLogs(params: {
  limit?: number;
  cursor?: number;
  method?: string;
  path?: string;
  userId?: number;
  status?: number;
}) {
  const { limit = 100, cursor, ...filters } = params || {};
  return prisma.apiLog.findMany({
    where: {
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.path ? { path: { contains: filters.path } } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: { id: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
}
