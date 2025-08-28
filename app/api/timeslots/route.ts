// api/timeslots/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { notificationService } from '@/lib/services/notification-service';
import { loadAppSettings } from '@/lib/services/app-settings';
import { z } from 'zod';
import { auth } from '@/auth';
// Store local-literal datetime strings as-is; no timezone conversion

// Helper: local-literal "YYYY-MM-DDTHH:MM:SS" (server local time) for createdAt/updatedAt
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

const createTimeslotSchema = z.object({
  eventId: z.number(),
  discipline: z.enum(['chimie', 'physique']),
  slots: z
    .array(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        timeslotDate: z.string().optional(),
        notes: z.string().optional(),
        // Ensure arrays; coerce undefined/null to empty arrays to avoid dropping values later
        salleIds: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.number().int())),
        classIds: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.number().int())),
      }),
    )
    .min(1),
});

const validateTimeslotSchema = z.object({
  timeslotIds: z.array(z.number()),
  approve: z.boolean(),
  notes: z.string().optional(),
  counterProposal: z
    .object({
      // Optional new proposal per slot; if provided and approve=false, mark as counter_proposed
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      timeslotDate: z.string().optional(),
      salleIds: z.array(z.number().int()).optional(),
      classIds: z.array(z.number().int()).optional(),
      // Notes spécifiques à la contre‑proposition
      notes: z.string().optional(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('event_id');
    const discipline = searchParams.get('discipline');
    const type = searchParams.get('type') ?? 'active';

    let whereClause: any = {};

    if (eventId) whereClause.eventId = parseInt(eventId);
    if (discipline) whereClause.discipline = discipline;

    if (type === 'active') {
      whereClause.state = {
        in: ['created', 'modified', 'approved', 'restored', 'counter_proposed'],
      };
    } else if (type === 'pending') {
      whereClause.state = { in: ['created', 'modified', 'counter_proposed'] };
    }

    const timeslots = await prisma.creneau.findMany({
      where: whereClause,
      include: {
        event: { select: { id: true, title: true } },
      },
      orderBy: [{ timeslotDate: 'asc' }, { startDate: 'asc' }],
    });

    // Prisma returns JSON fields directly; ensure they exist even if null
    const enriched = timeslots.map((t: any) => ({
      ...t,
      salleIds: t.salleIds || [],
      classIds: t.classIds || [],
      createdAt: toLocalLiteral(t.createdAt),
      updatedAt: toLocalLiteral(t.updatedAt),
    }));
    return NextResponse.json({ timeslots: enriched, eventId, discipline, type });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch timeslots' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    const body = await req.json();
    const validated = createTimeslotSchema.parse(body);

    // no debug logs in production

    // Normalize incoming local-like strings into ISO-8601 acceptable for Prisma (no TZ conversion, just fill parts)
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

    // Fetch event to capture ownerId into timeslot.eventOwner
    const ev = await prisma.evenement.findUnique({ where: { id: validated.eventId } });

    const created = await prisma.$transaction(
      validated.slots.map((s) =>
        prisma.creneau.create({
          data: {
            eventId: validated.eventId,
            discipline: validated.discipline,
            // Store local wall time directly (no timezone transforms)
            startDate: normalizeToISO(s.startDate)!,
            endDate: normalizeToISO(s.endDate)!,
            timeslotDate: normalizeToISO(s.timeslotDate || undefined) ?? undefined,
            // notes: s.notes, // Field removed - to be deleted from schema
            state: 'created',
            salleIds: (s.salleIds as number[]) || [],
            classIds: (s.classIds as number[]) || [],
            userId: userId ?? null,
            eventOwner: ev?.ownerId ?? null,
          },
        }),
      ),
    );

    const mapped = created.map((t: any) => ({
      ...t,
      createdAt: toLocalLiteral(t.createdAt),
      updatedAt: toLocalLiteral(t.updatedAt),
    }));

    return NextResponse.json({ timeslots: mapped }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create timeslot' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = validateTimeslotSchema.parse(body);

    // Optional owner-only approval for counter_proposed slots
    const session = await auth();
    const approverId = session?.user?.id ? Number(session.user.id) : null;

    // Fetch target slots to apply nuanced rules
    const slots = await prisma.creneau.findMany({
      where: { id: { in: validatedData.timeslotIds } },
      select: {
        id: true,
        state: true,
        eventOwner: true,
        eventId: true,
        startDate: true,
        endDate: true,
        timeslotDate: true,
      },
    });

    if (validatedData.approve) {
      // Only owner can approve counter_proposed
      const blocked = slots.filter(
        (s) => s.state === 'counter_proposed' && (!approverId || s.eventOwner !== approverId),
      );
      if (blocked.length > 0) {
        return NextResponse.json(
          { error: 'Seul le créateur peut approuver une contre‑proposition pour ces créneaux.' },
          { status: 403 },
        );
      }
      // For counter_proposed slots, promote proposed* fields into active dates
      const updated = await Promise.all(
        slots.map(async (s) =>
          prisma.creneau.update({
            where: { id: s.id },
            data: {
              state: 'approved',
              // notes: validatedData.notes, // Field removed - to be deleted from schema
            },
          }),
        ),
      );
      // Fix: promote proposed fields via raw update (since Prisma can't conditionally set in one call easily)
      // Parameterized promotion of proposed* fields
      const placeholders = validatedData.timeslotIds.map(() => '?').join(',');
      await prisma.$queryRawUnsafe(
        `UPDATE Creneau
          SET startDate = COALESCE(proposedStartDate, startDate),
              endDate = COALESCE(proposedEndDate, endDate),
              timeslotDate = COALESCE(proposedTimeslotDate, timeslotDate),
              proposedStartDate = NULL,
              proposedEndDate = NULL,
              proposedTimeslotDate = NULL,
              proposedNotes = NULL
          WHERE id IN (${placeholders})`,
        ...validatedData.timeslotIds,
      );
      // Notify owners about approval resolution if setting enabled and approver differs
      try {
        const settings = await loadAppSettings();
        if (
          settings.notificationOwnerEvents?.enabled &&
          settings.notificationOwnerEvents.includeTimeslots
        ) {
          // Build owner fallback from events when creneau.eventOwner is null
          const eventIdsForSlots = Array.from(
            new Set(slots.map((s) => s.eventId).filter((v): v is number => !!v)),
          );
          const eventsOwners =
            eventIdsForSlots.length && (prisma as any).evenement?.findMany
              ? await prisma.evenement.findMany({
                  where: { id: { in: eventIdsForSlots } },
                  select: { id: true, ownerId: true, title: true },
                })
              : [];
          const ownerByEvent = new Map<number, number | null>(
            eventsOwners.map((e) => [e.id, (e as any).ownerId ?? null]),
          );
          const titleByEvent = new Map<number, string | null>(
            eventsOwners.map((e) => [e.id, (e as any).title ?? null]),
          );
          const owners = Array.from(
            new Set(
              slots
                .map((s) => s.eventOwner ?? (s.eventId ? ownerByEvent.get(s.eventId) : null))
                .filter((v): v is number => !!v),
            ),
          );

          if (owners.length) {
            const actorId = approverId ?? 0;
            const blocked = settings.notificationOwnerEvents?.blockedUserIds || [];
            // Include actor as target as well (owner may want self-notifications)
            const targets = owners.filter((oid) => !blocked.includes(oid));

            if (targets.length) {
              const eventIds = Array.from(new Set(slots.map((s) => s.eventId).filter(Boolean)));
              // Determine actor name (best-effort)
              const actorName = session?.user?.name || session?.user?.email || 'Un utilisateur';
              // Representative date for message: prefer explicit timeslotDate else startDate (earliest)
              const dateCandidate = slots
                .map((o) => o.timeslotDate || o.startDate)
                .filter(Boolean)
                .sort(
                  (a: any, b: any) => new Date(a as any).getTime() - new Date(b as any).getTime(),
                )[0] as string | Date | undefined;
              const dateStr = dateCandidate
                ? new Date(dateCandidate).toLocaleString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : undefined;
              const count = validatedData.timeslotIds.length;
              let message: string;
              if (eventIds.length === 1 && eventIds[0]) {
                const evId = eventIds[0] as number;
                const title = titleByEvent.get(evId) || 'Événement';
                if (count > 1) {
                  message = `${count} créneaux de votre événement <strong>${title}</strong> ont été approuvés par <strong>${actorName}</strong>${dateStr ? ` (dont le ${dateStr})` : ''}`;
                } else {
                  message = `Le créneau du ${dateStr || '—'} de votre événement <strong>${title}</strong> a été approuvé par <strong>${actorName}</strong>`;
                }
              } else {
                // Multiple events case
                if (count > 1) {
                  message = `${count} créneaux de vos événements ont été approuvés par <strong>${actorName}</strong>${dateStr ? ` (dont le ${dateStr})` : ''}`;
                } else {
                  message = `Un créneau a été approuvé par <strong>${actorName}</strong>${dateStr ? ` (le ${dateStr})` : ''}`;
                }
              }
              await notificationService.createAndDispatch({
                module: 'EVENTS_OWNER',
                actionType: 'OWNER_TIMESLOT_APPROVED',
                severity: 'low',
                message,
                data: {
                  timeslotIds: validatedData.timeslotIds,
                  approvedBy: actorId,
                  ...(eventIds.length === 1 ? { eventId: eventIds[0] } : {}),
                  ...(dateStr ? { date: dateStr } : {}),
                },
                targetUserIds: targets,
              });
            }
          }
        }
      } catch (e) {
        console.error('[timeslots][ownerNotify][approve]', e);
      }

      return NextResponse.json({
        ok: true,
        action: 'approved',
        timeslotIds: validatedData.timeslotIds,
        count: updated.length,
      });
    }

    // Rejection path: optionally mark as counter_proposed with provided alternative
    if (validatedData.counterProposal) {
      const cp = validatedData.counterProposal;

      // Helper to compose a datetime string using a base date and a time string
      // Direct string manipulation to avoid timezone conversions
      const buildDateString = (baseDate: string | Date, timeStr?: string): string | null => {
        if (!timeStr) return null;

        // Extract time components from timeStr (format: "HH:MM" or full datetime)
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (!timeMatch) return null;

        const hours = timeMatch[1].padStart(2, '0');
        const minutes = timeMatch[2];

        // Convert baseDate to string if it's a Date object
        let datePart: string;
        if (typeof baseDate === 'string') {
          datePart = baseDate.split('T')[0]; // Get YYYY-MM-DD part
        } else {
          // If it's a Date object, convert to YYYY-MM-DD format manually to avoid timezone issues
          const year = baseDate.getFullYear();
          const month = (baseDate.getMonth() + 1).toString().padStart(2, '0');
          const day = baseDate.getDate().toString().padStart(2, '0');
          datePart = `${year}-${month}-${day}`;
        }

        return `${datePart}T${hours}:${minutes}:00.000Z`;
      };

      const updates = await Promise.all(
        slots.map(async (slot) => {
          const baseDate = cp.timeslotDate || slot.timeslotDate || slot.startDate;
          const proposedStart = buildDateString(baseDate, cp.startDate || undefined);
          const proposedEnd = buildDateString(baseDate, cp.endDate || undefined);
          const proposedTimeslot = buildDateString(baseDate, cp.timeslotDate || undefined);
          return prisma.creneau.update({
            where: { id: slot.id },
            data: {
              state: 'counter_proposed',
              proposedUserId: approverId ?? null,
              ...(cp.notes ? { proposedNotes: cp.notes } : {}),
              ...(proposedStart ? { proposedStartDate: proposedStart } : {}),
              ...(proposedEnd ? { proposedEndDate: proposedEnd } : {}),
              ...(proposedTimeslot ? { proposedTimeslotDate: proposedTimeslot } : {}),
              ...(cp.salleIds ? { salleIds: cp.salleIds } : {}),
              ...(cp.classIds ? { classIds: cp.classIds } : {}),
            },
          });
        }),
      );

      // Notify each event owner once (fetch owners)
      const owners = await prisma.creneau.findMany({
        where: { id: { in: validatedData.timeslotIds } },
        select: { eventOwner: true, eventId: true, timeslotDate: true, startDate: true },
      });
      const blocked = (await loadAppSettings()).notificationOwnerEvents?.blockedUserIds || [];
      const targetUserIds = Array.from(
        new Set(owners.map((o) => o.eventOwner).filter((o): o is number => !!o)),
      ).filter((id) => !blocked.includes(id));
      // Resolve actor and owner names for clear messages (best-effort; don't fail if model is mocked)
      let actorName = 'Un utilisateur';
      try {
        if (approverId && (prisma as any).utilisateur?.findUnique) {
          const actor = await (prisma as any).utilisateur.findUnique({ where: { id: approverId } });
          if (actor?.name || actor?.email) actorName = actor.name || actor.email || actorName;
        }
      } catch {
        // ignore lookup issues in tests
      }
      const firstOwnerId = owners.find((o) => !!o.eventOwner)?.eventOwner || null;
      let ownerName = 'propriétaire';
      try {
        if (firstOwnerId && (prisma as any).utilisateur?.findUnique) {
          const ownerUser = await (prisma as any).utilisateur.findUnique({
            where: { id: firstOwnerId },
          });
          if (ownerUser?.name || ownerUser?.email)
            ownerName = ownerUser.name || ownerUser.email || ownerName;
        }
      } catch {
        // ignore lookup issues in tests
      }
      // Determine a representative date for message: prefer explicit timeslotDate else startDate
      const dateCandidate = owners
        .map((o) => o.timeslotDate || o.startDate)
        .filter(Boolean)
        .sort(
          (a: any, b: any) => new Date(a as any).getTime() - new Date(b as any).getTime(),
        )[0] as string | Date | undefined;
      const dateStr = dateCandidate
        ? new Date(dateCandidate).toLocaleString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined;
      // Broadcast globally to roles, but exclude the actor and the owner(s) (who are notified separately as OWNER)
      await notificationService.createAndDispatch({
        module: 'EVENTS_GLOBAL',
        actionType: 'COUNTER_PROPOSAL',
        message: `L'utilisateur <strong>${actorName}</strong> a contre‑proposé un créneau pour un événement de <strong>${ownerName}</strong>.`,
        data: {
          timeslotIds: validatedData.timeslotIds,
          eventId: owners[0]?.eventId,
        },
        excludeUserIds: [...(approverId ? [approverId] : []), ...targetUserIds],
      });
      // Owner-specific information if actor differs
      try {
        const settings = await loadAppSettings();
        if (
          settings.notificationOwnerEvents?.enabled &&
          settings.notificationOwnerEvents.includeTimeslots
        ) {
          const actorId = approverId ?? 0;
          const targets = targetUserIds;
          if (targets.length) {
            await notificationService.createAndDispatch({
              module: 'EVENTS_OWNER',
              actionType: 'OWNER_TIMESLOT_COUNTER',
              severity: 'medium',
              message: `Votre événement${dateStr ? ` en date du <strong>${dateStr}</strong>` : ''} a reçu une contre‑proposition`,
              data: { timeslotIds: validatedData.timeslotIds, byUserId: actorId, date: dateStr },
              targetUserIds: targets,
            });
          }
        }
      } catch (e) {
        console.error('[timeslots][ownerNotify][counter]', e);
      }
      return NextResponse.json({
        ok: true,
        action: 'counter_proposed',
        timeslotIds: validatedData.timeslotIds,
        count: updates.length,
      });
    }

    // Plain reject
    const res = await prisma.creneau.updateMany({
      where: { id: { in: validatedData.timeslotIds } },
      data: {
        state: 'rejected',
        // notes: validatedData.notes, // Field removed - to be deleted from schema
      },
    });
    // Notify owners about rejection
    try {
      const settings = await loadAppSettings();
      if (
        settings.notificationOwnerEvents?.enabled &&
        settings.notificationOwnerEvents.includeTimeslots
      ) {
        const slotsData = await prisma.creneau.findMany({
          where: { id: { in: validatedData.timeslotIds } },
          select: {
            eventOwner: true,
            eventId: true,
            timeslotDate: true,
            startDate: true,
            event: { select: { title: true } },
          },
        });
        // Build owner fallback map when creneau.eventOwner is null
        const fallbackEventIds = Array.from(
          new Set(slotsData.map((o) => o.eventId).filter((v): v is number => !!v)),
        );
        const fallbackEvents = fallbackEventIds.length
          ? await prisma.evenement.findMany({
              where: { id: { in: fallbackEventIds } },
              select: { id: true, ownerId: true },
            })
          : [];
        const ownerByEventReject = new Map<number, number | null>(
          fallbackEvents.map((e) => [e.id, (e as any).ownerId ?? null]),
        );
        const actorId = approverId ?? 0;
        const actorName = session?.user?.name || session?.user?.email || 'Un utilisateur';
        const blocked = settings.notificationOwnerEvents?.blockedUserIds || [];
        const uniqueOwners = Array.from(
          new Set(
            slotsData
              .map((o) => o.eventOwner ?? (o.eventId ? ownerByEventReject.get(o.eventId) : null))
              .filter((v): v is number => !!v),
          ),
        ).filter((id) => !blocked.includes(id));
        if (uniqueOwners.length) {
          // Representative details for message
          const first = slotsData[0];
          const title = first?.event?.title || 'Événement';
          const dateCandidate = (first?.timeslotDate || first?.startDate) as
            | string
            | Date
            | undefined;
          const dateStr = dateCandidate
            ? new Date(dateCandidate).toLocaleString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : undefined;
          const count = validatedData.timeslotIds.length;
          const message =
            count > 1
              ? `${count} créneaux de votre événement <strong>${title}</strong> ont été rejetés par <strong>${actorName}</strong>${dateStr ? ` (dont le ${dateStr})` : ''}`
              : `Le créneau du ${dateStr || '—'} de votre événement <strong>${title}</strong> a été rejeté par <strong>${actorName}</strong>`;
          await notificationService.createAndDispatch({
            module: 'EVENTS_OWNER',
            actionType: 'OWNER_TIMESLOT_REJECTED',
            severity: 'low',
            message,
            data: {
              timeslotIds: validatedData.timeslotIds,
              byUserId: actorId,
              eventId: first?.eventId,
            },
            targetUserIds: uniqueOwners,
          });
        }
      }
    } catch (e) {
      console.error('[timeslots][ownerNotify][reject]', e);
    }
    return NextResponse.json({
      ok: true,
      action: 'rejected',
      timeslotIds: validatedData.timeslotIds,
      count: res.count,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to validate timeslots' }, { status: 500 });
  }
}
