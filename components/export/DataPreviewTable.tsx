'use client';
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Typography,
  TableSortLabel,
} from '@mui/material';
import type { Column, FontOptions } from '@/types/export';

interface DataPreviewTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  maxRows?: number;
  font: FontOptions;
  sortBy?: string | null;
  sortDir?: 'asc' | 'desc';
  onSort?: (id: string) => void;
}

export function DataPreviewTable<T>({
  rows,
  columns,
  maxRows = 12,
  font,
  sortBy,
  sortDir = 'asc',
  onSort,
}: DataPreviewTableProps<T>) {
  // Fallback: if sortBy is not provided, show the first column as sorted asc (visual only).
  const effectiveSortBy = sortBy ?? (columns.length ? columns[0].id : undefined);
  const previewRows = rows.slice(0, maxRows);
  const minWidthFor = (header: React.ReactNode, id?: string) => {
    const h = typeof header === 'string' ? header.toLowerCase() : '';
    const mapping: Array<{ match: (s: string) => boolean; px: number }> = [
      { match: (s) => /localisation|location/.test(s), px: 200 },
      { match: (s) => /nom|name/.test(s), px: 180 },
      { match: (s) => /cat[ée]gor/i.test(s), px: 160 },
    ];
    for (const m of mapping) if (m.match(h)) return m.px;
    // fallback by id when headers vary
    if (id) {
      const lid = id.toLowerCase();
      if (/(loc|location)/.test(lid)) return 200;
      if (/(name|nom)/.test(lid)) return 180;
      if (/cat/.test(lid)) return 160;
    }
    return undefined;
  };
  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table
        size="small"
        sx={{
          tableLayout: 'fixed',
          width: 'max-content',
          fontFamily: font.fontFamily,
          fontSize: font.fontSize,
        }}
      >
        <TableHead>
          <TableRow>
            {columns.map((c) => {
              const isSorted = effectiveSortBy === c.id;
              return (
                <TableCell
                  key={c.id}
                  sx={{
                    fontWeight: 700,
                    cursor: onSort ? 'pointer' : 'default',
                    userSelect: 'none',
                    minWidth: minWidthFor(c.header, c.id),
                    width: minWidthFor(c.header, c.id),
                    whiteSpace: 'nowrap',
                  }}
                  align={(c.align as any) || 'left'}
                  title={onSort ? 'Cliquer pour trier' : undefined}
                >
                  {onSort ? (
                    <TableSortLabel
                      active={isSorted}
                      direction={isSorted ? sortDir : 'asc'}
                      onClick={() => onSort(c.id)}
                    >
                      {c.header}
                    </TableSortLabel>
                  ) : (
                    c.header
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {previewRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                <Typography variant="body2" color="text.secondary">
                  Aucune donnée
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            previewRows.map((r, idx) => (
              <TableRow key={idx} hover>
                {columns.map((c) => (
                  <TableCell
                    key={c.id}
                    align={(c.align as any) || 'left'}
                    sx={{
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      minWidth: minWidthFor(c.header, c.id),
                      width: minWidthFor(c.header, c.id),
                    }}
                  >
                    {c.cell(r) as any}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default DataPreviewTable;
