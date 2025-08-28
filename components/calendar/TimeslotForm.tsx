import React, { useState } from 'react';
import { DialogContent, TextField, Box, Button, MenuItem, Alert } from '@mui/material';
import 'react-datepicker/dist/react-datepicker.css';
import FrenchDatePicker, {
  FrenchDateOnly,
  FrenchTimeOnly,
  FrenchDateTime,
} from '@/components/shared/FrenchDatePicker';
import { format } from 'date-fns';

export type TimeslotFormData = {
  startDate: string;
  endDate: string;
  notes?: string;
  salleId?: number | null;
};

export default function TimeslotForm({
  initial,
  onChange,
  onAdd,
  salles,
  existingSlots,
}: {
  initial?: Partial<TimeslotFormData>;
  onChange?: (data: TimeslotFormData) => void;
  onAdd?: (data: TimeslotFormData) => void;
  salles?: Array<{ id: number; name: string }>; // optional list of rooms
  existingSlots?: Array<{ startDate: string; endDate: string; salleId?: number | null }>;
}) {
  const [start, setStart] = useState<Date | null>(
    initial?.startDate ? new Date(initial.startDate) : null,
  );
  const [end, setEnd] = useState<Date | null>(initial?.endDate ? new Date(initial.endDate) : null);
  const [notes, setNotes] = useState<string>(initial?.notes ?? '');
  const [salleId, setSalleId] = useState<number | ''>(
    typeof initial?.salleId === 'number' ? initial!.salleId! : '',
  );

  // Legacy collision logic (single salleId) disabled after migration to multi-salle (salleIds array)
  const hasCollision = false;

  function toApiString(d: Date) {
    // Return Paris-local string without Z to let backend interpret in Europe/Paris
    return format(d, "yyyy-MM-dd'T'HH:mm");
  }

  function emitChange() {
    if (start && end) {
      onChange?.({
        startDate: toApiString(start),
        endDate: toApiString(end),
        notes,
        salleId: salleId === '' ? undefined : Number(salleId),
      });
    }
  }

  return (
    <DialogContent>
      <Box display="flex" flexDirection="column" gap={2}>
        {Array.isArray(salles) && salles.length > 0 && (
          <TextField
            select
            label="Salle (optionnel)"
            value={salleId}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : Number(e.target.value);
              setSalleId(v);
              emitChange();
            }}
          >
            <MenuItem value="">Aucune</MenuItem>
            {salles.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Box display="flex" gap={2}>
          <Box flex={1}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Début</label>
            <FrenchDateTime
              selected={start}
              onChange={(d: Date | null) => {
                setStart(d as Date);
                // Auto-adjust end if empty or before start
                if (!end && d) {
                  const e = new Date(d);
                  e.setHours(e.getHours() + 1);
                  setEnd(e);
                }
                emitChange();
              }}
              timeIntervals={15}
              customInput={<TextField size="medium" fullWidth />}
            />
          </Box>
          <Box flex={1}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Fin</label>
            <FrenchDateTime
              selected={end}
              onChange={(d: Date | null) => {
                setEnd(d as Date);
                emitChange();
              }}
              timeIntervals={15}
              customInput={<TextField size="medium" fullWidth />}
              minDate={start ?? undefined}
            />
          </Box>
        </Box>
        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            emitChange();
          }}
          multiline
          rows={2}
        />
        {hasCollision && (
          <Alert severity="warning">
            Chevauchement détecté avec un créneau existant
            {salleId !== '' && salleId != null ? ' dans cette salle' : ''}. Vous pouvez quand même
            ajouter le créneau.
          </Alert>
        )}
        {onAdd && (
          <Button
            variant="outlined"
            onClick={() => {
              if (!start || !end) return;
              onAdd({
                startDate: toApiString(start),
                endDate: toApiString(end),
                notes,
                salleId: salleId === '' ? undefined : Number(salleId),
              });
            }}
          >
            Ajouter le créneau
          </Button>
        )}
      </Box>
    </DialogContent>
  );
}
