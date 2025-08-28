'use client';

import React, { useEffect, useState } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import FrenchDatePicker, {
  FrenchDateOnly,
  FrenchTimeOnly,
} from '@/components/shared/FrenchDatePicker';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  Stack,
  TextField,
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  Science as ScienceIcon,
  Build as BuildIcon,
  Class as ClassIcon,
  MeetingRoom as MeetingRoomIcon,
  AttachFile as AttachFileIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  SwapHoriz as SwapHorizIcon,
  Event as EventIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import MultiAssignDialog, { MultiAssignOption } from '@/components/shared/MultiAssignDialog';
import { useEntityNames } from '@/components/providers/EntityNamesProvider';
import AddResourcesDialog, { AddResourcesDialogChange } from './AddResourcesDialog';
import { buildResourceSignature, buildCustomResourceSignature } from './resourceSignatures';
import { syncCustomResources } from '@/lib/services/customResourcesService';
import { FileUploadSection } from '@components/calendar/FileUploadSection';
import type { FileWithMetadata } from '@/types/global';
import SlotDisplay from './SlotDisplay';
import type { RawTimeslotLike } from './TimeslotPlanningDialog';
import { formatLocalIsoNoZ } from '@/lib/utils/datetime';

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

interface EventDetailsDialogProps {
  open: boolean;
  event: Event | null;
  onClose: () => void;
  onEdit?: (event: Event) => void;
  onCopy?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onApproveTimeSlots?: (event: Event) => void;
  onRejectTimeSlots?: (event: Event) => void;
  onApproveSlot?: (slotId: number) => void;
  onRejectSlot?: (slotId: number) => void;
  onCounterPropose?: (
    slotId: number,
    payload: {
      startDate?: string;
      endDate?: string;
      timeslotDate?: string;
      salleIds?: number[];
      classIds?: number[];
      notes?: string;
    },
  ) => void;
  canEdit: boolean;
  canValidate: boolean;
  isOwner?: boolean;
  onEventUpdate?: (eventId: number) => void; // Callback pour notifier les modifications
}

export default function EventDetailsDialog({
  open,
  event,
  onClose,
  onEdit,
  onCopy,
  onDelete,
  onApproveTimeSlots,
  onRejectTimeSlots,
  onApproveSlot,
  onRejectSlot,
  onCounterPropose,
  canEdit,
  canValidate,
  isOwner = false,
  onEventUpdate,
}: EventDetailsDialogProps) {
  const { classes: classMap, salles: salleMap } = useEntityNames();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [cpNotes, setCpNotes] = React.useState('');
  const [cpDateObj, setCpDateObj] = React.useState<Date | null>(null);
  const [cpStartObj, setCpStartObj] = React.useState<Date | null>(null);
  const [cpEndObj, setCpEndObj] = React.useState<Date | null>(null);
  const [showBulkCounter, setShowBulkCounter] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<null | 'salles' | 'classes'>(null);
  const [targetSlot, setTargetSlot] = React.useState<any | null>(null);
  const [, forceRerender] = React.useState(0);
  const [loadingSlotIds, setLoadingSlotIds] = React.useState<Set<number>>(new Set());
  const [resourcesDialogOpen, setResourcesDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity?: 'success' | 'info' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [localDocuments, setLocalDocuments] = useState<any[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState<FileWithMetadata[]>([]);
  const [addingDocs, setAddingDocs] = useState(false);
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null);
  const [uploadingOne, setUploadingOne] = useState(false);
  const [localMateriels, setLocalMateriels] = useState<any[]>([]);
  const [localReactifs, setLocalReactifs] = useState<any[]>([]);
  const [localCustomMats, setLocalCustomMats] = useState<any[]>([]);
  const [localCustomChems, setLocalCustomChems] = useState<any[]>([]);
  const [eventSalleIds, setEventSalleIds] = useState<number[]>([]);
  const [eventClassIds, setEventClassIds] = useState<number[]>([]);
  const [localTimeslots, setLocalTimeslots] = useState<any[]>([]);

  // Reset sticky UI state when dialog opens/closes or event changes
  useEffect(() => {
    if (!open) {
      setTargetSlot(null);
      setShowBulkCounter(false);
      setCpDateObj(null);
      setCpStartObj(null);
      setCpEndObj(null);
      setCpNotes('');
      setResourcesDialogOpen(false);
      setAddingDocs(false);
      setUploadingDocs([]);
    }
  }, [open]);
  useEffect(() => {
    // on event id change, clear per-event transient toggles
    setTargetSlot(null);
    setShowBulkCounter(false);
    setCpDateObj(null);
    setCpStartObj(null);
    setCpEndObj(null);
    setCpNotes('');
    setResourcesDialogOpen(false);
    setAddingDocs(false);
    setUploadingDocs([]);
  }, [event?.id]);

  // Entering focus mode (counter-propose) should close other subdialogs
  useEffect(() => {
    if (targetSlot) {
      setResourcesDialogOpen(false);
      setAddingDocs(false);
    }
  }, [targetSlot]);

  useEffect(() => {
    setUploadingDocs([]);
    setAddingDocs(false);
  }, [event?.id]);
  useEffect(() => {
    if (!open) {
      setUploadingDocs([]);
      setAddingDocs(false);
    }
  }, [open]);
  useEffect(() => {
    if (!event) return;
    setLocalTimeslots([...(event.timeslots || [])]);
    setLocalMateriels([...((event as any).materiels || [])]);
    setLocalReactifs([...((event as any).reactifs || [])]);
    setLocalCustomMats([...((event as any).customMaterielRequests || [])]);
    setLocalCustomChems([...((event as any).customReactifRequests || [])]);
    setLocalDocuments([...((event as any).documents || [])]);

    // Mettre à jour les IDs de salles et classes
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
    setEventSalleIds(parseIds(event.salleIds));
    setEventClassIds(parseIds(event.classIds));
  }, [event]);

  // Refetch event on external updates (edits) and update local state to reflect changes dynamically
  useEffect(() => {
    if (!event?.id) return;
    let cancelled = false;
    const refetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${event.id}`);
        if (!res.ok) return;
        const json = await res.json();
        const ev = json?.event || {};
        if (cancelled) return;
        setLocalTimeslots([...(ev.timeslots || [])]);
        setLocalMateriels([...(ev.materiels || [])]);
        setLocalReactifs([...(ev.reactifs || [])]);
        setLocalCustomMats([...(ev.customMaterielRequests || [])]);
        setLocalCustomChems([...(ev.customReactifRequests || [])]);
        setLocalDocuments([...(ev.documents || [])]);
        const parseIds = (raw: any): number[] => {
          if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'number');
          if (typeof raw === 'string') {
            try {
              const p = JSON.parse(raw);
              if (Array.isArray(p)) return p.filter((x) => typeof x === 'number');
            } catch {}
          }
          return [];
        };
        setEventSalleIds(parseIds(ev.salleIds));
        setEventClassIds(parseIds(ev.classIds));
      } catch {}
    };
    const onEnd = (e: any) => {
      try {
        const id = e?.detail?.eventId;
        if (!id || id !== event.id) return;
        refetchEvent();
      } catch {}
    };
    window.addEventListener('event-update:end', onEnd as any);
    window.addEventListener('event:refetch', onEnd as any);
    return () => {
      cancelled = true;
      window.removeEventListener('event-update:end', onEnd as any);
      window.removeEventListener('event:refetch', onEnd as any);
    };
  }, [event?.id]);

  const hasPendingSlots = (event?.timeslots || []).some(
    (slot) =>
      ['created', 'modified'].includes(slot.state) ||
      (isOwner && slot.state === 'counter_proposed'),
  );

  const parseDateSafe = (value: string | Date | null | undefined) => {
    if (!value) return null;
    try {
      if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
      let str = String(value).trim();
      if (!str) return null;
      // Normalize space to 'T'
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(str)) str = str.replace(' ', 'T');
      // If local-like ISO without Z, parse as local wall time
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
        const [date, time] = str.split('T');
        const [Y, M, D] = date.split('-').map(Number);
        const [h, m] = time.split(':').map(Number);
        return new Date(Y, (M as any) - 1, D, h, m, 0, 0);
      }
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  };
  const formatDate = (dateInput: string) => {
    const date = parseDateSafe(dateInput);
    if (!date) return 'Date invalide';
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const formatDateHeader = (key: string) => {
    const d = parseDateSafe(key);
    if (!d) return key;
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Helpers to format local dates without timezone shifts
  const toLocalIsoNoZ = (d: Date) => formatLocalIsoNoZ(d);
  const toDateOnly = (d: Date) => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  if (!event) return null;

  const openAssignDialog = (slot: any, type: 'salles' | 'classes') => {
    setTargetSlot(slot);
    setDialogType(type);
  };
  const loadSalles = async (): Promise<MultiAssignOption[]> => {
    const res = await fetch('/api/salles');
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.salles || []).map((s: any) => ({ id: s.id, name: s.name }));
  };
  const loadClasses = async (): Promise<MultiAssignOption[]> => {
    const res = await fetch('/api/classes');
    if (!res.ok) return [];
    const data = await res.json();
    const predefined = (data?.predefinedClasses || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      isCustom: false,
      group: 'Classes système',
    }));
    const custom = (data?.customClasses || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      isCustom: false === c.system ? true : !c.system,
      group: 'Mes classes',
    }));
    return [...custom, ...predefined];
  };
  const saveAssign = async (ids: number[]) => {
    if (!targetSlot || !dialogType) return;
    const currentRaw: number[] =
      (dialogType === 'salles' ? targetSlot.salleIds : targetSlot.classIds) || [];
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
      setSnackbar({ open: true, message: 'Aucune modification à enregistrer', severity: 'info' });
      return;
    }

    const body: any = dialogType === 'salles' ? { salleIds: next } : { classIds: next };
    try {
      try {
        if (event)
          window.dispatchEvent(
            new CustomEvent('event-update:start', { detail: { eventId: event.id } }),
          );
      } catch {}
      const res = await fetch(`/api/timeslots/${targetSlot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.event && event && json.event.id === event.id) {
          // Mettre à jour les states locaux avec les nouvelles valeurs
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
          setEventSalleIds(parseIds(json.event.salleIds));
          setEventClassIds(parseIds(json.event.classIds));
          (event as any).salleIds = json.event.salleIds ?? event.salleIds;
          (event as any).classIds = json.event.classIds ?? event.classIds;
        } else if (event) {
          const salleSet = new Set<number>();
          (event.timeslots || []).forEach((ts: any) => {
            (ts.salleIds || []).forEach((id: number) => {
              if (typeof id === 'number') salleSet.add(id);
            });
          });
          const classSet = new Set<number>();
          (event.timeslots || []).forEach((ts: any) => {
            (ts.classIds || []).forEach((id: number) => {
              if (typeof id === 'number') classSet.add(id);
            });
          });
          const newSalleIds = Array.from(salleSet.values());
          const newClassIds = Array.from(classSet.values());
          setEventSalleIds(newSalleIds);
          setEventClassIds(newClassIds);
          (event as any).salleIds = newSalleIds;
          (event as any).classIds = newClassIds;
        }
        // Reflect selection on the targeted slot after success
        if (dialogType === 'salles') targetSlot.salleIds = next;
        else targetSlot.classIds = next;
        forceRerender((x) => x + 1);

        // Notifier la modification
        if (onEventUpdate && event) {
          onEventUpdate(event.id);
        }
        setSnackbar({
          open: true,
          message: dialogType === 'salles' ? 'Salles mises à jour !' : 'Classes mises à jour !',
          severity: 'success',
        });
      } else {
        setSnackbar({ open: true, message: 'Échec de la mise à jour', severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, message: 'Erreur lors de la mise à jour', severity: 'error' });
    } finally {
      try {
        if (event)
          window.dispatchEvent(
            new CustomEvent('event-update:end', { detail: { eventId: event.id } }),
          );
      } catch {}
    }
  };

  const actionableStates = ['created', 'modified'];
  const eligibleSlots = (event?.timeslots || []).filter(
    (s) => actionableStates.includes(s.state) || (isOwner && s.state === 'counter_proposed'),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: 4,
          bgcolor: 'background.paper',
          backdropFilter: 'blur(10px)',
        },
      }}
    >
      <DialogTitle
        sx={(theme) => ({
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          color: theme.palette.primary.contrastText,
          fontWeight: 700,
        })}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.contrastText' }}>
              {event.owner?.name || '—'}
            </Typography>
            <Chip
              label={event.discipline || '—'}
              size="small"
              sx={{
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                fontWeight: 600,
                height: 22,
              }}
            />
          </Box>
          {event.title ? (
            <Typography
              variant="caption"
              sx={{ color: 'primary.contrastText', fontSize: '0.85rem' }}
            >
              {event.title}
            </Typography>
          ) : (
            <Typography
              variant="caption"
              sx={{ color: 'primary.contrastText', fontSize: '0.85rem', fontStyle: 'italic' }}
            >
              Aucun titre fourni
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ mt: 2, pb: 1 }}>
        <Box>
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
            >
              <Typography
                component="div"
                variant="subtitle1"
                sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <EventIcon fontSize="small" />{' '}
                {localTimeslots.length === 1 ? 'Créneau' : 'Créneaux'}
              </Typography>
              {canValidate && hasPendingSlots && (
                <Stack direction="row" spacing={1}>
                  {onApproveTimeSlots && (
                    <Tooltip title="Approuver tous les créneaux en attente">
                      <span>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => onApproveTimeSlots(event)}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {onRejectTimeSlots && (
                    <Tooltip title="Rejeter tous les créneaux en attente">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onRejectTimeSlots(event)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {onCounterPropose && eligibleSlots.length > 0 && (
                    <Tooltip title="Contre‑proposition groupée">
                      <span>
                        <IconButton
                          size="small"
                          color={showBulkCounter ? 'warning' : 'default'}
                          onClick={() => setShowBulkCounter((v) => !v)}
                        >
                          <SwapHorizIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              )}
            </Box>
            {showBulkCounter && onCounterPropose && (
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  border: '1px dashed',
                  borderColor: 'warning.main',
                  borderRadius: 2,
                  backgroundColor: 'warning.light',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Contre‑proposition groupée ({eligibleSlots.length} créneau(x))
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                      Date (optionnelle)
                    </Typography>
                    <FrenchDateOnly
                      selected={cpDateObj}
                      onChange={(d: Date | null) => setCpDateObj(d)}
                      customInput={<TextField size="medium" />}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                      Début (hh:mm)
                    </Typography>
                    <FrenchTimeOnly
                      selected={cpStartObj}
                      onChange={(d: Date | null) => setCpStartObj(d)}
                      timeIntervals={5}
                      customInput={<TextField size="medium" />}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                      Fin (hh:mm)
                    </Typography>
                    <FrenchTimeOnly
                      selected={cpEndObj}
                      onChange={(d: Date | null) => setCpEndObj(d)}
                      timeIntervals={5}
                      customInput={<TextField size="medium" />}
                    />
                  </Box>
                  <TextField
                    size="small"
                    label="Notes"
                    value={cpNotes}
                    onChange={(e) => setCpNotes(e.target.value)}
                    sx={{ minWidth: { xs: '100%', sm: 200 } }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<SwapHorizIcon fontSize="small" />}
                    disabled={eligibleSlots.some((slot) => loadingSlotIds.has(slot.id))}
                    onClick={async () => {
                      const payload: any = {};
                      if (cpDateObj) payload.timeslotDate = toDateOnly(cpDateObj);
                      if (cpStartObj) payload.startDate = toLocalIsoNoZ(cpStartObj);
                      if (cpEndObj) payload.endDate = toLocalIsoNoZ(cpEndObj);
                      if (cpNotes) payload.notes = cpNotes.trim();

                      // Add all eligible slots to loading state
                      setLoadingSlotIds(
                        (prev) => new Set([...prev, ...eligibleSlots.map((s) => s.id)]),
                      );
                      try {
                        try {
                          if (event)
                            window.dispatchEvent(
                              new CustomEvent('event-update:start', {
                                detail: { eventId: event.id },
                              }),
                            );
                        } catch {}
                        await Promise.all(
                          eligibleSlots.map((s) => onCounterPropose?.(s.id, payload)),
                        );
                        // Optimistic local update: mark proposed fields on each eligible slot
                        try {
                          (event.timeslots || []).forEach((s: any) => {
                            if (!eligibleSlots.find((e) => e.id === s.id)) return;
                            if (payload.startDate) s.proposedStartDate = payload.startDate;
                            if (payload.endDate) s.proposedEndDate = payload.endDate;
                            if (payload.timeslotDate) s.proposedTimeslotDate = payload.timeslotDate;
                            if (payload.notes) s.proposedNotes = payload.notes;
                            s.state = 'counter_proposed';
                          });
                          forceRerender((x) => x + 1);
                        } catch {}
                        // Notify parent for fine-grained rerender in lists
                        if (onEventUpdate && event) {
                          onEventUpdate(event.id);
                        }
                        setShowBulkCounter(false);
                        setCpDateObj(null);
                        setCpStartObj(null);
                        setCpEndObj(null);
                        setCpNotes('');
                      } finally {
                        // Remove all eligible slots from loading state
                        setLoadingSlotIds((prev) => {
                          const next = new Set(prev);
                          eligibleSlots.forEach((s) => next.delete(s.id));
                          return next;
                        });
                      }
                    }}
                  >
                    Appliquer
                  </Button>
                </Stack>
              </Box>
            )}
            {/* Focus mode: dim other sections when counter-proposing a specific slot */}
            <SlotDisplay
              slots={(targetSlot ? [targetSlot] : localTimeslots || []) as any}
              salleMap={salleMap as any}
              classMap={classMap as any}
              showAssignButtons
              onAssignSalle={(slot) => openAssignDialog(slot, 'salles')}
              onAssignClasses={(slot) => openAssignDialog(slot, 'classes')}
              onEventUpdate={onEventUpdate}
              loadingSlotIds={loadingSlotIds}
              canValidate={canValidate}
              isOwner={isOwner}
              eventId={event.id}
              onSlotUpdate={() => {
                // Refresh event data
                if (onEventUpdate) {
                  onEventUpdate(event.id);
                }
              }}
            />
            {targetSlot && canValidate && onCounterPropose && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  border: '1px dashed',
                  borderColor: 'warning.main',
                  borderRadius: 1.5,
                  backgroundColor: 'background.paper',
                  boxShadow: 3,
                  transition: 'all .25s ease',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  Contre‑proposition pour le créneau sélectionné
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'column' }}
                  spacing={1.5}
                  alignItems="flex-start"
                >
                  <Stack
                    sx={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 1.5,
                      justifyContent: 'space-between',
                    }}
                  >
                    <FrenchDateOnly
                      selected={cpDateObj}
                      onChange={(d: Date | null) => setCpDateObj(d)}
                      customInput={<TextField size="medium" label="Date" />}
                    />
                    <FrenchTimeOnly
                      selected={cpStartObj}
                      onChange={(d: Date | null) => setCpStartObj(d)}
                      timeIntervals={5}
                      customInput={<TextField size="medium" label="Début" />}
                    />
                    <FrenchTimeOnly
                      selected={cpEndObj}
                      onChange={(d: Date | null) => setCpEndObj(d)}
                      timeIntervals={5}
                      customInput={<TextField size="medium" label="Fin" />}
                    />
                  </Stack>
                  <Stack
                    sx={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 1.5,
                      justifyContent: 'space-between',
                    }}
                  >
                    <TextField
                      size="medium"
                      label="Notes"
                      value={cpNotes}
                      onChange={(e) => setCpNotes(e.target.value)}
                      sx={{
                        minWidth: 160,
                        flexGrow: 2,
                        maxWidth: '100%',
                      }}
                    />
                    <Stack
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 1.5,
                        justifyContent: 'space-around',
                        flexGrow: 1,
                      }}
                    >
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SwapHorizIcon fontSize="small" />}
                        disabled={loadingSlotIds.has(targetSlot?.id)}
                        onClick={async () => {
                          if (!targetSlot) return;
                          const payload: any = {};
                          if (cpDateObj) payload.timeslotDate = toDateOnly(cpDateObj);
                          if (cpStartObj) payload.startDate = toLocalIsoNoZ(cpStartObj);
                          if (cpEndObj) payload.endDate = toLocalIsoNoZ(cpEndObj);
                          if (cpNotes) payload.notes = cpNotes.trim();

                          setLoadingSlotIds((prev) => new Set([...prev, targetSlot.id]));
                          try {
                            if (event)
                              window.dispatchEvent(
                                new CustomEvent('event-update:start', {
                                  detail: { eventId: event.id },
                                }),
                              );
                            await onCounterPropose(targetSlot.id, payload);
                            // Optimistic local update: reflect proposed fields on the targeted slot
                            try {
                              const s = (event.timeslots || []).find(
                                (ts: any) => ts.id === targetSlot.id,
                              );
                              if (s) {
                                if (payload.startDate) s.proposedStartDate = payload.startDate;
                                if (payload.endDate) s.proposedEndDate = payload.endDate;
                                if (payload.timeslotDate)
                                  s.proposedTimeslotDate = payload.timeslotDate;
                                if (payload.notes) s.proposedNotes = payload.notes;
                                s.state = 'counter_proposed';
                              }
                              forceRerender((x) => x + 1);
                            } catch {}
                            // Notify parent for fine-grained rerender in lists
                            if (onEventUpdate && event) {
                              onEventUpdate(event.id);
                            }
                            // After sending, clear focus and inputs
                            setTargetSlot(null);
                            setCpDateObj(null);
                            setCpStartObj(null);
                            setCpEndObj(null);
                            setCpNotes('');
                            try {
                              if (event)
                                window.dispatchEvent(
                                  new CustomEvent('event-update:end', {
                                    detail: { eventId: event.id },
                                  }),
                                );
                            } catch {}
                          } finally {
                            setLoadingSlotIds((prev) => {
                              const next = new Set(prev);
                              next.delete(targetSlot.id);
                              return next;
                            });
                          }
                        }}
                      >
                        Envoyer
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setTargetSlot(null);
                          setCpDateObj(null);
                          setCpStartObj(null);
                          setCpEndObj(null);
                          setCpNotes('');
                        }}
                      >
                        Annuler
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            )}
            {/* Proposed variants are shown inline by SlotDisplay when proposed* fields are present */}
          </Box>
          <Collapse in={!targetSlot} timeout={250} unmountOnExit>
            <Box>
              <Box
                sx={{
                  my: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    component="div"
                    variant="subtitle1"
                    sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <MeetingRoomIcon fontSize="small" />{' '}
                    {eventSalleIds.length === 1 ? 'Salle' : 'Salles'}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                    {eventSalleIds.length > 0 ? (
                      eventSalleIds.map((id: number) => (
                        <Chip key={id} label={salleMap[id] || `Salle ${id}`} size="small" />
                      ))
                    ) : (
                      <Chip label="Aucune" size="small" variant="outlined" />
                    )}
                  </Stack>
                </Box>
                <Box>
                  <Typography
                    component="div"
                    variant="subtitle1"
                    sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <ClassIcon fontSize="small" />{' '}
                    {eventClassIds.length === 1 ? 'Classe' : 'Classes'}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                    {eventClassIds.length > 0 ? (
                      eventClassIds.map((id: number) => (
                        <Chip key={id} label={classMap[id] || `Classe ${id}`} size="small" />
                      ))
                    ) : (
                      <Chip label="Aucune" size="small" variant="outlined" />
                    )}
                  </Stack>
                </Box>
              </Box>
              <TableContainer component={Paper} sx={{ mt: 2, maxWidth: 600, margin: '0 auto' }}>
                <Table size="small" sx={{ minWidth: 300 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          borderBottom: '2px solid',
                          borderColor: 'primary.main',
                          color: 'primary.main',
                        }}
                      >
                        Type / Nom
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 'bold',
                          borderBottom: '2px solid',
                          borderColor: 'primary.main',
                          color: 'primary.main',
                        }}
                      >
                        Quantité
                      </TableCell>
                      {canEdit && (
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 'bold',
                            borderBottom: '2px solid',
                            borderColor: 'primary.main',
                            color: 'primary.main',
                          }}
                        >
                          Actions
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={canEdit ? 3 : 2}
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: 'grey.100',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <BuildIcon fontSize="small" /> Matériel
                      </TableCell>
                    </TableRow>
                    {localMateriels.map((m: any) => (
                      <TableRow key={`ev-mat-preset-${m.id}`}>
                        <TableCell>
                          <Typography variant="body2">{m.materielName}</Typography>
                        </TableCell>
                        <TableCell align="right">{m.quantity ? `${m.quantity}` : 'N/A'}</TableCell>
                        {canEdit && (
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={async () => {
                                const backup = [...localMateriels];
                                setLocalMateriels((prev) => prev.filter((x) => x.id !== m.id));
                                try {
                                  const remaining = backup
                                    .filter((x) => x.id !== m.id)
                                    .map((x) => ({
                                      materielId: x.materielId,
                                      name: x.materielName,
                                      quantity: x.quantity ?? 1,
                                      isCustom: false,
                                    }));
                                  await fetch(`/api/events/${event.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ materiels: remaining }),
                                  });
                                } catch {
                                  setLocalMateriels(backup);
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {localCustomMats.map((rm: any) => (
                      <TableRow key={`ev-mat-custom-${rm.id}`}>
                        <TableCell>
                          <Typography
                            variant="body2"
                            component="span"
                            sx={{ display: 'flex', alignItems: 'center' }}
                          >
                            {rm.name}
                            <Chip
                              label="PERSO"
                              size="small"
                              color="warning"
                              variant="filled"
                              sx={{ ml: 1, fontSize: '0.7rem', height: '18px' }}
                            />
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {rm.quantity ? `${rm.quantity}` : 'N/A'}
                        </TableCell>
                        {canEdit && (
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={async () => {
                                const backup = [...localCustomMats];
                                setLocalCustomMats((prev) => prev.filter((x) => x.id !== rm.id));
                                try {
                                  await fetch(
                                    `/api/events/${event.id}/requests/materiels?requestId=${rm.id}`,
                                    { method: 'DELETE' },
                                  );
                                } catch {
                                  setLocalCustomMats(backup);
                                }
                              }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {!(localMateriels.length || localCustomMats.length) && (
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            Aucun matériel
                          </Typography>
                        </TableCell>
                        <TableCell align="right">-</TableCell>
                        {canEdit && <TableCell align="center">-</TableCell>}
                      </TableRow>
                    )}
                    {event.discipline === 'chimie' ? (
                      <>
                        <TableRow>
                          <TableCell
                            colSpan={canEdit ? 3 : 2}
                            sx={{
                              fontWeight: 'bold',
                              bgcolor: 'grey.100',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <ScienceIcon fontSize="small" /> Réactifs Chimiques
                          </TableCell>
                        </TableRow>
                        {localReactifs.map((r: any) => (
                          <TableRow key={`ev-react-preset-${r.id}`}>
                            <TableCell>
                              <Typography variant="body2">{r.reactifName}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              {r.requestedQuantity || r.requestedQuantity === 0
                                ? `${r.requestedQuantity} ${r.unit || 'g'}`.trim()
                                : 'N/A'}
                            </TableCell>
                            {canEdit && (
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={async () => {
                                    const backup = [...localReactifs];
                                    setLocalReactifs((prev) => prev.filter((x) => x.id !== r.id));
                                    try {
                                      const remaining = backup
                                        .filter((x) => x.id !== r.id)
                                        .map((x) => ({
                                          reactifId: x.reactifId,
                                          name: x.reactifName,
                                          requestedQuantity: x.requestedQuantity ?? 0,
                                          unit: x.unit || 'g',
                                          isCustom: false,
                                        }));
                                      await fetch(`/api/events/${event.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ reactifs: remaining }),
                                      });
                                    } catch {
                                      setLocalReactifs(backup);
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {localCustomChems.map((rr: any) => (
                          <TableRow key={`ev-react-custom-${rr.id}`}>
                            <TableCell>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ display: 'flex', alignItems: 'center' }}
                              >
                                {rr.name}
                                <Chip
                                  label="PERSO"
                                  size="small"
                                  color="warning"
                                  variant="filled"
                                  sx={{ ml: 1, fontSize: '0.7rem', height: '18px' }}
                                />
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {rr.requestedQuantity || rr.requestedQuantity === 0
                                ? `${rr.requestedQuantity} ${rr.unit || 'g'}`.trim()
                                : 'N/A'}
                            </TableCell>
                            {canEdit && (
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={async () => {
                                    const backup = [...localCustomChems];
                                    setLocalCustomChems((prev) =>
                                      prev.filter((x) => x.id !== rr.id),
                                    );
                                    try {
                                      await fetch(
                                        `/api/events/${event.id}/requests/reactifs?requestId=${rr.id}`,
                                        { method: 'DELETE' },
                                      );
                                    } catch {
                                      setLocalCustomChems(backup);
                                    }
                                  }}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {!(localReactifs.length || localCustomChems.length) && (
                          <TableRow>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                Aucun réactif
                              </Typography>
                            </TableCell>
                            <TableCell align="right">-</TableCell>
                            {canEdit && <TableCell align="center">-</TableCell>}
                          </TableRow>
                        )}
                      </>
                    ) : (
                      <>
                        <TableRow>
                          <TableCell
                            colSpan={canEdit ? 3 : 2}
                            sx={{
                              fontWeight: 'bold',
                              bgcolor: 'grey.100',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <ScienceIcon fontSize="small" /> Réactifs Chimiques
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              Non applicable (Physique)
                            </Typography>
                          </TableCell>
                          <TableCell align="right">-</TableCell>
                          {canEdit && <TableCell align="center">-</TableCell>}
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {canEdit && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={() => setResourcesDialogOpen(true)}
                  >
                    Gérer Matériel & Réactifs
                  </Button>
                </Box>
              )}
              <Box sx={{ mt: 2 }}>
                <Typography
                  component="div"
                  variant="subtitle1"
                  sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <AttachFileIcon fontSize="small" /> Documents
                </Typography>
                {localDocuments.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Aucun document
                  </Typography>
                )}
                {localDocuments.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    {localDocuments.map((doc: any) => {
                      const effectiveName =
                        doc.fileName ||
                        (() => {
                          try {
                            const raw = decodeURIComponent(String(doc.fileUrl || '')).split('?')[0];
                            const parts = raw.split('/');
                            return parts[parts.length - 1] || 'Document';
                          } catch {
                            return 'Document';
                          }
                        })();
                      const sizeLabel = doc.fileSize
                        ? `${(doc.fileSize / 1024).toFixed(1)} KB`
                        : '';
                      const tooltip = `${effectiveName}${doc.fileType ? `\nType: ${doc.fileType}` : ''}${sizeLabel ? `\nTaille: ${sizeLabel}` : ''}`;
                      const buildDownloadUrl = (rawUrl: string) => {
                        if (!rawUrl) return rawUrl;
                        // In production, serve via proxy API for auth and headers
                        if (process.env.NODE_ENV === 'production') {
                          const enc = encodeURIComponent(rawUrl);
                          return `/api/documents/proxy?fileUrl=${enc}`;
                        }
                        return rawUrl;
                      };
                      const openUrl = buildDownloadUrl(doc.fileUrl);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Tooltip key={doc.id || doc.fileUrl} title={tooltip} arrow>
                            <Chip
                              label={effectiveName}
                              size="small"
                              variant="outlined"
                              onClick={() => openUrl && window.open(openUrl, '_blank')}
                              icon={<AttachFileIcon sx={{ fontSize: 14 }} />}
                            />
                          </Tooltip>
                          <Tooltip title="Télécharger">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => openUrl && window.open(openUrl, '_blank')}
                              >
                                <DownloadIcon fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {canEdit && (
                            <Tooltip title="Supprimer (archiver)">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={docActionLoading === doc.fileUrl}
                                  onClick={async () => {
                                    const remaining = localDocuments.filter((d: any) => d !== doc);
                                    setLocalDocuments(remaining);
                                    if (event) (event as any).documents = remaining;
                                    forceRerender((x) => x + 1);
                                    try {
                                      setDocActionLoading(doc.fileUrl);
                                      const res = await fetch(
                                        `/api/events/${event.id}/documents?fileUrl=${encodeURIComponent(doc.fileUrl)}`,
                                        { method: 'DELETE' },
                                      );
                                      if (!res.ok) throw new Error('delete failed');
                                      setSnackbar({
                                        open: true,
                                        message: 'Document supprimé',
                                        severity: 'success',
                                      });
                                    } catch (e) {
                                      setLocalDocuments((prev) => [...prev, doc]);
                                      setSnackbar({
                                        open: true,
                                        message: 'Échec suppression',
                                        severity: 'error',
                                      });
                                    } finally {
                                      setDocActionLoading(null);
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="inherit" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}{' '}
                        </Box>
                      );
                    })}
                  </Stack>
                )}
                {canEdit && !addingDocs && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      startIcon={<CloudUploadIcon fontSize="small" />}
                      onClick={() => setAddingDocs(true)}
                    >
                      Ajouter des documents
                    </Button>
                  </Box>
                )}
                {canEdit && addingDocs && (
                  <Box sx={{ mt: 2 }}>
                    <FileUploadSection
                      files={uploadingDocs}
                      onFilesChange={setUploadingDocs}
                      maxFiles={5}
                      eventId={event.id}
                      onFileUploaded={async (_fileId, uploaded) => {
                        setLocalDocuments((prev) => {
                          if (prev.some((d) => d.fileUrl === uploaded.fileUrl)) return prev;
                          return [
                            ...prev,
                            {
                              id: uploaded.documentId || `temp-${Date.now()}`,
                              fileName: uploaded.fileName,
                              fileUrl: uploaded.fileUrl,
                              fileSize: uploaded.fileSize,
                              fileType: uploaded.fileType,
                            },
                          ];
                        });
                        setSnackbar({
                          open: true,
                          message: uploaded.duplicate
                            ? 'Document déjà présent (non ré-ajouté)'
                            : 'Document ajouté',
                          severity: uploaded.duplicate ? 'info' : 'success',
                        });
                      }}
                      onFileDeleted={(fileUrl) => {
                        setLocalDocuments((prev) => prev.filter((d: any) => d.fileUrl !== fileUrl));
                        try {
                          if (event)
                            window.dispatchEvent(
                              new CustomEvent('event-update:end', { detail: { eventId: event.id } }),
                            );
                        } catch {}
                      }}
                    />
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        disabled={uploadingOne}
                        onClick={() => {
                          setAddingDocs(false);
                          setUploadingDocs([]);
                        }}
                      >
                        {uploadingOne ? 'Patientez…' : 'Terminer'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
              {resourcesDialogOpen && event && (
                <AddResourcesDialog
                  discipline={event.discipline === 'chimie' ? 'chimie' : 'physique'}
                  open={resourcesDialogOpen}
                  mode="dialog"
                  onClose={() => setResourcesDialogOpen(false)}
                  presetMaterials={localMateriels.map((m) => ({
                    id: m.materielId || m.id,
                    name: m.materielName,
                    quantity: m.quantity,
                  }))}
                  customMaterials={localCustomMats.map((m) => ({
                    id: m.id,
                    name: m.name,
                    quantity: m.quantity,
                  }))}
                  presetChemicals={localReactifs.map((r) => ({
                    id: r.reactifId || r.id,
                    name: r.reactifName,
                    requestedQuantity: r.requestedQuantity,
                    unit: r.unit,
                  }))}
                  customChemicals={localCustomChems.map((c) => ({
                    id: c.id,
                    name: c.name,
                    requestedQuantity: c.requestedQuantity,
                    unit: c.unit,
                  }))}
                  onChange={() => {}}
                  onSave={async (data: AddResourcesDialogChange) => {
                    const toNumber = (v: any, def: number) => {
                      if (v === '' || v === null || v === undefined) return def;
                      const n = Number(v);
                      return Number.isFinite(n) ? n : def;
                    };
                    const clampMin = (v: number, min: number) => (v < min ? min : v);
                    const newMateriels = data.presetMaterials
                      .filter((m) => m.name && m.name.trim())
                      .map((m) => ({
                        materielId: m.id,
                        name: m.name.trim(),
                        quantity: clampMin(toNumber(m.quantity, 1), 1),
                        isCustom: false,
                      }));
                    const newReactifs = data.presetChemicals
                      .filter((c) => c.name && c.name.trim())
                      .map((c) => ({
                        reactifId: c.id,
                        name: c.name.trim(),
                        requestedQuantity: Math.max(0, toNumber(c.requestedQuantity, 0)),
                        unit: (c.unit && c.unit.trim()) || 'g',
                        isCustom: false,
                      }));
                    const currentSig = buildResourceSignature({
                      materiels: localMateriels,
                      reactifs: localReactifs,
                    });
                    const nextSig = buildResourceSignature({
                      materiels: newMateriels,
                      reactifs: newReactifs,
                    });
                    const presetChanged = currentSig !== nextSig;
                    const currentCustomSig = buildCustomResourceSignature({
                      customMateriels: localCustomMats.map((m) => ({
                        name: m.name,
                        quantity: m.quantity,
                      })),
                      customReactifs: localCustomChems.map((c) => ({
                        name: c.name,
                        requestedQuantity: c.requestedQuantity,
                        unit: c.unit,
                      })),
                    });
                    const nextCustomSig = buildCustomResourceSignature({
                      customMateriels: data.customMaterials.map((m) => ({
                        name: m.name,
                        quantity: m.quantity,
                      })),
                      customReactifs: data.customChemicals.map((c) => ({
                        name: c.name,
                        requestedQuantity: c.requestedQuantity,
                        unit: c.unit,
                      })),
                    });
                    const customChangedPlanned = currentCustomSig !== nextCustomSig;
                    if (presetChanged) {
                      try {
                        await fetch(`/api/events/${event.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ materiels: newMateriels, reactifs: newReactifs }),
                        });
                      } catch (e) {
                        setSnackbar({
                          open: true,
                          message: 'Erreur lors de la mise à jour des ressources prédéfinies',
                          severity: 'error',
                        });
                        return;
                      }
                    }
                    let customChanged = false;
                    if (customChangedPlanned) {
                      try {
                        const syncResult = await syncCustomResources(event.id, {
                          materials: data.customMaterials.map((m) => ({
                            name: m.name,
                            quantity: m.quantity,
                          })),
                          chemicals: data.customChemicals.map((c) => ({
                            name: c.name,
                            requestedQuantity: c.requestedQuantity,
                            unit: c.unit,
                          })),
                        });
                        customChanged = syncResult.changed;
                        if (!syncResult.success) {
                          console.error(
                            '[EventDetailsDialog][customSync] errors',
                            syncResult.errors,
                          );
                        }
                      } catch (err) {
                        setSnackbar({
                          open: true,
                          message: 'Erreur lors de la synchronisation des ressources perso',
                          severity: 'error',
                        });
                        return;
                      }
                    }
                    if (presetChanged || customChanged) {
                      try {
                        const refreshed = await fetch(`/api/events/${event.id}`);
                        if (refreshed.ok) {
                          const json = await refreshed.json();
                          const ev = json.event || {};
                          setLocalMateriels([...(ev.materiels || [])]);
                          setLocalReactifs([...(ev.reactifs || [])]);
                          setLocalCustomMats([...(ev.customMaterielRequests || [])]);
                          setLocalCustomChems([...(ev.customReactifRequests || [])]);
                        } else {
                          setLocalMateriels(
                            newMateriels.map((m, idx) => ({
                              id: `mat-${idx}`,
                              materielId: m.materielId,
                              materielName: m.name,
                              quantity: m.quantity,
                            })),
                          );
                          setLocalReactifs(
                            newReactifs.map((r, idx) => ({
                              id: `chem-${idx}`,
                              reactifId: r.reactifId,
                              reactifName: r.name,
                              requestedQuantity: r.requestedQuantity,
                              unit: r.unit,
                            })),
                          );
                          setLocalCustomMats(
                            data.customMaterials.map((m, idx) => ({
                              id: m.id || `c-m-${idx}`,
                              name: m.name,
                              quantity: m.quantity,
                            })),
                          );
                          setLocalCustomChems(
                            data.customChemicals.map((c, idx) => ({
                              id: c.id || `c-c-${idx}`,
                              name: c.name,
                              requestedQuantity: c.requestedQuantity,
                              unit: c.unit,
                            })),
                          );
                        }
                      } catch {
                        setLocalMateriels(
                          newMateriels.map((m, idx) => ({
                            id: `mat-${idx}`,
                            materielId: m.materielId,
                            materielName: m.name,
                            quantity: m.quantity,
                          })),
                        );
                        setLocalReactifs(
                          newReactifs.map((r, idx) => ({
                            id: `chem-${idx}`,
                            reactifId: r.reactifId,
                            reactifName: r.name,
                            requestedQuantity: r.requestedQuantity,
                            unit: r.unit,
                          })),
                        );
                        setLocalCustomMats(
                          data.customMaterials.map((m, idx) => ({
                            id: m.id || `c-m-${idx}`,
                            name: m.name,
                            quantity: m.quantity,
                          })),
                        );
                        setLocalCustomChems(
                          data.customChemicals.map((c, idx) => ({
                            id: c.id || `c-c-${idx}`,
                            name: c.name,
                            requestedQuantity: c.requestedQuantity,
                            unit: c.unit,
                          })),
                        );
                      }
                    } else {
                      setLocalMateriels(localMateriels);
                      setLocalReactifs(localReactifs);
                    }
                    if (presetChanged || customChanged) {
                      setSnackbar({
                        open: true,
                        message: 'Ressources mises à jour',
                        severity: 'success',
                      });
                    } else {
                      setSnackbar({
                        open: true,
                        message: 'Aucune modification à enregistrer',
                        severity: 'info',
                      });
                    }
                  }}
                />
              )}
              <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              >
                <Alert
                  onClose={() => setSnackbar({ ...snackbar, open: false })}
                  severity={snackbar.severity}
                >
                  {snackbar.message}
                </Alert>
              </Snackbar>
              <Divider sx={{ mt: 3, mb: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Ajouté le {formatDate(event.createdAt)} • Modifié le {formatDate(event.updatedAt)}
              </Typography>
            </Box>
          </Collapse>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        {canEdit && onEdit && <Button onClick={() => onEdit(event)}>Éditer</Button>}
        {onCopy && <Button onClick={() => onCopy(event)}>Copier</Button>}
        {canEdit && onDelete && (
          <Button color="error" onClick={() => onDelete(event)}>
            Supprimer
          </Button>
        )}
      </DialogActions>
      {dialogType && targetSlot && (
        <MultiAssignDialog
          dialogType={dialogType || undefined}
          open={!!dialogType}
          title={dialogType === 'salles' ? 'Associer des salles' : 'Associer des classes'}
          description={
            dialogType === 'salles'
              ? 'Sélectionnez une ou plusieurs salles pour ce créneau.'
              : 'Sélectionnez une ou plusieurs classes pour ce créneau.'
          }
          loadOptions={dialogType === 'salles' ? loadSalles : loadClasses}
          initialSelectedIds={
            (dialogType === 'salles' ? targetSlot.salleIds : targetSlot.classIds) || []
          }
          onSave={saveAssign}
          onClose={() => {
            setDialogType(null);
            setTargetSlot(null);
          }}
          saveLabel="Enregistrer"
        />
      )}
    </Dialog>
  );
}
