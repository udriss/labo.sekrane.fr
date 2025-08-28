'use client';
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Card,
  Stack,
  Chip,
  TextField,
  Autocomplete,
  Alert,
} from '@mui/material';
import 'react-datepicker/dist/react-datepicker.css';
import FrenchDatePicker, {
  FrenchDateOnly,
  FrenchTimeOnly,
} from '@/components/shared/FrenchDatePicker';

import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export interface RawTimeslotLike {
  id?: number | string;
  startDate?: string;
  endDate?: string;
  timeslotDate?: string; // YYYY-MM-DD
  salleIds?: number[];
  classIds?: number[];
}

interface TimeslotPlanningDialogProps {
  open: boolean;
  slots: RawTimeslotLike[];
  discipline?: 'chimie' | 'physique';
  onClose: () => void;
  onSave: (updated: RawTimeslotLike[]) => void;
  title?: string;
}

type LocalSlot = {
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
  salleIds: number[];
  classIds: number[];
  id?: number | string;
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export const TimeslotPlanningDialog: React.FC<TimeslotPlanningDialogProps> = ({
  open,
  slots,
  discipline,
  onClose,
  onSave,
  title = 'Planification : créneaux, classes & salles',
}) => {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [availableSalles, setAvailableSalles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [localSlots, setLocalSlots] = useState<LocalSlot[]>([]);

  // Initialize local slots from incoming slots
  useEffect(() => {
    if (!open) return; // only when opening
    const safeDateOnly = (input: any): Date | null => {
      if (!input) return null;
      if (input instanceof Date) {
        return isNaN(input.getTime())
          ? null
          : new Date(input.getFullYear(), input.getMonth(), input.getDate());
      }
      if (typeof input === 'string') {
        const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
          const Y = parseInt(m[1], 10);
          const M = parseInt(m[2], 10);
          const D = parseInt(m[3], 10);
          if (!isNaN(Y) && !isNaN(M) && !isNaN(D)) return new Date(Y, M - 1, D);
        }
      }
      return null;
    };
    const parseTime = (stamp?: string) => {
      if (!stamp || typeof stamp !== 'string') return null;
      // Normaliser l'espace éventuel et ignorer le fuseau (on traite l'heure comme "wall clock")
      const normalized = stamp.replace(' ', 'T');
      // Cherche directement HH:MM après le 'T'
      const m = normalized.match(/T(\d{2}):(\d{2})/);
      if (m) return `${m[1]}:${m[2]}`;
      return null;
    };
    const mapped: LocalSlot[] = (slots || []).map((s) => {
      const date = safeDateOnly(s.timeslotDate) || safeDateOnly(s.startDate);
      return {
        id: s.id,
        date,
        startTime: parseTime(s.startDate),
        endTime: parseTime(s.endDate),
        salleIds: Array.isArray(s.salleIds) ? [...s.salleIds] : [],
        classIds: Array.isArray(s.classIds) ? [...s.classIds] : [],
      };
    });
    setLocalSlots(
      mapped.length
        ? mapped
        : [{ date: null, startTime: null, endTime: null, salleIds: [], classIds: [] }],
    );
  }, [open, slots]);

  // Fetch classes & salles
  useEffect(() => {
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
            a.group === b.group ? a.name.localeCompare(b.name) : a.group === 'Mes salles' ? -1 : 1,
          );
          setAvailableSalles(list);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const addSlot = () =>
    setLocalSlots((prev) => [
      ...prev,
      { date: null, startTime: null, endTime: null, salleIds: [], classIds: [] },
    ]);
  const removeSlot = (idx: number) => setLocalSlots((prev) => prev.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, partial: Partial<LocalSlot>) =>
    setLocalSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...partial } : s)));

  const hasInvalid = localSlots.some(
    (s) => !s.date || !s.startTime || !s.endTime || s.startTime >= s.endTime,
  );

  const handleSave = () => {
    const mapped: RawTimeslotLike[] = localSlots
      .filter((s) => s.date && s.startTime && s.endTime)
      .map((s) => {
        const [sh, sm] = s.startTime!.split(':').map(Number);
        const [eh, em] = s.endTime!.split(':').map(Number);
        const d = s.date as Date;
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em, 0, 0);
        // IMPORTANT: Use 'T' between date and time so backend helper (split on 'T') preserves hours
        const localIsoNoZ = (dt: Date) =>
          `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
        return {
          id: s.id,
          startDate: localIsoNoZ(start),
          endDate: localIsoNoZ(end),
          timeslotDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
          salleIds: s.salleIds,
          classIds: s.classIds,
        };
      });
    onSave(mapped);
    onClose();
  };

  // Input réutilisable qui bloque la propagation pour éviter l'ouverture du parent
  const PickerInput = React.useMemo(
    () =>
      React.forwardRef<HTMLInputElement, any>((props, ref) => (
        <TextField
          size="small"
          {...props}
          inputRef={ref}
          onClick={(e) => {
            e.stopPropagation();
            props.onClick?.(e);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            props.onMouseDown?.(e);
          }}
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
      onClose={(e: any) => {
        // Empêche la fermeture de relancer des clics sous-jacents
        if (e?.stopPropagation) e.stopPropagation();
        onClose();
      }}
      maxWidth="md"
      fullWidth
      // Bloque la propagation vers une carte événement ou un autre dialog parent
      PaperProps={{
        onClick: (e: any) => e?.stopPropagation && e.stopPropagation(),
        onMouseDown: (e: any) => e?.stopPropagation && e.stopPropagation(),
      }}
      slotProps={
        {
          backdrop: {
            onClick: (e: any) => {
              if (e?.stopPropagation) e.stopPropagation();
              onClose();
            },
          },
        } as any
      }
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Gérez les créneaux, salles et classes comme dans l'étape d'ajout d'événement.
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
                return (
                  <Card key={index} sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        Créneau {index + 1}
                      </Typography>
                      {localSlots.length > 1 && (
                        <IconButton size="small" color="error" onClick={() => removeSlot(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    <Box
                      display="grid"
                      gap={2}
                      alignItems="flex-start"
                      sx={{
                        gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, max-content)' },
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
                          className="react-datepicker-input"
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
      <DialogActions>
        <Button
          onClick={(e) => {
            (e as any).stopPropagation?.();
            onClose();
          }}
        >
          Annuler
        </Button>
        <Button variant="contained" disabled={hasInvalid} onClick={handleSave}>
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TimeslotPlanningDialog;
