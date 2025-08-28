import type { ReactNode } from 'react';
// types/export.ts
export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

export interface FontOptions {
  fontFamily: string;
  fontSize: number; // in px
}

export interface Column<T> {
  id: string;
  header: string;
  width?: number; // approximate px width for preview
  align?: 'left' | 'center' | 'right';
  // Render cell for preview
  cell: (row: T) => string | number | ReactNode;
  // Value used for CSV/XLSX export
  exportValue: (row: T) => string | number | null | undefined;
  // Optional style for preview and for xlsx (limited)
  getCellStyle?: (row: T) => { fg?: string; bg?: string; bold?: boolean; italic?: boolean };
}
