import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const sourceId = Number(idStr);
  if (!Number.isFinite(sourceId))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const src = await prisma.evenementPreset.findUnique({
      where: { id: sourceId },
      include: {
        materiels: true,
        reactifs: true,
        documents: true,
        creneaux: true,
      },
    });
    if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Allow copy if owner or shared with user
    const sharedIds: number[] = Array.isArray((src as any).sharedIds)
      ? ((src as any).sharedIds as any[])
      : [];
    if (src.ownerId !== userId && !sharedIds.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const created = await prisma.evenementPreset.create({
      data: {
        title: src.title,
        discipline: src.discipline,
        notes: src.notes || null,
        ownerId: userId,
        sharedIds: [],
      },
    });

    // Copy collections
    if (src.materiels?.length) {
      await prisma.evenementPresetMateriel.createMany({
        data: src.materiels.map((m) => ({
          presetId: created.id,
          materielId: m.materielId,
          materielName: m.materielName,
          quantity: m.quantity,
          isCustom: m.isCustom,
        })),
      });
    }
    if (src.reactifs?.length) {
      await prisma.evenementPresetReactif.createMany({
        data: src.reactifs.map((r) => ({
          presetId: created.id,
          reactifId: r.reactifId,
          reactifName: r.reactifName,
          requestedQuantity: r.requestedQuantity,
          unit: r.unit,
          isCustom: r.isCustom,
        })),
      });
    }
    if (src.documents?.length) {
      await prisma.evenementPresetDocument.createMany({
        data: src.documents.map((d) => ({
          presetId: created.id,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          fileSize: d.fileSize,
          fileType: d.fileType,
        })),
      });
    }
    if (src.creneaux?.length) {
      await prisma.evenementPresetCreneau.createMany({
        data: src.creneaux.map((c) => ({
          presetId: created.id,
          discipline: c.discipline,
          startDate: c.startDate as any,
          endDate: c.endDate as any,
          timeslotDate: c.timeslotDate as any,
          salleIds: Array.isArray((c as any).salleIds) ? (c as any).salleIds : [],
          classIds: Array.isArray((c as any).classIds) ? (c as any).classIds : [],
          state: 'created',
        })),
      });
    }

    return NextResponse.json({ presetId: created.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to duplicate' }, { status: 500 });
  }
}
