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
  const [submitting, setSubmitting] = React.useState(false);
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

  // Local guard: enable the button when valid drafts exist (e.g., after selecting a preset),
  // even if parent disabled state lags due to async meta propagation.
  const wrapperCanCreate = React.useMemo(() => {
    // When copying an event, allow creation without drafts
    if (copiedEventId) return true;
    const method = (createMeta as any)?.method;
    // If a preset is selected, allow creation even if drafts propagation is slightly delayed
    if (method === 'preset' && (createMeta as any)?.presetId) {
      // Prefer real drafts when available
      const metaDrafts = Array.isArray((createMeta as any)?.timeSlotsDrafts)
        ? ((createMeta as any)?.timeSlotsDrafts as any[])
        : [];
      const drafts = metaDrafts.length ? metaDrafts : (pendingSlotDrafts || []);
      if (Array.isArray(drafts) && drafts.length > 0) {
        const invalid = drafts.some((s: any) => !s?.startDate || !s?.endDate || !s?.timeslotDate);
        if (!invalid) return true;
      }
      // Fallback: preset chosen, let user proceed and let server-side validation handle absence of slots
      return true;
    }
    // Manual mode: if drafts array exists and non-empty, allow proceed; detailed validation will be handled in handler
    if (method === 'manual') {
      const metaDrafts = Array.isArray((createMeta as any)?.timeSlotsDrafts)
        ? ((createMeta as any)?.timeSlotsDrafts as any[])
        : [];
      const drafts = metaDrafts.length ? metaDrafts : (pendingSlotDrafts || []);
      return Array.isArray(drafts) && drafts.length > 0;
    }
    const metaDrafts = Array.isArray((createMeta as any)?.timeSlotsDrafts)
      ? ((createMeta as any)?.timeSlotsDrafts as any[])
      : [];
    const drafts = metaDrafts.length ? metaDrafts : (pendingSlotDrafts || []);
    return Array.isArray(drafts) && drafts.length > 0;
  }, [copiedEventId, createMeta, pendingSlotDrafts]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle>Ajouter un événement {createType === 'tp' ? 'TP' : 'Laborantin'}</DialogTitle>
      <CreateEventDialog
        createType={createType}
        initial={{
          title: '',
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
          variant="outlined" 
          onClick={async () => {
            if (!wrapperCanCreate || submitting) return;
            try {
              setSubmitting(true);
              await onCreateEvent();
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting || !wrapperCanCreate}
          color="success"
          startIcon={<CheckCircle />}
        >
          {submitting ? 'Ajout…' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
