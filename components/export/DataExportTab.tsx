// components/export/DataExportTab.tsx

'use client';
import React, { useMemo, useState } from 'react';
import {
  Stack,
  TextField,
  MenuItem,
  Divider,
  Typography,
  Paper,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { toggleButtonClasses } from '@mui/material/ToggleButton';
import { toggleButtonGroupClasses } from '@mui/material/ToggleButtonGroup';
import DataPreviewTable from './DataPreviewTable';
import ExportFormatOptions from './ExportFormatOptions';
import type { Column, ExportFormat, FontOptions } from '@/types/export';
import { toCSV, downloadCSV } from '@/lib/export/csv';
import { downloadXLSX } from '@/lib/export/xlsx';
import { exportTablePDF } from '@/lib/export/pdf';

interface DataExportTabProps<T> {
  title: string;
  rows: T[];
  columns: Column<T>[];
  filename: string;
  defaultSelected?: string[]; // optional preselection of column ids
}

export default function DataExportTab<T>({
  title,
  rows,
  columns,
  filename,
  defaultSelected,
  defaultOrientation = 'landscape', // Add default orientation prop
}: DataExportTabProps<T> & { defaultOrientation?: 'portrait' | 'landscape' }) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [font, setFont] = useState<FontOptions>({ fontFamily: 'Roboto, sans-serif', fontSize: 12 });
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(defaultOrientation);
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        defaultSelected && defaultSelected.length ? defaultSelected : columns.map((c) => c.id),
      ),
  );
  // Default sort: first column that is selected
  const initialSort = useMemo(() => {
    const sel = new Set(
      defaultSelected && defaultSelected.length ? defaultSelected : columns.map((c) => c.id),
    );
    const first = columns.find((c) => sel.has(c.id));
    return first?.id || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sortBy, setSortBy] = useState<string | null>(initialSort);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  const visibleColumns = useMemo(
    () => columns.filter((c) => selected.has(c.id)),
    [columns, selected],
  );

  // Apply sorting based on selected column
  const sortedRows = useMemo(() => {
    if (!sortBy) return rows;
    const col = visibleColumns.find((c) => c.id === sortBy);
    if (!col) return rows;
    const extractor = (r: T) => col.exportValue(r);
    // Stable sort: pair with original index
    const withIndex = rows.map((r, i) => ({ r, i }));
    const cmp = (a: any, b: any) => {
      const va = extractor(a.r);
      const vb = extractor(b.r);
      if (va == null && vb == null) return a.i - b.i;
      if (va == null) return 1; // nulls last
      if (vb == null) return -1;
      // numeric vs string compare
      const na =
        typeof va === 'number' ? va : Number.isFinite(Number(va)) && va !== '' ? Number(va) : null;
      const nb =
        typeof vb === 'number' ? vb : Number.isFinite(Number(vb)) && vb !== '' ? Number(vb) : null;
      if (na !== null && nb !== null) {
        const diff = na - nb;
        return diff !== 0 ? diff : a.i - b.i;
      }
      const sa = String(va).toLocaleLowerCase();
      const sb = String(vb).toLocaleLowerCase();
      const diff = sa.localeCompare(sb);
      return diff !== 0 ? diff : a.i - b.i;
    };
    withIndex.sort((a, b) => (sortDir === 'asc' ? cmp(a, b) : -cmp(a, b)));
    return withIndex.map((x) => x.r);
  }, [rows, visibleColumns, sortBy, sortDir]);

  const handleHeaderSort = (id: string) => {
    if (sortBy === id) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(id);
      setSortDir('asc');
    }
  };

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulk = (action: 'all' | 'none') => {
    setSelected(action === 'all' ? new Set(columns.map((c) => c.id)) : new Set());
  };

  const StyledToggleButtonGroup = useMemo(
    () =>
      styled(ToggleButtonGroup)(({ theme }) => ({
        gap: theme.spacing(1),
        [`& .${toggleButtonGroupClasses.firstButton}, & .${toggleButtonGroupClasses.middleButton}`]:
          {
            borderTopRightRadius: (theme.vars || theme).shape.borderRadius,
            borderBottomRightRadius: (theme.vars || theme).shape.borderRadius,
          },
        [`& .${toggleButtonGroupClasses.lastButton}, & .${toggleButtonGroupClasses.middleButton}`]:
          {
            borderTopLeftRadius: (theme.vars || theme).shape.borderRadius,
            borderBottomLeftRadius: (theme.vars || theme).shape.borderRadius,
            borderLeft: `1px solid ${(theme.vars || theme).palette.divider}`,
          },
        // Ensure a visible divider between two adjacent selected buttons (override default transparent border)
        [`& .${toggleButtonGroupClasses.grouped}.Mui-selected + .${toggleButtonGroupClasses.grouped}.Mui-selected`]:
          {
            borderLeft: `1px solid ${(theme.vars || theme).palette.divider} !important`,
            marginLeft: 0,
          },
        [`& .${toggleButtonGroupClasses.lastButton}.${toggleButtonClasses.disabled}, & .${toggleButtonGroupClasses.middleButton}.${toggleButtonClasses.disabled}`]:
          {
            borderLeft: `1px solid ${(theme.vars || theme).palette.action.disabledBackground}`,
          },
      })),
    [],
  );

  const handleExport = () => {
    console.log('handleExport called with:', {
      exportFormat,
      sortedRows: sortedRows.length,
      visibleColumns: visibleColumns.length,
      filename,
    });

    if (exportFormat === 'csv') {
      const data = toCSV(sortedRows, visibleColumns, ',');
      downloadCSV(data, `${filename}.csv`);
    } else if (exportFormat === 'xlsx') {
      downloadXLSX(filename, sortedRows, visibleColumns);
    } else if (exportFormat === 'pdf') {
      console.log('Starting PDF export with:', {
        title,
        filename,
        rowCount: sortedRows.length,
        columnCount: visibleColumns.length,
        orientation,
      });
      try {
        exportTablePDF(sortedRows, visibleColumns, {
          title,
          filename,
          fontFamily: font.fontFamily,
          fontSize: font.fontSize,
          orientation,
        });
      } catch (error) {
        console.error('PDF export error:', error);
        alert(`Erreur lors de l'export PDF: ${error}`);
      }
    }
  };

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <ExportFormatOptions
        exportFormat={exportFormat}
        setExportFormat={setExportFormat}
        onExport={handleExport}
      />

      {/* Section: Options d'export */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
          Polices et tailles
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
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
            slotProps={{ htmlInput: { min: 8, max: 24 } }}
            value={font.fontSize}
            onChange={(e) =>
              setFont((f) => ({
                ...f,
                fontSize: Math.max(8, Math.min(24, Number(e.target.value) || 12)),
              }))
            }
            sx={{ width: 160 }}
          />

          {exportFormat === 'pdf' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 80 }}>
                Orientation:
              </Typography>
              <ToggleButtonGroup
                value={orientation}
                exclusive
                onChange={(_, value) => {
                  if (value) setOrientation(value);
                }}
                size="small"
                aria-label="orientation"
              >
                <ToggleButton value="portrait" aria-label="portrait">
                  Portrait
                </ToggleButton>
                <ToggleButton value="landscape" aria-label="paysage">
                  Paysage
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Section: Colonnes */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
          Colonnes
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'column' } }}>
          <Box sx={{ minWidth: 240 }}>
            <Stack
              sx={{
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flexDirection: 'row',
                gap: 2,
              }}
            >
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => handleBulk('all')}>
                  Tout sélectionner
                </Button>
                <Button size="small" onClick={() => handleBulk('none')}>
                  Aucun
                </Button>
              </Stack>
            </Stack>
            <StyledToggleButtonGroup
              value={Array.from(selected)}
              onChange={(_, val: string[]) => setSelected(new Set(val))}
              aria-label="Colonnes"
              sx={{ display: 'flex', flexWrap: 'wrap' }}
            >
              {columns.map((c) => (
                <ToggleButton
                  key={c.id}
                  value={c.id}
                  size="small"
                  aria-label={String(c.header)}
                  sx={
                    c.header === 'd' || c.header === 'M.M (g/mol)'
                      ? { textTransform: 'none' }
                      : { textTransform: 'uppercase' }
                  }
                >
                  {c.header}
                </ToggleButton>
              ))}
            </StyledToggleButtonGroup>
          </Box>
        </Box>
      </Paper>

      {/* Section: Aperçu */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
          Aperçu ({visibleColumns.length} colonnes)
        </Typography>
        <DataPreviewTable
          rows={sortedRows}
          columns={visibleColumns}
          font={font}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleHeaderSort}
        />
      </Paper>
    </Stack>
  );
}
