// api/materiel/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { notificationService } from '@/lib/services/notification-service';
import { auth } from '@/auth';
import { z } from 'zod';
import { toUTCEquivalent } from '@/lib/utils/datetime';

const createMaterielSchema = z.object({
  discipline: z.enum(['chimie', 'physique']),
  name: z.string().min(1),
  categoryId: z.number().int().positive().optional().nullable(),
  quantity: z.number().int().min(0).default(1),
  minStock: z.number().int().min(0).optional().nullable(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  supplier: z.string().optional(),
  purchaseDate: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      // Accept either full datetime or just date; treat as local
      try {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) return toUTCEquivalent(val);
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return toUTCEquivalent(val + 'T00:00:00');
        return new Date(val); // fallback (may contain timezone)
      } catch {
        return new Date(val);
      }
    }),
  notes: z.string().optional(),
  materielPresetId: z.number().int().positive().optional().nullable(),
  salleId: z.number().int().positive().optional().nullable(),
  localisationId: z.number().int().positive().optional().nullable(),
  materielPersoId: z.number().int().positive().optional().nullable(),
});

const updateMaterielSchema = createMaterielSchema.partial().extend({
  id: z.number().int().positive(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const discipline = searchParams.get('discipline');
    const categoryId = searchParams.get('categoryId');
    const salleId = searchParams.get('salleId');
    const localisationId = searchParams.get('localisationId');
    const lowStock = searchParams.get('lowStock');

    let whereClause: any = {};
    if (discipline) whereClause.discipline = discipline;
    if (categoryId) whereClause.categoryId = parseInt(categoryId);
    if (salleId) whereClause.salleId = parseInt(salleId);
    if (localisationId) whereClause.localisationId = parseInt(localisationId);
    if (lowStock) whereClause.quantity = { lte: parseInt(lowStock) || 5 };

    // Debug: log incoming filters
    try {
      console.info('[materiel.GET] Filters:', {
        discipline,
        categoryId: categoryId ? parseInt(categoryId) : null,
        salleId: salleId ? parseInt(salleId) : null,
        localisationId: localisationId ? parseInt(localisationId) : null,
        lowStock: lowStock ? parseInt(lowStock) || 5 : null,
      });
    } catch {}

    // Some environments might have an older Prisma client; defensively avoid selecting unknown fields
    const select: any = {
      id: true,
      discipline: true,
      name: true,
      categoryId: true,
      minStock: true,
      quantity: true,
      model: true,
      serialNumber: true,
      supplier: true,
      purchaseDate: true,
      notes: true,
      salleId: true,
      localisationId: true,
      materielPersoId: true,
      materielPresetId: true,
      createdAt: true,
      updatedAt: true,
      // relations
      salle: true,
      localisation: true,
      // keep relations for convenience (no fallback logic here)
      materielPerso: true,
      materielPreset: true,
      category: true,
    };
    const materiels = await prisma.materielInventaire.findMany({
      where: whereClause,
      select,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ materiels });
  } catch (error) {
    console.error('Error fetching materiels:', error);
    return NextResponse.json({ error: 'Failed to fetch materiels' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const validatedData = createMaterielSchema.parse(body);
    // Strip unsupported columns to avoid DB error if provided by client
    const { equipmentTypeId: _ignored, ...dataToCreate } = (validatedData as any) || {};

    // Enforce categoryId population from materielPerso or materielPreset if missing
    let resolvedCategoryId = dataToCreate.categoryId ?? null;
    if (resolvedCategoryId == null) {
      try {
        if (dataToCreate.materielPersoId) {
          const mp = await prisma.materielPerso.findUnique({
            where: { id: dataToCreate.materielPersoId },
            select: { categorieId: true },
          });
          resolvedCategoryId = mp?.categorieId ?? null;
        } else if (dataToCreate.materielPresetId) {
          const preset = await prisma.materielPreset.findUnique({
            where: { id: dataToCreate.materielPresetId },
            select: { categoryId: true },
          });
          resolvedCategoryId = preset?.categoryId ?? null;
        }
      } catch {}
    }

    // If no source nor category could be determined, reject
    if (
      resolvedCategoryId == null &&
      !dataToCreate.categoryId &&
      !dataToCreate.materielPersoId &&
      !dataToCreate.materielPresetId
    ) {
      return NextResponse.json(
        {
          error:
            'categoryId is required or must be resolvable from materielPersoId/materielPresetId',
        },
        { status: 400 },
      );
    }

    const createData = {
      ...dataToCreate,
      categoryId: resolvedCategoryId ?? dataToCreate.categoryId ?? null,
    } as any;

    const materiel = await prisma.materielInventaire.create({
      data: createData,
      select: {
        id: true,
        discipline: true,
        name: true,
        category: true,
        quantity: true,
        minStock: true,
        model: true,
        serialNumber: true,
        supplier: true,
        purchaseDate: true,
        notes: true,
        salleId: true,
        localisationId: true,
        materielPersoId: true,
        materielPresetId: true,
        createdAt: true,
        updatedAt: true,
        salle: true,
        localisation: true,
        materielPerso: true,
        materielPreset: true,
      },
    });

    // Emit notification (best-effort, ignore failure)
    notificationService
      .createAndDispatch({
        module: 'MATERIEL',
        actionType: 'CREATE',
        message: `Matériel ajouté : <strong>${materiel.name}</strong>`,
        data: {
          materialId: materiel.id,
          quantityNew: materiel.quantity,
          triggeredBy: session?.user?.name || session?.user?.email || 'système',
          discipline: materiel.discipline,
        },
        // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
      })
      .catch(() => {});

    return NextResponse.json({ materiel }, { status: 201 });
  } catch (error) {
    console.error('Error creating materiel:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create materiel' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const validatedData = updateMaterielSchema.parse(body);
    const { id, _changes, ...data } = validatedData as any;

    // Strip unsupported columns to avoid DB error if provided by client
    const { equipmentTypeId: _ignored2, ...dataToUpdate } = (data as any) || {};

    // Fetch previous for diff
    const before = await prisma.materielInventaire.findUnique({
      where: { id },
      select: {
        quantity: true,
        name: true,
        category: true,
        minStock: true,
        model: true,
        serialNumber: true,
        supplier: true,
        purchaseDate: true,
        notes: true,
        salleId: true,
        localisationId: true,
      },
    });

    const materiel = await prisma.materielInventaire.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        discipline: true,
        name: true,
        category: true,
        quantity: true,
        minStock: true,
        model: true,
        serialNumber: true,
        supplier: true,
        purchaseDate: true,
        notes: true,
        salleId: true,
        localisationId: true,
        materielPersoId: true,
        createdAt: true,
        updatedAt: true,
        salle: true,
        localisation: true,
        materielPerso: true,
      },
    });

    // Enhanced notification with detailed changes
    let message = `Matériel mis à jour : <strong>${materiel.name}</strong>`;
    const notificationData: any = {
      materialId: materiel.id,
      triggeredBy: session?.user?.name || session?.user?.email || 'système',
    };

    // If changes were provided from client, use them for detailed notification
    if (_changes && Object.keys(_changes).length > 0) {
      const changeTexts: string[] = [];

      for (const [field, change] of Object.entries(
        _changes as Record<string, { old: any; new: any }>,
      )) {
        if (field === 'quantity') {
          notificationData.quantityPrev = change.old;
          notificationData.quantityNew = change.new;
          changeTexts.push(`Quantité : ${change.old} → ${change.new}`);
        } else if (field === 'minStock') {
          changeTexts.push(`Stock min : ${change.old} → ${change.new}`);
        } else if (field === 'salle' || field === 'salleId') {
          changeTexts.push(`Salle : ${change.old || '(aucune)'} → ${change.new || '(aucune)'}`);
        } else if (field === 'localisation' || field === 'localisationId') {
          changeTexts.push(
            `Localisation: ${change.old || '(aucune)'} → ${change.new || '(aucune)'}`,
          );
        } else if (field === 'category' || field === 'categoryId') {
          changeTexts.push(`Catégorie: ${change.old || '(aucune)'} → ${change.new || '(aucune)'}`);
        } else {
          const fieldName =
            {
              name: 'Nom',
              categoryId: 'Catégorie',
              model: 'Modèle',
              serialNumber: 'N° série',
              supplier: 'Fournisseur',
              notes: 'Notes',
              purchaseDate: 'Date achat',
            }[field] || field;
          changeTexts.push(`${fieldName}: ${change.old || '(vide)'} → ${change.new || '(vide)'}`);
        }
      }

      if (changeTexts.length > 0) {
        message += `<br/>Modifications: ${changeTexts.join(', ')}`;
        notificationData.changes = changeTexts;
      }
    } else {
      // Fallback: detect quantity change only
      if (before && before.quantity !== materiel.quantity) {
        notificationData.quantityPrev = before.quantity;
        notificationData.quantityNew = materiel.quantity;
      }
    }

    notificationService
      .createAndDispatch({
        module: 'MATERIEL',
        actionType: 'UPDATE',
        message,
        data: notificationData,
        // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
      })
      .catch(() => {});

    // Alerte minStock (si défini) et rupture de stock
    try {
      const minStock: number | null = (materiel as any).minStock ?? null;
      if (materiel.quantity === 0) {
        await notificationService.createAndDispatch({
          module: 'MATERIEL',
          actionType: 'ALERT',
          message: `⛔ Rupture de stock pour matériel: <strong>${materiel.name}</strong>`,
          severity: 'high',
          data: {
            materialId: materiel.id,
            currentQuantity: materiel.quantity,
            minStock,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        });
      } else if (minStock != null && materiel.quantity <= minStock) {
        await notificationService.createAndDispatch({
          module: 'MATERIEL',
          actionType: 'ALERT',
          message: `⚠️ Stock faible pour matériel: <strong>${materiel.name}</strong> (${materiel.quantity} restant)`,
          severity: 'medium',
          data: {
            materialId: materiel.id,
            currentQuantity: materiel.quantity,
            minStock,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        });
      }
    } catch {}

    return NextResponse.json({ materiel });
  } catch (error) {
    console.error('Error updating materiel:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update materiel' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const deletedId = parseInt(id);
    let deletedName: string | undefined;
    try {
      const existing = await prisma.materielInventaire.findUnique({
        where: { id: deletedId },
        select: { name: true },
      });
      deletedName = existing?.name;
    } catch {}
    await prisma.materielInventaire.delete({ where: { id: deletedId } });
    if (deletedName)
      notificationService
        .createAndDispatch({
          module: 'MATERIEL',
          actionType: 'DELETE',
          message: `Matériel supprimé : <strong>${deletedName}</strong>`,
          data: {
            materialId: deletedId,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        })
        .catch(() => {});

    return NextResponse.json({ message: 'Materiel deleted successfully' });
  } catch (error) {
    console.error('Error deleting materiel:', error);
    return NextResponse.json({ error: 'Failed to delete materiel' }, { status: 500 });
  }
}
