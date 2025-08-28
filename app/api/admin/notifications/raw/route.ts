import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notification-service';
import { prisma } from '@/lib/services/db';

// GET /api/admin/notifications/raw?limit=50&cursor=123
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const user = await prisma.utilisateur.findUnique({
      where: { id: Number(session.user.id) },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') || '50', 10)));
    const cursor = sp.get('cursor') ? Number(sp.get('cursor')) : undefined;

    const items = await notificationService.listAllNotifications({
      limit,
      cursor,
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications brutes:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
