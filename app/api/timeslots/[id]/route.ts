// api/timeslots/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
// Store local-literal datetime strings as-is; no timezone conversion
import { z } from 'zod';
import { auth } from '@/auth';
import { loadAppSettings } from '@/lib/services/app-settings';
import { notificationService } from '@/lib/services/notification-service';

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

const updateSlotSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeslotDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  proposedStartDate: z.string().optional(),
  proposedEndDate: z.string().optional(),
  proposedTimeslotDate: z.string().nullable().optional(),
  proposedNotes: z.string().optional(),
  state: z
    .enum([
      'created',
      'modified',
      'deleted',
      'invalidated',
      'approved',
      'rejected',
      'restored',
      'counter_proposed',
    ])
    .optional(),
  salleIds: z.array(z.number().int()).optional(),
  classIds: z.array(z.number().int()).optional(),
  // Special flags for counter-proposal handling
  acceptCounterProposal: z.boolean().optional(),
  clearProposedFields: z.boolean().optional(),
});

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const session = await auth();
    const body = await req.json();
    const data = updateSlotSchema.parse(body);

    // Normalize datetime strings to ISO-8601 format
    const normalizeToISO = (input?: string): string | null => {
      if (!input) return null;
      // If already has timezone info (Z or +/-), accept as-is (ensure milliseconds)
      if (/Z$|[+-]\d{2}:?\d{2}$/.test(input)) {
        if (/\.\d{3}Z$/.test(input) || /\.\d{3}[+-]\d{2}:?\d{2}$/.test(input)) return input;
        // Add milliseconds before TZ
        return input.replace(/(Z|[+-]\d{2}:?\d{2})$/, '.000$1');
      }
      // Date only
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return `${input}T00:00:00.000Z`;
      // YYYY-MM-DDTHH:MM
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return `${input}:00.000Z`;
      // YYYY-MM-DDTHH:MM:SS
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(input)) return `${input}.000Z`;
      // Fallback: try Date parsing without changing wall time; if parseable, return iso
      const d = new Date(input);
      if (!isNaN(d.getTime())) return d.toISOString();
      return null;
    };

    // Get current slot to access proposed fields if needed
    const currentSlot = await prisma.creneau.findUnique({
      where: { id },
      select: {
        id: true,
        proposedStartDate: true,
        proposedEndDate: true,
        proposedTimeslotDate: true,
        proposedNotes: true,
        startDate: true,
        endDate: true,
        timeslotDate: true,
        state: true,
        // Also capture salle/class associations to detect assignment changes
        salleIds: true,
        classIds: true,
      },
    });

    if (!currentSlot) {
      return NextResponse.json({ error: 'Timeslot not found' }, { status: 404 });
    }

    let updateData: any = {};

    // Handle special case: accept counter-proposal
    if (data.acceptCounterProposal) {
      updateData = {
        // Move proposed fields to actual fields
        ...(currentSlot.proposedStartDate ? { startDate: currentSlot.proposedStartDate } : {}),
        ...(currentSlot.proposedEndDate ? { endDate: currentSlot.proposedEndDate } : {}),
        ...(currentSlot.proposedTimeslotDate
          ? { timeslotDate: currentSlot.proposedTimeslotDate }
          : {}),
        // Clear proposed fields
        proposedStartDate: null,
        proposedEndDate: null,
        proposedTimeslotDate: null,
        proposedNotes: null,
        state: data.state || 'approved',
      };
    }
    // Handle special case: clear proposed fields (owner counter-proposal)
    else if (data.clearProposedFields) {
      updateData = {
        // Update actual fields with new values - normalize to ISO format
        ...(data.startDate ? { startDate: normalizeToISO(data.startDate) } : {}),
        ...(data.endDate ? { endDate: normalizeToISO(data.endDate) } : {}),
        ...(data.timeslotDate !== undefined
          ? {
              timeslotDate: data.timeslotDate ? normalizeToISO(data.timeslotDate) : null,
            }
          : {}),
        // Clear proposed fields
        proposedStartDate: null,
        proposedEndDate: null,
        proposedTimeslotDate: null,
        proposedNotes: null,
        state: data.state || 'modified',
        ...(data.salleIds ? { salleIds: data.salleIds } : {}),
        ...(data.classIds ? { classIds: data.classIds } : {}),
      };
    }
    // Normal update case - clear proposed fields on any modification
    else {
      updateData = {
        ...data,
        // Normalize datetime strings to ISO format
        ...(data.startDate ? { startDate: normalizeToISO(data.startDate) } : {}),
        ...(data.endDate ? { endDate: normalizeToISO(data.endDate) } : {}),
        ...(data.timeslotDate !== undefined
          ? {
              timeslotDate: data.timeslotDate ? normalizeToISO(data.timeslotDate) : null,
            }
          : {}),
        // Handle proposed fields for counter-proposals
        ...(data.proposedStartDate
          ? { proposedStartDate: normalizeToISO(data.proposedStartDate) }
          : {}),
        ...(data.proposedEndDate ? { proposedEndDate: normalizeToISO(data.proposedEndDate) } : {}),
        ...(data.proposedTimeslotDate !== undefined
          ? {
              proposedTimeslotDate: data.proposedTimeslotDate
                ? normalizeToISO(data.proposedTimeslotDate)
                : null,
            }
          : {}),
        ...(data.proposedNotes !== undefined ? { proposedNotes: data.proposedNotes } : {}),
        ...(data.salleIds ? { salleIds: data.salleIds } : {}),
        ...(data.classIds ? { classIds: data.classIds } : {}),
        // Clear proposed fields when modifying actual fields (unless it's a counter-proposal)
        ...(data.startDate || data.endDate || data.timeslotDate !== undefined
          ? {
              proposedStartDate: null,
              proposedEndDate: null,
              proposedTimeslotDate: null,
              proposedNotes: null,
            }
          : {}),
      };
    }

    // Note: client-side gating prevents no-op updates; server proceeds with updateData as provided

    const slot = await prisma.creneau.update({
      where: { id },
      data: updateData,
    });

    // Agréger les IDs de toutes les salles/classes des créneaux de l'événement pour maintenir Evenement.*Ids
    try {
      const allSlots = await prisma.creneau.findMany({
        where: { eventId: slot.eventId },
        select: { salleIds: true, classIds: true },
      });
      const salleSet = new Set<number>();
      const classSet = new Set<number>();
      for (const s of allSlots) {
        if (Array.isArray(s.salleIds)) {
          for (const id of s.salleIds as any[]) if (typeof id === 'number') salleSet.add(id);
        }
        if (Array.isArray(s.classIds)) {
          for (const id of s.classIds as any[]) if (typeof id === 'number') classSet.add(id);
        }
      }
      const aggregatedSalleIds = Array.from(salleSet.values());
      const aggregatedClassIds = Array.from(classSet.values());
      const updatedEvent = await prisma.evenement.update({
        where: { id: slot.eventId },
        data: { salleIds: aggregatedSalleIds, classIds: aggregatedClassIds },
        select: { id: true, salleIds: true, classIds: true },
      });
      // Owner-targeted notification for direct timeslot edits
      try {
        const settings = await loadAppSettings();
        if (
          settings.notificationOwnerEvents?.enabled &&
          settings.notificationOwnerEvents.includeTimeslots
        ) {
          const ev = await prisma.evenement.findUnique({
            where: { id: slot.eventId },
            select: { ownerId: true, title: true },
          });
          const actorId = session?.user?.id ? Number(session.user.id) : 0;
          const actorName = session?.user?.name || session?.user?.email || 'Un utilisateur';
          // Compose before/after strings (prefer timeslotDate else startDate)
          const beforeDate = currentSlot.timeslotDate || currentSlot.startDate;
          const afterDate = slot.timeslotDate || slot.startDate;
          const fmt = (d?: string | Date | null) =>
            d
              ? new Date(d as any).toLocaleString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : undefined;
          const beforeStr = fmt(beforeDate);
          const afterStr = fmt(afterDate);

          // Detect salle/class assignment changes
          const toNumArray = (v: any): number[] => {
            if (Array.isArray(v)) return (v as any[]).filter((x) => typeof x === 'number');
            try {
              if (typeof v === 'string') {
                const p = JSON.parse(v);
                return Array.isArray(p) ? p.filter((x) => typeof x === 'number') : [];
              }
            } catch {}
            return [];
          };
          const beforeSalle = toNumArray((currentSlot as any).salleIds);
          const beforeClass = toNumArray((currentSlot as any).classIds);
          const afterSalle = toNumArray((slot as any).salleIds);
          const afterClass = toNumArray((slot as any).classIds);
          const salleChanged = JSON.stringify(beforeSalle) !== JSON.stringify(afterSalle);
          const classChanged = JSON.stringify(beforeClass) !== JSON.stringify(afterClass);

          const blocked = settings.notificationOwnerEvents?.blockedUserIds || [];
          // Always notify the owner (even if they are the actor), unless explicitly blocked
          if (ev?.ownerId && !blocked.includes(ev.ownerId)) {
            // Build message: mention date change if any, otherwise mention salle/class assignment changes
            const baseTitle = ev.title || '';
            let message = '';
            if (beforeStr !== afterStr) {
              message = `Un créneau de votre événement <strong>${baseTitle}</strong> a été modifié par <strong>${actorName}</strong>${
                beforeStr || afterStr ? ` : ${beforeStr || '—'} -> ${afterStr || '—'}` : ''
              }`;
            } else if (salleChanged || classChanged) {
              const parts: string[] = [];
              if (salleChanged) parts.push('salles');
              if (classChanged) parts.push('classes');
              const what = parts.join(' et ');
              message = `Les ${what} associées à un créneau de votre événement <strong>${baseTitle}</strong> ont été mises à jour par <strong>${actorName}</strong>.`;
            } else {
              // Fallback (should rarely happen)
              message = `Un créneau de votre événement <strong>${baseTitle}</strong> a été mis à jour par <strong>${actorName}</strong>.`;
            }

            await notificationService.createAndDispatch({
              module: 'EVENTS_OWNER',
              actionType: 'OWNER_TIMESLOT_UPDATED',
              severity: 'low',
              message,
              data: {
                timeslotId: slot.id,
                timeslotIds: [slot.id],
                eventId: slot.eventId,
                byUserId: actorId,
                before: beforeDate,
                after: afterDate,
                salleIdsBefore: beforeSalle,
                salleIdsAfter: afterSalle,
                classIdsBefore: beforeClass,
                classIdsAfter: afterClass,
              },
              targetUserIds: [ev.ownerId],
            });
          }
        }
      } catch {}
      const mapped = slot
        ? {
            ...slot,
            createdAt: toLocalLiteral((slot as any).createdAt),
            updatedAt: toLocalLiteral((slot as any).updatedAt),
          }
        : slot;
      return NextResponse.json({ timeslot: mapped, event: updatedEvent });
    } catch (aggErr) {
      // En cas d'échec de l'agrégation on renvoie quand même le créneau mis à jour
      console.error('[timeslot][aggregateIds]', aggErr);
      const mapped = slot
        ? {
            ...slot,
            createdAt: toLocalLiteral((slot as any).createdAt),
            updatedAt: toLocalLiteral((slot as any).updatedAt),
          }
        : slot;
      return NextResponse.json({ timeslot: mapped, aggregationError: true });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update timeslot' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    // Fetch slot first to get eventId and details for notifications and aggregation
    const slot = await prisma.creneau.findUnique({
      where: { id },
      select: {
        id: true,
        eventId: true,
        startDate: true,
        endDate: true,
        timeslotDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!slot) return NextResponse.json({ error: 'Timeslot not found' }, { status: 404 });

    await prisma.creneau.delete({ where: { id } });

    // After deletion, re-aggregate Evenement salleIds/classIds
    let updatedEvent: any = undefined;
    try {
      const allSlots = await prisma.creneau.findMany({
        where: { eventId: slot.eventId },
        select: { salleIds: true, classIds: true },
      });
      const salleSet = new Set<number>();
      const classSet = new Set<number>();
      for (const s of allSlots) {
        if (Array.isArray(s.salleIds)) {
          for (const sid of s.salleIds as any[]) if (typeof sid === 'number') salleSet.add(sid);
        }
        if (Array.isArray(s.classIds)) {
          for (const cid of s.classIds as any[]) if (typeof cid === 'number') classSet.add(cid);
        }
      }
      updatedEvent = await prisma.evenement.update({
        where: { id: slot.eventId },
        data: { salleIds: Array.from(salleSet.values()), classIds: Array.from(classSet.values()) },
        select: { id: true },
      });
    } catch (aggErr) {
      console.error('[timeslot][delete][aggregateIds]', aggErr);
    }

    // Owner notification about deletion
    try {
      const settings = await loadAppSettings();
      if (
        settings.notificationOwnerEvents?.enabled &&
        settings.notificationOwnerEvents.includeTimeslots
      ) {
        const ev = await prisma.evenement.findUnique({
          where: { id: slot.eventId },
          select: { ownerId: true, title: true },
        });
        const blocked = settings.notificationOwnerEvents?.blockedUserIds || [];
        if (ev?.ownerId && !blocked.includes(ev.ownerId)) {
          const session = await auth();
          const actorId = session?.user?.id ? Number(session.user.id) : 0;
          const actorName = session?.user?.name || session?.user?.email || 'Un utilisateur';
          const baseTitle = ev.title || 'votre événement';
          const dateRef = slot.timeslotDate || slot.startDate;
          const dateStr = dateRef
            ? new Date(dateRef as any).toLocaleString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : undefined;
          const message = `Un créneau de votre événement <strong>${baseTitle}</strong> a été supprimé par <strong>${actorName}</strong>${
            dateStr ? ` (créneau: ${dateStr})` : ''
          }.`;
          await notificationService.createAndDispatch({
            module: 'EVENTS_OWNER',
            actionType: 'OWNER_TIMESLOT_DELETED',
            severity: 'low',
            message,
            data: {
              timeslotId: slot.id,
              timeslotIds: [slot.id],
              eventId: slot.eventId,
              byUserId: actorId,
              before: dateRef,
              after: null,
            },
            targetUserIds: [ev.ownerId],
          });
        }
      }
    } catch (notifyErr) {
      console.error('[timeslot][delete][notify]', notifyErr);
    }

    return NextResponse.json({ ok: true, event: updatedEvent });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete timeslot' }, { status: 500 });
  }
}
