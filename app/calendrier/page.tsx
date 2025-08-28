// app/calendrier/page.tsx

'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Box, Alert, Typography, useTheme, useMediaQuery } from '@mui/material';
import CalendarExportTab from '@/components/export/CalendarExportTab';
import { CreateEventMeta } from '@/components/calendar/CreateEventDialog';
import { EditEventMeta as EditMeta } from '@/components/calendar/EditEventDialog';
import EventList from '@/components/calendar/EventList';
import ActionHeader from '@/components/calendar/ActionHeader';
import { EntityNamesProvider } from '@/components/providers/EntityNamesProvider';
import CalendarTabs, { TabPanel } from '@/components/calendar/CalendarTabs';
import CalendarNavigation from '@/components/calendar/CalendarNavigation';
import EventDetailsDialog from '@/components/calendar/EventDetailsDialog';
import CreateEventDialogWrapper from '@/components/calendar/CreateEventDialogWrapper';
import { resetCreateEventDialogCache } from '@/components/calendar/CreateEventDialog';
import EditEventDialogWrapper from '@/components/calendar/EditEventDialogWrapper';
import RoleTester, { RoleTestConfig } from '@/components/calendar/RoleTester';
import { CalendarSkeleton } from '@/components/shared/LoadingSkeleton';
import { SnackbarProvider, useSnackbar } from '@/components/providers/SnackbarProvider';
import { useTimeslots } from '@/lib/hooks/useTimeslots';
import { useTabWithURL } from '@/lib/hooks/useTabWithURL';
import { syncCustomResources } from '@/lib/services/customResourcesService';
import { useEventActions } from '@/lib/hooks/useEventActions';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { TimeslotData } from '@/lib/types/timeslots';
import {
  buildResourceSignature,
  buildCustomResourceSignature,
} from '@/components/calendar/resourceSignatures';
import { useImpersonation } from '@/lib/contexts/ImpersonationContext';

interface Event {
  id: number;
  title: string;
  discipline: string;
  ownerId: number;
  owner: { id: number; name: string; email: string };
  timeslots: any[];
  // New JSON arrays (Int[])
  classIds?: number[] | any; // keep any for unparsed JSON
  salleIds?: number[] | any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function CalendrierContent() {
  const { data: session } = useSession();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const snackbarRef = useRef(showSnackbar);
  useEffect(() => {
    snackbarRef.current = showSnackbar;
  }, [showSnackbar]);

  // Hook pour la gestion des tabs avec URL
  const { tabValue, handleTabChange: updateTabURL } = useTabWithURL({
    defaultTab: 0,
    maxTabs: 8, // +1 Export tab
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [eventToCopy, setEventToCopy] = useState<Event | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [createType, setCreateType] = useState<'tp' | 'laborantin'>('tp');
  const [createEventForm, setCreateEventForm] = useState<{
    title: string;
    discipline: 'chimie' | 'physique';
    notes?: string;
  }>({ title: '', discipline: 'chimie', notes: '' });
  const [createMeta, setCreateMeta] = useState<CreateEventMeta>({
    classes: [],
    materials: [],
    chemicals: [],
    uploads: [],
  });
  const [weeklyRefDate, setWeeklyRefDate] = useState<Date>(() => {
    const d = new Date();
    // set to Monday of current week
    const day = d.getDay(); // 0..6 with 0 Sunday
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dailyDate, setDailyDate] = useState<Date>(() => new Date());
  const [editMeta, setEditMeta] = useState<EditMeta>({
    classes: [],
    salles: [],
    materials: [],
    chemicals: [],
    uploads: [],
  });
  // Draft créneaux en attente avant ajout de l'événement.
  // Utilise désormais les tableaux salleIds / classIds (migration depuis l'ancien champ salleId unique)
  const [pendingSlotDrafts, setPendingSlotDrafts] = useState<
    Array<
      Pick<
        TimeslotData,
        'startDate' | 'endDate' | 'timeslotDate' | 'proposedNotes' | 'salleIds' | 'classIds'
      >
    >
  >([]);
  const [salles, setSalles] = useState<Array<{ id: number; name: string }>>([]);
  const { impersonatedUser } = useImpersonation();
  const baseUserRole = (session as any)?.user?.role as
    | 'ADMIN'
    | 'ADMINLABO'
    | 'ENSEIGNANT'
    | 'LABORANTIN_PHYSIQUE'
    | 'LABORANTIN_CHIMIE'
    | 'ELEVE'
    | undefined;
  const userId = (session as any)?.user?.id as number | string | undefined;

  // États pour les tests de rôles (développement uniquement)
  const [roleTestConfig, setRoleTestConfig] = useState<RoleTestConfig>({
    testRole: 'ENSEIGNANT',
    overrideCanEdit: 'normal',
    overrideCanValidate: 'normal',
    overrideIsOwner: 'normal',
    showRoleTest: false,
  });

  const effectiveRole = useMemo(() => {
    if (roleTestConfig.showRoleTest) return roleTestConfig.testRole as any;
    // Admin impersonation overrides visual role
    if (baseUserRole === 'ADMIN' && impersonatedUser) return impersonatedUser.role as any;
    return baseUserRole;
  }, [roleTestConfig.showRoleTest, roleTestConfig.testRole, baseUserRole, impersonatedUser]);

  const effectiveUserId = useMemo(() => {
    if (roleTestConfig.showRoleTest) return userId; // keep real id in test mode
    if (baseUserRole === 'ADMIN' && impersonatedUser) return impersonatedUser.id;
    return userId;
  }, [roleTestConfig.showRoleTest, baseUserRole, impersonatedUser, userId]);

  const [disciplineFilter, setDisciplineFilter] = useState<'chimie' | 'physique'>(() => {
    return effectiveRole === 'LABORANTIN_PHYSIQUE' ? 'physique' : 'chimie';
  });
  const [roomFilter, setRoomFilter] = useState<number | 'all'>('all');
  const [classFilter, setClassFilter] = useState<number | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  // moved roleTestConfig above to avoid hook-order issues

  // Keep discipline filter aligned with effective role changes
  useEffect(() => {
    if (effectiveRole === 'LABORANTIN_PHYSIQUE' && disciplineFilter !== 'physique') {
      setDisciplineFilter('physique');
    } else if (effectiveRole === 'LABORANTIN_CHIMIE' && disciplineFilter !== 'chimie') {
      setDisciplineFilter('chimie');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRole]);

  const { proposeTimeslots, approveTimeslots } = useTimeslots();

  // Attend un éventuel résultat de persistance des créneaux (émis par EditEventDialog ou SlotDisplay)
  const awaitSlotsPersistResult = useCallback(
    async (eventId: number, timeoutMs = 1200): Promise<boolean> => {
      try {
        const cache: any = (globalThis as any).__slotsPersistCache;
        const rec = cache?.[eventId];
        if (rec && Date.now() - rec.ts < 5000) {
          return !!rec.changed;
        }
      } catch {}
      return await new Promise<boolean>((resolve) => {
        let resolved = false;
        const onEvt = (e: any) => {
          if (e?.detail?.eventId === eventId) {
            resolved = true;
            try {
              const cache: any = (globalThis as any).__slotsPersistCache || {};
              cache[eventId] = { changed: !!e.detail.changed, ts: Date.now() };
              (globalThis as any).__slotsPersistCache = cache;
            } catch {}
            resolve(!!e.detail.changed);
          }
        };
        try {
          window.addEventListener(
            'event-slots:persist-result',
            onEvt as any,
            { once: true } as any,
          );
        } catch {}
        setTimeout(() => {
          if (!resolved) resolve(false);
        }, timeoutMs);
      });
    },
    [],
  );

  // Récupération des événements
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      setError('Erreur lors du chargement des événements');
      snackbarRef.current('Erreur lors du chargement des événements', 'error');
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fonction pour recharger un événement spécifique
  const handleEventRefresh = useCallback(
    async (eventId: number) => {
      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          // Si l'événement n'existe plus (404), le supprimer de la liste locale
          if (response.status === 404) {
            console.log(`Événement ${eventId} supprimé, mise à jour de la liste locale`);
            setEvents((prevEvents) => prevEvents.filter((event) => event.id !== eventId));
            // Si l'événement sélectionné était celui-ci, le fermer
            if (selectedEvent && selectedEvent.id === eventId) {
              setSelectedEvent(null);
              setDetailsDialogOpen(false);
            }
            return;
          }
          throw new Error("Erreur lors du rechargement de l'événement");
        }

        const data = await response.json();
        if (data.event) {
          setEvents((prevEvents) =>
            prevEvents.map((event) => (event.id === eventId ? data.event : event)),
          );

          // Si l'événement est actuellement sélectionné dans EventDetailsDialog, le mettre à jour aussi
          if (selectedEvent && selectedEvent.id === eventId) {
            setSelectedEvent(data.event);
          }
        }
      } catch (error) {
        console.error("Erreur lors du rechargement de l'événement:", error);
        // En cas d'erreur, recharger tous les événements
        await fetchEvents();
      }
    },
    [selectedEvent, fetchEvents],
  );

  const {
    isCreator: originalIsCreator,
    handleMoveDate,
    handleStateChange,
    handleConfirmModification,
    handleApproveTimeSlotChanges,
    handleRejectTimeSlotChanges,
    handleSaveEdit,
    handleEventDelete,
    canEditEvent: originalCanEditEvent,
    canValidateEvent: originalCanValidateEvent,
  } = useEventActions({ fetchEvents });

  // Utilisation du hook de permissions avec test de rôles
  const { isCreator, canEditEvent, canValidateEvent } = usePermissions({
    roleTestConfig,
    originalCanEditEvent,
    originalCanValidateEvent,
    originalIsCreator,
  });

  // Format grouped timeslots by date: "YYYY-MM-DD: 08:00-09:00, 10:00-11:00; YYYY-MM-DD: ..."
  const groupTimeslotsLabel = (slots: any[]) => {
    if (!Array.isArray(slots) || slots.length === 0) return 'Aucun créneau';
    const asLocalLiteral = (d: Date) =>
      new Date(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
        d.getUTCMilliseconds(),
      );
    const groups: Record<string, Array<{ s: string; e: string }>> = {};
    for (const s of slots) {
      const start = asLocalLiteral(new Date(s.startDate));
      const end = asLocalLiteral(new Date(s.endDate));
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const day = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const hs = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
      const he = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
      if (!groups[day]) groups[day] = [];
      groups[day].push({ s: hs, e: he });
    }
    // Sort by time within each day
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => a.s.localeCompare(b.s));
    }
    const parts = Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, arr]) => `${day} · ${arr.map((x) => `${x.s}-${x.e}`).join(', ')}`);
    return parts.join(' ; ');
  };

  // removed unused hasOverlap utility

  // 2. Gestion sécurisée du stockage et de la récupération de l'onglet
  const getStoredTabValue = (): number => {
    try {
      const stored = localStorage.getItem('calendar-tab');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };

  const saveTabValue = (value: number): void => {
    try {
      localStorage.setItem('calendar-tab', value.toString());
    } catch {
      // Ignore si localStorage non disponible
    }
  };

  // 3. Change l'onglet actif et sauvegarde la valeur
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Preserve scroll position when changing tabs
    const currentScrollY = window.scrollY;
    updateTabURL(newValue);
    // Restore scroll position after tab content renders with improved timing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: currentScrollY, behavior: 'instant' });
        });
      });
    });
  }; // 4. Ouvre le dialogue de détails pour l'événement sélectionné
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  };

  // 5. Retourne la liste des événements ayant au moins un créneau actif aujourd'hui
  const getTodayEvents = (): Event[] => {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const todayLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const asLocalLiteral = (d: Date) =>
      new Date(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
        d.getUTCMilliseconds(),
      );
    return events.filter((event) =>
      event.timeslots.some((slot) => {
        if (slot.timeslotDate && String(slot.timeslotDate).startsWith(todayLocal)) return true;
        if (!slot.startDate) return false;
        const d = asLocalLiteral(new Date(slot.startDate));
        const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        return day === todayLocal;
      }),
    );
  };

  // 6. Ouvre les dialogues d'ajout d'événement TP ou Laborantin
  const handleCreateTPEvent = () => {
    setCreateType('tp');
    setCreateDialogOpen(true);
  };

  const handleCreateLaborantinEvent = () => {
    setCreateType('laborantin');
    setCreateDialogOpen(true);
  };

  // 7. Ferme le dialogue de détails et ouvre le dialogue d'édition
  const handleEventEdit = async (event: Event) => {
    setDetailsDialogOpen(false);
    let latest = event;
    try {
      const res = await fetch(`/api/events/${event.id}`);
      if (res.ok) {
        const j = await res.json();
        if (j?.event) {
          latest = j.event as Event;
          setEvents((prev) => prev.map((e) => (e.id === latest.id ? latest : e)));
        }
      }
    } catch {}
    setSelectedEvent(latest);

    const presetMaterials = (latest as any).materiels?.filter((m: any) => !m.isCustom) || [];
    const presetChemicals = (latest as any).reactifs?.filter((r: any) => !r.isCustom) || [];

    const customMaterials: Array<{ name: string; quantity?: number }> = [];
    const customChemicals: Array<{ name: string; requestedQuantity?: number; unit?: string }> = [];

    // Event-level custom requests (preferred)
    ((latest as any).customMaterielRequests || []).forEach((rm: any) => {
      if (!rm?.name) return;
      customMaterials.push({
        name: rm.name,
        quantity: typeof rm.quantity === 'number' ? rm.quantity : Number(rm.quantity) || 1,
      });
    });
    ((latest as any).customReactifRequests || []).forEach((rr: any) => {
      if (!rr?.name) return;
      const rq =
        typeof rr.requestedQuantity === 'number'
          ? rr.requestedQuantity
          : Number(rr.requestedQuantity) || 0;
      customChemicals.push({ name: rr.name, requestedQuantity: rq, unit: rr.unit || 'g' });
    });

    // Legacy per-timeslot fallback
    (latest.timeslots || []).forEach((ts: any) => {
      (ts.requestsMateriels || []).forEach((rm: any) => {
        if (!rm?.name) return;
        customMaterials.push({
          name: rm.name,
          quantity: typeof rm.quantity === 'number' ? rm.quantity : Number(rm.quantity) || 1,
        });
      });
      (ts.requestsReactifs || []).forEach((rr: any) => {
        if (!rr?.name) return;
        const rq =
          typeof rr.requestedQuantity === 'number'
            ? rr.requestedQuantity
            : Number(rr.requestedQuantity) || 0;
        customChemicals.push({ name: rr.name, requestedQuantity: rq, unit: rr.unit || 'g' });
      });
    });

    // Deduplicate customs by normalized name
    const dedup = <T extends { name: string }>(arr: T[]) => {
      const map = new Map<string, T>();
      arr.forEach((it) => {
        if (it.name) map.set(it.name.trim().toLowerCase(), it);
      });
      return Array.from(map.values());
    };
    const dedupCustomMaterials = dedup(customMaterials);
    const dedupCustomChemicals = dedup(customChemicals);

    setEditMeta({
      classes: Array.isArray(latest.classIds)
        ? (latest.classIds as any[])
            .filter((id) => typeof id === 'number')
            .map((id) => ({ id, name: '' }))
        : [],
      salles: Array.isArray(latest.salleIds)
        ? (latest.salleIds as any[])
            .filter((id) => typeof id === 'number')
            .map((id) => ({ id, name: '' }))
        : [],
      materials: [
        ...presetMaterials.map((m: any) => m.materielName),
        ...dedupCustomMaterials.map((m) => m.name),
      ],
      chemicals: [
        ...presetChemicals.map((r: any) => r.reactifName),
        ...dedupCustomChemicals.map((r) => r.name),
      ],
      materialsDetailed: presetMaterials.map((m: any) => ({
        id: m.materielId || m.id,
        name: m.materielName,
        quantity: m.quantity,
      })),
      customMaterials: dedupCustomMaterials,
      chemicalsDetailed: presetChemicals.map((r: any) => ({
        id: r.reactifId || r.id,
        name: r.reactifName,
        requestedQuantity: Number(r.requestedQuantity || 0),
        unit: r.unit || 'g',
      })),
      customChemicals: dedupCustomChemicals,
      uploads: (latest as any).documents?.map((d: any) => d.fileUrl) || [],
    });
    // Store initial signature for change detection in Edit dialog (optional if used)
    setEditDialogOpen(true);
  };

  // 8. Prépare la copie d'un événement pour le dialogue d'ajout
  const handleEventCopy = (event: Event) => {
    setEventToCopy(event);
    setCreateDialogOpen(true);
  };

  // 9. Ferme le dialogue d'ajout et réinitialise l'événement à copier
  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setEventToCopy(null);
  };

  // 14. Met à jour la liste locale des événements et l'événement sélectionné
  const handleEventUpdate = (updatedEvent: Event) => {
    setEvents((prev) => prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)));
    if (selectedEvent?.id === updatedEvent.id) {
      setSelectedEvent(updatedEvent);
    }
  };

  // Handler pour l\'ajout d'événement
  const handleCreateEvent = useCallback(async () => {
    // Give React a microtask to flush any pending meta updates before reading drafts
    await Promise.resolve();
    // Utiliser la source la plus fraîche pour les drafts (évite une condition de course au 1er envoi)
    const latestDrafts = ((createMeta as any)?.timeSlotsDrafts || pendingSlotDrafts || []) as Array<
      Pick<
        TimeslotData,
        'startDate' | 'endDate' | 'timeslotDate' | 'proposedNotes' | 'salleIds' | 'classIds'
      >
    >;

    // Create the event first
    const slotSalleIds = (latestDrafts || [])
      .flatMap((s) => (Array.isArray(s.salleIds) ? s.salleIds : []))
      .filter((id): id is number => typeof id === 'number');
    const selectedSalleIds = (((createMeta as any)?.salles || []) as Array<{ id: number }>)
      .map((s) => s.id)
      .filter((id): id is number => typeof id === 'number');

    // IMPORTANT: Aggregate classIds from both pending slots AND meta
    const slotClassIds = (latestDrafts || [])
      .flatMap((s) => (Array.isArray(s.classIds) ? s.classIds : []))
      .filter((id): id is number => typeof id === 'number');
    const selectedClassIds = (((createMeta as any)?.classes || []) as Array<{ id: number }>)
      .map((c) => c.id)
      .filter((id): id is number => typeof id === 'number');

    // Ensure unique values for Event table
    const uniqueSalleIds = Array.from(new Set([...slotSalleIds, ...selectedSalleIds]));
    const uniqueClassIds = Array.from(new Set([...slotClassIds, ...selectedClassIds]));

    // no debug logs in production
    const payload = {
      title:
        createEventForm.title && createEventForm.title.trim().length > 0
          ? createEventForm.title
          : undefined,
      discipline: createEventForm.discipline ?? ((eventToCopy?.discipline as any) || 'chimie'),
      notes: createEventForm.notes ?? '',
      salleIds: uniqueSalleIds.length > 0 ? uniqueSalleIds : undefined,
      classIds: uniqueClassIds.length > 0 ? uniqueClassIds : undefined,
      // Explicit type for coloring and role-based filters
      type:
        createType === 'laborantin'
          ? createEventForm.discipline === 'physique'
            ? 'LABORANTIN_PHYSIQUE'
            : 'LABORANTIN_CHIMIE'
          : 'TP',
      // Add materials, chemicals, and documents from createMeta
      // Utiliser la clé 'name' pour correspondre au schéma d'update; la route POST accepte encore materielName/reactifName mais on unifie.
      materiels: ((createMeta as any)?.materialsDetailed || []).map((m: any) => ({
        materielId: typeof m.id === 'number' ? m.id : undefined,
        name: m.name,
        quantity: Number(m.quantity) > 0 ? Number(m.quantity) : 1,
        isCustom: !!m.isCustom,
      })),
      reactifs: ((createMeta as any)?.chemicalsDetailed || []).map((c: any) => ({
        reactifId: typeof c.id === 'number' ? c.id : undefined,
        name: c.name,
        requestedQuantity: typeof c.requestedQuantity === 'number' ? c.requestedQuantity : 0,
        unit: c.unit || 'g',
        isCustom: !!c.isCustom,
      })),
      documents: ((createMeta as any)?.uploads || [])
        .filter((u: any) => {
          if (!u) return false;
          const isLocal = !!(u as any).isLocal;
          // Exclude only local files (they will be uploaded via multipart after creation)
          return !isLocal;
        })
        .map((u: any) => {
          const fileUrl = typeof u === 'string' ? u : (u.fileUrl || u.existingFile?.fileUrl || '');
          let fileName =
            typeof u === 'object' && u.fileName
              ? u.fileName
              : (() => {
                  try {
                    const decoded = decodeURIComponent(fileUrl.split('?')[0]);
                    const parts = decoded.split('/');
                    return parts[parts.length - 1];
                  } catch {
                    return 'Document';
                  }
                })();
          if (!fileName) fileName = 'Document';
          return {
            fileName,
            fileUrl,
            fileSize: typeof u === 'object' ? u.fileSize : undefined,
            fileType: typeof u === 'object' ? u.fileType : undefined,
          };
        })
        .filter(
          (doc: any, idx: number, arr: any[]) =>
            arr.findIndex((d: any) => d.fileUrl === doc.fileUrl) === idx,
        ),
    } as {
      title?: string;
      discipline: 'chimie' | 'physique';
      notes?: string;
      salleIds?: number[];
      classIds?: number[];
      type?: 'TP' | 'LABORANTIN_CHIMIE' | 'LABORANTIN_PHYSIQUE';
      materiels?: any[];
      reactifs?: any[];
      documents?: any[];
    };
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      showSnackbar("Erreur lors de l'ajout de l'événement", 'error');
      return;
    }
    const created = await res.json();
    const newEvent: Event = created.event;

    // Upload any local files after event creation
    const localFiles = ((createMeta as any)?.uploads || []).filter(
      (u: any) => u.isLocal && u.fileData,
    );
    if (localFiles.length > 0) {
      try {
        for (const fileInfo of localFiles) {
          const formData = new FormData();
          formData.append('file', fileInfo.fileData);

          const uploadRes = await fetch(`/api/events/${newEvent.id}/documents`, {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) {
            console.warn(`Failed to upload file ${fileInfo.fileName}`);
          }
        }
        showSnackbar(`Événement ajouté avec ${localFiles.length} fichier(s) uploadé(s)`, 'success');
      } catch (error) {
        console.error('Error uploading files:', error);
        showSnackbar("Événement ajouté mais erreur lors de l'upload des fichiers", 'warning');
      }
    } else {
      showSnackbar('Événement ajouté avec succès', 'success');
    }

    // Handle preset files copying via uploadFilesToEvent if available
    // Plus besoin d'une étape de copie post-création: le serveur copie les fichiers /preset/ -> /user_{id}/{mois} pendant POST /api/events
    // Add the new event to the local state optimistically for animation (at the top)
    setEvents((prev) => [newEvent, ...prev]);

    // Propose slots if any and then fetch complete event data
    if ((latestDrafts || []).length) {
      try {
        await proposeTimeslots({
          eventId: newEvent.id,
          discipline: newEvent.discipline,
          slots: latestDrafts,
        });

        // Fetch the complete event with timeslots after timeslots have been created
        try {
          const response = await fetch(`/api/events/${newEvent.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.event) {
              // Update the event with complete data including timeslots
              setEvents((prev) =>
                prev.map((event) => (event.id === newEvent.id ? data.event : event)),
              );
            }
          }
        } catch (error) {
          console.error('Error fetching complete event data:', error);
        }
      } catch (error) {
        console.error('Error proposing timeslots:', error);
      }
    }

    // Note: createMeta (classes/materials/chemicals/uploads) are now sent to the API endpoint
    // Reset dialog state only after success
    setPendingSlotDrafts([]);
    setCreateMeta({ classes: [], materials: [], chemicals: [], uploads: [] });
    resetCreateEventDialogCache();
    setCreateDialogOpen(false);
  }, [
    createEventForm,
    createMeta,
    eventToCopy,
    pendingSlotDrafts,
    proposeTimeslots,
    showSnackbar,
    createType,
  ]);

  // Handler pour l'édition d'événement
  const handleEditEvent = useCallback(async () => {
    if (!selectedEvent) return;
    try {
      const classIds = (editMeta.classes || [])
        .map((c) => c.id)
        .filter((id): id is number => typeof id === 'number');
      const salleIds = (editMeta.salles || [])
        .map((s) => s.id)
        .filter((id): id is number => typeof id === 'number');

      // IMPORTANT: le schéma backend attend la clé 'name' (et non materielName / reactifName)
      // Only send preset materials/chemicals to the main event API
      const materiels = (editMeta.materialsDetailed || []).map((m) => ({
        materielId: typeof m.id === 'number' ? m.id : undefined,
        name: m.name,
        quantity: Number(m.quantity) > 0 ? Number(m.quantity) : 1,
      }));
      const reactifs = (editMeta.chemicalsDetailed || []).map((c) => ({
        reactifId: typeof c.id === 'number' ? c.id : undefined,
        name: c.name,
        requestedQuantity: typeof c.requestedQuantity === 'number' ? c.requestedQuantity : 0,
        unit: c.unit || 'g',
      }));
      const documents = (editMeta.uploads || [])
        .filter((u) => !!u)
        .map((u: any) => {
          const fileUrl = typeof u === 'string' ? u : u.fileUrl;
          let fileName =
            typeof u === 'object' && u.fileName
              ? u.fileName
              : (() => {
                  try {
                    const decoded = decodeURIComponent(fileUrl.split('?')[0]);
                    const parts = decoded.split('/');
                    return parts[parts.length - 1];
                  } catch {
                    return 'Document';
                  }
                })();
          if (!fileName) fileName = 'Document';
          return {
            fileName,
            fileUrl,
            fileSize: typeof u === 'object' ? u.fileSize : undefined,
            fileType: typeof u === 'object' ? u.fileType : undefined,
          };
        })
        .filter((doc, idx, arr) => arr.findIndex((d) => d.fileUrl === doc.fileUrl) === idx);

      // Build prev/next signatures for base resources
      const prevBaseSig = buildResourceSignature({
        materiels: ((selectedEvent as any)?.materiels || []).map((m: any) => ({
          id: m.materielId ?? m.id,
          quantity: m.quantity,
        })),
        reactifs: ((selectedEvent as any)?.reactifs || []).map((r: any) => ({
          id: r.reactifId ?? r.id,
          requestedQuantity: r.requestedQuantity,
          unit: r.unit,
        })),
        documents: ((selectedEvent as any)?.documents || []).map((d: any) => ({
          fileUrl: d.fileUrl,
        })),
        classes: Array.isArray((selectedEvent as any)?.classIds)
          ? ((selectedEvent as any)?.classIds as any[]).filter((x) => typeof x === 'number')
          : [],
        salles: Array.isArray((selectedEvent as any)?.salleIds)
          ? ((selectedEvent as any)?.salleIds as any[]).filter((x) => typeof x === 'number')
          : [],
      });
      const nextBaseSig = buildResourceSignature({
        materiels: materiels.map((m) => ({
          id: m.materielId ?? (m as any).id,
          quantity: m.quantity,
        })),
        reactifs: reactifs.map((r) => ({
          id: r.reactifId ?? (r as any).id,
          requestedQuantity: r.requestedQuantity,
          unit: r.unit,
        })),
        documents: documents.map((d) => ({ fileUrl: d.fileUrl })),
        classes: classIds,
        salles: salleIds,
      });
      const baseChanged = prevBaseSig !== nextBaseSig;

      // Prepare custom resources and compute signatures to decide if we need to sync
      const sanitizedCustomMaterials = (editMeta.customMaterials || [])
        .filter((m) => m.name && m.name.trim())
        .map((m) => ({ name: m.name.trim(), quantity: Math.max(1, Number(m.quantity) || 1) }));
      const sanitizedCustomChemicals = (editMeta.customChemicals || [])
        .filter((c) => c.name && c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          requestedQuantity: Math.max(0, Number(c.requestedQuantity) || 0),
          unit: (c.unit && c.unit.trim()) || 'g',
        }));
      const prevCustomSig = buildCustomResourceSignature({
        customMateriels: (((selectedEvent as any)?.customMaterielRequests || []) as any[]).map(
          (rm: any) => ({ name: rm.name, quantity: rm.quantity }),
        ),
        customReactifs: (((selectedEvent as any)?.customReactifRequests || []) as any[]).map(
          (rr: any) => ({ name: rr.name, requestedQuantity: rr.requestedQuantity, unit: rr.unit }),
        ),
      });
      const nextCustomSig = buildCustomResourceSignature({
        customMateriels: sanitizedCustomMaterials,
        customReactifs: sanitizedCustomChemicals,
      });
      const customChangedCandidate = prevCustomSig !== nextCustomSig;

      // Si seules les modifications de créneaux sont concernées, attendre leur résultat
      if (!baseChanged && !customChangedCandidate) {
        setEditDialogOpen(false);
        const slotsChanged = await awaitSlotsPersistResult(selectedEvent.id);
        if (slotsChanged) {
          showSnackbar('Créneaux mis à jour', 'success');
        } else {
          showSnackbar('Aucune modification à enregistrer', 'info');
        }
        return;
      }

      // First update core event meta
      let updated: any = null;
      if (baseChanged) {
        updated = await handleSaveEdit(
          selectedEvent.id,
          {
            title: selectedEvent.title,
            discipline: selectedEvent.discipline,
            notes: selectedEvent.notes,
            classIds,
            salleIds,
            materiels,
            reactifs,
            documents,
          } as any,
          { silent: true },
        );
      }
      // Persist custom materials & chemicals using unified sync service (supports PUT + fallback)
      let customChanged = false;
      if (customChangedCandidate) {
        try {
          const syncResult = await syncCustomResources(selectedEvent.id, {
            materials: sanitizedCustomMaterials,
            chemicals: sanitizedCustomChemicals,
          });
          customChanged = syncResult.changed;
          if (!syncResult.success)
            console.error('[handleEditEvent] custom sync errors', syncResult.errors);
        } catch (e) {
          console.error('[handleEditEvent] custom sync failed', e);
        }
      }

      if (updated) setSelectedEvent(updated as any);
      setEditDialogOpen(false);
      // Note: fetchEvents() supprimé car le système d'événements 'event-update:end'
      // gère déjà la mise à jour ciblée via EventList
      const slotsChanged = await awaitSlotsPersistResult(selectedEvent.id);

      // Message plus précis selon le type de modification
      if (updated && customChanged && slotsChanged) {
        showSnackbar('Ressources et créneaux mis à jour', 'success');
      } else if (updated && customChanged) {
        showSnackbar('Ressources mises à jour', 'success');
      } else if (updated && slotsChanged) {
        showSnackbar('Métadonnées et créneaux mis à jour', 'success');
      } else if (customChanged && slotsChanged) {
        showSnackbar('Ressources personnalisées et créneaux mis à jour', 'success');
      } else if (updated) {
        showSnackbar('Métadonnées mises à jour', 'success');
      } else if (customChanged) {
        showSnackbar('Ressources personnalisées mises à jour', 'success');
      } else if (slotsChanged) {
        showSnackbar('Créneaux mis à jour', 'success');
      } else {
        showSnackbar('Aucune modification à enregistrer', 'info');
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedEvent, editMeta, handleSaveEdit, showSnackbar, awaitSlotsPersistResult]);

  // Initialisation
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Erreur lors du chargement');
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        setError('Erreur lors du chargement des événements');
        snackbarRef.current('Erreur lors du chargement des événements', 'error');
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    })();
    // Load rooms
    fetch('/api/salles')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.salles)) {
          setSalles(data.salles.map((s: any) => ({ id: s.id, name: s.name })));
        }
      })
      .catch(() => {});
  }, []);

  // Compute tabs order based on role (must be before any conditional returns to keep hook order stable)
  const tabs = useMemo(() => {
    // Base tabs by role (may include both disciplines)
    const base = (() => {
      if (effectiveRole === 'LABORANTIN_CHIMIE') {
        return [
          'Chimie',
          ...(isMobile ? [] : ['Vue hebdo']),
          "Aujourd'hui",
          'Planning quotidien',
          'Planning général',
          'Mes événements',
          'Physique',
          'Export',
        ];
      }
      if (effectiveRole === 'LABORANTIN_PHYSIQUE') {
        return [
          'Physique',
          ...(isMobile ? [] : ['Vue hebdo']),
          "Aujourd'hui",
          'Planning quotidien',
          'Planning général',
          'Mes événements',
          'Chimie',
          'Export',
        ];
      }
      // ENSEIGNANT and others fallback to current order
      return [
        'Mes événements',
        'Chimie',
        'Physique',
        'Planning général',
        "Aujourd'hui",
        ...(isMobile ? [] : ['Vue hebdo']),
        'Planning quotidien',
        'Export',
      ];
    })();

    // Keep only the selected discipline tab label at the same relative position
    const selectedDisciplineLabel = disciplineFilter === 'chimie' ? 'Chimie' : 'Physique';
    const firstDiscIdxCandidates = [base.indexOf('Chimie'), base.indexOf('Physique')].filter(
      (i) => i >= 0,
    );
    const insertAt = firstDiscIdxCandidates.length
      ? Math.min(...firstDiscIdxCandidates)
      : base.length;
    const withoutDisc = base.filter((t) => t !== 'Chimie' && t !== 'Physique');
    withoutDisc.splice(insertAt, 0, selectedDisciplineLabel);
    return withoutDisc;
  }, [effectiveRole, isMobile, disciplineFilter]);

  // Ensure initial tab aligns with role preference
  useEffect(() => {
    // if URL specifies, respect it (handled by useTabWithURL). Otherwise, adjust based on role.
    if (effectiveRole === 'LABORANTIN_PHYSIQUE') {
      // if tabs[0] is 'Physique', ensure tabValue is 0
      if (tabs[0] === 'Physique' && tabValue !== 0) updateTabURL(0);
    } else if (effectiveRole === 'LABORANTIN_CHIMIE') {
      if (tabs[0] === 'Chimie' && tabValue !== 0) updateTabURL(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRole, tabs]);

  // After all hooks, we can conditionally return UI states without affecting hook order
  if (loading) {
    return (
      <Box
        data-page="calendrier"
        className="calendar-container"
        sx={{
          maxWidth: '100vw',
          width: '100%',
          overflow: 'hidden',
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >
        <CalendarSkeleton />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        data-page="calendrier"
        className="calendar-container"
        sx={{
          maxWidth: '100vw',
          width: '100%',
          overflow: 'hidden',
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 4,
            p: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Alert severity="error">{error}</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <EntityNamesProvider>
      <Box
        data-page="calendrier"
        className="calendar-container"
        sx={{
          maxWidth: '100%',
          width: '100%',
          overflow: 'hidden',
          px: { xs: 1, sm: 2, md: 3 },
          py: { xs: 1, sm: 2 },
        }}
      >
        {/* Header Section now uses ActionHeader (filters moved into EventList) */}
        <ActionHeader
          disciplineFilter={disciplineFilter}
          onDisciplineChange={(d) => {
            setDisciplineFilter(d);
            // Switch to the matching tab (Chimie or Physique)
            const target = d === 'chimie' ? 'Chimie' : 'Physique';
            const idx = tabs.indexOf(target);
            if (idx >= 0) updateTabURL(idx);
          }}
          onCreateTP={handleCreateTPEvent}
          onCreateLaborantin={handleCreateLaborantinEvent}
          canValidateEvent={canValidateEvent()}
        />
        {/* Export moved to dedicated tab */}

        {/* Zone de test des rôles (développement uniquement)
        {Number(userId) === 1 && baseUserRole === 'ADMIN' && (
          <RoleTester config={roleTestConfig} onConfigChange={setRoleTestConfig} />
        )}
        */}

        {/* Content Section via CalendarTabs */}
        <CalendarTabs
          value={tabValue}
          onChange={handleTabChange}
          tabs={tabs}
          sx={{
            maxWidth: '100%',
            '& .MuiTabPanel-root': {
              maxWidth: '100%',
              overflow: 'hidden',
              px: 0,
            },
          }}
        >
          {/* Mes événements */}
          <TabPanel value={tabValue} index={tabs.indexOf('Mes événements')}>
            <EventList
              events={events.filter((e) => {
                const uid =
                  typeof effectiveUserId === 'number' ? effectiveUserId : Number(effectiveUserId);
                return typeof uid === 'number' && !isNaN(uid) ? e.ownerId === uid : false;
              })}
              discipline={'all'}
              loading={loading}
              onEventClick={handleEventClick}
              groupTimeslotsLabel={groupTimeslotsLabel}
              emptyMessage={'Aucun de vos événements'}
              onEventUpdate={handleEventRefresh}
              deletingId={deletingId}
              canValidate={canValidateEvent()}
              isOwner={isCreator}
              userRole={effectiveRole as any}
            />
          </TabPanel>

          {/* Discipline-specific tab: show only the selected one */}
          <TabPanel
            value={tabValue}
            index={tabs.indexOf(disciplineFilter === 'chimie' ? 'Chimie' : 'Physique')}
          >
            <EventList
              events={events}
              discipline={disciplineFilter}
              loading={loading}
              onEventClick={handleEventClick}
              groupTimeslotsLabel={groupTimeslotsLabel}
              emptyMessage={
                disciplineFilter === 'chimie'
                  ? 'Aucun événement de chimie'
                  : 'Aucun événement de physique'
              }
              onEventUpdate={handleEventRefresh}
              deletingId={deletingId}
              canValidate={canValidateEvent()}
              isOwner={isCreator}
              userRole={effectiveRole as any}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={tabs.indexOf('Planning général')}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
              Tous les événements (toutes disciplines)
            </Typography>
            <EventList
              events={events}
              discipline={'all'}
              loading={loading}
              onEventClick={handleEventClick}
              groupTimeslotsLabel={groupTimeslotsLabel}
              emptyMessage={`Aucun événement`}
              onEventUpdate={handleEventRefresh}
              deletingId={deletingId}
              canValidate={canValidateEvent()}
              isOwner={isCreator}
              userRole={effectiveRole as any}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={tabs.indexOf("Aujourd'hui")}>
            <EventList
              events={getTodayEvents().filter((e) => e.discipline === disciplineFilter)}
              discipline={disciplineFilter}
              loading={loading}
              onEventClick={handleEventClick}
              groupTimeslotsLabel={groupTimeslotsLabel}
              emptyMessage={`Aucun événement aujourd'hui en ${disciplineFilter}`}
              emptySubMessage=""
              onEventUpdate={handleEventRefresh}
              deletingId={deletingId}
              canValidate={canValidateEvent()}
              isOwner={isCreator}
              userRole={effectiveRole as any}
            />
          </TabPanel>

          {/* Weekly view */}
          {!isMobile && (
            <TabPanel value={tabValue} index={tabs.indexOf('Vue hebdo')}>
              <CalendarNavigation
                currentDate={weeklyRefDate}
                onPrevious={() =>
                  setWeeklyRefDate(new Date(weeklyRefDate.getTime() - 7 * 86400000))
                }
                onToday={() => setWeeklyRefDate(new Date())}
                onDateChange={(d) => setWeeklyRefDate(d)}
                onNext={() => setWeeklyRefDate(new Date(weeklyRefDate.getTime() + 7 * 86400000))}
                previousLabel="Semaine précédente"
                nextLabel="Semaine suivante"
                title="Vue hebdomadaire"
                events={events.filter((e) => e.discipline === disciplineFilter)}
                displayMode="week"
                onEventClick={handleEventClick}
              />
            </TabPanel>
          )}

          {/* Daily planning */}
          <TabPanel
            value={tabValue}
            index={
              isMobile ? tabs.indexOf('Planning quotidien') : tabs.indexOf('Planning quotidien')
            }
          >
            <CalendarNavigation
              currentDate={dailyDate}
              onPrevious={() => setDailyDate(new Date(dailyDate.getTime() - 86400000))}
              onToday={() => setDailyDate(new Date())}
              onDateChange={(d) => setDailyDate(d)}
              onNext={() => setDailyDate(new Date(dailyDate.getTime() + 86400000))}
              previousLabel="Jour précédent"
              nextLabel="Jour suivant"
              title="Planning quotidien"
              events={events.filter((e) => e.discipline === disciplineFilter)}
              displayMode="day"
              onEventClick={handleEventClick}
            />
          </TabPanel>
          {/* Export Tab */}
          <TabPanel value={tabValue} index={tabs.indexOf('Export')}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              Export calendrier
            </Typography>
            <CalendarExportTab
              title="Export calendrier"
              events={events as any}
              defaultMode={isMobile ? 'day' : 'week'}
              filename="calendrier"
            />
          </TabPanel>
        </CalendarTabs>

        {/* Dialogue de détails d'événement (componentized) */}
        <EventDetailsDialog
          open={detailsDialogOpen}
          event={selectedEvent}
          onClose={() => setDetailsDialogOpen(false)}
          onEdit={(ev) => handleEventEdit(ev)}
          onCopy={(ev) => handleEventCopy(ev)}
          onDelete={async (ev) => {
            // Immediately close the dialog and show spinner on the card
            setDetailsDialogOpen(false);
            setSelectedEvent(null);
            setDeletingId(ev.id);
            const ok = await handleEventDelete(ev);
            if (ok) {
              // Remove from local list without full reload
              setEvents((prev) => prev.filter((e) => e.id !== ev.id));
            } else {
              // fallback: refresh
              await fetchEvents();
            }
            setDeletingId(null);
          }}
          onApproveTimeSlots={(ev) => handleApproveTimeSlotChanges(ev)}
          onRejectTimeSlots={(ev) => handleRejectTimeSlotChanges(ev)}
          onApproveSlot={async (slotId) => {
            try {
              await approveTimeslots({ timeslotIds: [slotId], approve: true });
              // Trigger targeted event update instead of full fetchEvents
              if (selectedEvent) {
                handleEventRefresh(selectedEvent.id);
              }
            } catch {}
          }}
          onRejectSlot={async (slotId) => {
            try {
              await approveTimeslots({ timeslotIds: [slotId], approve: false });
              // Trigger targeted event update instead of full fetchEvents
              if (selectedEvent) {
                handleEventRefresh(selectedEvent.id);
              }
            } catch {}
          }}
          onCounterPropose={async (
            slotId,
            payload: {
              startDate?: string;
              endDate?: string;
              timeslotDate?: string;
              salleIds?: number[];
              classIds?: number[];
              notes?: string;
            },
          ) => {
            try {
              await approveTimeslots({
                timeslotIds: [slotId],
                approve: false,
                notes: payload.notes,
                counterProposal: {
                  startDate: payload.startDate,
                  endDate: payload.endDate,
                  timeslotDate: payload.timeslotDate,
                  salleIds: payload.salleIds,
                  classIds: payload.classIds,
                },
              });
              // Trigger targeted event update instead of full fetchEvents
              if (selectedEvent) {
                handleEventRefresh(selectedEvent.id);
              }
            } catch {}
          }}
          canEdit={selectedEvent ? canEditEvent(selectedEvent) : false}
          canValidate={canValidateEvent()}
          isOwner={selectedEvent ? isCreator(selectedEvent) : false}
          onEventUpdate={handleEventRefresh}
        />

        {/* Dialogue d'ajout d'événement */}
        <CreateEventDialogWrapper
          open={createDialogOpen}
          onClose={handleCreateDialogClose}
          createType={createType}
          eventToCopy={eventToCopy}
          createEventForm={createEventForm}
          onCreateEventFormChange={setCreateEventForm}
          createMeta={createMeta}
          onCreateMetaChange={setCreateMeta}
          pendingSlotDrafts={pendingSlotDrafts}
          onPendingSlotDraftsChange={setPendingSlotDrafts}
          onCreateEvent={handleCreateEvent}
        />

        {/* Dialogue d'édition d'événement */}
        <EditEventDialogWrapper
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          selectedEvent={selectedEvent}
          onSelectedEventChange={(event) => setSelectedEvent(event as Event | null)}
          editMeta={editMeta}
          onEditMetaChange={setEditMeta}
          onSaveEdit={handleEditEvent}
        />
        {/* Export dialog removed; use Export tab */}
      </Box>
    </EntityNamesProvider>
  );
}

export default function CalendrierPage() {
  return (
    <Suspense
      fallback={
        <Box>
          <CalendarSkeleton />
        </Box>
      }
    >
      <CalendrierContent />
    </Suspense>
  );
}
