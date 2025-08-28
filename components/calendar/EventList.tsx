'use client';

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  TextField,
  useTheme,
  useMediaQuery,
  Tooltip,
  Paper,
  CircularProgress,
} from '@mui/material';
import { FilterList as FilterListIcon } from '@mui/icons-material';
import { Print as PrintIcon, Search as SearchIcon } from '@mui/icons-material';
import MultiAssignDialog, { MultiAssignOption } from '@/components/shared/MultiAssignDialog';
import SlotDisplay from '@/components/calendar/SlotDisplay';
import { Person as PersonIcon } from '@mui/icons-material';
import { EventListSkeleton } from '@/components/shared/LoadingSkeleton';
import { useEntityNames } from '@/components/providers/EntityNamesProvider';
import { buildAndDownloadEventPdfServer } from '@/lib/export/serverEventPdf';

interface Event {
  id: number;
  title: string;
  discipline: string;
  ownerId: number;
  owner: { id: number; name: string; email: string };
  timeslots: any[];
  classIds?: number[] | any;
  salleIds?: number[] | any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface EventListProps {
  events: Event[];
  discipline: 'chimie' | 'physique' | 'all';
  loading?: boolean;
  roomFilter?: number | 'all';
  classFilter?: number | 'all';
  onEventClick: (event: Event) => void;
  groupTimeslotsLabel: (slots: any[]) => string;
  emptyMessage?: string;
  emptySubMessage?: string;
  onEventUpdate?: (eventId: number) => void; // Callback pour notifier les modifications
  onDeleteEvent?: (eventId: number) => void; // Suppression ciblée
  deletingId?: number | null; // Id en cours de suppression pour overlay
  // Validation props
  canValidate?: boolean;
  isOwner?: (event: Event) => boolean; // Function to determine if user owns the event
  // Role de l'utilisateur pour adapter l'UI (ex: LABORANTIN_CHIMIE / LABORANTIN_PHYSIQUE)
  userRole?:
    | 'ADMIN'
    | 'ADMINLABO'
    | 'ENSEIGNANT'
    | 'LABORANTIN_PHYSIQUE'
    | 'LABORANTIN_CHIMIE'
    | 'ELEVE'
    | undefined;
}

export default function EventList({
  events,
  discipline,
  loading = false,
  roomFilter = 'all',
  classFilter = 'all',
  onEventClick,
  groupTimeslotsLabel,
  emptyMessage = `Aucun événement de ${discipline}`,
  emptySubMessage = 'Cliquez sur "Nouveau TP" pour ajouter votre premier événement',
  onEventUpdate,
  onDeleteEvent,
  deletingId = null,
  canValidate = false,
  isOwner,
  userRole,
}: EventListProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));
  // Local copy to allow fine-grained optimistic updates (slot-level) without full parent refresh
  const [localEvents, setLocalEvents] = React.useState<Event[]>(events);
  const [refreshKeyByEvent, setRefreshKeyByEvent] = React.useState<Record<number, number>>({});
  const [updatingEventIds, setUpdatingEventIds] = React.useState<Set<number>>(new Set());
  const [newlyAddedEventIds, setNewlyAddedEventIds] = React.useState<Set<number>>(new Set());
  // Local filter UI state (moved from ActionHeader)
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [roomFilterLocal, setRoomFilterLocal] = React.useState<number | 'all'>(roomFilter);
  const [classFilterLocal, setClassFilterLocal] = React.useState<number | 'all'>(classFilter);
  const [dateRange, setDateRange] = React.useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [sallesOptions, setSallesOptions] = React.useState<Array<{ id: number; name: string }>>([]);
  const [allClasses, setAllClasses] = React.useState<Array<{ id: number; name: string }>>([]);
  const [loadingClasses, setLoadingClasses] = React.useState(false);
  const [exportingIds, setExportingIds] = React.useState<Set<number>>(new Set());
  // Dialog state must be declared before any conditional returns to keep hooks order stable
  const [dialog, setDialog] = React.useState<null | { type: 'salles' | 'classes'; slot: any }>(
    null,
  );

  // Keep track of previous event IDs to detect new additions
  const previousEventIdsRef = React.useRef<Set<number>>(new Set());

  React.useEffect(() => {
    // Detect newly added events by comparing with previous IDs
    const currentIds = new Set(events.map((e) => e.id));
    const newIds = [...currentIds].filter((id) => !previousEventIdsRef.current.has(id));

    if (newIds.length > 0) {
      setNewlyAddedEventIds(new Set(newIds));
      // Remove the "new" status after animation
      setTimeout(() => {
        setNewlyAddedEventIds(new Set());
      }, 2000);
    }

    // Update the ref for next comparison
    previousEventIdsRef.current = currentIds;
    setLocalEvents(events);
  }, [events]);

  // Initialize local filters from props if provided (back-compat while migrating)
  React.useEffect(() => {
    setRoomFilterLocal(roomFilter);
  }, [roomFilter]);
  React.useEffect(() => {
    setClassFilterLocal(classFilter);
  }, [classFilter]);

  // Listen to global window events to toggle targeted update spinners without prop drilling
  React.useEffect(() => {
    const onStart = (e: any) => {
      const id = e?.detail?.eventId;
      if (typeof id === 'number') setUpdatingEventIds((prev) => new Set(prev).add(id));
    };
    const onEnd = (e: any) => {
      const id = e?.detail?.eventId;
      if (typeof id === 'number') {
        setUpdatingEventIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        // Rerender that card
        setRefreshKeyByEvent((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
        // Ask parent to refresh that event if possible (ensures latest data after dialogs)
        if (onEventUpdate) {
          try {
            onEventUpdate(id);
          } catch {}
        }
      }
    };
    window.addEventListener('event-update:start', onStart as any);
    window.addEventListener('event-update:end', onEnd as any);
    return () => {
      window.removeEventListener('event-update:start', onStart as any);
      window.removeEventListener('event-update:end', onEnd as any);
    };
  }, [onEventUpdate]);

  // Listen for slot-level updates coming from EditEventDialog (created/modified/deleted)
  React.useEffect(() => {
    const onSlotsUpdated = (e: any) => {
      const detail = e?.detail || {};
      const eventId: number | undefined = detail.eventId;
      if (typeof eventId !== 'number') return;
      const created: any[] = Array.isArray(detail.created) ? detail.created : [];
      const modified: any[] = Array.isArray(detail.modified) ? detail.modified : [];
      const deleted: number[] = Array.isArray(detail.deleted)
        ? detail.deleted.filter((x: any) => typeof x === 'number')
        : [];
      setLocalEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== eventId) return ev;
          // Work on a shallow copy of timeslots
          let nextSlots: any[] = Array.isArray(ev.timeslots) ? [...ev.timeslots] : [];
          if (deleted.length) {
            const delSet = new Set<number>(deleted);
            nextSlots = nextSlots.filter((ts: any) => !delSet.has(ts.id));
          }
          if (modified.length) {
            const byId: Record<number, any> = Object.create(null);
            modified.forEach((m: any) => {
              if (typeof m.id === 'number') byId[m.id] = m;
            });
            nextSlots = nextSlots.map((ts: any) =>
              byId[ts.id]
                ? {
                    ...ts,
                    ...byId[ts.id],
                  }
                : ts,
            );
          }
          if (created.length) {
            nextSlots = nextSlots.concat(created);
          }
          // Recompute aggregated salleIds/classIds at event level
          const salleSet = new Set<number>();
          const classSet = new Set<number>();
          nextSlots.forEach((ts: any) => {
            (ts.salleIds || []).forEach((id: number) => {
              if (typeof id === 'number') salleSet.add(id);
            });
            (ts.classIds || []).forEach((id: number) => {
              if (typeof id === 'number') classSet.add(id);
            });
          });
          return {
            ...ev,
            timeslots: nextSlots,
            salleIds: Array.from(salleSet.values()),
            classIds: Array.from(classSet.values()),
          };
        }),
      );
      // Lightweight rerender for that event card
      setRefreshKeyByEvent((prev) => ({ ...prev, [eventId]: (prev[eventId] || 0) + 1 }));
    };
    window.addEventListener('event-slots:updated', onSlotsUpdated as any);
    return () => window.removeEventListener('event-slots:updated', onSlotsUpdated as any);
  }, []);

  // Use shared provider maps to avoid duplicate network calls
  const { salles: salleMap, classes: classMap } = useEntityNames();

  // Load salles options once
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/salles');
        if (!r.ok) return;
        const d = await r.json();
        setSallesOptions((d?.salles || []).map((s: any) => ({ id: s.id, name: s.name })));
      } catch {}
    })();
  }, []);

  // Fetch all classes (for readable names) once
  React.useEffect(() => {
    if (allClasses.length > 0 || loadingClasses) return;
    (async () => {
      try {
        setLoadingClasses(true);
        const res = await fetch('/api/classes');
        if (res.ok) {
          const data = await res.json();
          const list: Array<{ id: number; name: string }> = [
            ...(data?.predefinedClasses || []),
            ...(data?.customClasses || []),
          ].map((c: any) => ({ id: c.id, name: c.name }));
          setAllClasses(list);
        }
      } catch {}
      setLoadingClasses(false);
    })();
  }, [allClasses.length, loadingClasses]);

  // Derive unique classes options from events
  const uniqueClassOptions = React.useMemo(() => {
    const ids = new Set<number>();
    localEvents.forEach((e) => {
      const arr: any = e.classIds;
      if (Array.isArray(arr)) arr.forEach((id) => typeof id === 'number' && ids.add(id));
    });
    return Array.from(ids.values())
      .map((id) => ({ id, name: allClasses.find((c) => c.id === id)?.name || `Classe ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [localEvents, allClasses]);

  const parseDate = (v: any) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    let s = String(v);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
      const [date, time] = s.split('T');
      const [Y, M, D] = date.split('-').map(Number);
      const [h, m] = time.split(':').map(Number);
      return new Date(Y, (M as any) - 1, D, h, m, 0, 0);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const dayEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const isEventInDateRange = (event: Event) => {
    if (!dateRange.start && !dateRange.end) return true;
    const startBound = dateRange.start ? dayStart(dateRange.start) : null;
    const endBound = dateRange.end ? dayEnd(dateRange.end) : null;
    return (event.timeslots || []).some((slot: any) => {
      // Support both timeslotDate (YYYY-MM-DD) and startDate/endDate
      if (slot.timeslotDate) {
        const d = parseDate(String(slot.timeslotDate));
        if (!d) return false;
        const ds = dayStart(d);
        if (startBound && ds < startBound) return false;
        if (endBound && ds > endBound) return false;
        return true;
      }
      const s = parseDate(slot.startDate);
      const e = parseDate(slot.endDate) || s;
      if (!s && !e) return false;
      const sd = s ? s : e!;
      const ed = e ? e : s!;
      if (startBound && ed < startBound) return false;
      if (endBound && sd > endBound) return false;
      return true;
    });
  };

  const filteredEvents = localEvents
    .filter((event) => (discipline === 'all' ? true : event.discipline === discipline))
    .filter((event) => {
      if (roomFilterLocal === 'all') return true;
      const eventSalleIds: number[] = Array.isArray(event.salleIds)
        ? (event.salleIds as any[])
        : [];
      return eventSalleIds.includes(roomFilterLocal as number);
    })
    .filter((event) => {
      if (classFilterLocal === 'all') return true;
      const eventClassIds: number[] = Array.isArray(event.classIds)
        ? (event.classIds as any[])
        : [];
      return eventClassIds.includes(classFilterLocal as number);
    })
    .filter(isEventInDateRange);

  if (loading) {
    return <EventListSkeleton />;
  }

  const isEmpty = filteredEvents.length === 0;

  // parseDate already defined above
  const formatDateHeader = (key: string) => {
    const d = parseDate(key);
    if (!d) return key;
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  const handleAssignSalle = (slot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDialog({ type: 'salles', slot });
  };
  const handleAssignClasses = (slot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDialog({ type: 'classes', slot });
  };

  const loadSalles = async (): Promise<MultiAssignOption[]> => {
    const r = await fetch('/api/salles');
    if (!r.ok) return [];
    const data = await r.json();
    return (data?.salles || []).map((s: any) => ({ id: s.id, name: s.name }));
  };
  const loadClasses = async (): Promise<MultiAssignOption[]> => {
    const r = await fetch('/api/classes');
    if (!r.ok) return [];
    const data = await r.json();
    return [...(data?.predefinedClasses || []), ...(data?.customClasses || [])].map((c: any) => ({
      id: c.id,
      name: c.name,
    }));
  };
  const saveAssign = async (ids: number[]) => {
    if (!dialog) return;
    const type = dialog.type;
    const slotId = dialog.slot?.id;
    const currentRaw: number[] =
      (type === 'salles' ? dialog.slot.salleIds : dialog.slot.classIds) || [];
    const current = (Array.isArray(currentRaw) ? currentRaw : []).filter(
      (x: any) => typeof x === 'number',
    );
    const next = (Array.isArray(ids) ? ids : []).filter((x: any) => typeof x === 'number');
    const sameSet = (a: number[], b: number[]) => {
      if (a.length !== b.length) return false;
      const s = new Set(a);
      for (const v of b) if (!s.has(v)) return false;
      return true;
    };
    if (sameSet(current, next)) {
      // No change: do nothing (optional: could emit a global info snackbar if needed)
      return;
    }
    const body: any = type === 'salles' ? { salleIds: next } : { classIds: next };

    try {
      // Dispatch targeted updating spinner for the event containing this slot
      try {
        const evId = localEvents.find((e) => e.timeslots.some((ts: any) => ts.id === slotId))
          ?.id as number | undefined;
        if (typeof evId === 'number')
          window.dispatchEvent(
            new CustomEvent('event-update:start', { detail: { eventId: evId } }),
          );
      } catch {}

      const res = await fetch(`/api/timeslots/${slotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = await res.json();
        // Reflect change on the slot
        setLocalEvents((prev) =>
          prev.map((ev) => ({
            ...ev,
            timeslots: ev.timeslots.map((ts: any) =>
              ts.id === slotId
                ? {
                    ...ts,
                    ...(type === 'salles' ? { salleIds: next } : { classIds: next }),
                  }
                : ts,
            ),
          })),
        );

        // If API returns aggregated event, merge it; else recompute union
        if (json?.event) {
          const { event: updatedEv } = json;
          setLocalEvents((prev) =>
            prev.map((ev) =>
              ev.id === updatedEv.id
                ? {
                    ...ev,
                    salleIds: updatedEv.salleIds ?? ev.salleIds,
                    classIds: updatedEv.classIds ?? ev.classIds,
                  }
                : ev,
            ),
          );
        } else {
          setLocalEvents((prev) =>
            prev.map((ev) => {
              if (!ev.timeslots.some((ts: any) => ts.id === slotId)) return ev;
              const salleSet = new Set<number>();
              const classSet = new Set<number>();
              ev.timeslots.forEach((ts: any) => {
                (ts.salleIds || []).forEach((id: number) => {
                  if (typeof id === 'number') salleSet.add(id);
                });
                (ts.classIds || []).forEach((id: number) => {
                  if (typeof id === 'number') classSet.add(id);
                });
              });
              return {
                ...ev,
                salleIds: Array.from(salleSet.values()),
                classIds: Array.from(classSet.values()),
              };
            }),
          );
        }
      }
    } catch {
      // Optionally could refetch that event if failure; keep silent for now
    } finally {
      try {
        const evId = localEvents.find((e) => e.timeslots.some((ts: any) => ts.id === slotId))
          ?.id as number | undefined;
        if (typeof evId === 'number')
          window.dispatchEvent(new CustomEvent('event-update:end', { detail: { eventId: evId } }));
      } catch {}
    }
  };


    const openPreview = (ev: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const previewUrl = `/pdf-preview?eventId=${ev.id}`;
    window.open(previewUrl, '_blank');
  };

  const openPdfInNewTab = (ev: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    // Ouvre immédiatement un nouvel onglet vers une page dédiée qui gère l'attente et l'affichage
    const url = `/pdf-open?eventId=${ev.id}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    // Si pop-up bloqué, l'utilisateur restera sur la page courante; aucune action supplémentaire
  };

  return (
    <Box>
      {/* Filters toggle button */}
      <Box display="flex" justifyContent="flex-end" my={1}>
        <Tooltip title={filtersOpen ? 'Masquer les filtres' : 'Afficher les filtres'}>
          <IconButton onClick={() => setFiltersOpen((v) => !v)} aria-label="filtrer">
            <FilterListIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Hidden filters panel */}
      {filtersOpen && (
        <Paper
          elevation={0}
          sx={{
            my: 2,
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: (t) => `1px solid ${t.palette.divider}`,
          }}
        >
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            {/* Room filter */}
            {sallesOptions.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: isMobileSmall ? 'column' : 'row',
                  alignItems: isMobileSmall ? 'flex-start' : 'center',
                  gap: 1,
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ width: isMobile ? '100%' : 'auto' }}
                >
                  Salle :
                </Typography>
                <TextField
                  select
                  size="small"
                  value={roomFilterLocal}
                  onChange={(e: React.ChangeEvent<any>) =>
                    setRoomFilterLocal(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  slotProps={{ select: { native: true } }}
                  fullWidth={isMobile}
                  sx={{ width: isMobile ? '100%' : 180 }}
                >
                  <option value="all">Toutes</option>
                  {sallesOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </TextField>
              </Box>
            )}

            {/* Class filter */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: 1,
                width: isMobile ? '100%' : 'auto',
              }}
            >
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ width: isMobile ? '100%' : 'auto' }}
              >
                Classe:
              </Typography>
              <TextField
                select
                size="small"
                value={classFilterLocal}
                onChange={(e: React.ChangeEvent<any>) =>
                  setClassFilterLocal(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                slotProps={{ select: { native: true } }}
                sx={{ maxWidth: isMobile ? '100%' : 200, width: '100%' }}
              >
                <option value="all">Toutes</option>
                {uniqueClassOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </TextField>
            </Box>

            {/* Date range */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: 1,
                width: isMobile ? '100%' : 'auto',
              }}
            >
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ width: isMobile ? '100%' : 'auto' }}
              >
                Période:
              </Typography>
              <TextField
                type="date"
                size="small"
                value={dateRange.start ? new Date(dateRange.start).toISOString().slice(0, 10) : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDateRange((prev) => ({
                    ...prev,
                    start: e.target.value ? new Date(e.target.value) : null,
                  }))
                }
                sx={{ maxWidth: isMobile ? '100%' : 180, width: '100%' }}
                slotProps={{ inputLabel: { shrink: false } }}
              />
              <Typography variant="body2">→</Typography>
              <TextField
                type="date"
                size="small"
                value={dateRange.end ? new Date(dateRange.end).toISOString().slice(0, 10) : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDateRange((prev) => ({
                    ...prev,
                    end: e.target.value ? new Date(e.target.value) : null,
                  }))
                }
                sx={{ maxWidth: isMobile ? '100%' : 180, width: '100%' }}
                slotProps={{ inputLabel: { shrink: false } }}
              />
            </Box>
          </Box>
        </Paper>
      )}

      <Box
        display="grid"
        gap={2}
        sx={{
          gridTemplateColumns: '1fr',
          '@media (min-width:1200px)': { gridTemplateColumns: '1fr' },
          maxWidth: '100%',
          width: '100%',
          pt: 1,
        }}
      >
        {isEmpty && (
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6">{emptyMessage}</Typography>
            <Typography variant="body2">{emptySubMessage}</Typography>
          </Box>
        )}
        {!isEmpty &&
          filteredEvents.map((event) => {
            const isLaborantin =
              userRole === 'LABORANTIN_CHIMIE' || userRole === 'LABORANTIN_PHYSIQUE';
            const slots = event.timeslots;
            const parseIds = (raw: any): number[] => {
              if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'number');
              if (typeof raw === 'string') {
                try {
                  const parsed = JSON.parse(raw);
                  if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'number');
                } catch {}
              }
              return [];
            };
            const eventSalleIds = parseIds(event.salleIds);
            const eventClassIds = parseIds(event.classIds);
            const isNewEvent = newlyAddedEventIds.has(event.id);
            return (
              <Box
                key={event.id}
                onClick={() => onEventClick(event)}
                className={isNewEvent ? 'new-event-animation' : ''}
                sx={(theme) => ({
                  p: { xs: 2, md: 3 },
                  // Réserver de l'espace à gauche pour le panneau actions des laborantins
                  pl: isLaborantin ? { xs: 2, md: '88px' } : { xs: 2, md: 3 },
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: `2px solid ${theme.palette.divider}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  maxWidth: '100%',
                  width: '100%',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  '&:hover': {
                    ...(theme.breakpoints.up('md') && {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      borderColor: theme.palette.primary.main,
                    }),
                  },
                })}
              >
                {/* Boutons PDF */}
                {!isLaborantin && (
                  // Affichage standard: petits boutons en haut à droite
                  <Box
                    sx={{ position: 'absolute', top: 8, right: 8, zIndex: 3 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Prévisualiser (éditeur)">
                        <span>
                          <IconButton
                            size="small"
                            aria-label="prévisualiser"
                            onClick={(e) => openPreview(event, e)}
                          >
                            <SearchIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip
                        title={
                          exportingIds.has(event.id) ? 'Génération…' : 'Ouvrir PDF dans un onglet'
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            aria-label="ouvrir PDF"
                            onClick={(e) => openPdfInNewTab(event, e)}
                            disabled={exportingIds.has(event.id)}
                          >
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                )}

                {isLaborantin && (
                  // Affichage laborantin: panneau vertical à gauche, sur toute la hauteur
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 72,
                      display: { xs: 'none', md: 'flex' },
                      flexDirection: 'column',
                      zIndex: 3,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Box
                      sx={(t) => ({
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: t.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                        borderRight: `1px solid ${t.palette.divider}`,
                        borderTop: `1px solid ${t.palette.divider}`,
                        borderLeft: `1px solid ${t.palette.divider}`,
                        borderTopLeftRadius: 16,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        '&:hover': {
                          bgcolor: t.palette.mode === 'dark' ? 'grey.700' : 'grey.200',
                        },
                      })}
                      role="button"
                      aria-label="prévisualiser"
                      onClick={(e) => openPreview(event, e)}
                    >
                      <Tooltip title="Prévisualiser (éditeur)">
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <SearchIcon />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            Aperçu
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Box>
                    <Box
                      sx={(t) => ({
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: t.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                        borderRight: `1px solid ${t.palette.divider}`,
                        borderBottom: `1px solid ${t.palette.divider}`,
                        borderLeft: `1px solid ${t.palette.divider}`,
                        borderBottomLeftRadius: 16,
                        cursor: exportingIds.has(event.id) ? 'progress' : 'pointer',
                        transition: 'background-color 0.2s ease',
                        '&:hover': {
                          bgcolor: t.palette.mode === 'dark' ? 'grey.700' : 'grey.200',
                        },
                        position: 'relative',
                      })}
                      role="button"
                      aria-label="ouvrir PDF"
                      onClick={(e) =>
                        !exportingIds.has(event.id) && openPdfInNewTab(event, e as any)
                      }
                    >
                      <Tooltip
                        title={
                          exportingIds.has(event.id) ? 'Génération…' : 'Ouvrir PDF dans un onglet'
                        }
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          {exportingIds.has(event.id) ? (
                            <CircularProgress size={24} />
                          ) : (
                            <PrintIcon />
                          )}
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            PDF
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Box>
                  </Box>
                )}
                {updatingEventIds.has(event.id) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      bgcolor: 'rgba(255,255,255,0.55)',
                      borderRadius: 3,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CircularProgress size={36} />
                  </Box>
                )}
                {deletingId === event.id && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      bgcolor: 'rgba(255,255,255,0.7)',
                      borderRadius: 3,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CircularProgress size={36} />
                  </Box>
                )}
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  sx={{ maxWidth: '100%', overflow: 'hidden' }}
                >
                  <PersonIcon fontSize="small" sx={{ color: 'primary.main', flexShrink: 0 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {event.owner?.name || 'Utilisateur inconnu'}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {event.title ? event.title : `Événement ID ${event.id}`}
                </Typography>

                {/* Ancien affichage 
            <Box display="flex" gap={2} alignItems="center" sx={{ mt: 1.5, flexWrap: 'wrap' }}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <RoomIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {(() => {
                    return eventSalleIds.length
                      ? eventSalleIds.map((id) => salleMap[id] || `Salle ${id}`).join(', ')
                      : 'Aucune salle';
                  })()}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <ClassIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {(() => {
                    return eventClassIds.length
                      ? eventClassIds.map((id) => classMap[id] || `Classe ${id}`).join(', ')
                      : 'Aucune classe';
                  })()}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <AccessTimeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}
                >
                  {groupTimeslotsLabel(event.timeslots)}
                  {event.timeslots.some((t: any) => t.state === 'approved') && (
                    <Tooltip title="Au moins un créneau validé">
                      <CheckCircleIcon fontSize="inherit" color="success" />
                    </Tooltip>
                  )}
                </Typography>
              </Box>
            </Box>
            */}

                <Box
                  mt={2}
                  sx={{
                    position: 'relative',
                    '& .MuiTypography-subtitle2': { textTransform: 'capitalize' },
                    // Ajuster l'affichage des groupes de créneaux sur mobile: marges réduites
                  }}
                >
                  <SlotDisplay
                    key={`${event.id}-${refreshKeyByEvent[event.id] || 0}`}
                    slots={slots as any}
                    salleMap={salleMap as any}
                    classMap={classMap as any}
                    onAssignSalle={(slot, ev) => handleAssignSalle(slot, ev)}
                    onAssignClasses={(slot, ev) => handleAssignClasses(slot, ev)}
                    onEventUpdate={(id) => {
                      if (onEventUpdate) onEventUpdate(id);
                      // Trigger a lightweight rerender only for this event card
                      setRefreshKeyByEvent((prev) => ({
                        ...prev,
                        [event.id]: (prev[event.id] || 0) + 1,
                      }));
                    }}
                    canValidate={canValidate}
                    isOwner={isOwner ? isOwner(event) : false}
                    eventId={event.id}
                    onSlotUpdate={() => {
                      // Refresh event data
                      if (onEventUpdate) {
                        onEventUpdate(event.id);
                      }
                      // Trigger a lightweight rerender only for this event card
                      setRefreshKeyByEvent((prev) => ({
                        ...prev,
                        [event.id]: (prev[event.id] || 0) + 1,
                      }));
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        {/* Render single instance of MultiAssignDialog outside clickable event cards to avoid click bubbling reopening details */}
        {dialog && dialog.slot && (
          <MultiAssignDialog
            open={!!dialog}
            title={dialog.type === 'salles' ? 'Associer des salles' : 'Associer des classes'}
            description={
              dialog.type === 'salles'
                ? 'Sélectionnez une ou plusieurs salles pour ce créneau.'
                : 'Sélectionnez une ou plusieurs classes pour ce créneau.'
            }
            loadOptions={dialog.type === 'salles' ? loadSalles : loadClasses}
            initialSelectedIds={
              (dialog.type === 'salles' ? dialog.slot.salleIds : dialog.slot.classIds) || []
            }
            onSave={saveAssign}
            onClose={() => setDialog(null)}
            saveLabel="Enregistrer"
            dialogType={dialog.type}
          />
        )}
      </Box>
    </Box>
  );
}
