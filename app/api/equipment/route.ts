// api/equipment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notification-service';
import { writeApiLog } from '@/lib/services/audit-log';

const createEquipmentSchema = z.object({
  discipline: z.enum(['chimie', 'physique']),
  name: z.string().min(1),
  categoryId: z.number().int().positive().optional().nullable(),
  quantity: z.number().int().positive().default(1),
  salleId: z.number().int().optional().nullable(),
  localisationId: z.number().int().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const discipline = searchParams.get('discipline');
    const category = searchParams.get('category');
    const lowStock = searchParams.get('lowStock');

    let whereClause: any = {};
    if (discipline) whereClause.discipline = discipline;
    if (category) whereClause.categoryId = parseInt(category);
    if (lowStock) whereClause.quantity = { lte: parseInt(lowStock) || 5 };

    const materiels = await prisma.materielInventaire.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        discipline: true,
        name: true,
        categoryId: true,
        category: true,
        quantity: true,
        minStock: true,
        salleId: true,
        localisationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const res = NextResponse.json({ equipement: materiels });
    try {
      await writeApiLog({
        method: 'GET',
        path: '/api/equipment',
        status: 200,
        userId: undefined,
        role: undefined,
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        module: 'EQUIPMENT',
        action: 'LIST',
      });
    } catch {}
    return res;
  } catch (error) {
    const res = NextResponse.json({ error: 'Failed to fetch equipement' }, { status: 500 });
    try {
      await writeApiLog({
        method: 'GET',
        path: '/api/equipment',
        status: 500,
        userId: undefined,
        role: undefined,
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        module: 'EQUIPMENT',
        action: 'LIST',
        message: 'error',
      });
    } catch {}
    return res;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createEquipmentSchema.parse(body);

    const equipement = await prisma.materielInventaire.create({
      data: validatedData,
    });

    notificationService
      .createAndDispatch({
        module: 'MATERIEL',
        actionType: 'CREATE',
        message: `Nouvel équipement ajouté: <strong>${equipement.name}</strong>`,
        data: {
          equipmentId: equipement.id,
          discipline: equipement.discipline,
          categoryId: equipement.categoryId,
          quantity: equipement.quantity,
          triggeredBy: session?.user?.name || session?.user?.email || 'système',
        },
        excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
      })
      .catch(() => {});

    const res = NextResponse.json({ equipement }, { status: 201 });
    try {
      await writeApiLog({
        method: 'POST',
        path: '/api/equipment',
        status: 201,
        userId: session?.user?.id ? Number(session.user.id) : undefined,
        role: (session?.user as any)?.role,
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        module: 'EQUIPMENT',
        action: 'CREATE',
        meta: { id: equipement.id },
      });
    } catch {}
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const res = NextResponse.json({ error: error.issues }, { status: 400 });
      try {
        await writeApiLog({
          method: 'POST',
          path: '/api/equipment',
          status: 400,
          ip: req.headers.get('x-forwarded-for') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
          module: 'EQUIPMENT',
          action: 'CREATE',
          message: 'validation failed',
        });
      } catch {}
      return res;
    }
    const res = NextResponse.json({ error: 'Failed to create equipement' }, { status: 500 });
    try {
      await writeApiLog({
        method: 'POST',
        path: '/api/equipment',
        status: 500,
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        module: 'EQUIPMENT',
        action: 'CREATE',
        message: 'error',
      });
    } catch {}
    return res;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...data } = body as any;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const before = await prisma.materielInventaire.findUnique({
      where: { id: Number(id) },
      select: { name: true, quantity: true },
    });

    const equipement = await prisma.materielInventaire.update({
      where: { id: Number(id) },
      data,
    });

    notificationService
      .createAndDispatch({
        module: 'MATERIEL',
        actionType: 'UPDATE',
        message: `Équipement mis à jour: <strong>${equipement.name}</strong>`,
        data: {
          equipmentId: equipement.id,
          updated: Object.keys(data),
          quantityPrev: before?.quantity,
          quantityNew: equipement.quantity,
          triggeredBy: session?.user?.name || session?.user?.email || 'système',
        },
        // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
      })
      .catch(() => {});

    // Alerte dynamique: utiliser minStock si défini; sinon aucune alerte « faible ». Rupture si quantité = 0.
    try {
      const minStock: number | null = (equipement as any).minStock ?? null;
      if (equipement.quantity === 0) {
        await notificationService.createAndDispatch({
          module: 'MATERIEL',
          actionType: 'ALERT',
          message: `⛔ Rupture de stock pour équipement: <strong>${equipement.name}</strong>`,
          severity: 'high',
          data: {
            equipmentId: equipement.id,
            currentQuantity: equipement.quantity,
            minStock: minStock,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        });
      } else if (minStock != null && equipement.quantity <= minStock) {
        await notificationService.createAndDispatch({
          module: 'MATERIEL',
          actionType: 'ALERT',
          message: `⚠️ Stock faible pour équipement: <strong>${equipement.name}</strong> (${equipement.quantity} restant)`,
          severity: 'medium',
          data: {
            equipmentId: equipement.id,
            currentQuantity: equipement.quantity,
            minStock: minStock,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        });
      }
    } catch {}

    const res = NextResponse.json({ equipement });
    try {
      await writeApiLog({
        method: 'PUT',
        path: '/api/equipment',
        status: 200,
        userId: session?.user?.id ? Number(session.user.id) : undefined,
        role: (session?.user as any)?.role,
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        module: 'EQUIPMENT',
        action: 'UPDATE',
        meta: { id: equipement.id },
      });
    } catch {}
    return res;
  } catch (error) {
    const res = NextResponse.json({ error: 'Failed to update equipement' }, { status: 500 });
    try {
      await writeApiLog({
        method: 'PUT',
        path: '/api/equipment',
        status: 500,
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        module: 'EQUIPMENT',
        action: 'UPDATE',
        message: 'error',
      });
    } catch {}
    return res;
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
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const deleteId = Number(id);
    let equipmentName: string | undefined;

    try {
      const existing = await prisma.materielInventaire.findUnique({
        where: { id: deleteId },
        select: { name: true },
      });
      equipmentName = existing?.name;
    } catch {}

    await prisma.materielInventaire.delete({ where: { id: deleteId } });

    if (equipmentName) {
      notificationService
        .createAndDispatch({
          module: 'MATERIEL',
          actionType: 'DELETE',
          message: `Équipement supprimé: <strong>${equipmentName}</strong>`,
          data: {
            equipmentId: deleteId,
            deletedEquipment: equipmentName,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        })
        .catch(() => {});
    }

    const res = NextResponse.json({ ok: true });
    try {
      await writeApiLog({
        method: 'DELETE',
        path: '/api/equipment',
        status: 200,
        userId: session?.user?.id ? Number(session.user.id) : undefined,
        role: (session?.user as any)?.role,
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        module: 'EQUIPMENT',
        action: 'DELETE',
        meta: { id: Number(id) },
      });
    } catch {}
    return res;
  } catch (error) {
    const res = NextResponse.json({ error: 'Failed to delete equipement' }, { status: 500 });
    try {
      await writeApiLog({
        method: 'DELETE',
        path: '/api/equipment',
        status: 500,
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        module: 'EQUIPMENT',
        action: 'DELETE',
        message: 'error',
      });
    } catch {}
    return res;
  }
}
