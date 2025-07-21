import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const events = await prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        timestamp: true,
        user: {
          select: {
            name: true,
          },
        },
        ipAddress: true,
        userAgent: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Erreur lors de la récupération des événements de sécurité:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des événements de sécurité' }, { status: 500 });
  }
}
