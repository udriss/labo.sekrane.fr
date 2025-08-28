'use client';

// Client-side utility to build an Event PDF and append attachments (PDFs, images, docx/txt best-effort)
// Dependencies: jsPDF, jspdf-autotable, pdf-lib, mammoth (for DOCX to HTML)

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';

type AnyMap = Record<number, string>;

export interface BuildEventPdfOptions {
  event: any;
  salleMap: AnyMap;
  classMap: AnyMap;
  timeslotsLabel?: string;
}

const SMALL_MARGIN = 8; // mm (petites marges)
const LINE_HEIGHT = 6; // mm

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const parseIds = (raw: any): number[] => {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'number');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'number');
    } catch {}
  }
  return [];
};

const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  let s = String(v);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const [date, time] = s.split('T');
    const [Y, M, D] = date.split('-').map(Number);
    const [h, m] = time.split(':').map(Number);
    return new Date(Y, (M as any) - 1, D, h, m, 0, 0);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const fmtDate = (v: any): string => {
  const d = toDate(v);
  if (!d) return '';
  return d.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildDownloadUrl = (rawUrl: string) => {
  if (!rawUrl) return rawUrl;
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    const enc = encodeURIComponent(rawUrl);
    return `/api/documents/proxy?fileUrl=${enc}`;
  }
  return rawUrl;
};

const arrayBufferFromBlob = (blob: Blob) => blob.arrayBuffer();

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const splitTextToSize = (doc: jsPDF, text: string, maxWidth: number) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  return Array.isArray(lines) ? lines : [String(lines)];
};

export async function buildAndDownloadEventPdf(opts: BuildEventPdfOptions) {
  if (!isBrowser()) return;

  const { event, salleMap, classMap, timeslotsLabel } = opts;
  // Prepare data
  const salleIds = parseIds(event.salleIds);
  const classIds = parseIds(event.classIds);
  const ownerName = event?.owner?.name || '—';
  const discipline = event?.discipline || '—';
  const title = event?.title || '';
  const createdAt = fmtDate(event?.createdAt);
  const updatedAt = fmtDate(event?.updatedAt);

  const materiels: any[] = [...(event.materiels || [])];
  const customMats: any[] = [...(event.customMaterielRequests || [])];
  const reactifs: any[] = [...(event.reactifs || [])];
  const customChems: any[] = [...(event.customReactifRequests || [])];
  const documents: any[] = [...(event.documents || [])];

  // 1) Build the base PDF with jsPDF (A4 portrait)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * SMALL_MARGIN;
  let y = SMALL_MARGIN;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Fiche événement', SMALL_MARGIN, y);
  y += LINE_HEIGHT + 2;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const headerLines = [
    `Propriétaire: ${ownerName}`,
    `Discipline: ${discipline}`,
    title ? `Titre: ${title}` : 'Titre: (aucun)',
  ];
  headerLines.forEach((line) => {
    doc.text(line, SMALL_MARGIN, y);
    y += LINE_HEIGHT;
  });
  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.text(`Créé le ${createdAt} • Modifié le ${updatedAt}`, SMALL_MARGIN, y);
  doc.setTextColor(0);
  y += LINE_HEIGHT + 2;

  // Slots section
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Créneaux', SMALL_MARGIN, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  if (timeslotsLabel) {
    const lines = splitTextToSize(doc, timeslotsLabel, contentWidth);
    lines.forEach((l) => {
      if (y > 287) {
        doc.addPage();
        y = SMALL_MARGIN;
      }
      doc.text(l, SMALL_MARGIN, y);
      y += LINE_HEIGHT;
    });
  }

  // List each slot briefly
  const slots: any[] = Array.isArray(event.timeslots) ? event.timeslots : [];
  slots.forEach((s) => {
    const parts: string[] = [];
    if (s.timeslotDate) parts.push(String(s.timeslotDate));
    if (s.startDate || s.endDate)
      parts.push([fmtDate(s.startDate), fmtDate(s.endDate)].filter(Boolean).join(' → '));
    const sSalle =
      Array.isArray(s.salleIds) && s.salleIds.length
        ? `Salles: ${s.salleIds.map((id: number) => salleMap[id] || `Salle ${id}`).join(', ')}`
        : '';
    const sClass =
      Array.isArray(s.classIds) && s.classIds.length
        ? `Classes: ${s.classIds.map((id: number) => classMap[id] || `Classe ${id}`).join(', ')}`
        : '';
    const info = [parts.join(' • '), sSalle, sClass].filter(Boolean).join(' | ');
    const lines = splitTextToSize(doc, `• ${info}`, contentWidth);
    lines.forEach((l) => {
      if (y > 287) {
        doc.addPage();
        y = SMALL_MARGIN;
      }
      doc.text(l, SMALL_MARGIN, y);
      y += LINE_HEIGHT;
    });
  });
  y += 2;

  // Salles & Classes section (like chips)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  if (y > 285) {
    doc.addPage();
    y = SMALL_MARGIN;
  }
  doc.text('Salles', SMALL_MARGIN, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  const sallesText = salleIds.length
    ? salleIds.map((id) => salleMap[id] || `Salle ${id}`).join(', ')
    : 'Pas de salle';
  splitTextToSize(doc, sallesText, contentWidth).forEach((l) => {
    if (y > 287) {
      doc.addPage();
      y = SMALL_MARGIN;
    }
    doc.text(l, SMALL_MARGIN, y);
    y += LINE_HEIGHT;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  if (y > 285) {
    doc.addPage();
    y = SMALL_MARGIN;
  }
  doc.text('Classes', SMALL_MARGIN, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  const classesText = classIds.length
    ? classIds.map((id) => classMap[id] || `Classe ${id}`).join(', ')
    : 'Pas de classe';
  splitTextToSize(doc, classesText, contentWidth).forEach((l) => {
    if (y > 287) {
      doc.addPage();
      y = SMALL_MARGIN;
    }
    doc.text(l, SMALL_MARGIN, y);
    y += LINE_HEIGHT;
  });

  // Matériel / Réactifs tables (only if provided)
  const hasMaterials = materiels.length + customMats.length > 0;
  const hasChemicals = reactifs.length + customChems.length > 0;
  if (hasMaterials || hasChemicals) {
    if (y > 270) {
      doc.addPage();
      y = SMALL_MARGIN;
    }
    // Matériel
    if (hasMaterials) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Matériel', SMALL_MARGIN, y);
      y += LINE_HEIGHT;
      const rows: Array<[string, string]> = [];
      materiels.forEach((m: any) =>
        rows.push([String(m.materielName || m.name || '—'), String(m.quantity ?? '—')]),
      );
      customMats.forEach((m: any) =>
        rows.push([`${m.name || '—'} (PERSO)`, String(m.quantity ?? '—')]),
      );
      (doc as any).autoTable({
        startY: y,
        margin: { left: SMALL_MARGIN, right: SMALL_MARGIN },
        styles: { fontSize: 10 },
        head: [['Type / Nom', 'Quantité']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }
    // Réactifs (chimie)
    if (hasChemicals) {
      if (y > 270) {
        doc.addPage();
        y = SMALL_MARGIN;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Réactifs chimiques', SMALL_MARGIN, y);
      y += LINE_HEIGHT;
      const rows: Array<[string, string]> = [];
      reactifs.forEach((r: any) =>
        rows.push([
          String(r.reactifName || r.name || '—'),
          `${r.requestedQuantity ?? '—'} ${r.unit || ''}`.trim(),
        ]),
      );
      customChems.forEach((r: any) =>
        rows.push([
          `${r.name || '—'} (PERSO)`,
          `${r.requestedQuantity ?? '—'} ${r.unit || ''}`.trim(),
        ]),
      );
      (doc as any).autoTable({
        startY: y,
        margin: { left: SMALL_MARGIN, right: SMALL_MARGIN },
        styles: { fontSize: 10 },
        head: [['Nom', 'Quantité']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }
  }

  // 2) Append attachments that we can render directly in jsPDF: images, DOCX (via mammoth -> HTML), TXT
  // PDFs will be merged in a separate step with pdf-lib after exporting jsPDF to ArrayBuffer

  const imgExt = ['png', 'jpg', 'jpeg', 'webp'];
  const isImage = (mime: string, name: string) =>
    mime.startsWith('image/') || imgExt.some((e) => name.toLowerCase().endsWith(`.${e}`));
  const isPdf = (mime: string, name: string) =>
    mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
  const isDocx = (mime: string, name: string) =>
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.toLowerCase().endsWith('.docx');
  const isTxt = (mime: string, name: string) =>
    mime.startsWith('text/') || name.toLowerCase().endsWith('.txt');
  const isOdtOrDoc = (mime: string, name: string) =>
    name.toLowerCase().endsWith('.odt') ||
    name.toLowerCase().endsWith('.doc') ||
    mime === 'application/vnd.oasis.opendocument.text' ||
    mime === 'application/msword';

  const pdfAttachments: Array<{ name: string; ab: ArrayBuffer }> = [];

  // Render section title for attachments once if any
  if (documents.length) {
    if (y > 270) {
      doc.addPage();
      y = SMALL_MARGIN;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Documents joints', SMALL_MARGIN, y);
    y += LINE_HEIGHT;
  }

  for (const d of documents) {
    const name: string = d.fileName || 'Document';
    const type: string = d.fileType || '';
    const url = buildDownloadUrl(d.fileUrl);
    if (!url) continue;
    let blob: Blob | null = null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch doc failed');
      blob = await res.blob();
    } catch (e) {
      // Skip on error but leave a note
      if (y > 287) {
        doc.addPage();
        y = SMALL_MARGIN;
      }
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text(`Document non disponible: ${name}`, SMALL_MARGIN, y);
      doc.setFont('helvetica', 'normal');
      y += LINE_HEIGHT;
      continue;
    }

    if (isPdf(type, name)) {
      const ab = await arrayBufferFromBlob(blob);
      pdfAttachments.push({ name, ab });
      // Add a small line in the index
      if (y > 287) {
        doc.addPage();
        y = SMALL_MARGIN;
      }
      doc.setFontSize(10);
      doc.text(`• PDF: ${name}`, SMALL_MARGIN, y);
      y += LINE_HEIGHT;
      continue;
    }

    if (isImage(type, name)) {
      // Add a dedicated page with centered image
      const dataUrl = await blobToDataUrl(blob);
      doc.addPage();
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      // Estimate image size by creating an Image
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      // Fit into page with small margins
      const maxW = pw - 2 * SMALL_MARGIN;
      const maxH = ph - 2 * SMALL_MARGIN;
      const ratio = Math.min(maxW / iw, maxH / ih);
      const w = Math.max(10, iw * ratio);
      const h = Math.max(10, ih * ratio);
      const x = (pw - w) / 2;
      const yy = (ph - h) / 2;
      doc.addImage(dataUrl, undefined as any, x, yy, w, h);
      // Add caption
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(name, SMALL_MARGIN, ph - 4);
      doc.setFont('helvetica', 'normal');
      // Reset y to bottom so next text forces a new page if needed
      y = ph - SMALL_MARGIN;
      continue;
    }

    if (isDocx(type, name)) {
      // Convert DOCX -> HTML via mammoth, then render HTML into PDF
      try {
        // Try browser build first, fallback to main entry
        let mammothMod: any;
        try {
          mammothMod = await import('mammoth/mammoth.browser');
        } catch {
          mammothMod = await import('mammoth');
        }
        const mammoth: any = mammothMod?.default || mammothMod;
        const ab = await arrayBufferFromBlob(blob);
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer: ab });
        // Render HTML in a fresh page to keep layout clear
        doc.addPage();
        const container = document.createElement('div');
        container.style.width = `${contentWidth}mm`;
        container.innerHTML = `<div style="font-family: Helvetica, Arial, sans-serif; font-size: 11px;">${html}</div>`;
        if (typeof (doc as any).html === 'function') {
          await (doc as any).html(container, {
            x: SMALL_MARGIN,
            y: SMALL_MARGIN,
            width: contentWidth,
            windowWidth: 800,
          });
        } else {
          // Fallback: strip tags and render as plain text
          const text = container.textContent || container.innerText || '';
          const lines = splitTextToSize(doc, text, contentWidth);
          let yy = SMALL_MARGIN;
          for (const l of lines) {
            if (yy > 287) {
              doc.addPage();
              yy = SMALL_MARGIN;
            }
            doc.text(l, SMALL_MARGIN, yy);
            yy += LINE_HEIGHT;
          }
        }
        // Footer name
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(name, SMALL_MARGIN, doc.internal.pageSize.getHeight() - 4);
        doc.setFont('helvetica', 'normal');
        y = doc.internal.pageSize.getHeight() - SMALL_MARGIN;
      } catch (e) {
        if (y > 287) {
          doc.addPage();
          y = SMALL_MARGIN;
        }
        doc.setFontSize(10);
        doc.text(`• DOCX non convertible (${name})`, SMALL_MARGIN, y);
        y += LINE_HEIGHT;
      }
      continue;
    }

    if (isTxt(type, name)) {
      try {
        const text = await blob.text();
        doc.addPage();
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const lines = splitTextToSize(doc, text, contentWidth);
        let yy = SMALL_MARGIN;
        for (const l of lines) {
          if (yy > 287) {
            doc.addPage();
            yy = SMALL_MARGIN;
          }
          doc.text(l, SMALL_MARGIN, yy);
          yy += LINE_HEIGHT;
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(name, SMALL_MARGIN, doc.internal.pageSize.getHeight() - 4);
        doc.setFont('helvetica', 'normal');
        y = doc.internal.pageSize.getHeight() - SMALL_MARGIN;
      } catch (e) {
        if (y > 287) {
          doc.addPage();
          y = SMALL_MARGIN;
        }
        doc.setFontSize(10);
        doc.text(`• TXT non lisible (${name})`, SMALL_MARGIN, y);
        y += LINE_HEIGHT;
      }
      continue;
    }

    if (isOdtOrDoc(type, name)) {
      // Not supported in-browser reliably; note it and keep the link
      if (y > 287) {
        doc.addPage();
        y = SMALL_MARGIN;
      }
      doc.setFontSize(10);
      doc.text(`• Format non supporté (ajoutez une version PDF): ${name}`, SMALL_MARGIN, y);
      y += LINE_HEIGHT;
      continue;
    }

    // Fallback: mark unknown
    if (y > 287) {
      doc.addPage();
      y = SMALL_MARGIN;
    }
    doc.setFontSize(10);
    doc.text(`• Fichier ignoré: ${name}`, SMALL_MARGIN, y);
    y += LINE_HEIGHT;
  }

  // 3) Merge PDFs at the end using pdf-lib
  const baseAb = doc.output('arraybuffer') as ArrayBuffer;
  let pdfDoc = await PDFDocument.load(baseAb);
  for (const p of pdfAttachments) {
    try {
      const extDoc = await PDFDocument.load(p.ab);
      const pages = await pdfDoc.copyPages(extDoc, extDoc.getPageIndices());
      for (const pg of pages) pdfDoc.addPage(pg);
    } catch (e) {
      // Skip problematic PDF
      // Optionally we could create a warning page, but pdf-lib cannot edit jsPDF doc now.
    }
  }

  const finalBytes = await pdfDoc.save();
  const blob = new Blob([finalBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  const date = new Date();
  const ts = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  const safeTitle = (title || `evenement-${event.id || ''}`).replace(/[^a-z0-9-_]+/gi, '_');
  link.href = URL.createObjectURL(blob);
  link.download = `${safeTitle}_${ts}.pdf`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 0);
}
