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
  Checkbox,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Stack,
} from '@mui/material';
import { FilterList as FilterListIcon } from '@mui/icons-material';
import { Print as PrintIcon, Search as SearchIcon, Delete as DeleteIcon, SelectAll as SelectAllIcon, AttachFile as AttachFileIcon, Description as DescriptionIcon, DeleteSweep as DeleteSweepIcon } from '@mui/icons-material';
import MultiAssignDialog, { MultiAssignOption } from '@/components/shared/MultiAssignDialog';
import SlotDisplay from '@/components/calendar/SlotDisplay';
import { Person as PersonIcon } from '@mui/icons-material';
import { EventListSkeleton } from '@/components/shared/LoadingSkeleton';
import { useEntityNames } from '@/components/providers/EntityNamesProvider';

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
  // Multi-selection states
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedEvents, setSelectedEvents] = React.useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = React.useState(false);
  const [batchDeleteError, setBatchDeleteError] = React.useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = React.useState(false);
  const [selectedEventsDetails, setSelectedEventsDetails] = React.useState<any[]>([]);
  // Dialog state must be declared before any conditional returns to keep hooks order stable
  const [dialog, setDialog] = React.useState<null | { type: 'salles' | 'classes'; slot: any }>(
    null,
  );

  // Pagination states
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10); // Fixed page size
  const [showAll, setShowAll] = React.useState(false);

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

  // Pagination logic
  const totalEvents = filteredEvents.length;
  const totalPages = Math.ceil(totalEvents / pageSize);
  const paginatedEvents = showAll ? filteredEvents : filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [roomFilterLocal, classFilterLocal, dateRange, discipline]);

  // Reset to paginated view when events change significantly
  React.useEffect(() => {
    if (totalEvents <= pageSize) {
      setShowAll(true);
    } else if (showAll && totalEvents > pageSize * 2) {
      setShowAll(false);
      setPage(1);
    }
  }, [totalEvents, pageSize, showAll]);

  if (loading) {
    return <EventListSkeleton />;
  }

  const isEmpty = totalEvents === 0;

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

  // Multi-selection functions
  const handleSelectEvent = (eventId: number, checked: boolean) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(eventId);
      } else {
        newSet.delete(eventId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedEvents.size === paginatedEvents.length) {
      // Deselect all
      setSelectedEvents(new Set());
    } else {
      // Select all visible events
      setSelectedEvents(new Set(paginatedEvents.map(e => e.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedEvents.size === 0) return;

    // Fetch detailed information for selected events including documents
    setBatchDeleting(true);
    try {
      const eventDetailsPromises = Array.from(selectedEvents).map(eventId =>
        fetch(`/api/events/${eventId}`)
          .then(res => res.json())
          .then(data => data.event)
          .catch(() => null)
      );

      const details = await Promise.all(eventDetailsPromises);
      const validDetails = details.filter(event => event !== null);
      setSelectedEventsDetails(validDetails);
      setBatchDeleteDialogOpen(true);
    } catch (error) {
      setBatchDeleteError('Erreur lors du chargement des détails des événements');
    } finally {
      setBatchDeleting(false);
    }
  };

  const confirmBatchDelete = async () => {
    setBatchDeleteDialogOpen(false);
    setBatchDeleting(true);
    setBatchDeleteError(null);

    try {
      const idsToDelete = Array.from(selectedEvents);
      const deletePromises = idsToDelete.map((eventId) =>
        (async () => {
          // First delete the event's documents
          try {
            await fetch(`/api/events/${eventId}/documents`, { method: 'DELETE' });
          } catch (docError) {
            console.warn(`Erreur lors de la suppression des documents de l'événement ${eventId}:`, docError);
            // Continue with event deletion even if document deletion fails
          }
          
          // Then delete the event itself
          const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error(`Failed to delete event ${eventId}`);
          return eventId;
        })()
      );

      await Promise.all(deletePromises);

      setLocalEvents((prev) => prev.filter((event) => !idsToDelete.includes(event.id)));

      if (onEventUpdate) {
        idsToDelete.forEach((eventId) => onEventUpdate(eventId));
      }

      setSelectedEvents(new Set());
      setSelectionMode(false);
    } catch (error) {
      setBatchDeleteError(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setBatchDeleting(false);
    }
  };

  const openFileInNewTab = (fileUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fileUrl) return;
    const proxyUrl = `/api/documents/proxy?fileUrl=${encodeURIComponent(fileUrl)}`;
    window.open(proxyUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      // Exiting selection mode, clear selection
      setSelectedEvents(new Set());
      setBatchDeleteError(null);
    }
  };

  return (
    <Box>
      {/* Bulk actions bar */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        {!selectionMode ? (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={toggleSelectionMode}
            disabled={totalEvents === 0}
          >
            Suppression en lot
          </Button>
        ) : (
          <>
            <Button
              variant="outlined"
              onClick={() => {
                setSelectionMode(false);
                setSelectedEvents(new Set());
              }}
            >
              Annuler
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleSelectAll}
              disabled={paginatedEvents.length === 0 || paginatedEvents.every((e) => selectedEvents.has(e.id))}
            >
              Tout sélectionner
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedEvents(new Set())}
              disabled={selectedEvents.size === 0}
            >
              Tout déselectionner
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              disabled={selectedEvents.size === 0}
              onClick={handleBatchDelete}
            >
              Supprimer ({selectedEvents.size})
            </Button>
          </>
        )}
        <Tooltip title={filtersOpen ? 'Masquer les filtres' : 'Afficher les filtres'}>
          <IconButton onClick={() => setFiltersOpen((v) => !v)} aria-label="filtrer">
            <FilterListIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Batch delete error */}
      {batchDeleteError && (
        <Alert severity="error" sx={{ my: 1 }} onClose={() => setBatchDeleteError(null)}>
          {batchDeleteError}
        </Alert>
      )}

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
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 180 }}>
                  <InputLabel>Salle</InputLabel>
                  <Select
                    value={roomFilterLocal}
                    label="Salle"
                    onChange={(e: any) =>
                      setRoomFilterLocal(e.target.value === 'all' ? 'all' : Number(e.target.value))
                    }
                  >
                    <MenuItem value="all">Toutes</MenuItem>
                    {sallesOptions.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
              <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 200 }}>
                <InputLabel>Classe</InputLabel>
                <Select
                  value={classFilterLocal}
                  label="Classe"
                  onChange={(e: any) =>
                    setClassFilterLocal(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                >
                  <MenuItem value="all">Toutes</MenuItem>
                  {uniqueClassOptions.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                label="Début"
                value={dateRange.start ? new Date(dateRange.start).toISOString().slice(0, 10) : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDateRange((prev) => ({
                    ...prev,
                    start: e.target.value ? new Date(e.target.value) : null,
                  }))
                }
                sx={{ maxWidth: isMobile ? '100%' : 180, width: '100%' }}
                InputLabelProps={{ shrink: true }}
              />
              <Typography variant="body2">→</Typography>
              <TextField
                type="date"
                size="small"
                label="Fin"
                value={dateRange.end ? new Date(dateRange.end).toISOString().slice(0, 10) : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDateRange((prev) => ({
                    ...prev,
                    end: e.target.value ? new Date(e.target.value) : null,
                  }))
                }
                sx={{ maxWidth: isMobile ? '100%' : 180, width: '100%' }}
                InputLabelProps={{ shrink: true }}
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
            <Typography variant="h6">
              {selectionMode
                ? `Aucun événement ${discipline === 'all' ? '' : `de ${discipline}`} à sélectionner`
                : emptyMessage
              }
            </Typography>
            <Typography variant="body2">
              {selectionMode
                ? 'Utilisez les filtres pour affiner votre recherche'
                : emptySubMessage
              }
            </Typography>
          </Box>
        )}
        {!isEmpty &&
          paginatedEvents.map((event) => {
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
                onClick={() => {
                  if (selectionMode) {
                    handleSelectEvent(event.id, !selectedEvents.has(event.id));
                  } else {
                    onEventClick(event);
                  }
                }}
                className={isNewEvent ? 'new-event-animation' : ''}
                sx={(theme) => ({
                  p: { xs: 2, md: 3 },
                  // Réserver de l'espace à gauche pour le panneau actions des laborantins et la checkbox
                  pl: selectionMode
                    ? { xs: 6, md: '88px' } // Plus d'espace pour la checkbox
                    : isLaborantin
                      ? { xs: 2, md: '88px' }
                      : { xs: 2, md: 3 },
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: `2px solid ${selectionMode && selectedEvents.has(event.id) ? theme.palette.primary.main : theme.palette.divider}`,
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
                      borderColor: selectionMode && selectedEvents.has(event.id) ? theme.palette.primary.main : theme.palette.divider,
                    }),
                  },
                })}
              >
                {/* Selection checkbox */}
                {selectionMode && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 4,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedEvents.has(event.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectEvent(event.id, e.target.checked);
                      }}
                      size="small"
                    />
                  </Box>
                )}
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

        {/* Pagination and Show All controls */}
        {!isEmpty && totalEvents > pageSize && (
          <Stack
            direction="row"
            spacing={2}
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 3, px: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {showAll ? (
                  `Affichage de tous les ${totalEvents} événements`
                ) : (
                  `Page ${page} sur ${totalPages} (${totalEvents} événements au total)`
                )}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setShowAll(!showAll);
                  if (!showAll) {
                    setPage(1);
                  }
                }}
              >
                {showAll ? 'Paginer' : 'Tout afficher'}
              </Button>

              {!showAll && (
                <Pagination
                  size="small"
                  page={page}
                  count={Math.max(1, totalPages)}
                  onChange={(_, v) => setPage(v)}
                  showFirstButton
                  showLastButton
                />
              )}
            </Box>
          </Stack>
        )}
      </Box>

      {/* Batch Delete Confirmation Dialog */}
      <Dialog
        open={batchDeleteDialogOpen}
        onClose={() => setBatchDeleteDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '80vh' }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            <Typography variant="h6" component="span">
              Confirmer la suppression ({selectedEvents.size} événement{selectedEvents.size > 1 ? 's' : ''})
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Les événements suivants et tous leurs fichiers associés seront définitivement supprimés. Cette action est irréversible.
          </Typography>

          <List>
            {selectedEventsDetails.map((event, index) => {
              const associatedFiles = event.documents || [];
              
              return (
                <React.Fragment key={event.id}>
                  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
                    <Box display="flex" alignItems="center" gap={1} width="100%">
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <DescriptionIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" fontWeight={600}>
                            {event.title || `Événement ID ${event.id}`}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {event.owner?.name || 'Utilisateur inconnu'} • {event.discipline} • {event.timeslots?.length || 0} créneau{(event.timeslots?.length || 0) > 1 ? 'x' : ''}
                          </Typography>
                        }
                      />
                    </Box>

                    {associatedFiles.length > 0 && (
                      <Box sx={{ mt: 2, width: '100%', pl: 5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                          Fichiers associés ({associatedFiles.length}) :
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {associatedFiles.map((file: any, fileIndex: number) => (
                            <Chip
                              key={fileIndex}
                              icon={<AttachFileIcon />}
                              label={file.fileName || file.name || 'Fichier inconnu'}
                              size="small"
                              variant="outlined"
                              color="warning"
                              sx={{
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'warning.light' }
                              }}
                              onClick={(e) => openFileInNewTab(file.fileUrl || file.url, e)}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </ListItem>
                  {index < selectedEventsDetails.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setBatchDeleteDialogOpen(false)}
            color="inherit"
          >
            Annuler
          </Button>
          <Button
            onClick={confirmBatchDelete}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={batchDeleting}
          >
            {batchDeleting ? 'Suppression...' : 'Supprimer définitivement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
