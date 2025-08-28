// api/rooms/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notification-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const available = searchParams.get('available');

    const where: any = {};
    if (search) {
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
    }
    if (available === '1') {
      where.available = true;
    }

    const rooms = await prisma.salle.findMany({
      where,
      include: {
        _count: {
          select: {
            localisations: true,
            materiels: true,
            consommables: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Erreur lors de la récupération des salles:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, placesDisponibles, batiment } = body;

    if (!name) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    const room = await prisma.salle.create({
      data: {
        name,
        description,
        placesDisponibles: placesDisponibles ? Number(placesDisponibles) : null,
        batiment,
      },
    });

    notificationService
      .createAndDispatch({
        module: 'ROOMS',
        actionType: 'CREATE',
        message: `Nouvelle salle ajoutée: <strong>${room.name}</strong>`,
        data: {
          roomId: room.id,
          placesDisponibles: room.placesDisponibles,
          triggeredBy: session?.user?.name || session?.user?.email || 'système',
        },
        // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
      })
      .catch(() => {});

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la salle:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing room id' }, { status: 400 });
    }

    const before = await prisma.salle.findUnique({
      where: { id: Number(id) },
      select: { name: true, placesDisponibles: true },
    });

    const room = await prisma.salle.update({
      where: { id: Number(id) },
      data: {
        ...updateData,
        placesDisponibles: updateData.placesDisponibles
          ? Number(updateData.placesDisponibles)
          : undefined,
      },
    });

    // Send different notifications based on what changed
    if (before?.placesDisponibles !== room.placesDisponibles) {
      notificationService
        .createAndDispatch({
          module: 'ROOMS',
          actionType: 'STATUS',
          message: `Capacité salle modifiée : <strong>${room.name}</strong> → ${room.placesDisponibles || 'Non définie'} places`,
          data: {
            roomId: room.id,
            previousCapacity: before?.placesDisponibles,
            newCapacity: room.placesDisponibles,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        })
        .catch(() => {});
    } else {
      notificationService
        .createAndDispatch({
          module: 'ROOMS',
          actionType: 'UPDATE',
          message: `Salle mise à jour : <strong>${room.name}</strong>`,
          data: {
            roomId: room.id,
            updated: Object.keys(updateData),
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        })
        .catch(() => {});
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la salle:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing room id' }, { status: 400 });
    }

    const deleteId = Number(id);
    let roomName: string | undefined;

    try {
      const existing = await prisma.salle.findUnique({
        where: { id: deleteId },
        select: { name: true },
      });
      roomName = existing?.name;
    } catch {}

    await prisma.salle.delete({ where: { id: deleteId } });

    if (roomName) {
      notificationService
        .createAndDispatch({
          module: 'ROOMS',
          actionType: 'DELETE',
          message: `Salle supprimée : <strong>${roomName}</strong>`,
          data: {
            roomId: deleteId,
            deletedRoom: roomName,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        })
        .catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de la salle:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}
