import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationPreferencesService } from '@/scripts/init-notification-preferences';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const configs = await notificationPreferencesService.getConfigs();

    return NextResponse.json({ configs });

  } catch (error) {
    console.error('Error fetching notification configs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des configurations' },
      { status: 500 }
    );
  }
}