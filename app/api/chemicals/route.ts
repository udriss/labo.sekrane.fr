// api/chemicals/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';
import { toUTCEquivalent } from '@/lib/utils/datetime';
import {
  chemicalCreateSchema,
  chemicalInventoryCreateSchema,
  chemicalInventoryUpdateSchema,
} from '@/lib/schemas/chemical';
import { notificationService } from '@/lib/services/notification-service';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || searchParams.get('q');
    const hazard = searchParams.get('hazard'); // hazardClass (stocké en CSV dans reactifPreset.hazardClass)
    const lowStock = searchParams.get('lowStock');
    const salleId = searchParams.get('salleId');

    if (!(prisma as any).reactifInventaire) {
      console.error('Prisma client missing reactifInventaire delegate. Did client generation run?');
      return NextResponse.json({ error: 'Prisma client not ready' }, { status: 500 });
    }

    const where: any = {};
    // Filtre salle + stock direct sur l'inventaire
    if (lowStock) where.stock = { lte: parseInt(lowStock) || 5 };
    if (salleId) where.salleId = parseInt(salleId);

    // Filtres relationnels (preset)
    const presetFilters: any = {};
    if (search) presetFilters.name = { contains: search };
    if (hazard) presetFilters.hazardClass = { contains: hazard };
    if (Object.keys(presetFilters).length) where.reactifPreset = { is: presetFilters };

    let reactifsData: any[] = [];
    try {
      reactifsData = await (prisma as any).reactifInventaire.findMany({
        where,
        include: {
          reactifPreset: true,
          salle: { select: { id: true, name: true } },
          localisation: { select: { id: true, name: true } },
          supplier: true, // relation (requires regenerated Prisma client)
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e: any) {
      // Fallback si le client Prisma n'est pas régénéré (relation supplier inconnue)
      console.warn(
        '[reactifs][GET] include supplier failed, fallback sans relation. Régénérez Prisma (npm run db:generate).',
      );
      const raw = await (prisma as any).reactifInventaire.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      // Charger les presets + salles + localisations + suppliers séparément (batch minimal)
      const presetIds = Array.from(new Set(raw.map((r: any) => r.reactifPresetId))) as number[];
      const salleIds = Array.from(
        new Set(raw.map((r: any) => r.salleId).filter((v: any) => v != null)),
      ) as number[];
      const localisationIds = Array.from(
        new Set(raw.map((r: any) => r.localisationId).filter((v: any) => v != null)),
      ) as number[];
      const supplierIds = Array.from(
        new Set(raw.map((r: any) => r.supplierId).filter((v: any) => v != null)),
      ) as number[];
      const [presets, salles, localisations, suppliers] = await Promise.all([
        prisma.reactifPreset.findMany({ where: { id: { in: presetIds } } }),
        salleIds.length ? prisma.salle.findMany({ where: { id: { in: salleIds } } }) : [],
        localisationIds.length
          ? prisma.localisation.findMany({ where: { id: { in: localisationIds } } })
          : [],
        supplierIds.length
          ? (prisma as any).supplier.findMany({ where: { id: { in: supplierIds } } })
          : [],
      ]);
      const presetMap = new Map(presets.map((p: any) => [p.id, p]));
      const salleMap = new Map(salles.map((s: any) => [s.id, s]));
      const locMap = new Map(localisations.map((l: any) => [l.id, l]));
      const supplierMap = new Map(suppliers.map((s: any) => [s.id, s]));
      reactifsData = raw.map((r: any) => ({
        ...r,
        reactifPreset: presetMap.get(r.reactifPresetId) || null,
        salle: r.salleId ? salleMap.get(r.salleId) || null : null,
        localisation: r.localisationId ? locMap.get(r.localisationId) || null : null,
        supplier: r.supplierId ? supplierMap.get(r.supplierId) || null : null,
      }));
    }
    // Aplatir supplierName pour le front
    const enriched = reactifsData.map((c: any) => ({
      ...c,
      supplierName: c.supplier?.name || null,
    }));
    // Optionnel: retourner aussi les presets correspondant à la recherche (utilisés par /recherche)
    let presets: any[] = [];
    if (typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      presets = await prisma.reactifPreset.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { casNumber: { contains: q } },
            { formula: { contains: q } },
            { category: { contains: q } },
          ],
        },
        take: 50,
        orderBy: { name: 'asc' },
      });
    }
    // Retourner inventaire et presets pour une recherche plus pertinente
    return NextResponse.json({ reactifs: enriched, presets });
  } catch (error) {
    console.error('Erreur lors de la récupération des réactifs:', error);
    return NextResponse.json({ error: 'Failed to fetch reactifs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    // Nouvelle structure: ajouter d'abord (ou réutiliser) un preset, puis entrée inventaire
    const data = chemicalInventoryCreateSchema.parse(body);

    // Trouver ou ajouter le preset (match par name + casNumber)
    let preset = await prisma.reactifPreset.findFirst({
      where: {
        name: data.name,
        casNumber: data.casNumber || null,
      },
    });
    if (!preset) {
      preset = await prisma.reactifPreset.create({
        data: {
          name: data.name,
          casNumber: data.casNumber || null,
          formula: data.formula || null,
          category: data.category || null,
          hazardClass: data.hazard?.length ? data.hazard.join(', ') : null,
          boilingPointC: data.boilingPointC ?? null,
          meltingPointC: data.meltingPointC ?? null,
          molarMass: data.molarMass ?? null,
          // @ts-ignore density ajouté récemment (regénérer Prisma si erreur persiste)
          density: (data as any).density ?? null,
        } as any,
      });
    }

    // Valider que la localisation appartient à la salle si spécifiée
    if (data.localisationId && data.salleId) {
      const localisation = await prisma.localisation.findUnique({
        where: { id: data.localisationId },
        select: { salleId: true },
      });

      if (!localisation || localisation.salleId !== data.salleId) {
        return NextResponse.json(
          { error: 'La localisation ne correspond pas à la salle sélectionnée' },
          { status: 400 },
        );
      }
    }

    // Supplier resolution / creation
    let supplierId: number | null = null;
    if (data.supplierId) supplierId = data.supplierId;
    else if (!data.supplierId && data.supplierName) {
      const existing = await (prisma as any).supplier.findFirst({
        where: { name: data.supplierName },
      });
      if (existing) supplierId = existing.id;
      else {
        const created = await (prisma as any).supplier.create({
          data: { name: data.supplierName },
        });
        supplierId = created.id;
      }
    }

    const normPurchase = data.purchaseDate
      ? (() => {
          const raw =
            typeof data.purchaseDate === 'string'
              ? data.purchaseDate
              : new Date(data.purchaseDate as any).toISOString();
          const base = raw.split('Z')[0];
          return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(base)
            ? toUTCEquivalent(base.substring(0, 16) + ':00')
            : toUTCEquivalent(base.substring(0, 10) + 'T00:00:00');
        })()
      : null;
    const normExpiration = data.expirationDate
      ? (() => {
          const raw =
            typeof data.expirationDate === 'string'
              ? data.expirationDate
              : new Date(data.expirationDate as any).toISOString();
          const base = raw.split('Z')[0];
          return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(base)
            ? toUTCEquivalent(base.substring(0, 16) + ':00')
            : toUTCEquivalent(base.substring(0, 10) + 'T00:00:00');
        })()
      : null;
    const reactif = await (prisma as any).reactifInventaire.create({
      data: {
        reactifPresetId: preset.id,
        stock: data.stock,
        salleId: data.salleId || null,
        localisationId: data.localisationId || null,
        unit: data.unit || null,
        minStock: data.minStock ?? null,
        purchaseDate: normPurchase,
        expirationDate: normExpiration,
        notes: data.notes || null,
        supplierId: supplierId,
      },
      include: {
        reactifPreset: true,
        salle: { select: { id: true, name: true } },
        localisation: { select: { id: true, name: true } },
        supplier: true,
      },
    });
    notificationService
      .createAndDispatch({
        module: 'CHEMICALS',
        actionType: 'CREATE',
        message: `Réactif d'inventaire ajouté : <strong>${preset.name}</strong>`,
        data: {
          inventoryId: reactif.id,
          reactifPresetId: preset.id,
          stockPrev: 0,
          stockNew: reactif.stock,
          triggeredBy: session?.user?.name || session?.user?.email || 'système',
        },
        // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
      })
      .catch((e) => console.error('[reactifs][notify][create]', e));

    return NextResponse.json({ reactif }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 },
      );
    }
    console.error('Erreur lors de l\'ajout du réactif:', error);
    return NextResponse.json({ error: "Erreur lors de l'ajout du réactif" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { id, _changes, ...updateData } = body as any;

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const data = chemicalInventoryUpdateSchema.parse({ id, ...updateData });

    // Valider que la localisation appartient à la salle si spécifiée
    if (data.localisationId && data.salleId) {
      const localisation = await prisma.localisation.findUnique({
        where: { id: data.localisationId },
        select: { salleId: true },
      });

      if (!localisation || localisation.salleId !== data.salleId) {
        return NextResponse.json(
          { error: 'La localisation ne correspond pas à la salle sélectionnée' },
          { status: 400 },
        );
      }
    }

    const before = await prisma.reactifInventaire.findUnique({
      where: { id: Number(id) },
      select: { stock: true, reactifPresetId: true },
    });
    // Update supplier if provided (accept supplierId or supplierName)
    let supplierId: number | undefined = undefined;
    if ((data as any).supplierId) supplierId = (data as any).supplierId;
    else if ((data as any).supplierName) {
      const existing = await (prisma as any).supplier.findFirst({
        where: { name: (data as any).supplierName },
      });
      supplierId = existing
        ? existing.id
        : (await (prisma as any).supplier.create({ data: { name: (data as any).supplierName } }))
            .id;
    }

    const normPurchase = (data as any).purchaseDate
      ? (() => {
          const raw =
            typeof (data as any).purchaseDate === 'string'
              ? (data as any).purchaseDate
              : new Date((data as any).purchaseDate as any).toISOString();
          const base = raw.split('Z')[0];
          return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(base)
            ? toUTCEquivalent(base.substring(0, 16) + ':00')
            : toUTCEquivalent(base.substring(0, 10) + 'T00:00:00');
        })()
      : undefined;
    const normExpiration = (data as any).expirationDate
      ? (() => {
          const raw =
            typeof (data as any).expirationDate === 'string'
              ? (data as any).expirationDate
              : new Date((data as any).expirationDate as any).toISOString();
          const base = raw.split('Z')[0];
          return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(base)
            ? toUTCEquivalent(base.substring(0, 16) + ':00')
            : toUTCEquivalent(base.substring(0, 10) + 'T00:00:00');
        })()
      : undefined;
    const reactif = await (prisma as any).reactifInventaire.update({
      where: { id: Number(id) },
      data: (() => {
        // IMPORTANT: ne pas utiliser l'opérateur ?? directement pour les champs nullable autrement null devient undefined (et n'est pas écrit)
        const update: any = {
          stock: data.stock ?? undefined,
          unit: (data as any).unit ?? undefined,
          minStock: (data as any).minStock ?? undefined,
          notes: (data as any).notes ?? undefined,
          supplierId: supplierId,
        };
        // Dates: normPurchase/normExpiration vaut undefined si absentes; si on veut supporter reset -> envoyer explicitement null côté front (à prévoir si besoin)
        if (normPurchase !== undefined) update.purchaseDate = normPurchase;
        if (normExpiration !== undefined) update.expirationDate = normExpiration;
        // Propager explicitement null si demandé (reset salle / localisation)
        if (Object.prototype.hasOwnProperty.call(data, 'salleId')) {
          update.salleId = data.salleId === null ? null : data.salleId;
        }
        if (Object.prototype.hasOwnProperty.call(data, 'localisationId')) {
          update.localisationId = data.localisationId === null ? null : data.localisationId;
        }
        return update;
      })(),
      include: {
        reactifPreset: true,
        salle: {
          select: { id: true, name: true },
        },
        localisation: {
          select: { id: true, name: true },
        },
        supplier: true,
      },
    });

    // Create notification with detailed changes if _changes provided
    if (_changes && Object.keys(_changes).length > 0) {
      const changeTexts: string[] = [];
      for (const [field, change] of Object.entries(
        _changes as Record<string, { before: any; after: any }>,
      )) {
        if (field === 'stock' || field === 'quantity') {
          changeTexts.push(`Stock : ${change.before} → ${change.after}`);
        } else if (field === 'minStock') {
          changeTexts.push(`Stock min : ${change.before} → ${change.after}`);
        } else if (field === 'unit') {
          changeTexts.push(`Unité : ${change.before || '(vide)'} → ${change.after || '(vide)'}`);
        } else if (field === 'salle' || field === 'salleId') {
          changeTexts.push(
            `Salle : ${change.before || '(aucune)'} → ${change.after || '(aucune)'}`,
          );
        } else if (field === 'localisation' || field === 'localisationId') {
          changeTexts.push(
            `Localisation: ${change.before || '(aucune)'} → ${change.after || '(aucune)'}`,
          );
        } else if (field === 'supplier' || field === 'supplierName' || field === 'supplierId') {
          changeTexts.push(
            `Fournisseur : ${change.before || '(aucun)'} → ${change.after || '(aucun)'}`,
          );
        } else if (field === 'purchaseDate') {
          changeTexts.push(
            `Date d'achat : ${change.before || '(vide)'} → ${change.after || '(vide)'}`,
          );
        } else if (field === 'expirationDate') {
          changeTexts.push(
            `Date d'expiration : ${change.before || '(vide)'} → ${change.after || '(vide)'}`,
          );
        } else if (field === 'notes') {
          changeTexts.push(`Notes : ${change.before || '(vide)'} → ${change.after || '(vide)'}`);
        } else {
          changeTexts.push(`${field}: ${change.before || '(vide)'} → ${change.after || '(vide)'}`);
        }
      }

      notificationService
        .createAndDispatch({
          module: 'CHEMICALS',
          actionType: 'UPDATE',
          message:
            `Réactif d'inventaire mis à jour: <strong>${reactif.reactifPreset.name}</strong>` +
            (changeTexts.length ? `<br/>Modifications: ${changeTexts.join(', ')}` : ''),
          data: {
            inventoryId: reactif.id,
            changes: _changes,
            changesSummary: changeTexts,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        })
        .catch((error) => console.error('Error creating notification:', error));
    } else {
      // Fallback notification without changes detail
      notificationService
        .createAndDispatch({
          module: 'CHEMICALS',
          actionType: 'UPDATE',
          message: `Réactif d'inventaire mis à jour: <strong>${reactif.reactifPreset.name}</strong>`,
          data: {
            inventoryId: reactif.id,
            updated: Object.keys(data),
            stockPrev: before?.stock,
            stockNew: reactif.stock,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        })
        .catch((error) => console.error('Error creating notification:', error));
    }

    // Alerte minStock (si défini) et rupture de stock
    try {
      const minStock: number | null = (reactif as any).minStock ?? null;
      if (reactif.stock === 0) {
        await notificationService.createAndDispatch({
          module: 'CHEMICALS',
          actionType: 'ALERT',
          message: `⛔ Rupture de stock: <strong>${reactif.reactifPreset.name}</strong>`,
          severity: 'high',
          data: {
            inventoryId: reactif.id,
            currentStock: reactif.stock,
            minStock,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        });
      } else if (minStock != null && reactif.stock <= minStock) {
        await notificationService.createAndDispatch({
          module: 'CHEMICALS',
          actionType: 'ALERT',
          message: `⚠️ Stock faible: <strong>${reactif.reactifPreset.name}</strong> (${reactif.stock} restant)`,
          severity: 'medium',
          data: {
            inventoryId: reactif.id,
            currentStock: reactif.stock,
            minStock,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        });
      }
    } catch {}

    return NextResponse.json({ reactif });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 },
      );
    }
    console.error('Erreur lors de la mise à jour du réactif:', error);
    return NextResponse.json({ error: 'Failed to update reactif' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleteId = Number(id);
    let name: string | undefined;
    try {
      const existing = await prisma.reactifInventaire.findUnique({
        where: { id: deleteId },
        select: { reactifPreset: { select: { name: true } } },
      });
      name = existing?.reactifPreset.name;
    } catch {}
    await prisma.reactifInventaire.delete({ where: { id: deleteId } });
    const session = await auth();
    if (name)
      notificationService
        .createAndDispatch({
          module: 'CHEMICALS',
          actionType: 'DELETE',
          message: `Réactif d'inventaire supprimé: <strong>${name}</strong>`,
          data: {
            inventoryId: deleteId,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
          // excludeUserIds: session?.user?.id ? [Number(session.user.id)] : [],
        })
        .catch((e) => console.error('[reactifs][notify][delete]', e));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du réactif:', error);
    return NextResponse.json({ error: 'Failed to delete reactif' }, { status: 500 });
  }
}
