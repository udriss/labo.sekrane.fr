import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/services/db';

// GET /api/admin/notification-users
// Returns a compact list of users for admin to configure fine-grained notification settings.
export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const users = await prisma.utilisateur.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });
  return NextResponse.json({ users });
}
