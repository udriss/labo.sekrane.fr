// Proper XLSX export using ExcelJS (dynamically imported to keep bundle lean)
export async function downloadXLSX<T>(
  filename: string,
  rows: T[],
  columns: {
    header: string;
    exportValue: (row: T) => string | number | null | undefined;
    getCellStyle?: (row: T) => { fg?: string; bg?: string; bold?: boolean; italic?: boolean };
  }[],
) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LaboApp';
  wb.created = new Date();

  // Add current date to worksheet name
  const currentDate = new Date()
    .toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(/\//g, '-'); // Replace / with - for valid worksheet name

  const ws = wb.addWorksheet(`Export ${currentDate}`, { views: [{ state: 'frozen', ySplit: 1 }] });

  // Define columns
  ws.columns = columns.map((c) => ({ header: c.header, key: c.header, width: 20 }));

  // Add rows
  for (const r of rows) {
    const rowValues: Record<string, any> = {};
    columns.forEach((c) => {
      rowValues[c.header] = c.exportValue(r) ?? '';
    });
    const added = ws.addRow(rowValues);
    // Apply optional styles
    columns.forEach((c, idx) => {
      const style = c.getCellStyle?.(r);
      if (!style) return;
      const cell = added.getCell(idx + 1);
      if (style.bold || style.italic) {
        cell.font = { ...(cell.font || {}), bold: !!style.bold, italic: !!style.italic };
      }
      if (style.bg) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: cssHexToARGB(style.bg) },
        };
      }
      if (style.fg) {
        cell.font = { ...(cell.font || {}), color: { argb: cssHexToARGB(style.fg) } };
      }
    });
  }

  // Header styling
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { horizontal: 'center', vertical: 'middle' };

  // Page setup landscape
  ws.pageSetup = { orientation: 'landscape' } as any;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function cssHexToARGB(hex: string): string {
  // Accepts formats like #RRGGBB or #AARRGGBB; defaults to FF alpha
  const v = hex.replace('#', '').trim();
  if (v.length === 8) return v.toUpperCase();
  if (v.length === 6) return `FF${v.toUpperCase()}`;
  // Fallback gray
  return 'FFCCCCCC';
}
