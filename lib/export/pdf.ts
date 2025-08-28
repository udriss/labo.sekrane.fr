export interface PdfOptions {
  title?: string;
  fontFamily?: string;
  fontSize?: number; // px
  filename?: string; // default derived by caller
  tryEmbedFonts?: boolean; // attempt to embed fonts from /fonts
  embedFontPaths?: string[]; // explicit font paths to try
  orientation?: 'portrait' | 'landscape'; // PDF orientation
}

// Generate a real PDF file using jsPDF + AutoTable
export async function exportTablePDF<T>(
  rows: T[],
  columns: { header: string; exportValue: (row: T) => string | number | null | undefined }[],
  options: PdfOptions = {},
) {
  // Validate inputs
  if (!rows || !Array.isArray(rows)) {
    console.error('exportTablePDF: rows must be an array');
    throw new Error('Invalid rows data');
  }
  if (!columns || !Array.isArray(columns)) {
    console.error('exportTablePDF: columns must be an array');
    throw new Error('Invalid columns data');
  }

  const {
    title = 'Export',
    fontFamily = 'Helvetica',
    fontSize = 10,
    filename = 'export',
    tryEmbedFonts = true,
    embedFontPaths,
    orientation = 'landscape',
  } = options;

  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable: any = (autoTableModule as any).default || (autoTableModule as any).autoTable;

  const doc: any = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

  const family = String(fontFamily || '').toLowerCase();
  const coreFont = family.includes('courier')
    ? 'courier'
    : family.includes('times')
      ? 'times'
      : 'helvetica';
  doc.setFont(coreFont, 'normal');
  doc.setFontSize(fontSize + 2);
  try {
    doc.text(String(title), 40, 40);
  } catch {
    // If title draw fails due to font, fallback to core font and retry once
    try {
      doc.setFont(coreFont, 'normal');
      doc.text(String(title), 40, 40);
    } catch {}
  }

  // Use only core fonts to avoid jsPDF PubSub errors completely
  const activeFont = coreFont;

  // Treat incoming formula as LaTeX-like directly. If users pasted unicode digits,
  // we lightly normalize digits but do not auto-convert otherwise.
  const normalizeToLatex = (formula: string): string => {
    if (!formula) return formula;
    let result = formula;
    const unicodeSubToNormal: Record<string, string> = {
      '₀': '0',
      '₁': '1',
      '₂': '2',
      '₃': '3',
      '₄': '4',
      '₅': '5',
      '₆': '6',
      '₇': '7',
      '₈': '8',
      '₉': '9',
    };
    const unicodeSupToNormal: Record<string, string> = {
      '⁰': '0',
      '¹': '1',
      '²': '2',
      '³': '3',
      '⁴': '4',
      '⁵': '5',
      '⁶': '6',
      '⁷': '7',
      '⁸': '8',
      '⁹': '9',
      '⁺': '+',
      '⁻': '-',
    };
    Object.entries(unicodeSubToNormal).forEach(
      ([u, n]) => (result = result.replace(new RegExp(u, 'g'), n)),
    );
    Object.entries(unicodeSupToNormal).forEach(
      ([u, n]) => (result = result.replace(new RegExp(u, 'g'), n)),
    );
    return result;
  };

  // Safe text measurement with fallback
  const measure = (txt: string): number => {
    try {
      if (!txt) return 0;
      return doc.getTextWidth ? doc.getTextWidth(txt) : txt.length * (fontSize * 0.5);
    } catch {
      return (txt?.length || 0) * (fontSize * 0.5);
    }
  };

  // Parse LaTeX-style formula into renderable segments
  const parseLatexFormula = (
    formula: string,
  ): Array<{ text: string; type: 'normal' | 'subscript' | 'superscript' }> => {
    const segments: Array<{ text: string; type: 'normal' | 'subscript' | 'superscript' }> = [];
    let i = 0;

    while (i < formula.length) {
      if (formula[i] === '_' && i + 1 < formula.length && formula[i + 1] === '{') {
        // Subscript: _{...}
        let j = i + 2;
        let braceCount = 1;
        while (j < formula.length && braceCount > 0) {
          if (formula[j] === '{') braceCount++;
          if (formula[j] === '}') braceCount--;
          j++;
        }
        segments.push({ text: formula.slice(i + 2, j - 1), type: 'subscript' });
        i = j;
      } else if (formula[i] === '^' && i + 1 < formula.length && formula[i + 1] === '{') {
        // Superscript: ^{...}
        let j = i + 2;
        let braceCount = 1;
        while (j < formula.length && braceCount > 0) {
          if (formula[j] === '{') braceCount++;
          if (formula[j] === '}') braceCount--;
          j++;
        }
        segments.push({ text: formula.slice(i + 2, j - 1), type: 'superscript' });
        i = j;
      } else {
        // Normal text
        let j = i;
        while (j < formula.length && formula[j] !== '_' && formula[j] !== '^') {
          j++;
        }
        if (j > i) {
          segments.push({ text: formula.slice(i, j), type: 'normal' });
        }
        i = j;
      }
    }

    return segments;
  };

  const body = rows.map((r) =>
    columns.map((c) => {
      const v = c.exportValue(r);
      if (v == null) return '';
      if (typeof v !== 'string') return v as any;
      // Keep raw value; treat as LaTeX and render at paint time
      if (/formule|formula/i.test(c.header)) {
        return normalizeToLatex(v);
      }
      return v;
    }),
  );

  const sampleLimit = 200;
  const colWidths: Record<number, number> = {};
  const minWidths: Record<number, number> = {};
  const headerOnlyCols: Set<number> = new Set(); // columns that should fit header (Classe de danger, Localisation)
  const fitContentCols: Set<number> = new Set(); // columns that should fit content (Stock, Formule, d, M.M, CAS)

  // Utility to measure with a specific font size (restoring after)
  const getDocFontSize = () => {
    try {
      return doc.getFontSize ? doc.getFontSize() : fontSize;
    } catch {
      return fontSize;
    }
  };
  const measureWithSize = (txt: string, size: number): number => {
    const prev = getDocFontSize();
    try {
      if (doc.setFontSize) doc.setFontSize(size);
      return measure(txt.replace(/\n/g, ' '));
    } finally {
      try {
        if (doc.setFontSize) doc.setFontSize(prev);
      } catch {}
    }
  };

  // More accurate width estimation for a LaTeX-like chemical formula
  const measureFormula = (latex: string): number => {
    const segments = parseLatexFormula(latex || '');
    if (!segments.length) return measureWithSize(latex || '', fontSize);
    let total = 0;
    for (const seg of segments) {
      const size = seg.type === 'normal' ? fontSize : Math.max(6, Math.round(fontSize * 0.75));
      total += measureWithSize(seg.text, size);
    }
    // small padding
    return Math.ceil(total + 6);
  };

  // Determine column roles first
  const getIndex = (re: RegExp) => columns.findIndex((c) => re.test(c.header));
  const idxFormula = getIndex(/formule|formula/i);
  const idxDanger = getIndex(/classe.*danger|danger.*class/i);
  const idxMM = getIndex(/m\.m.*g\/mol/i);
  const idxStock = getIndex(/^stock$/i);
  const idxDensity = getIndex(/^d$/i);
  const idxCAS = getIndex(/^cas$/i);
  const idxLocalisation = getIndex(/localisation|location/i);

  if (idxStock >= 0) headerOnlyCols.add(idxStock);
  if (idxFormula >= 0) fitContentCols.add(idxFormula);
  if (idxDensity >= 0) fitContentCols.add(idxDensity);
  if (idxMM >= 0) fitContentCols.add(idxMM);
  if (idxCAS >= 0) fitContentCols.add(idxCAS);
  if (idxDanger >= 0) headerOnlyCols.add(idxDanger);
  if (idxLocalisation >= 0) headerOnlyCols.add(idxLocalisation);

  // Measure widths
  const DEFAULT_MIN = 40;
  const FORMULA_MIN = 60;
  const CAS_MIN = 70;

  columns.forEach((c, idx) => {
    const headerText = String(c.header);
    const headerW = measureWithSize(headerText, fontSize);

    // Fit-to-header columns (danger class, localisation): width = header + padding, body wraps
    if (headerOnlyCols.has(idx)) {
      const width = Math.ceil(headerW + 24); // small padding
      colWidths[idx] = width;
      minWidths[idx] = width; // hard min: never shrink below header
      return;
    }

    // Fit-to-content columns: Stock, Formule, d, M.M, CAS
    if (fitContentCols.has(idx)) {
      let maxContentW = headerW;
      const isFormula = idx === idxFormula;
      for (let r = 0; r < body.length && r < sampleLimit; r++) {
        const cellStr = String(body[r][idx] ?? '');
        const w = isFormula ? measureFormula(cellStr) : measureWithSize(cellStr, fontSize);
        if (w > maxContentW) maxContentW = w;
      }
      // extra padding; a bit more for formula to "let it breathe"
      const pad = isFormula ? 12 : 10;
      const base = Math.ceil(maxContentW + pad);
      const minBase = idx === idxFormula ? FORMULA_MIN : idx === idxCAS ? CAS_MIN : DEFAULT_MIN;
      colWidths[idx] = Math.max(minBase, base);
      minWidths[idx] = Math.max(minBase, Math.ceil(headerW + 8));
      return;
    }

    // Other columns: compute by content but apply a reasonable cap
    let maxW = headerW;
    for (let r = 0; r < body.length && r < sampleLimit; r++) {
      const w = measureWithSize(String(body[r][idx] ?? ''), fontSize);
      if (w > maxW) maxW = w;
    }
    const padded = Math.ceil(maxW + 10);
    const capped = Math.min(180, padded); // cap to avoid very wide text pushing others off-page
    colWidths[idx] = Math.max(DEFAULT_MIN, capped);
    minWidths[idx] = Math.max(DEFAULT_MIN, Math.ceil(headerW + 8));
  });

  const head = [columns.map((c) => c.header)];
  const formulaColIndex = columns.findIndex((c) => /formule|formula/i.test(c.header));
  const dangerClassColIndex = columns.findIndex((c) =>
    /classe.*danger|danger.*class/i.test(c.header),
  );
  const mmColIndex = columns.findIndex((c) => /m\.m.*g\/mol/i.test(c.header));
  const stockColIndex = columns.findIndex((c) => /^stock$/i.test(c.header));

  const pageWidth = doc.internal.pageSize.getWidth();
  const margins = 80; // 40 left + 40 right
  const available = pageWidth - margins;
  const totalDesired = Object.values(colWidths).reduce((a, b) => a + b, 0);
  if (totalDesired > available) {
    // Proportionally shrink columns, protecting header-only columns at their min widths
    let currentTotal = totalDesired;
    const shrinkable: number[] = [];
    let shrinkableExtra = 0;
    for (const [k, w] of Object.entries(colWidths)) {
      const idx = Number(k);
      const minW = Math.max(
        minWidths[idx] || DEFAULT_MIN,
        headerOnlyCols.has(idx) ? colWidths[idx] : DEFAULT_MIN,
      );
      const extra = Math.max(0, w - minW);
      if (extra > 0) {
        shrinkable.push(idx);
        shrinkableExtra += extra;
      }
    }
    const needReduce = currentTotal - available;
    if (shrinkableExtra > 0) {
      const factor = Math.min(1, needReduce / shrinkableExtra);
      for (const idx of shrinkable) {
        const minW = Math.max(
          minWidths[idx] || DEFAULT_MIN,
          headerOnlyCols.has(idx) ? colWidths[idx] : DEFAULT_MIN,
        );
        const extra = Math.max(0, colWidths[idx] - minW);
        const reduceBy = Math.floor(extra * factor);
        colWidths[idx] = Math.max(minW, colWidths[idx] - reduceBy);
      }
    }
    // If still too wide (e.g., headers alone exceed available), final clamp to distribute
    const afterTotal = Object.values(colWidths).reduce((a, b) => a + b, 0);
    if (afterTotal > available) {
      const ratio = available / afterTotal;
      Object.keys(colWidths).forEach((k) => {
        const idx = Number(k);
        const minW = minWidths[idx] || DEFAULT_MIN;
        colWidths[idx] = Math.max(minW, Math.floor(colWidths[idx] * ratio));
      });
    }
  }

  // Recompute total after scaling/constraints
  const finalTotalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

  const tableConfig: any = {
    head,
    body,
    startY: 60,
    styles: { font: activeFont, fontSize },
    headStyles: { fillColor: [245, 245, 245], textColor: 20 },
    theme: 'grid',
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    // Lock table width to available page width to ensure no columns overflow the page
    tableWidth: Math.min(available, finalTotalWidth, available),
    columnStyles: Object.fromEntries(
      Object.entries(colWidths).map(([k, w]) => {
        const colIndex = Number(k);
        const style: any = { cellWidth: w };

        // Enable text wrapping for specific columns but keep headers on one line
        if (colIndex === dangerClassColIndex || colIndex === idxLocalisation) {
          style.cellWidth = w;
          style.overflow = 'linebreak';
          style.columnWidth = 'wrap';
        }

        return [colIndex, style];
      }),
    ),
    ...(formulaColIndex >= 0 || dangerClassColIndex >= 0 || mmColIndex >= 0 || stockColIndex >= 0
      ? {
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === formulaColIndex) {
              // Clear textual content; we will paint formula manually with baseline shifts
              data.cell.text = [''];
            }

            // Enable text wrapping for specific columns - but only for body, not headers
            if (
              data.section === 'body' &&
              (data.column.index === dangerClassColIndex || data.column.index === idxLocalisation)
            ) {
              data.cell.styles.overflow = 'linebreak';
              data.cell.styles.cellWidth = colWidths[data.column.index];
            }

            // Prevent header wrapping for these columns
            if (
              data.section === 'head' &&
              (data.column.index === dangerClassColIndex || data.column.index === idxLocalisation)
            ) {
              data.cell.styles.overflow = 'hidden'; // Force single line for headers
            }
          },
          didDrawCell: (data: any) => {
            // Only handle formula column for custom drawing
            if (
              data.section !== 'body' ||
              data.column.index !== formulaColIndex ||
              formulaColIndex < 0
            )
              return;

            try {
              const raw = rows[data.row.index] as T;
              const col = columns[formulaColIndex];
              const originalFormula = String(col.exportValue(raw) ?? '');
              const latexFormula = normalizeToLatex(originalFormula);
              const segments = parseLatexFormula(latexFormula);

              if (!segments.length) return;

              const cell = data.cell || {};
              const xBase = cell.x || 0;
              const yBase = cell.y || 0;
              const cellHeight = cell.height || 20;

              // Calculate vertical center for baseline
              const yCenter = yBase + cellHeight / 2;

              let x = xBase + 4; // Small left padding
              const normalSize = Math.min(fontSize, 10); // Cap at 10pt for safety
              const subSupSize = Math.max(6, Math.round(normalSize * 0.75));

              // Set safe text color and font
              doc.setTextColor(0, 0, 0);
              doc.setFont(activeFont, 'normal');

              for (const segment of segments) {
                if (!segment.text) continue;

                let currentSize = normalSize;
                let yOffset = yCenter;

                if (segment.type === 'subscript') {
                  currentSize = subSupSize;
                  yOffset = yCenter + 3; // Move down for subscript
                } else if (segment.type === 'superscript') {
                  currentSize = subSupSize;
                  yOffset = yCenter - 3; // Move up for superscript
                }

                doc.setFontSize(currentSize);

                // Simple text draw without options to avoid jsPDF errors
                doc.text(segment.text, x, yOffset);

                // Calculate width for next segment position
                let segmentWidth = segment.text.length * (currentSize * 0.6);
                try {
                  if (doc.getTextWidth) {
                    segmentWidth = doc.getTextWidth(segment.text);
                  }
                } catch {
                  // Keep fallback width
                }

                x += segmentWidth;
              }

              // Restore normal font size
              doc.setFontSize(fontSize);
            } catch (error) {
              // If formula rendering fails, just skip it silently
              console.warn('Formula rendering error:', error);
            }
          },
        }
      : {}),
    didDrawPage: (data: any) => {
      // Add page footer with pagination placeholder and date
      const totalPagesExp = '{total_pages_count_string}';
      const pageNum = data.pageNumber || 1;

      // Get current date in French format
      const currentDate = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Footer positioning
      const pageH = doc.internal.pageSize.getHeight();
      const footerY = pageH - 20;

      // Set footer font
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100); // Gray color

      // Left: Date
      doc.text(`Généré le ${currentDate}`, 40, footerY);

      // Right: Pagination with total pages placeholder
      const paginationText = `Page ${pageNum} sur ${totalPagesExp}`;
      const textWidth = doc.getTextWidth(paginationText);
      const pageW = doc.internal.pageSize.getWidth();
      doc.text(paginationText, pageW - textWidth - 40, footerY);

      // Reset to normal color
      doc.setTextColor(0, 0, 0);
    },
  };

  try {
    autoTable(doc, tableConfig);
  } catch (e) {
    // fallback to core font and simplified table
    doc.setFont(coreFont, 'normal');
    tableConfig.styles.font = coreFont;
    delete tableConfig.didParseCell;
    delete tableConfig.didDrawCell;
    autoTable(doc, tableConfig);
  }

  // Replace total pages placeholder after table has been fully rendered
  try {
    if (typeof (doc as any).putTotalPages === 'function') {
      (doc as any).putTotalPages('{total_pages_count_string}');
    }
  } catch {}

  const safeFilename = typeof filename === 'string' ? filename : 'export';
  const outName =
    safeFilename && safeFilename.endsWith('.pdf') ? safeFilename : `${safeFilename}.pdf`;
  doc.save(outName);
}
