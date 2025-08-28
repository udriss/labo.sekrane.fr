'use client';
import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import type { ExportFormat, FontOptions } from '@/types/export';
import ExportFormatOptions from './ExportFormatOptions';
import { toCSV, downloadCSV } from '@/lib/export/csv';
import { downloadXLSX } from '@/lib/export/xlsx';
import { exportTablePDF } from '@/lib/export/pdf';

export interface CalendarEventLite {
  id: number;
  title: string;
  discipline: 'chimie' | 'physique' | string;
  timeslots: Array<{ startDate?: string; endDate?: string; timeslotDate?: string }>;
  classIds?: number[];
  salleIds?: number[];
  classes?: Array<{ id: number; name: string }>; // optional enriched
  salles?: Array<{ id: number; name: string }>; // optional enriched
}

interface CalendarExportDialogProps {
  open: boolean;
  title?: string;
  events: CalendarEventLite[];
  onClose: () => void;
}

function formatSlotRange(slot: {
  startDate?: string;
  endDate?: string;
  timeslotDate?: string;
}): string {
  if (slot.timeslotDate) return slot.timeslotDate;
  if (slot.startDate && slot.endDate) {
    const s = new Date(slot.startDate);
    const e = new Date(slot.endDate);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const day = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
    const hs = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
    const he = `${pad(e.getHours())}:${pad(e.getMinutes())}`;
    return `${day} ${hs}-${he}`;
  }
  return '—';
}

export default function CalendarExportDialog({
  open,
  title = 'Export calendrier',
  events,
  onClose,
}: CalendarExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [font, setFont] = useState<FontOptions>({ fontFamily: 'Roboto, sans-serif', fontSize: 12 });
  const [mode, setMode] = useState<'day' | 'week'>('week');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  // Compute a friendly filename based on selected mode or date range
  const baseFilename = useMemo(() => {
    const clamp = (s: string) => (s || '').replaceAll(/[^0-9-]/g, '').slice(0, 10);
    const s = clamp(start);
    const e = clamp(end);
    if (s && e) return `calendrier_${s}_${e}`;
    if (s && !e) return `calendrier_${s}`;
    if (!s && e) return `calendrier_${e}`;
    return mode === 'day' ? 'calendrier_jour' : 'calendrier';
  }, [start, end, mode]);

  const filtered = useMemo(() => {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (!s && !e) return events;
    return events.filter((ev) =>
      (ev.timeslots || []).some((ts) => {
        const d = ts.timeslotDate
          ? new Date(ts.timeslotDate)
          : ts.startDate
            ? new Date(ts.startDate)
            : null;
        if (!d) return false;
        if (s && d < s) return false;
        if (e && d > e) return false;
        return true;
      }),
    );
  }, [events, start, end]);

  const rows = useMemo(
    () =>
      filtered.map((ev) => ({
        title: ev.title || '—',
        discipline: ev.discipline,
        schedule: (ev.timeslots || []).map((ts) => formatSlotRange(ts)).join(' ; '),
        classes: (ev.classes || []).map((c) => c.name).join(', '),
        salles: (ev.salles || []).map((s) => s.name).join(', '),
      })),
    [filtered],
  );

  const flatColumns = [
    { header: 'Titre', exportValue: (r: (typeof rows)[number]) => r.title },
    { header: 'Discipline', exportValue: (r: (typeof rows)[number]) => r.discipline },
    {
      header: mode === 'day' ? 'Créneaux (jour)' : 'Créneaux (semaine)',
      exportValue: (r: (typeof rows)[number]) => r.schedule,
    },
    { header: 'Classes', exportValue: (r: (typeof rows)[number]) => r.classes },
    { header: 'Salles', exportValue: (r: (typeof rows)[number]) => r.salles },
  ];

  const handleExport = () => {
    if (exportFormat === 'csv') {
      const csv = toCSV(rows, flatColumns);
      downloadCSV(`${baseFilename}.csv`, csv);
      return;
    }
    if (exportFormat === 'xlsx') {
      downloadXLSX(baseFilename, rows, flatColumns);
      return;
    }
    exportTablePDF(rows, flatColumns, {
      title,
      fontFamily: font.fontFamily,
      fontSize: font.fontSize,
      filename: baseFilename,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={mode}
              onChange={(_, v) => v && setMode(v)}
            >
              <ToggleButton value="day">Jour</ToggleButton>
              <ToggleButton value="week">Semaine</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label="Début"
              type="date"
              size="small"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Fin"
              type="date"
              size="small"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Police (CSS)"
              size="small"
              value={font.fontFamily}
              onChange={(e) => setFont((f) => ({ ...f, fontFamily: e.target.value }))}
              sx={{ minWidth: 240 }}
            />
            <TextField
              label="Taille"
              type="number"
              size="small"
              inputProps={{ min: 8, max: 24 }}
              value={font.fontSize}
              onChange={(e) =>
                setFont((f) => ({
                  ...f,
                  fontSize: Math.max(8, Math.min(24, Number(e.target.value) || 12)),
                }))
              }
              sx={{ width: 120 }}
            />
          </Stack>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Prévisualisation ({rows.length})
            </Typography>
            <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
              {rows.map((r, idx) => (
                <ListItem key={idx} divider>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={600}>{r.title}</Typography>
                        <Chip size="small" label={r.discipline} />
                      </Stack>
                    }
                    secondary={
                      <>
                        <Typography variant="body2">{r.schedule}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Classes: {r.classes || '—'} · Salles: {r.salles || '—'}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
              {rows.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  Aucun événement dans l'intervalle.
                </Typography>
              )}
            </List>
          </Paper>
          <ExportFormatOptions
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            onExport={handleExport}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
