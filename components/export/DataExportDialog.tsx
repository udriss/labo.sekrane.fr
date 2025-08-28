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
  MenuItem,
} from '@mui/material';
import ExportFormatOptions from './ExportFormatOptions';
import DataPreviewTable from './DataPreviewTable';
import type { Column, ExportFormat, FontOptions } from '@/types/export';
import { toCSV, downloadCSV } from '@/lib/export/csv';
import { downloadXLSX } from '@/lib/export/xlsx';
import { exportTablePDF } from '@/lib/export/pdf';

interface DataExportDialogProps<T> {
  open: boolean;
  title: string;
  rows: T[];
  columns: Column<T>[];
  filename: string; // base filename without extension
  onClose: () => void;
}

const FONT_FAMILIES = [
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  'Roboto, sans-serif',
  'Times New Roman, Times, serif',
  'Georgia, serif',
  'Courier New, Courier, monospace',
  'Monaco, Menlo, Consolas, monospace',
];

export function DataExportDialog<T>({
  open,
  title,
  rows,
  columns,
  filename,
  onClose,
}: DataExportDialogProps<T>) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [font, setFont] = useState<FontOptions>({ fontFamily: 'Roboto, sans-serif', fontSize: 12 });

  const flatColumns = useMemo(
    () => columns.map((c) => ({ header: c.header, exportValue: c.exportValue })),
    [columns],
  );

  const handleExport = async () => {
    if (exportFormat === 'csv') {
      const csv = toCSV(rows, flatColumns);
      downloadCSV(filename.endsWith('.csv') ? filename : `${filename}.csv`, csv);
      return;
    }
    if (exportFormat === 'xlsx') {
      await downloadXLSX(filename, rows, flatColumns as any);
      return;
    }
    // pdf
    await exportTablePDF(rows, flatColumns, {
      title,
      fontFamily: font.fontFamily,
      fontSize: font.fontSize,
      filename: `${filename}.pdf`,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Police"
              value={font.fontFamily}
              onChange={(e) => setFont((f) => ({ ...f, fontFamily: e.target.value }))}
              size="small"
              sx={{ minWidth: 220 }}
            >
              {FONT_FAMILIES.map((f) => (
                <MenuItem key={f} value={f} sx={{ fontFamily: f }}>
                  {f.split(',')[0]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Taille de police"
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
              sx={{ width: 160 }}
            />
          </Stack>
          <DataPreviewTable rows={rows} columns={columns} font={font} />
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

export default DataExportDialog;
