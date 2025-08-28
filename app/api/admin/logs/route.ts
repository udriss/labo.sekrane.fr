import { NextRequest } from 'next/server';
import { listApiLogs } from '@/lib/services/audit-log';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const cursor = searchParams.get('cursor')
      ? parseInt(searchParams.get('cursor')!, 10)
      : undefined;
    const method = searchParams.get('method') || undefined;
    const path = searchParams.get('path') || undefined;
    const userId = searchParams.get('userId')
      ? parseInt(searchParams.get('userId')!, 10)
      : undefined;
    const status = searchParams.get('status')
      ? parseInt(searchParams.get('status')!, 10)
      : undefined;
    const items = await listApiLogs({ limit, cursor, method, path, userId, status });
    return Response.json({ items });
  } catch (e) {
    console.error('[admin/logs] GET failed', e);
    return Response.json({ error: 'failed' }, { status: 500 });
  }
}
