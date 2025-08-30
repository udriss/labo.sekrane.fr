'use client';

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EditEventDialog, { EditEventMeta, EditEventDialogHandle } from './EditEventDialog';
import { hasFullResourceChanges } from './resourceSignatures';

interface EventData {
  id: number;
  title: string;
  discipline: string;
  notes?: string;
  timeslots: any[];
}

interface EditEventDialogWrapperProps {
  open: boolean;
  onClose: () => void;
  selectedEvent: EventData | null;
  onSelectedEventChange: (event: EventData | null) => void;
  editMeta: EditEventMeta;
  onEditMetaChange: (meta: EditEventMeta) => void;
  onSaveEdit: () => Promise<void>;
  initialEditSignature?: string; // for hasFullResourceChanges comparison
}

export default function EditEventDialogWrapper({
  open,
  onClose,
  selectedEvent,
  onSelectedEventChange,
  editMeta,
  onEditMetaChange,
  onSaveEdit,
  initialEditSignature = '',
}: EditEventDialogWrapperProps) {
  const handleEventChange = (data: any) => {
    // Optimistic local draft; save occurs on click
    onSelectedEventChange(
      selectedEvent ? ({ ...selectedEvent, ...data } as EventData) : selectedEvent,
    );
  };

  // Check if save button should be disabled
  const hasChanges = useMemo(() => {
    if (!initialEditSignature) return true; // no initial signature, allow save

    const currentSig = JSON.stringify({
      materiels: editMeta.materialsDetailed || [],
      reactifs: editMeta.chemicalsDetailed || [],
      documents: editMeta.uploads || [],
      classes: (editMeta.classes || [])
        .map((c) => c.id)
        .filter((id): id is number => typeof id === 'number'),
      salles: (editMeta.salles || [])
        .map((s) => s.id)
        .filter((id): id is number => typeof id === 'number'),
      customMateriels: editMeta.customMaterials || [],
      customReactifs: editMeta.customChemicals || [],
    });

    return currentSig !== initialEditSignature;
  }, [editMeta, initialEditSignature]);

  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: 'info' | 'success' | 'error';
  }>({ open: false, message: '', severity: 'info' });

  const dialogRef = React.useRef<EditEventDialogHandle | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Listen for close requests from the internal wizard
  React.useEffect(() => {
    const handleCloseRequest = () => {
      onClose();
    };

    window.addEventListener('edit-dialog:close-request', handleCloseRequest);
    return () => {
      window.removeEventListener('edit-dialog:close-request', handleCloseRequest);
    };
  }, [onClose]);

  const handleSave = async () => {
    // Close dialog immediately for better UX; continue save in background
    const res = await dialogRef.current?.persistSlots();
    const slotsChanged = !!res?.changed;
    onClose();
    try {
      await onSaveEdit();
      // Notify others to refetch event data
      try {
        window.dispatchEvent(
          new CustomEvent('event:refetch', {
            detail: { eventId: selectedEvent?.id },
          }),
        );
      } catch {}
      if (!slotsChanged) {
        setSnack({ open: true, message: 'Aucune modification à enregistrer', severity: 'info' });
      }
    } catch (e) {
      setSnack({ open: true, message: 'Erreur lors de la sauvegarde', severity: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle>Éditer l&apos;événement</DialogTitle>
      {selectedEvent && (
        <EditEventDialog
          ref={dialogRef}
          initial={{
            title: selectedEvent.title,
            discipline: selectedEvent.discipline as any,
            notes: selectedEvent.notes,
          }}
          initialSlots={(selectedEvent.timeslots || []).map((s: any) => ({
            id: s.id,
            startDate: s.startDate,
            endDate: s.endDate,
            classIds: Array.isArray(s.classIds) ? s.classIds : [],
            salleIds: Array.isArray(s.salleIds) ? s.salleIds : [],
          }))}
          onChange={handleEventChange}
          valueMeta={editMeta}
          onMetaChange={onEditMetaChange}
          eventId={selectedEvent.id}
          onDuplicateUpload={(fileUrl) => {
            setSnack({
              open: true,
              message: 'Document déjà présent (non ajouté de nouveau)',
              severity: 'info',
            });
          }}
          // When the internal wizard 'Enregistrer' is clicked, also run outer save flow
          onPersistSlots={onSaveEdit}
        />
      )}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="outlined"
          onClick={handleSave}
          disabled={!hasChanges}
          color='success'
        >
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
}
