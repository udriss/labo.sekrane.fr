// api/events/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';
import { notificationService } from '@/lib/services/notification-service';
import { loadAppSettings } from '@/lib/services/app-settings';
import { auth } from '@/auth';

const toLocalLiteral = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const toLocal = (dt: Date) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  if (typeof d === 'string') {
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(d)) return d.replace(/\.\d{3}$/, '');
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? d : toLocal(parsed);
  }
  return toLocal(d);
};
const updateEventSchema = z.object({
  title: z.string().optional(),
  discipline: z.enum(['chimie', 'physique']).optional(),
  type: z.enum(['TP', 'LABORANTIN_CHIMIE', 'LABORANTIN_PHYSIQUE']).optional(),
  notes: z.string().optional(),
  classIds: z.array(z.number().int()).optional(),
  salleIds: z.array(z.number().int()).optional(),
  materiels: z
    .array(
      z.object({
        id: z.number().optional(),
        materielId: z.number().optional(),
        name: z.string(),
        quantity: z.number().default(1),
        isCustom: z.boolean().default(false),
      }),
    )
    .optional(),
  reactifs: z
    .array(
      z.object({
        id: z.number().optional(),
        reactifId: z.number().optional(),
        name: z.string(),
        requestedQuantity: z.number().default(0),
        unit: z.string().default('g'),
        isCustom: z.boolean().default(false),
      }),
    )
    .optional(),
  documents: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number().optional(),
        fileType: z.string().optional(),
      }),
    )
    .optional(),
});

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  try {
    const event = await prisma.evenement.findUnique({
      where: { id },
      // NOTE: After schema change (event-level custom requests) we include new relations.
      // If TypeScript complains (client not yet regenerated) cast includes as any to bypass until `pnpm prisma generate` or `npm run db:generate` is executed.
      include: {
        owner: { select: { id: true, name: true, email: true } },
        timeslots: true,
        materiels: {
          include: { materiel: { select: { id: true, name: true, discipline: true } } },
        },
        reactifs: {
          include: {
            reactif: { include: { reactifPreset: { select: { id: true, name: true } } } },
          },
        },
        customMaterielRequests: true,
        customReactifRequests: true,
        documents: true,
      },
    });
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const mapped: any = {
      ...event,
      createdAt: toLocalLiteral((event as any).createdAt),
      updatedAt: toLocalLiteral((event as any).updatedAt),
      timeslots: (event as any).timeslots?.map((t: any) => ({
        ...t,
        createdAt: toLocalLiteral(t.createdAt),
        updatedAt: toLocalLiteral(t.updatedAt),
      })),
      materiels: (event as any).materiels?.map((m: any) => ({
        ...m,
        createdAt: toLocalLiteral(m.createdAt),
        updatedAt: toLocalLiteral(m.updatedAt),
      })),
      reactifs: (event as any).reactifs?.map((r: any) => ({
        ...r,
        createdAt: toLocalLiteral(r.createdAt),
        updatedAt: toLocalLiteral(r.updatedAt),
      })),
      customMaterielRequests: (event as any).customMaterielRequests?.map((cm: any) => ({
        ...cm,
        createdAt: toLocalLiteral(cm.createdAt),
        updatedAt: toLocalLiteral(cm.updatedAt),
      })),
      customReactifRequests: (event as any).customReactifRequests?.map((cr: any) => ({
        ...cr,
        createdAt: toLocalLiteral(cr.createdAt),
        updatedAt: toLocalLiteral(cr.updatedAt),
      })),
      documents: (event as any).documents?.map((d: any) => ({
        ...d,
        createdAt: toLocalLiteral(d.createdAt),
        updatedAt: toLocalLiteral(d.updatedAt),
      })),
    };
    return NextResponse.json({ event: mapped });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const session = await auth();
    const raw = await req.json();
    // Filtrer les champs pertinents pour la mise à jour de l'événement (ignorer state, reason, timeSlots, etc.)
    const data: any = {};
    const allowedKeys: (keyof typeof raw)[] = [
      'title',
      'discipline',
      'type',
      'notes',
      'classIds',
      'salleIds',
      'materiels',
      'reactifs',
      'documents',
    ];
    for (const k of allowedKeys) if (raw[k] !== undefined) data[k] = raw[k];
    const validatedData = updateEventSchema.parse(data);

    // Get original event for notification comparison
    const beforeUpdate = await prisma.evenement.findUnique({
      where: { id },
      include: {
        materiels: true,
        reactifs: true,
        documents: true,
      },
    });

    if (!beforeUpdate) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const updated = await prisma.evenement.update({
      where: { id },
      data: {
        title: data.title && data.title.trim().length > 0 ? data.title : undefined,
        discipline: data.discipline,
        type: data.type,
        notes: data.notes,
        ...(Array.isArray(data.classIds) ? { classIds: data.classIds } : {}),
        ...(Array.isArray(data.salleIds) ? { salleIds: data.salleIds } : {}),
        ...(Array.isArray(data.materiels)
          ? {
              materiels: {
                deleteMany: {},
                create: data.materiels.map((mat: any) => ({
                  materielId: mat.materielId,
                  materielName: mat.name,
                  quantity: mat.quantity,
                  isCustom: mat.isCustom,
                })),
              },
            }
          : {}),
        ...(Array.isArray(data.reactifs)
          ? {
              reactifs: {
                deleteMany: {},
                create: data.reactifs.map((react: any) => ({
                  reactifId: react.reactifId,
                  reactifName: react.name,
                  requestedQuantity: react.requestedQuantity,
                  unit: react.unit,
                  isCustom: react.isCustom,
                })),
              },
            }
          : {}),
        ...(Array.isArray(data.documents)
          ? {
              documents: {
                deleteMany: {},
                create: data.documents.map((doc: any) => ({
                  fileName: doc.fileName,
                  fileUrl: doc.fileUrl,
                  fileSize: doc.fileSize,
                  fileType: doc.fileType,
                })),
              },
            }
          : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        timeslots: true,
        materiels: {
          include: { materiel: { select: { id: true, name: true, discipline: true } } },
        },
        reactifs: {
          include: {
            reactif: { include: { reactifPreset: { select: { id: true, name: true } } } },
          },
        },
        documents: true,
        customMaterielRequests: true,
        customReactifRequests: true,
      },
    });
    const final =
      !data.title || data.title.trim().length === 0
        ? await prisma.evenement.update({
            where: { id },
            data: { title: `Événement ID ${id}` },
            include: {
              owner: { select: { id: true, name: true, email: true } },
              timeslots: true,
              materiels: {
                include: { materiel: { select: { id: true, name: true, discipline: true } } },
              },
              reactifs: {
                include: {
                  reactif: { include: { reactifPreset: { select: { id: true, name: true } } } },
                },
              },
              documents: true,
              customMaterielRequests: true,
              customReactifRequests: true,
            },
          })
        : updated;

    // Send notification for event update (broadcast)
    const updatedFields = Object.keys(validatedData);
    const actorName = session?.user?.name || session?.user?.email || 'Un utilisateur';
    const ownerName = final.owner?.name || final.owner?.email || 'propriétaire';
    const dateCandidateU = (final.timeslots || [])
      .map((t: any) => t.timeslotDate || t.startDate)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(a as any).getTime() - new Date(b as any).getTime())[0] as
      | string
      | Date
      | undefined;
    const dateStrU = dateCandidateU
      ? new Date(dateCandidateU).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : undefined;
    const finalAny: any = final;
    notificationService
      .createAndDispatch({
        module: 'EVENTS_GLOBAL',
        actionType: 'UPDATE',
        message: `${actorName} a modifié un événement de ${ownerName} en ${final.discipline}${
          dateStrU ? ` prévu le ${dateStrU}` : ''
        }`,
        data: {
          eventId: final.id,
          title: final.title,
          discipline: final.discipline,
          updatedFields,
          classesCountBefore: Array.isArray((beforeUpdate as any).classIds)
            ? (beforeUpdate as any).classIds.length
            : 0,
          classesCountAfter: Array.isArray(finalAny.classIds) ? finalAny.classIds.length : 0,
          sallesCountBefore: Array.isArray((beforeUpdate as any).salleIds)
            ? (beforeUpdate as any).salleIds.length
            : 0,
          sallesCountAfter: Array.isArray(finalAny.salleIds) ? finalAny.salleIds.length : 0,
          materielsCountBefore: (beforeUpdate as any).materiels?.length || 0,
          materielsCountAfter: finalAny.materiels?.length || 0,
          reactifsCountBefore: (beforeUpdate as any).reactifs?.length || 0,
          reactifsCountAfter: finalAny.reactifs?.length || 0,
          documentsCountBefore: (beforeUpdate as any).documents?.length || 0,
          documentsCountAfter: finalAny.documents?.length || 0,
          triggeredBy: session?.user?.name || session?.user?.email || 'système',
        },
        // Exclude actor and owner (owner already gets OWNER notification; actor doesn't need global echo)
        excludeUserIds: [
          ...(session?.user?.id ? [Number(session.user.id)] : []),
          ...(final.owner?.id ? [Number(final.owner.id)] : []),
        ],
      })
      .catch((e) => console.error('[events][notify][update]', e));

    // Targeted notification to event owner (if actor != owner)
    try {
      const settings = await loadAppSettings();
      if (settings.notificationOwnerEvents?.enabled) {
        const ownerId =
          final.owner?.id ||
          (await prisma.evenement.findUnique({ where: { id }, select: { ownerId: true } }))
            ?.ownerId;
        const actorId = session?.user?.id ? Number(session.user.id) : null;
        const blocked = settings.notificationOwnerEvents?.blockedUserIds || [];
        const targets = ownerId && !blocked.includes(ownerId) ? [ownerId] : [];
        if (targets.length && actorId) {
          await notificationService.createAndDispatch({
            module: 'EVENTS_OWNER',
            actionType: 'OWNER_UPDATE',
            severity: 'medium',
            message: `Votre événement <strong>${final.title}</strong> a été modifié`,
            data: {
              eventId: final.id,
              title: final.title,
              updatedFields,
              byUserId: actorId,
              byUser: session?.user?.name || session?.user?.email || 'utilisateur',
            },
            targetUserIds: targets,
          });
        }
      }
    } catch (e) {
      console.error('[events][ownerNotify][update]', e);
    }

    const mapped: any = final
      ? {
          ...final,
          createdAt: toLocalLiteral((final as any).createdAt),
          updatedAt: toLocalLiteral((final as any).updatedAt),
          timeslots: (final as any).timeslots?.map((t: any) => ({
            ...t,
            createdAt: toLocalLiteral(t.createdAt),
            updatedAt: toLocalLiteral(t.updatedAt),
          })),
          materiels: (final as any).materiels?.map((m: any) => ({
            ...m,
            createdAt: toLocalLiteral(m.createdAt),
            updatedAt: toLocalLiteral(m.updatedAt),
          })),
          reactifs: (final as any).reactifs?.map((r: any) => ({
            ...r,
            createdAt: toLocalLiteral(r.createdAt),
            updatedAt: toLocalLiteral(r.updatedAt),
          })),
          documents: (final as any).documents?.map((d: any) => ({
            ...d,
            createdAt: toLocalLiteral(d.createdAt),
            updatedAt: toLocalLiteral(d.updatedAt),
          })),
          customMaterielRequests: (final as any).customMaterielRequests?.map((cm: any) => ({
            ...cm,
            createdAt: toLocalLiteral(cm.createdAt),
            updatedAt: toLocalLiteral(cm.updatedAt),
          })),
          customReactifRequests: (final as any).customReactifRequests?.map((cr: any) => ({
            ...cr,
            createdAt: toLocalLiteral(cr.createdAt),
            updatedAt: toLocalLiteral(cr.updatedAt),
          })),
        }
      : final;
    return NextResponse.json({ event: mapped });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  try {
    const session = await auth();

    // Get event details before deletion for notification
    const eventToDelete = await prisma.evenement.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        timeslots: true,
        materiels: true,
        reactifs: true,
        documents: true,
      },
    });

    if (!eventToDelete) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Also delete associated timeslots via ON DELETE or manually
    // Creneau has FK to Evenement without cascade; delete timeslots first
    await prisma.creneau.deleteMany({ where: { eventId: id } });
    await prisma.evenement.delete({ where: { id } });

    // Compose deletion message details (actor, owner, date)
    const actorNameD = session?.user?.name || session?.user?.email || 'Un utilisateur';
    const ownerNameD = eventToDelete.owner?.name || eventToDelete.owner?.email || 'propriétaire';
    const dateCandidateD = (eventToDelete.timeslots || [])
      .map((t: any) => t.timeslotDate || t.startDate)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(a as any).getTime() - new Date(b as any).getTime())[0] as
      | string
      | Date
      | undefined;
    const dateStrD = dateCandidateD
      ? new Date(dateCandidateD).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : undefined;

    // Send notification for event deletion (broadcast)
    notificationService
      .createAndDispatch({
        module: 'EVENTS_GLOBAL',
        actionType: 'DELETE',
        message: `${actorNameD} a supprimé un événement de ${ownerNameD} en ${eventToDelete.discipline}${
          dateStrD ? ` prévu le ${dateStrD}` : ''
        }`,
        data: {
          eventId: id,
          title: eventToDelete.title,
          discipline: eventToDelete.discipline,
          classesCount: Array.isArray((eventToDelete as any).classIds)
            ? (eventToDelete as any).classIds.length
            : 0,
          sallesCount: Array.isArray((eventToDelete as any).salleIds)
            ? (eventToDelete as any).salleIds.length
            : 0,
          materielsCount: eventToDelete.materiels?.length || 0,
          reactifsCount: eventToDelete.reactifs?.length || 0,
          documentsCount: eventToDelete.documents?.length || 0,
          triggeredBy: session?.user?.name || session?.user?.email || 'système',
        },
        excludeUserIds: [
          ...(session?.user?.id ? [Number(session.user.id)] : []),
          ...(eventToDelete.owner?.id ? [Number(eventToDelete.owner.id)] : []),
        ],
      })
      .catch((e) => console.error('[events][notify][delete]', e));

    // Targeted owner notification (if deleted by another)
    try {
      const settings = await loadAppSettings();
      if (settings.notificationOwnerEvents?.enabled && eventToDelete.owner) {
        const actorId = session?.user?.id ? Number(session.user.id) : null;
        const ownerId = (eventToDelete as any).owner?.id || (eventToDelete as any).ownerId;
        const blocked = settings.notificationOwnerEvents?.blockedUserIds || [];
        const targets = ownerId && !blocked.includes(ownerId) ? [ownerId] : [];
        if (targets.length && actorId) {
          await notificationService.createAndDispatch({
            module: 'EVENTS_OWNER',
            actionType: 'OWNER_DELETE',
            severity: 'high',
            message: `Votre événement <strong>${eventToDelete.title}</strong> a été supprimé`,
            data: {
              eventId: id,
              title: eventToDelete.title,
              byUserId: actorId,
              byUser: session?.user?.name || session?.user?.email || 'utilisateur',
            },
            targetUserIds: targets,
          });
        }
      }
    } catch (e) {
      console.error('[events][ownerNotify][delete]', e);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
