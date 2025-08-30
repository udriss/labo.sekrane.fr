'use client';

import React from 'react';
import { Dialog, DialogTitle, DialogActions, Button, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CreateEventDialog, { CreateEventMeta } from './CreateEventDialog';
import { CheckCircle } from '@mui/icons-material'

interface EventData {
  id: number;
  title: string;
  discipline: string;
  notes?: string;
}

interface CreateEventDialogWrapperProps {
  open: boolean;
  onClose: () => void;
  createType: 'tp' | 'laborantin';
  eventToCopy?: EventData | null;
  copiedEventId?: number | null;
  createEventForm: {
    title: string;
    discipline: 'chimie' | 'physique';
    notes?: string;
  };
  onCreateEventFormChange: (data: any) => void;
  createMeta: CreateEventMeta;
  onCreateMetaChange: (meta: CreateEventMeta) => void;
  pendingSlotDrafts: any[];
  onPendingSlotDraftsChange: (drafts: any[]) => void;
  onCreateEvent: () => Promise<void>;
  isCreateButtonDisabled?: boolean;
}

export default function CreateEventDialogWrapper({
  open,
  onClose,
  createType,
  eventToCopy,
  copiedEventId,
  createEventForm,
  onCreateEventFormChange,
  createMeta,
  onCreateMetaChange,
  pendingSlotDrafts,
  onPendingSlotDraftsChange,
  onCreateEvent,
  isCreateButtonDisabled = false,
}: CreateEventDialogWrapperProps) {
  const handleClose = () => {
    onPendingSlotDraftsChange([]);
    onClose();
  };

  const handleMetaChange = (meta: CreateEventMeta) => {
    onCreateMetaChange(meta);
    // Defensive: ensure drafts is an array to avoid first-run undefined issues
    const drafts = Array.isArray((meta as any).timeSlotsDrafts)
      ? ((meta as any).timeSlotsDrafts as any[])
      : [];
    // no debug logs in production
    onPendingSlotDraftsChange(drafts);
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle>Ajouter un événement {createType === 'tp' ? 'TP' : 'Laborantin'}</DialogTitle>
      <CreateEventDialog
        createType={createType}
        initial={{
          title: eventToCopy?.title ? `Copie de ${eventToCopy.title}` : '',
          discipline: (eventToCopy?.discipline as any) ?? 'chimie',
          notes: eventToCopy?.notes ?? '',
        }}
        copiedEventId={copiedEventId}
        onChange={onCreateEventFormChange}
        valueMeta={createMeta}
        onMetaChange={handleMetaChange}
      />
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button 
          variant="contained" 
          onClick={async () => {
            if (isCreateButtonDisabled || submitting) return;
            setSubmitting(true);
            try {
              await onCreateEvent();
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={isCreateButtonDisabled || submitting}
          color="success"
          startIcon={<CheckCircle />}
        >
          {submitting ? 'Ajout…' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
