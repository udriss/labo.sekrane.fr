'use client';
import React, { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Paper,
  Button,
} from '@mui/material';
import type { ExportFormat, FontOptions } from '@/types/export';
import ExportFormatOptions from './ExportFormatOptions';
import { toCSV, downloadCSV } from '@/lib/export/csv';
import { downloadXLSX } from '@/lib/export/xlsx';

export interface CalendarEventLite {
  id: number;
  title: string;
  discipline: 'chimie' | 'physique' | string;
  timeslots: Array<{ startDate?: string; endDate?: string; timeslotDate?: string }>;
  classes?: Array<{ id: number; name: string }>;
  salles?: Array<{ id: number; name: string }>;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDay(d: Date) {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseSlot(slot: { startDate?: string; endDate?: string; timeslotDate?: string }) {
  const parseLocal = (s: string) => {
    // Expect formats like 'YYYY-MM-DD HH:mm' or 'YYYY-MM-DDTHH:mm'
    const m = String(s)
      .replace(' ', 'T')
      .match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!m) return null;
    const [_, Y, M, D, h, mi] = m;
    // Construct a Date using local time components (no timezone conversion)
    return new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(mi), 0, 0);
  };
  if (slot.startDate && slot.endDate) {
    const s = parseLocal(slot.startDate);
    const e = parseLocal(slot.endDate);
    if (!s || !e) return null;
    return { start: s, end: e };
  }
  if (slot.timeslotDate) {
    const d = String(slot.timeslotDate);
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    const s = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9, 0, 0, 0);
    const e = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 10, 0, 0, 0);
    return { start: s, end: e };
  }
  return null;
}

function getEventInstances(ev: CalendarEventLite) {
  const arr: Array<{ start: Date; end: Date; title: string }> = [];
  (ev.timeslots || []).forEach((ts) => {
    const pe = parseSlot(ts);
    if (pe) arr.push({ ...pe, title: ev.title || '—' });
  });
  return arr;
}

function buildDayEvents(events: CalendarEventLite[], day: Date) {
  const dayStr = fmtDay(day);
  const list: Array<{ start: Date; end: Date; title: string } & { col?: number; span?: number }> =
    [];
  for (const ev of events) {
    for (const inst of getEventInstances(ev)) {
      const s = inst.start;
      if (fmtDay(s) === dayStr) list.push({ ...inst });
    }
  }
  // Assign columns to handle overlaps (greedy coloring)
  list.sort((a, b) => a.start.getTime() - b.start.getTime());
  const active: Array<{ end: Date; col: number }> = [];
  let maxCol = 0;
  for (const e of list) {
    // free columns that ended
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= e.start) active.splice(i, 1);
    }
    // find smallest available col
    const used = new Set(active.map((a) => a.col));
    let col = 0;
    while (used.has(col)) col++;
    e.col = col;
    active.push({ end: e.end, col });
    if (col > maxCol) maxCol = col;
  }
  const totalCols = maxCol + 1;
  list.forEach((e) => (e.span = totalCols));
  return list as Array<{ start: Date; end: Date; title: string; col: number; span: number }>;
}

async function exportCalendarPDF(opts: {
  events: CalendarEventLite[];
  mode: 'day' | 'week';
  refDate: Date;
  font: FontOptions;
  filename: string;
  startHour: number;
  endHour: number;
  includeSaturday: boolean;
}) {
  const { events, mode, refDate, font, filename, startHour, endHour, includeSaturday } = opts;
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const titleH = 24;
  const axisW = 60;
  const topY = margin + titleH + 10;
  const bottomY = pageH - margin;
  const gridH = bottomY - topY;
  const dayCount = mode === 'day' ? 1 : includeSaturday ? 6 : 5; // Mon-Fri (+ Saturday optional)
  const gridW = pageW - margin * 2 - axisW;
  const colW = gridW / dayCount;
  const hourH = gridH / (endHour - startHour);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const title = mode === 'day' ? 'Planning (jour)' : 'Planning (semaine)';
  doc.text(title, margin, margin + 16);

  // Time axis with bold hour and half-hour dotted lines
  doc.setFontSize(font.fontSize);
  doc.setFont('helvetica', 'normal');
  for (let h = startHour; h <= endHour; h++) {
    const y = topY + (h - startHour) * hourH;
    doc.setDrawColor(220);
    doc.line(margin + axisW, y, margin + axisW + gridW, y);
    const label = `${h.toString().padStart(2, '0')}:00`;
    doc.setTextColor(60);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y + 4);
    doc.setFont('helvetica', 'normal');
    if (h < endHour) {
      // half-hour dotted
      const y2 = y + hourH / 2;
      doc.setLineDashPattern([2, 2], 0);
      doc.setDrawColor(200);
      doc.line(margin + axisW, y2, margin + axisW + gridW, y2);
      doc.setLineDashPattern([], 0);
    }
  }

  // Days headers and verticals
  const weekStart = startOfWeek(refDate);
  for (let d = 0; d < dayCount; d++) {
    const x = margin + axisW + d * colW;
    const day =
      mode === 'day'
        ? refDate
        : new Date(
            weekStart.getFullYear(),
            weekStart.getMonth(),
            weekStart.getDate() + d,
            0,
            0,
            0,
            0,
          );
    const label = day.toLocaleDateString(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
    doc.setTextColor(40);
    doc.text(label, x + 4, topY - 6);
    doc.setDrawColor(200);
    doc.line(x, topY, x, topY + gridH);
  }
  // Right border
  doc.line(margin + axisW + gridW, topY, margin + axisW + gridW, topY + gridH);

  // Place events
  const placeDay = (day: Date, dayIndex: number) => {
    const dayEvents = buildDayEvents(events, day);
    for (const e of dayEvents) {
      const sH = e.start.getHours() + e.start.getMinutes() / 60;
      const eH = e.end.getHours() + e.end.getMinutes() / 60;
      const y = topY + (sH - startHour) * hourH;
      const h = Math.max(10, (eH - sH) * hourH);
      const x0 = margin + axisW + dayIndex * colW;
      const w = Math.max(30, colW / (e.span || 1) - 6);
      const x = x0 + (e.col || 0) * (colW / (e.span || 1)) + 3;
      doc.setFillColor(232, 244, 250);
      doc.setDrawColor(120, 170, 200);
      doc.roundedRect(x, y, w, h, 4, 4, 'FD');
      doc.setTextColor(20);
      doc.setFontSize(Math.max(8, font.fontSize - 2));
      const txt = e.title.length > 60 ? e.title.slice(0, 57) + '…' : e.title;
      doc.text(txt, x + 4, y + 12, { maxWidth: w - 8 });
    }
  };

  if (mode === 'day') {
    placeDay(refDate, 0);
  } else {
    const days = includeSaturday ? 6 : 5;
    for (let i = 0; i < days; i++) placeDay(new Date(weekStart.getTime() + i * 86400000), i);
  }

  doc.save(`${filename}.pdf`);
}

export default function CalendarExportTab({
  title = 'Export calendrier',
  events,
  defaultMode = 'week',
  filename = 'calendrier',
}: {
  title?: string;
  events: CalendarEventLite[];
  defaultMode?: 'day' | 'week';
  filename?: string;
}) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [font, setFont] = useState<FontOptions>({ fontFamily: 'Roboto, sans-serif', fontSize: 12 });
  const [mode, setMode] = useState<'day' | 'week'>(defaultMode);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [startHour, setStartHour] = useState<number>(7);
  const [endHour, setEndHour] = useState<number>(18);
  const [includeSaturday, setIncludeSaturday] = useState<boolean>(false);

  const refDate = useMemo(() => {
    // Parse as local date without timezone shifts
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
    return new Date();
  }, [date]);

  // Precompute week start for grid
  const gridWeekStart = useMemo(() => startOfWeek(refDate), [refDate]);
  // Build weekly/day table grid for CSV/XLSX: time rows x day columns, each cell contains events text
  const grid = useMemo(() => {
    const start = startHour;
    const end = endHour;
    const hours = Array.from({ length: end - start }, (_, i) => start + i);
    const wsDays =
      mode === 'day'
        ? [refDate]
        : Array.from(
            { length: includeSaturday ? 6 : 5 },
            (_, i) =>
              new Date(
                gridWeekStart.getFullYear(),
                gridWeekStart.getMonth(),
                gridWeekStart.getDate() + i,
                0,
                0,
                0,
                0,
              ),
          );
    const rows = hours.map((h) => {
      const row: Record<string, string> = { Heure: `${String(h).padStart(2, '0')}:00` };
      wsDays.forEach((d, di) => {
        const dayKey = d.toLocaleDateString('fr-CA'); // YYYY-MM-DD
        const within = (ev: CalendarEventLite) =>
          (ev.timeslots || []).some((ts) => {
            // naive match substrings
            const sd = String(ts.startDate || ts.timeslotDate || '').slice(0, 10);
            return sd === dayKey;
          });
        const eventsForDay = events.filter(within);
        const texts: string[] = [];
        eventsForDay.forEach((ev) => {
          (ev.timeslots || []).forEach((ts) => {
            const m = String(ts.startDate || '')
              .replace(' ', 'T')
              .match(/T(\d{2}):(\d{2})/);
            if (!m) return;
            const hh = Number(m[1]);
            if (hh === h) texts.push(ev.title);
          });
        });
        row[d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })] =
          texts.join(' | ');
      });
      return row;
    });
    const columns = [
      'Heure',
      ...wsDays.map((d) =>
        d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      ),
    ];
    return { rows, columns };
  }, [events, mode, refDate, gridWeekStart, startHour, endHour, includeSaturday]);

  const handleExport = async () => {
    if (exportFormat === 'csv') {
      const flat = grid.rows.map((r) => r);
      const columns = grid.columns.map((h) => ({
        header: h,
        exportValue: (row: Record<string, string>) => row[h],
      }));
      const csv = toCSV(flat, columns);
      downloadCSV(`${filename}.csv`, csv);
      return;
    }
    if (exportFormat === 'xlsx') {
      const columns = grid.columns.map((h) => ({
        header: h,
        exportValue: (row: Record<string, string>) => row[h],
      }));
      await downloadXLSX(filename, grid.rows, columns);
      return;
    }
    // PDF visual grid
    await exportCalendarPDF({
      events,
      mode,
      refDate,
      font,
      filename,
      startHour,
      endHour,
      includeSaturday,
    });
  };

  // Simple on-page visual preview (HTML-based)
  const dayCount = mode === 'day' ? 1 : includeSaturday ? 6 : 5;
  const weekStart = startOfWeek(refDate);
  const days = Array.from({ length: dayCount }).map((_, i) =>
    mode === 'day'
      ? refDate
      : new Date(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate() + i,
          0,
          0,
          0,
          0,
        ),
  );

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <ExportFormatOptions
        exportFormat={exportFormat}
        setExportFormat={setExportFormat}
        onExport={handleExport}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="day">Jour</ToggleButton>
          <ToggleButton value="week">Semaine</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          label={mode === 'day' ? 'Date' : 'Date de la semaine'}
          type="date"
          size="small"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Début (h)"
          type="number"
          size="small"
          inputProps={{ min: 6, max: 22 }}
          value={startHour}
          onChange={(e) => {
            const v = Math.max(6, Math.min(22, Number(e.target.value) || 7));
            setStartHour(v);
            if (v >= endHour) setEndHour(Math.min(23, v + 1));
          }}
          sx={{ width: 120 }}
        />
        <TextField
          label="Fin (h)"
          type="number"
          size="small"
          inputProps={{ min: 7, max: 23 }}
          value={endHour}
          onChange={(e) => {
            const v = Math.max(startHour + 1, Math.min(23, Number(e.target.value) || 18));
            setEndHour(v);
          }}
          sx={{ width: 120 }}
        />
        <ToggleButton
          value="sat"
          selected={includeSaturday}
          onChange={() => setIncludeSaturday((s) => !s)}
        >
          Samedi
        </ToggleButton>
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
      <Paper variant="outlined" sx={{ p: 2, overflow: 'auto' }}>
        <Typography variant="subtitle2" gutterBottom>
          Prévisualisation ({mode === 'day' ? 'Jour' : 'Semaine'})
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `60px repeat(${dayCount}, 1fr)`,
            gap: 1,
            minHeight: 520,
          }}
        >
          {/* Time axis */}
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {Array.from({ length: endHour - startHour + 1 }).map((_, i) => (
              <Box key={i} sx={{ height: 48, fontSize: 12, color: 'text.secondary' }}>
                {String(startHour + i).padStart(2, '0')}:00
              </Box>
            ))}
          </Box>
          {days.map((d, dayIdx) => {
            const items = buildDayEvents(events, d);
            return (
              <Box
                key={dayIdx}
                sx={{ position: 'relative', borderLeft: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="caption" sx={{ position: 'sticky', top: 0 }}>
                  {d.toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </Typography>
                <Box sx={{ position: 'relative', height: (endHour - startHour) * 48 }}>
                  {items.map((e, idx) => {
                    const sH = e.start.getHours() + e.start.getMinutes() / 60;
                    const eH = e.end.getHours() + e.end.getMinutes() / 60;
                    const top = (sH - startHour) * 48;
                    const height = Math.max(16, (eH - sH) * 48);
                    const total = e.span || 1;
                    const width = `calc(${100 / total}% - 6px)`;
                    const left = `calc(${(e.col || 0) * (100 / total)}% + 3px)`;
                    return (
                      <Box
                        key={idx}
                        sx={{
                          position: 'absolute',
                          top,
                          left,
                          width,
                          height,
                          bgcolor: 'rgba(3, 169, 244, 0.15)',
                          border: '1px solid rgba(3, 155, 229, 0.6)',
                          borderRadius: 1,
                          p: 0.5,
                          fontSize: 12,
                          overflow: 'hidden',
                        }}
                        title={e.title}
                      >
                        {e.title}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Stack>
  );
}
