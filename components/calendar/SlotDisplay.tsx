'use client';
import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  TextField,
  Autocomplete,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import GroupIcon from '@mui/icons-material/Group';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ReplyIcon from '@mui/icons-material/Reply';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CancelIcon from '@mui/icons-material/Cancel';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import 'react-datepicker/dist/react-datepicker.css';
import { FrenchDateOnly, FrenchTimeOnly } from '@/components/shared/FrenchDatePicker';
import { useTimeslots } from '@/lib/hooks/useTimeslots';
import { useSnackbar } from '@/components/providers/SnackbarProvider';

// Shared cache for last slots persist result, read by calendar page
const __slotsPersistCache = (globalThis as any).__slotsPersistCache || {};
(globalThis as any).__slotsPersistCache = __slotsPersistCache;

// -----------------------------------------
// Types
// -----------------------------------------
export interface SlotDisplaySlot {
  id: number | string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  timeslotDate?: string | Date | null;
  // Proposed variant fields when state is counter_proposed
  proposedStartDate?: string | Date | null;
  proposedEndDate?: string | Date | null;
  proposedTimeslotDate?: string | Date | null;
  proposedNotes?: string | null;
  state: string;
  salleIds?: number[];
  classIds?: number[];
  salle?: { name?: string } | null;
  class?: { name?: string } | null;
  eventId?: number; // For persistence of planning
  discipline?: 'chimie' | 'physique';
}

export interface SlotVisual {
  borderColor: string;
  bg: any; // allows theme function
  chipColor: any;
  label: string;
}

export interface SlotDisplayProps {
  slots: SlotDisplaySlot[];
  groupByDate?: boolean;
  salleMap: Record<number, string>;
  classMap: Record<number, string>;
  onAssignSalle?: (slot: SlotDisplaySlot, ev: React.MouseEvent) => void;
  onAssignClasses?: (slot: SlotDisplaySlot, ev: React.MouseEvent) => void;
  showAssignButtons?: boolean;
  renderSlotExtras?: (slot: SlotDisplaySlot) => React.ReactNode;
  onEventUpdate?: (eventId: number) => void;
  loadingSlotIds?: Set<number>;
  // Validation props
  canValidate?: boolean;
  isOwner?: boolean;
  eventId?: number;
  onSlotUpdate?: () => void; // Callback après modification d'un slot
}

interface RawTimeslotLike {
  id?: number | string;
  startDate?: string;
  endDate?: string;
  timeslotDate?: string | null;
  salleIds?: number[];
  classIds?: number[];
  state?: string;
}

// -----------------------------------------
// Helpers
// -----------------------------------------
const pad = (n: number) => n.toString().padStart(2, '0');

// Internal standardized date parser - no timezone conversion, pure wall time
const parseDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    // Convert Date object back to local wall time string and re-parse
    // to avoid timezone shifts from Prisma Date objects
    const year = value.getUTCFullYear();
    const month = value.getUTCMonth() + 1;
    const day = value.getUTCDate();
    const hours = value.getUTCHours();
    const minutes = value.getUTCMinutes();
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }
  let s = String(value);
  // Normalize 'YYYY-MM-DD HH:mm' to 'YYYY-MM-DDTHH:mm'
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T');
  // Strip trailing Z to treat as wall time
  s = s.replace(/Z$/, '');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const [date, time] = s.split('T');
    const [Y, M, D] = date.split('-').map(Number);
    const [h, m] = time.split(':').map(Number);
    return new Date(Y, M - 1, D, h, m, 0, 0);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateHeader = (key: string): string => {
  const d = parseDate(key);
  if (!d) return key;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Safe string helpers to avoid localeCompare on non-strings
const toStringSafe = (v: unknown): string =>
  v == null ? '' : typeof v === 'string' ? v : String(v);
const frCompare = (a: unknown, b: unknown) =>
  toStringSafe(a).localeCompare(toStringSafe(b), 'fr', { sensitivity: 'base' });

// Normalize any date-ish value to a stable YYYY-MM-DD key for grouping/sorting
const normalizeDateKey = (ref: unknown): string => {
  if (!ref) return 'autre';
  if (ref instanceof Date && !isNaN(ref.getTime())) {
    const y = ref.getFullYear();
    const m = pad(ref.getMonth() + 1);
    const d = pad(ref.getDate());
    return `${y}-${m}-${d}`;
  }
  const s = toStringSafe(ref);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
};

const internalSlotVisual = (state: string): SlotVisual => {
  switch (state) {
    case 'approved':
      return {
        borderColor: 'success.dark',
        bg: (t: any) => t.palette.action.hover,
        chipColor: 'success',
        label: 'Approuvé',
      };
    case 'rejected':
      return {
        borderColor: 'error.dark',
        bg: (t: any) => t.palette.action.hover,
        chipColor: 'error',
        label: 'Rejeté',
      };
    case 'counter_proposed':
      return {
        borderColor: 'warning.dark',
        bg: (t: any) => t.palette.action.hover,
        chipColor: 'warning',
        label: 'Contre‑proposé',
      };
    case 'modified':
      return {
        borderColor: 'info.light',
        bg: (t: any) => t.palette.action.hover,
        chipColor: 'info',
        label: 'Modifié',
      };
    case 'created':
    default:
      return {
        borderColor: 'primary.dark',
        bg: (t: any) => t.palette.action.hover,
        chipColor: 'default',
        label: 'En attente',
      };
  }
};

// -----------------------------------------
// Inline planning dialog
// -----------------------------------------
interface InlineTimeslotPlanningProps {
  open: boolean;
  onClose: () => void;
  slots: RawTimeslotLike[];
  onSave: (slots: RawTimeslotLike[]) => void;
}

interface EditingSlot {
  id?: number | string;
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
  salleIds: number[];
  classIds: number[];
  original?: {
    date: string; // yyyy-mm-dd
    startTime: string | null;
    endTime: string | null;
    salleIds: number[];
    classIds: number[];
  };
}

const InlineTimeslotPlanning: React.FC<InlineTimeslotPlanningProps> = ({
  open,
  onClose,
  slots,
  onSave,
}) => {
  const [localSlots, setLocalSlots] = React.useState<EditingSlot[]>([]);
  const [availableClasses, setAvailableClasses] = React.useState<any[]>([]);
  const [availableSalles, setAvailableSalles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Init local slots when dialog opens
  React.useEffect(() => {
    if (!open) return;
    const next: EditingSlot[] = (slots || []).map((s: any) => {
      const start = parseDate(s.startDate);
      const end = parseDate(s.endDate);
      const dateRef = s.timeslotDate || s.startDate;
      let date: Date | null = null;
      if (dateRef) {
        const d = parseDate(dateRef);
        if (d && !isNaN(d.getTime())) date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
      const fmt = (d: Date | null) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : null);
      return {
        id: s.id,
        date,
        startTime: fmt(start),
        endTime: fmt(end),
        salleIds: s.salleIds || [],
        classIds: s.classIds || [],
        original: date
          ? {
              date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
              startTime: fmt(start),
              endTime: fmt(end),
              salleIds: [...(s.salleIds || [])],
              classIds: [...(s.classIds || [])],
            }
          : undefined,
      };
    });
    if (!next.length) {
      next.push({
        id: undefined,
        date: new Date(),
        startTime: '09:00',
        endTime: '10:00',
        salleIds: [],
        classIds: [],
      });
    }
    setLocalSlots(next);
  }, [open, slots]);

  // Load classes & salles
  React.useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const rClasses = await fetch('/api/classes');
        if (rClasses.ok) {
          const data = await rClasses.json();
          const predefined = (data?.predefinedClasses || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            group: 'Classes système',
            isCustom: false,
          }));
          const custom = (data?.customClasses || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            group: 'Mes classes',
            isCustom: !!c.id && !c.system,
          }));
          setAvailableClasses([...custom, ...predefined]);
        }
        const rSalles = await fetch('/api/salles');
        if (rSalles.ok) {
          const d = await rSalles.json();
          const list = (d?.salles || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            group: s.userOwnerId ? 'Mes salles' : 'Salles système',
            isCustom: !!s.userOwnerId,
          }));
          list.sort((a: any, b: any) =>
            a.group === b.group ? frCompare(a.name, b.name) : a.group === 'Mes salles' ? -1 : 1,
          );
          setAvailableSalles(list);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const updateSlot = (index: number, patch: Partial<EditingSlot>) => {
    setLocalSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const addSlot = () => {
    setLocalSlots((prev) => [
      ...prev,
      {
        id: undefined,
        date: new Date(),
        startTime: '09:00',
        endTime: '10:00',
        salleIds: [],
        classIds: [],
      },
    ]);
  };
  const removeSlot = (index: number) => {
    setLocalSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const hasInvalid = localSlots.some((s) => s.startTime && s.endTime && s.startTime >= s.endTime);

  const handleSave = () => {
    const all: RawTimeslotLike[] = [];
    localSlots.forEach((s) => {
      if (!s.date || !s.startTime || !s.endTime) return; // ignore incomplete
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      const start = new Date(
        s.date.getFullYear(),
        s.date.getMonth(),
        s.date.getDate(),
        sh,
        sm,
        0,
        0,
      );
      const end = new Date(s.date.getFullYear(), s.date.getMonth(), s.date.getDate(), eh, em, 0, 0);
      const localIsoNoZ = (dt: Date) =>
        `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00.000Z`;
      const dateStr = `${s.date.getFullYear()}-${pad(s.date.getMonth() + 1)}-${pad(s.date.getDate())}`;
      const data: RawTimeslotLike = {
        id: s.id,
        startDate: localIsoNoZ(start),
        endDate: localIsoNoZ(end),
        timeslotDate: `${dateStr}T00:00:00.000Z`,
        salleIds: s.salleIds,
        classIds: s.classIds,
      };
      if (s.original) {
        const isModified =
          dateStr !== s.original.date ||
          s.startTime !== s.original.startTime ||
          s.endTime !== s.original.endTime ||
          s.salleIds.slice().sort().join(',') !== s.original.salleIds.slice().sort().join(',') ||
          s.classIds.slice().sort().join(',') !== s.original.classIds.slice().sort().join(',');
        if (isModified) data.state = 'modified';
      }
      all.push(data);
    });
    onSave(all);
    onClose();
  };

  const PickerInput = React.useMemo(
    () =>
      React.forwardRef<HTMLInputElement, any>((props, ref) => (
        <TextField
          size="small"
          {...props}
          inputRef={ref}
          onFocus={(e) => {
            e.stopPropagation();
            props.onFocus?.(e);
          }}
        />
      )),
    [],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      onClick={(e) => e.stopPropagation()}
    >
      <DialogTitle onClick={(e) => e.stopPropagation()}>Planification des créneaux</DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }} onClick={(e) => e.stopPropagation()}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Gérez les créneaux, salles et classes.
        </Typography>
        <Box display="flex" flexDirection="column" gap={3}>
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                Créneaux horaires
              </Typography>
              <Button variant="outlined" size="small" onClick={addSlot} startIcon={<AddIcon />}>
                Ajouter
              </Button>
            </Box>
            <Stack spacing={2}>
              {localSlots.map((slot, index) => {
                const invalid = slot.startTime && slot.endTime && slot.startTime >= slot.endTime;
                const isComplete = slot.date && slot.startTime && slot.endTime;
                let modified = false;
                if (slot.original && isComplete) {
                  const y = slot.date as Date;
                  const dateStr = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
                  if (dateStr !== slot.original.date) modified = true;
                  if (slot.startTime !== slot.original.startTime) modified = true;
                  if (slot.endTime !== slot.original.endTime) modified = true;
                  const sallesChanged =
                    slot.salleIds.slice().sort().join(',') !==
                    slot.original.salleIds.slice().sort().join(',');
                  const classesChanged =
                    slot.classIds.slice().sort().join(',') !==
                    slot.original.classIds.slice().sort().join(',');
                  if (sallesChanged || classesChanged) modified = true;
                }
                const isNew = !slot.original;
                return (
                  <Card key={index} sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        Créneau {index + 1}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        {isNew && <Chip size="small" color="info" label="Nouveau" />}
                        {!isNew && modified && (
                          <Chip size="small" color="warning" label="Modifié" />
                        )}
                        {localSlots.length > 1 && (
                          <IconButton size="small" color="error" onClick={() => removeSlot(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                    <Box
                      display="grid"
                      gap={2}
                      alignItems="flex-start"
                      sx={{
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(6, max-content)' },
                        '& > *': { minWidth: { xs: 'auto', sm: 120 } },
                      }}
                    >
                      <Box>
                        <Typography variant="caption" display="block" fontWeight={600} gutterBottom>
                          Date
                        </Typography>
                        <FrenchDateOnly
                          selected={slot.date && !isNaN(slot.date.getTime()) ? slot.date : null}
                          onChange={(d: Date | null) => updateSlot(index, { date: d as Date })}
                          customInput={<PickerInput label="Date" />}
                          shouldCloseOnSelect={true}
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" display="block" fontWeight={600} gutterBottom>
                          Début
                        </Typography>
                        <FrenchTimeOnly
                          selected={
                            slot.startTime && /^\d{2}:\d{2}$/.test(slot.startTime)
                              ? (() => {
                                  const [hh, mm] = (slot.startTime as string)
                                    .split(':')
                                    .map(Number);
                                  return new Date(1970, 0, 1, hh, mm, 0, 0);
                                })()
                              : null
                          }
                          onChange={(d: Date | null) => {
                            if (!d) return;
                            const hh = (d as Date).getHours().toString().padStart(2, '0');
                            const mm = (d as Date).getMinutes().toString().padStart(2, '0');
                            updateSlot(index, { startTime: `${hh}:${mm}` });
                          }}
                          customInput={<PickerInput label="Début" />}
                          shouldCloseOnSelect={true}
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" display="block" fontWeight={600} gutterBottom>
                          Fin
                        </Typography>
                        <FrenchTimeOnly
                          selected={
                            slot.endTime && /^\d{2}:\d{2}$/.test(slot.endTime)
                              ? (() => {
                                  const [hh, mm] = (slot.endTime as string).split(':').map(Number);
                                  return new Date(1970, 0, 1, hh, mm, 0, 0);
                                })()
                              : null
                          }
                          onChange={(d: Date | null) => {
                            if (!d) return;
                            const hh = (d as Date).getHours().toString().padStart(2, '0');
                            const mm = (d as Date).getMinutes().toString().padStart(2, '0');
                            updateSlot(index, { endTime: `${hh}:${mm}` });
                          }}
                          customInput={<PickerInput label="Fin" />}
                          shouldCloseOnSelect={true}
                        />
                      </Box>
                    </Box>
                    <Box
                      mt={2}
                      display="grid"
                      gap={2}
                      sx={{ gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
                    >
                      <Box>
                        <Typography variant="caption" display="block" fontWeight={600} gutterBottom>
                          Salles
                        </Typography>
                        <Autocomplete
                          multiple
                          size="small"
                          options={availableSalles}
                          loading={loading}
                          groupBy={(o) => o.group || ''}
                          getOptionLabel={(o) => o.name}
                          value={availableSalles.filter((s) => slot.salleIds.includes(s.id))}
                          onChange={(_, vals) =>
                            updateSlot(index, { salleIds: (vals as any[]).map((v) => v.id) })
                          }
                          renderInput={(p) => <TextField {...p} placeholder="Salles" />}
                          renderTags={(value, getTagProps) =>
                            value.map((option: any, i: number) => (
                              <Chip
                                {...getTagProps({ index: i })}
                                key={`${option.id}-${option.name}`}
                                label={option.name}
                                size="small"
                                color={option.isCustom ? 'warning' : 'default'}
                              />
                            ))
                          }
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" display="block" fontWeight={600} gutterBottom>
                          Classes
                        </Typography>
                        <Autocomplete
                          multiple
                          size="small"
                          options={availableClasses}
                          loading={loading}
                          groupBy={(o) => o.group || ''}
                          getOptionLabel={(o) => o.name}
                          value={availableClasses.filter((c) => slot.classIds.includes(c.id))}
                          onChange={(_, vals) =>
                            updateSlot(index, { classIds: (vals as any[]).map((v) => v.id) })
                          }
                          renderInput={(p) => <TextField {...p} placeholder="Classes" />}
                          renderTags={(value, getTagProps) =>
                            value.map((option: any, i: number) => (
                              <Chip
                                {...getTagProps({ index: i })}
                                key={`${option.id}-${option.name}`}
                                label={option.name}
                                size="small"
                                color={option.isCustom ? 'warning' : 'default'}
                              />
                            ))
                          }
                        />
                      </Box>
                    </Box>
                    {invalid && (
                      <Box mt={1}>
                        <Alert severity="warning">
                          L'heure de fin doit être après l'heure de début.
                        </Alert>
                      </Box>
                    )}
                  </Card>
                );
              })}
            </Stack>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions onClick={(e) => e.stopPropagation()}>
        <Button
          onClick={(e) => {
            (e as any).stopPropagation?.();
            onClose();
          }}
        >
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={hasInvalid}
          onClick={(e) => {
            (e as any).stopPropagation?.();
            handleSave();
          }}
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// (Old type & visual mapping replaced by above cleaned version)

export const SlotDisplay: React.FC<SlotDisplayProps> = ({
  slots,
  groupByDate = true,
  salleMap,
  classMap,
  onAssignSalle,
  onAssignClasses,
  showAssignButtons = true,
  renderSlotExtras,
  onEventUpdate,
  loadingSlotIds = new Set(),
  canValidate = false,
  isOwner = false,
  eventId,
  onSlotUpdate,
}) => {
  const [planningOpen, setPlanningOpen] = React.useState(false);
  const [localSlots, setLocalSlots] = React.useState<SlotDisplaySlot[]>(slots);

  // User counter-proposal dialog (ReplyIcon)
  const [userCounterProposalDialog, setUserCounterProposalDialog] = React.useState<{
    open: boolean;
    slotId: number | null;
  }>({ open: false, slotId: null });
  const [userCpNotes, setUserCpNotes] = React.useState('');
  const [userCpDateObj, setUserCpDateObj] = React.useState<Date | null>(null);
  const [userCpStartObj, setUserCpStartObj] = React.useState<Date | null>(null);
  const [userCpEndObj, setUserCpEndObj] = React.useState<Date | null>(null);

  // Owner counter-proposal dialog (CancelIcon)
  const [ownerCounterProposalDialog, setOwnerCounterProposalDialog] = React.useState<{
    open: boolean;
    slotId: number | null;
  }>({ open: false, slotId: null });
  const [ownerCpDateObj, setOwnerCpDateObj] = React.useState<Date | null>(null);
  const [ownerCpStartObj, setOwnerCpStartObj] = React.useState<Date | null>(null);
  const [ownerCpEndObj, setOwnerCpEndObj] = React.useState<Date | null>(null);
  const [ownerCpNotes, setOwnerCpNotes] = React.useState<string>('');

  // Helper to compose a datetime string using a base date and a time string
  // Direct string manipulation to avoid timezone conversions
  const buildDateString = React.useCallback(
    (baseDate: string | Date, timeStr?: string): string | null => {
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
    },
    [],
  );

  const [internalLoadingSlots, setInternalLoadingSlots] = React.useState<Set<number>>(new Set());

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const { approveTimeslots } = useTimeslots();
  const { showSnackbar } = useSnackbar();

  // Combine external and internal loading states
  const allLoadingSlotIds = React.useMemo(() => {
    const combined = new Set([...loadingSlotIds, ...internalLoadingSlots]);
    return combined;
  }, [loadingSlotIds, internalLoadingSlots]);

  // Validation functions
  const handleApproveSlot = React.useCallback(
    async (slotId: number) => {
      if (!canValidate) return;

      setInternalLoadingSlots((prev) => new Set([...prev, slotId]));
      try {
        await approveTimeslots({
          timeslotIds: [slotId],
          approve: true,
        });
        onSlotUpdate?.();
        if (eventId && onEventUpdate) {
          onEventUpdate(eventId);
        }
      } catch (error) {
        console.error('Error approving slot:', error);
      } finally {
        setInternalLoadingSlots((prev) => {
          const next = new Set(prev);
          next.delete(slotId);
          return next;
        });
      }
    },
    [canValidate, approveTimeslots, onSlotUpdate, eventId, onEventUpdate],
  );

  const handleRejectSlot = React.useCallback(
    async (slotId: number) => {
      if (!canValidate) return;

      setInternalLoadingSlots((prev) => new Set([...prev, slotId]));
      try {
        await approveTimeslots({
          timeslotIds: [slotId],
          approve: false, // This triggers rejection
        });
        onSlotUpdate?.();
        if (eventId && onEventUpdate) {
          onEventUpdate(eventId);
        }
      } catch (error) {
        console.error('Error rejecting slot:', error);
      } finally {
        setInternalLoadingSlots((prev) => {
          const next = new Set(prev);
          next.delete(slotId);
          return next;
        });
      }
    },
    [canValidate, approveTimeslots, onSlotUpdate, eventId, onEventUpdate],
  );

  const handleCounterPropose = React.useCallback(
    async (slotId: number) => {
      if (!canValidate) return;

      const slot = localSlots.find((s) => Number(s.id) === slotId);
      if (!slot) return;

      // Initialize user counter-proposal form with current slot data
      const currentDate = parseDate(slot.timeslotDate || slot.startDate);
      const currentStart = parseDate(slot.startDate);
      const currentEnd = parseDate(slot.endDate);

      setUserCpDateObj(currentDate);
      setUserCpStartObj(currentStart);
      setUserCpEndObj(currentEnd);
      setUserCpNotes('');
      setUserCounterProposalDialog({ open: true, slotId });
    },
    [canValidate, localSlots],
  );

  const submitCounterProposal = React.useCallback(async () => {
    const { slotId } = userCounterProposalDialog;
    if (!slotId || !canValidate) return;

    setInternalLoadingSlots((prev) => new Set([...prev, slotId]));
    try {
      const counterProposal: any = {};

      // Format date sans timezone en utilisant buildDateString
      let baseDateStr: string | null = null;
      if (userCpDateObj) {
        const year = userCpDateObj.getFullYear();
        const month = (userCpDateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = userCpDateObj.getDate().toString().padStart(2, '0');
        baseDateStr = `${year}-${month}-${day}`;
        counterProposal.timeslotDate = baseDateStr;
      }

      // Format startDate et endDate en utilisant buildDateString
      if (userCpStartObj && baseDateStr) {
        const hours = userCpStartObj.getHours().toString().padStart(2, '0');
        const minutes = userCpStartObj.getMinutes().toString().padStart(2, '0');
        counterProposal.startDate = buildDateString(baseDateStr, `${hours}:${minutes}`);
      }

      if (userCpEndObj && baseDateStr) {
        const hours = userCpEndObj.getHours().toString().padStart(2, '0');
        const minutes = userCpEndObj.getMinutes().toString().padStart(2, '0');
        counterProposal.endDate = buildDateString(baseDateStr, `${hours}:${minutes}`);
      }

      // Ajouter les notes à la contre-proposition
      if (userCpNotes) {
        counterProposal.notes = userCpNotes;
      }

      await approveTimeslots({
        timeslotIds: [slotId],
        approve: false, // Counter-proposal implies not approved yet
        counterProposal,
      });

      setUserCounterProposalDialog({ open: false, slotId: null });
      setUserCpNotes('');
      setUserCpDateObj(null);
      setUserCpStartObj(null);
      setUserCpEndObj(null);

      onSlotUpdate?.();
      if (eventId && onEventUpdate) {
        onEventUpdate(eventId);
      }
    } catch (error) {
      console.error('Error counter-proposing slot:', error);
    } finally {
      setInternalLoadingSlots((prev) => {
        const next = new Set(prev);
        next.delete(slotId);
        return next;
      });
    }
  }, [
    userCounterProposalDialog,
    canValidate,
    userCpDateObj,
    userCpStartObj,
    userCpEndObj,
    userCpNotes,
    buildDateString,
    approveTimeslots,
    onSlotUpdate,
    eventId,
    onEventUpdate,
  ]);

  // Owner functions for handling counter-proposals
  const handleAcceptCounterProposal = React.useCallback(
    async (slotId: number) => {
      if (!isOwner) return;

      setInternalLoadingSlots((prev) => new Set([...prev, slotId]));
      try {
        // Accept counter-proposal: move proposed* fields to actual fields and clear proposed*
        const response = await fetch(`/api/timeslots/${slotId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: 'approved',
            acceptCounterProposal: true, // Special flag to handle proposed* → actual fields
          }),
        });

        if (!response.ok) throw new Error('Failed to accept counter-proposal');

        onSlotUpdate?.();
        if (eventId && onEventUpdate) {
          onEventUpdate(eventId);
        }
      } catch (error) {
        console.error('Error accepting counter-proposal:', error);
      } finally {
        setInternalLoadingSlots((prev) => {
          const next = new Set(prev);
          next.delete(slotId);
          return next;
        });
      }
    },
    [isOwner, onSlotUpdate, eventId, onEventUpdate],
  );

  const handleRejectCounterProposal = React.useCallback(
    async (slotId: number) => {
      if (!isOwner) return;

      const slot = localSlots.find((s) => Number(s.id) === slotId);
      if (!slot) return;

      // Initialize owner counter-proposal form with current PROPOSED data
      const proposedDate = parseDate(
        (slot as any).proposedTimeslotDate || (slot as any).proposedStartDate,
      );
      const proposedStart = parseDate((slot as any).proposedStartDate);
      const proposedEnd = parseDate((slot as any).proposedEndDate);

      setOwnerCpDateObj(proposedDate);
      setOwnerCpStartObj(proposedStart);
      setOwnerCpEndObj(proposedEnd);
      setOwnerCounterProposalDialog({ open: true, slotId });
    },
    [isOwner, localSlots],
  );

  const submitOwnerCounterProposal = React.useCallback(async () => {
    const { slotId } = ownerCounterProposalDialog;
    if (!slotId || !isOwner) return;

    setInternalLoadingSlots((prev) => new Set([...prev, slotId]));
    try {
      const requestBody: any = {
        state: 'modified',
        clearProposedFields: true, // Special flag to clear proposed* fields
      };

      // Format date en utilisant le format ISO simple pour timeslotDate
      let baseDateStr: string | null = null;
      if (ownerCpDateObj) {
        const year = ownerCpDateObj.getFullYear();
        const month = (ownerCpDateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = ownerCpDateObj.getDate().toString().padStart(2, '0');
        baseDateStr = `${year}-${month}-${day}`;
        requestBody.timeslotDate = `${baseDateStr}T00:00:00.000Z`;
      }

      // Format startDate en utilisant buildDateString
      if (ownerCpStartObj && baseDateStr) {
        const hours = ownerCpStartObj.getHours().toString().padStart(2, '0');
        const minutes = ownerCpStartObj.getMinutes().toString().padStart(2, '0');
        requestBody.startDate = buildDateString(baseDateStr, `${hours}:${minutes}`);
      }

      // Format endDate en utilisant buildDateString
      if (ownerCpEndObj && baseDateStr) {
        const hours = ownerCpEndObj.getHours().toString().padStart(2, '0');
        const minutes = ownerCpEndObj.getMinutes().toString().padStart(2, '0');
        requestBody.endDate = buildDateString(baseDateStr, `${hours}:${minutes}`);
      }

      // Ajouter les notes si présentes
      if (ownerCpNotes) {
        requestBody.notes = ownerCpNotes;
      }

      // Owner counter-proposal: replace actual fields with new values and clear proposed*
      const response = await fetch(`/api/timeslots/${slotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('Failed to submit owner counter-proposal');

      setOwnerCounterProposalDialog({ open: false, slotId: null });
      setOwnerCpDateObj(null);
      setOwnerCpStartObj(null);
      setOwnerCpEndObj(null);
      setOwnerCpNotes('');

      onSlotUpdate?.();
      if (eventId && onEventUpdate) {
        onEventUpdate(eventId);
      }
    } catch (error) {
      console.error('Error submitting owner counter-proposal:', error);
    } finally {
      setInternalLoadingSlots((prev) => {
        const next = new Set(prev);
        next.delete(slotId);
        return next;
      });
    }
  }, [
    ownerCounterProposalDialog,
    isOwner,
    ownerCpDateObj,
    ownerCpStartObj,
    ownerCpEndObj,
    ownerCpNotes,
    buildDateString,
    onSlotUpdate,
    eventId,
    onEventUpdate,
  ]);

  React.useEffect(() => {
    setLocalSlots(slots);
  }, [slots]);

  // Debug: log validation props
  React.useEffect(() => {}, [canValidate, isOwner, eventId]);

  const canFullPlan = React.useMemo(() => {
    if (!localSlots.length) return false;
    const first = localSlots[0];
    return !!first.eventId && !!first.discipline;
  }, [localSlots]);

  const persistPlanning = async (updated: RawTimeslotLike[]) => {
    if (!updated || !updated.length) return;
    // Infer eventId & discipline from first existing slot (or updated ones if needed)
    const base = (localSlots[0] as any) || {};
    const eventId = base.eventId;
    const discipline = base.discipline;
    if (!eventId || !discipline) return; // cannot persist
    try {
      // Notify global listeners that this event is being updated
      try {
        window.dispatchEvent(new CustomEvent('event-update:start', { detail: { eventId } }) as any);
      } catch {}
      const original = [...localSlots];
      const originalById: Record<number, any> = {};
      original.forEach((s: any) => {
        if (typeof s.id === 'number') originalById[s.id] = s;
      });

      // Séparer les créneaux par type d'opération
      const toUpdate = updated.filter(
        (s) => typeof s.id === 'number' && (s as any).state === 'modified',
      );
      const toCreate = updated.filter(
        (s) => s.id === undefined || s.id === null || typeof s.id !== 'number',
      );
      const existingIds = new Set(
        updated.filter((s) => typeof s.id === 'number').map((s) => s.id as number),
      );
      const toDelete = original.filter(
        (s: any) => typeof s.id === 'number' && !existingIds.has(s.id),
      );

      // If nothing to update/create/delete, show info snackbar and stop
      if (toUpdate.length === 0 && toCreate.length === 0 && toDelete.length === 0) {
        try {
          __slotsPersistCache[eventId] = { changed: false, ts: Date.now() };
          window.dispatchEvent(
            new CustomEvent('event-slots:persist-result', {
              detail: { eventId, changed: false },
            }) as any,
          );
        } catch {}
        showSnackbar('Aucune modification à enregistrer', 'info');
        return;
      }

      // Update seulement les créneaux modifiés
      await Promise.all(
        toUpdate.map(async (s) => {
          try {
            const response = await fetch(`/api/timeslots/${s.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                startDate: s.startDate,
                endDate: s.endDate,
                timeslotDate: s.timeslotDate,
                salleIds: s.salleIds || [],
                classIds: s.classIds || [],
                state: 'modified',
              }),
            });
            if (!response.ok) {
              console.error('PUT timeslot failed', s.id, await response.text());
            }
          } catch (e) {
            console.error('PUT timeslot error', s.id, e);
          }
        }),
      );

      // Delete removed
      await Promise.all(
        toDelete.map(async (s: any) => {
          try {
            const response = await fetch(`/api/timeslots/${s.id}`, { method: 'DELETE' });
            if (!response.ok) {
              console.error('DELETE timeslot failed', s.id, await response.text());
            }
          } catch (e) {
            console.error('DELETE timeslot error', s.id, e);
          }
        }),
      );

      // Create new
      if (toCreate.length) {
        try {
          const response = await fetch('/api/timeslots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId,
              discipline,
              slots: toCreate.map((c) => ({
                startDate: c.startDate!,
                endDate: c.endDate!,
                timeslotDate: c.timeslotDate,
                salleIds: c.salleIds || [],
                classIds: c.classIds || [],
              })),
            }),
          });
          if (!response.ok) {
            console.error('POST timeslots failed', await response.text());
          }
        } catch (e) {
          console.error('POST timeslots error', e);
        }
      }

      // Refresh locally from API to reflect authoritative state
      try {
        const r = await fetch(`/api/events/${eventId}`);
        if (r.ok) {
          const js = await r.json();
          if (js?.event?.timeslots) {
            setLocalSlots(js.event.timeslots);
          }
        }
      } catch {}

      // Signal change success globally and via snackbar
      try {
        __slotsPersistCache[eventId] = { changed: true, ts: Date.now() };
        window.dispatchEvent(
          new CustomEvent('event-slots:persist-result', {
            detail: { eventId, changed: true },
          }) as any,
        );
      } catch {}
      showSnackbar('Créneaux mis à jour', 'success');

      // Mettre à jour les classIds et salleIds de l'événement avec les IDs uniques de tous les créneaux (éviter no-op)
      try {
        const allClassIds = [...new Set(updated.flatMap((slot) => slot.classIds || []))];
        const allSalleIds = [...new Set(updated.flatMap((slot) => slot.salleIds || []))];

        // Read current event to compare aggregated ids and avoid no-op PUT
        let prevClassIds: number[] = [];
        let prevSalleIds: number[] = [];
        try {
          const r = await fetch(`/api/events/${eventId}`);
          if (r.ok) {
            const js = await r.json();
            const ev = js?.event || {};
            prevClassIds = Array.isArray(ev.classIds)
              ? (ev.classIds as number[]).filter((x: any) => typeof x === 'number')
              : [];
            prevSalleIds = Array.isArray(ev.salleIds)
              ? (ev.salleIds as number[]).filter((x: any) => typeof x === 'number')
              : [];
          }
        } catch {}

        const sameClasses =
          prevClassIds.slice().sort().join(',') === allClassIds.slice().sort().join(',');
        const sameSalles =
          prevSalleIds.slice().sort().join(',') === allSalleIds.slice().sort().join(',');

        if (!sameClasses || !sameSalles) {
          const eventUpdateResponse = await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              classIds: allClassIds,
              salleIds: allSalleIds,
            }),
          });

          if (!eventUpdateResponse.ok) {
            console.error('Event update failed', await eventUpdateResponse.text());
          } else {
            // Notifier le parent qu'il y a eu une modification
            if (onEventUpdate) {
              onEventUpdate(eventId);
            }
          }
        }
      } catch (e) {
        console.error('Event update error', e);
      }
    } catch {
    } finally {
      // Notify global listeners that the update ended
      try {
        window.dispatchEvent(new CustomEvent('event-update:end', { detail: { eventId } }) as any);
      } catch {}
    }
  };
  const groupSlots = React.useCallback(
    (list: SlotDisplaySlot[]) => {
      if (!groupByDate) return [['all', list]] as [string, SlotDisplaySlot[]][];
      const map = new Map<string, SlotDisplaySlot[]>();
      list.forEach((s) => {
        const ref = s.timeslotDate || s.startDate || 'autre';
        const key = normalizeDateKey(ref);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
      });
      return Array.from(map.entries()).sort(([a], [b]) => frCompare(a, b));
    },
    [groupByDate],
  );

  const formatTimeRange = (slot: SlotDisplaySlot) => {
    const start = parseDate(slot.startDate);
    const end = parseDate(slot.endDate);
    const s = start
      ? start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    const e = end
      ? end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    return `${s} → ${e}`;
  };

  const grouped = groupSlots(localSlots || []);

  // Check if ANY slot across ALL groups is loading
  const hasAnyLoading = (localSlots || []).some((slot) => allLoadingSlotIds.has(Number(slot.id)));

  if (!localSlots || !localSlots.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucun créneau
      </Typography>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={1} sx={{ position: 'relative' }}>
      {hasAnyLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
            p: 1,
          }}
        ></Box>
      )}
      <Box
        sx={{
          opacity: hasAnyLoading ? 0.7 : 1,
          pointerEvents: hasAnyLoading ? 'none' : 'auto',
        }}
      >
        {grouped.map(([key, list]) => {
          return (
            <Box
              key={key}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                p: 1,
                borderRadius: 2,
              }}
            >
              {groupByDate && (
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {formatDateHeader(key)}
                </Typography>
              )}
              {list
                .slice()
                .sort((a, b) =>
                  String(a.startDate || a.timeslotDate).localeCompare(
                    String(b.startDate || b.timeslotDate),
                  ),
                )
                .flatMap((slot) => {
                  const isSlotLoading = allLoadingSlotIds.has(Number(slot.id));
                  const v = internalSlotVisual(slot.state);
                  const salleNames = (slot.salleIds || []).map(
                    (id) => salleMap[id] || `Salle ${id}`,
                  );
                  const classNames = (slot.classIds || []).map(
                    (id) => classMap[id] || `Classe ${id}`,
                  );
                  const hasProposed =
                    !!(slot as any).proposedStartDate ||
                    !!(slot as any).proposedEndDate ||
                    !!(slot as any).proposedTimeslotDate;

                  const items = [];

                  // Original slot first
                  const backgroundColor = typeof v.bg === 'function' ? v.bg(theme) : v.bg;
                  items.push(
                    <Box
                      key={slot.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor,
                        borderLeft: '6px solid',
                        borderColor: v.borderColor,
                        mb: 1,
                        flexDirection: isMobileSmall ? 'column' : 'row',
                        position: 'relative',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          minWidth: { sm: 92 },
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: isMobileSmall ? '100%' : 'auto',
                        }}
                      >
                        {formatTimeRange(slot)}
                      </Typography>
                      <Chip
                        size="small"
                        sx={{
                          fontWeight: 600,
                          width: isMobileSmall ? '100%' : 'auto',
                          borderWidth: 2,
                        }}
                        variant="outlined"
                        color={v.chipColor as any}
                        label={v.label}
                      />
                      <Stack
                        direction={isMobileSmall ? 'column' : 'row'}
                        spacing={0.5}
                        flexWrap="wrap"
                        sx={{
                          flex: 1,
                          width: isMobileSmall ? '100%' : 'auto',
                        }}
                      >
                        {salleNames.map((n) => (
                          <Chip
                            key={`s-${slot.id}-${n}`}
                            size="small"
                            icon={<MeetingRoomIcon style={{ fontSize: 14 }} />}
                            label={n}
                            variant="outlined"
                            sx={{ width: isMobileSmall ? '100%' : 'auto' }}
                          />
                        ))}
                        {classNames.map((n) => (
                          <Chip
                            key={`c-${slot.id}-${n}`}
                            size="small"
                            icon={<GroupIcon style={{ fontSize: 14 }} />}
                            label={n}
                            color="secondary"
                            variant="outlined"
                            sx={{ width: isMobileSmall ? '100%' : 'auto' }}
                          />
                        ))}
                      </Stack>
                      {showAssignButtons && (
                        <Stack
                          direction={isMobileSmall ? 'row' : 'row'}
                          spacing={0.5}
                          flexWrap="wrap"
                          sx={{
                            flex: 1,
                            justifyContent: isMobileSmall ? 'flex-end' : 'flex-end',
                            width: '100%',
                          }}
                        >
                          {onAssignSalle && (
                            <Tooltip
                              title={
                                salleNames.length
                                  ? `Salles: ${salleNames.join(', ')}`
                                  : slot.salle?.name || 'Associer des salles'
                              }
                            >
                              <IconButton
                                size="small"
                                onClick={(ev) => onAssignSalle(slot, ev)}
                                sx={{ ml: 'auto' }}
                              >
                                <MeetingRoomIcon
                                  fontSize="small"
                                  color={salleNames.length ? 'primary' : 'disabled'}
                                />
                              </IconButton>
                            </Tooltip>
                          )}
                          {onAssignClasses && (
                            <Tooltip
                              title={
                                classNames.length
                                  ? `Classes: ${classNames.join(', ')}`
                                  : 'Associer des classes'
                              }
                            >
                              <IconButton size="small" onClick={(ev) => onAssignClasses(slot, ev)}>
                                <GroupIcon
                                  fontSize="small"
                                  color={classNames.length ? 'secondary' : 'disabled'}
                                />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canFullPlan && (
                            <Tooltip title="Planifier / modifier les créneaux">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setPlanningOpen(true);
                                }}
                                onMouseDown={(e) => {
                                  // Empêche le onClick parent (carte événement) avant l'ouverture du dialog
                                  e.stopPropagation();
                                }}
                              >
                                <EventNoteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {/* Validation buttons */}
                          {canValidate && (
                            <>
                              <Tooltip title="Approuver ce créneau">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (canValidate) {
                                      handleApproveSlot(Number(slot.id));
                                    }
                                  }}
                                  disabled={isSlotLoading || !canValidate}
                                  color="success"
                                >
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Rejeter ce créneau">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (canValidate) {
                                      handleRejectSlot(Number(slot.id));
                                    }
                                  }}
                                  disabled={isSlotLoading || !canValidate}
                                  color="error"
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Contre-proposer">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (canValidate) {
                                      handleCounterPropose(Number(slot.id));
                                    }
                                  }}
                                  disabled={isSlotLoading || !canValidate}
                                  color="warning"
                                >
                                  <ReplyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {renderSlotExtras && renderSlotExtras(slot)}
                        </Stack>
                      )}
                    </Box>,
                  );

                  // If there's a counter-proposal, add it immediately below
                  const hasProposedNotes = !!(slot as any).proposedNotes;
                  if (hasProposed || hasProposedNotes) {
                    const proposed: SlotDisplaySlot = {
                      ...slot,
                      id: `${slot.id}-proposed`,
                      startDate: (slot as any).proposedStartDate || slot.startDate,
                      endDate: (slot as any).proposedEndDate || slot.endDate,
                      timeslotDate: (slot as any).proposedTimeslotDate || slot.timeslotDate,
                      state: 'counter_proposed',
                      proposedNotes: (slot as any).proposedNotes || null,
                    };
                    const proposedVisual = internalSlotVisual('counter_proposed');
                    const proposedBackgroundColor =
                      typeof proposedVisual.bg === 'function'
                        ? proposedVisual.bg(theme)
                        : proposedVisual.bg;

                    items.push(
                      <Box key={proposed.id} sx={{ ml: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1,
                            p: 0.75,
                            borderRadius: 1,
                            backgroundColor: proposedBackgroundColor,
                            borderLeft: '6px solid',
                            borderColor: proposedVisual.borderColor,
                            mb: 0.25,
                            flexDirection: isMobile ? 'column' : 'row',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              minWidth: { sm: 92 },
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: isMobile ? '100%' : 'auto',
                              flex: 1,
                            }}
                          >
                            {(() => {
                              const d = parseDate(proposed.timeslotDate || proposed.startDate);
                              const day = d
                                ? d.toLocaleDateString('fr-FR', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })
                                : 'Date invalide';
                              const range = formatTimeRange(proposed);
                              return `Contre‑proposition : ${day} • ${range}`;
                            })()}
                          </Typography>

                          {/* Owner buttons for counter-proposal */}
                          {isOwner && (
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="Accepter la contre-proposition">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (isOwner) {
                                      handleAcceptCounterProposal(Number(slot.id));
                                    }
                                  }}
                                  disabled={allLoadingSlotIds.has(Number(slot.id)) || !isOwner}
                                  color="success"
                                >
                                  <DoneAllIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Rejeter et contre-proposer">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (isOwner) {
                                      handleRejectCounterProposal(Number(slot.id));
                                    }
                                  }}
                                  disabled={allLoadingSlotIds.has(Number(slot.id)) || !isOwner}
                                  color="error"
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        </Box>
                        {proposed.proposedNotes && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
                            Note: {proposed.proposedNotes}
                          </Typography>
                        )}
                      </Box>,
                    );
                  }

                  return items;
                })}
            </Box>
          );
        })}
        {canFullPlan && (
          <InlineTimeslotPlanning
            open={planningOpen}
            onClose={() => setPlanningOpen(false)}
            slots={(localSlots || []) as any}
            onSave={(updated: RawTimeslotLike[]) => persistPlanning(updated)}
          />
        )}

        {/* User Counter-proposal dialog (ReplyIcon) */}
        <Dialog
          open={userCounterProposalDialog.open}
          onClose={() => setUserCounterProposalDialog({ open: false, slotId: null })}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              minHeight: '500px',
              overflow: 'visible',
            },
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <DialogTitle
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            Contre-proposition de créneau
          </DialogTitle>
          <DialogContent
            sx={{ overflow: 'visible' }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <Box display="flex" flexDirection="column" gap={3} mt={2}>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <FrenchDateOnly
                  selected={userCpDateObj}
                  onChange={(date: Date | null) => setUserCpDateObj(date)}
                  customInput={<TextField fullWidth label="Nouvelle date" />}
                />
              </Box>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <FrenchTimeOnly
                  selected={userCpStartObj}
                  onChange={(time: Date | null) => setUserCpStartObj(time)}
                  customInput={<TextField fullWidth label="Heure de début" />}
                />
              </Box>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <FrenchTimeOnly
                  selected={userCpEndObj}
                  onChange={(time: Date | null) => setUserCpEndObj(time)}
                  customInput={<TextField fullWidth label="Heure de fin" />}
                />
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (optionnel)"
                value={userCpNotes}
                onChange={(e) => setUserCpNotes(e.target.value)}
                placeholder="Expliquez votre contre-proposition..."
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setUserCounterProposalDialog({ open: false, slotId: null });
              }}
            >
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                submitCounterProposal();
              }}
              disabled={!userCpDateObj || !userCpStartObj || !userCpEndObj}
            >
              Soumettre
            </Button>
          </DialogActions>
        </Dialog>

        {/* Owner Counter-proposal dialog (CancelIcon) */}
        <Dialog
          open={ownerCounterProposalDialog.open}
          onClose={() => setOwnerCounterProposalDialog({ open: false, slotId: null })}
          maxWidth="md"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                minHeight: '400px',
                overflow: 'visible',
              },
            },
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <DialogTitle
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            Contre-contre-proposition (propriétaire)
          </DialogTitle>
          <DialogContent
            sx={{ overflow: 'visible' }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <Box display="flex" flexDirection="column" gap={3} mt={2}>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <FrenchDateOnly
                  selected={ownerCpDateObj}
                  onChange={(date: Date | null) => setOwnerCpDateObj(date)}
                  customInput={<TextField fullWidth label="Nouvelle date" />}
                />
              </Box>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <FrenchTimeOnly
                  selected={ownerCpStartObj}
                  onChange={(time: Date | null) => setOwnerCpStartObj(time)}
                  customInput={<TextField fullWidth label="Heure de début" />}
                />
              </Box>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <FrenchTimeOnly
                  selected={ownerCpEndObj}
                  onChange={(time: Date | null) => setOwnerCpEndObj(time)}
                  customInput={<TextField fullWidth label="Heure de fin" />}
                />
              </Box>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes (optionnel)"
                  value={ownerCpNotes}
                  onChange={(e) => {
                    e.stopPropagation();
                    setOwnerCpNotes(e.target.value);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setOwnerCounterProposalDialog({ open: false, slotId: null });
                setOwnerCpNotes('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                submitOwnerCounterProposal();
              }}
              disabled={!ownerCpDateObj || !ownerCpStartObj || !ownerCpEndObj}
            >
              Contre-proposer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default SlotDisplay;
