export function toCSV<T>(
  rows: T[],
  columns: { header: string; exportValue: (row: T) => string | number | null | undefined }[],
  separator = ',',
): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes('"')) return '"' + str.replace(/"/g, '""') + '"';
    if (str.includes(separator) || /[\n\r]/.test(str)) return '"' + str + '"';
    return str;
  };
  const header = columns.map((c) => escape(c.header)).join(separator);
  const lines = rows.map((r) => columns.map((c) => escape(c.exportValue(r))).join(separator));
  return [header, ...lines].join('\n');
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
