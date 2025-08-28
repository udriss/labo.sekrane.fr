import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import React from 'react';
import EventPrintTemplate from '@/components/pdf/EventPrintTemplate';
import { PDFDocument } from 'pdf-lib';

// Fonction pour générer et stocker le PDF dans /public
async function generatePdfToPublic(
  req: NextRequest,
): Promise<{ success: boolean; pdfUrl?: string; filename?: string; error?: string }> {
  try {
    // Générer le PDF en utilisant la fonction existante
    const pdfResponse = await generatePdf(req);

    if (!pdfResponse.ok) {
      const error = await pdfResponse.text();
      return { success: false, error };
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const filename = `event-pdf-${timestamp}.pdf`;
    const publicPath = path.join(process.cwd(), 'public', filename);

    // Écrire le fichier dans /public
    await fs.writeFile(publicPath, Buffer.from(pdfBuffer));

    // Retourner l'URL publique
    const pdfUrl = `/${filename}`;

    return {
      success: true,
      pdfUrl,
      filename,
    };
  } catch (error) {
    console.error('[PDF Storage Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la génération du PDF',
    };
  }
}

export const runtime = 'nodejs';

// Puppeteer import with dynamic fallback to puppeteer-core when needed
let puppeteer: any;
try {
  puppeteer = require('puppeteer');
} catch {
  puppeteer = require('puppeteer-core');
}

// Ensure Chromium can write user data in a local, app-writable directory (works for www-data)
async function prepareChromeWritableDirs() {
  // Allow override via env; otherwise default to an app-local folder; fallback to OS tmp if needed
  const preferredBase =
    process.env.CHROME_DATA_DIR || path.join(process.cwd(), 'public', '.chromium');
  const tryPrepare = async (baseDir: string) => {
    const userDataDir = path.join(baseDir, 'user-data');
    const xdgConfigHome = path.join(baseDir, 'xdg-config');
    const xdgCacheHome = path.join(baseDir, 'xdg-cache');
    const xdgDataHome = path.join(baseDir, 'xdg-data');
    const applicationsDir = path.join(xdgDataHome, 'applications');

    const ensureDir = async (p: string) => {
      await fs.mkdir(p, { recursive: true });
    };

    await ensureDir(baseDir);
    await ensureDir(userDataDir);
    await ensureDir(xdgConfigHome);
    await ensureDir(xdgCacheHome);
    await ensureDir(applicationsDir);

    // Pre-create an empty mimeapps.list to avoid Chrome trying to touch in HOME/.local
    const mimeappsPath = path.join(applicationsDir, 'mimeapps.list');
    await fs.writeFile(mimeappsPath, '', { flag: 'a' });

    // Point Chromium to those writable locations
    process.env.HOME = baseDir; // Prevent attempts to write under /var/www/.local
    process.env.XDG_CONFIG_HOME = xdgConfigHome;
    process.env.XDG_CACHE_HOME = xdgCacheHome;
    process.env.XDG_DATA_HOME = xdgDataHome;

    return { userDataDir };
  };

  try {
    return await tryPrepare(preferredBase);
  } catch {
    const fallbackBase = path.join(os.tmpdir(), 'labo-chromium');
    return await tryPrepare(fallbackBase);
  }
}

export async function POST(req: NextRequest) {
  return await generatePdf(req);
}

export async function GET(req: NextRequest) {
  // Support pour les requêtes GET avec paramètres d'URL
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return new Response(JSON.stringify({ error: 'eventId requis' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Ajouter un objet request modifié avec la méthode json() qui retourne les données
  const modifiedRequest = {
    ...req,
    json: async () => ({
      eventId: parseInt(eventId, 10),
      salleMap: {},
      classMap: {},
    }),
    headers: req.headers, // Garder les headers originaux
    nextUrl: req.nextUrl, // Garder nextUrl pour accéder à origin
  } as NextRequest;

  // Générer le PDF et le stocker dans /public
  const result = await generatePdfToPublic(modifiedRequest);

  if (result.success) {
    // Retourner l'URL du fichier stocké
    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: result.pdfUrl,
        filename: result.filename,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } else {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function generatePdf(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      event,
      eventId,
      salleMap = {},
      classMap = {},
      pages = null,
      sequence = null,
      customLayout = false,
    } = body || {};
    let fullEvent = event;
    if (!fullEvent && typeof eventId === 'number') {
      // fetch event server-side to avoid large payloads from client
      const baseUrl =
        process.env.NODE_ENV === 'production'
          ? process.env.NEXTAUTH_URL || req.headers.get('origin') || req.nextUrl.origin
          : `http://localhost:${process.env.PORT || ''}`;
      const url = new URL(`/api/events/${eventId}`, baseUrl).toString();
      const res = await fetch(url, {
        headers: { cookie: req.headers.get('cookie') ?? '' },
        cache: 'no-store',
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Event not found' }), { status: 400 });
      }
      const json = await res.json();
      fullEvent = json?.event;
    }
    if (!fullEvent)
      return new Response(JSON.stringify({ error: 'Missing event' }), { status: 400 });

    // If custom layout with pages configuration is provided, use it
    if (customLayout) {
      const usedPages =
        Array.isArray(pages) && pages.length
          ? pages
          : [{ id: 'main', type: 'content', title: 'Fiche événement' }];
      return generateCustomLayoutPdf(
        fullEvent,
        usedPages,
        req,
        sequence || undefined,
        salleMap,
        classMap,
      );
    }

    // Otherwise use standard layout
    return generateStandardPdf(fullEvent, salleMap, classMap, req);
  } catch (err: any) {
    console.error('[API] generate-event-pdf error', err);
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Generate custom layout PDF with drag-and-drop positioned images
async function generateCustomLayoutPdf(
  event: any,
  pages: any[],
  req: NextRequest,
  sequence?: Array<{ type: 'page' | 'pdf'; id: string }>,
  salleMap: Record<number, string> = {},
  classMap: Record<number, string> = {},
) {
  const { renderToString } = await import('react-dom/server');

  // Pre-fetch document images like in standard PDF
  const docsWithDataUrls = await Promise.all(
    (event.documents || []).map(async (doc: any) => {
      const url = doc.fileUrl || doc.url;
      if (!url) return doc;

      const name = doc.fileName || 'document';
      const lowerName = name.toLowerCase();
      const isImg =
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.gif') ||
        lowerName.endsWith('.webp') ||
        lowerName.endsWith('.svg');

      if (!isImg) return doc;

      try {
        // Use internal fetch with correct host/port for production compatibility
        const baseUrl =
          process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL || req.nextUrl.origin
            : `http://localhost:${process.env.PORT || ''}`;

        const enc = encodeURIComponent(url);
        const absUrl = new URL(`/api/documents/proxy?fileUrl=${enc}`, baseUrl).toString();

        const res = await fetch(absUrl, {
          headers: {
            cookie: req.headers.get('cookie') ?? '',
            'User-Agent': 'pdf-generator-internal',
          },
        });

        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const mimeType = res.headers.get('content-type') || 'image/png';
          const b64 = Buffer.from(buffer).toString('base64');
          return {
            ...doc,
            dataUrl: `data:${mimeType};base64,${b64}`,
            hasDataUrl: true,
          };
        }
      } catch (err) {
        console.log('[PDF Route] Failed to pre-fetch image:', url, err);
      }
      return doc;
    }),
  );

  // Update event with pre-fetched images
  const eventWithDataUrls = {
    ...event,
    documents: docsWithDataUrls,
  };

  // Helper to render a single page HTML document for puppeteer
  const wrapHtml = (bodyInner: string) => `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        html, body { margin: 0; padding: 0; }
        /* Ensure a 30px header space on every page when rendering single pages */
        @page { size: A4; margin: 30px 0 0 0; }
      </style>
    </head>
    <body>
      <div style="width:210mm; height:297mm; position: relative; overflow: hidden;">${bodyInner}</div>
    </body>
  </html>`;

  // Launch Puppeteer
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || undefined;
  const { userDataDir } = await prepareChromeWritableDirs();
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=medium',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-crash-reporter',
      `--user-data-dir=${userDataDir}`,
    ],
    headless: 'new',
    executablePath,
  });
  const cookieHeader = req.headers.get('cookie') || '';

  // Render each configured page separately to a PDF buffer
  const perPagePdfBytes: Record<string, Uint8Array> = {};

  // Compute which image documents are marked as present on the main content page
  const mainPage = pages.find((p) => p.id === 'main');
  const presentOnMain = new Set<string>();
  (mainPage?.images || []).forEach((img: any) => {
    if (img?.src) presentOnMain.add(String(img.src));
  });
  // Compute all image doc urls from the event
  const allImageDocUrls: string[] = (event.documents || [])
    .filter((doc: any) => {
      const name = String(doc.fileName || doc.url || '').toLowerCase();
      return (
        name.endsWith('.png') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.gif') ||
        name.endsWith('.webp') ||
        name.endsWith('.svg')
      );
    })
    .map((doc: any) => String(doc.fileUrl || doc.url))
    .filter(Boolean);
  // Exclude only those images that are NOT present on main (so present ones will be rendered inline by the template)
  const excludeFromTemplate: string[] = allImageDocUrls.filter((u) => !presentOnMain.has(u));

  for (const p of pages) {
    let pageHtml = '';
    if (p.type === 'content') {
      // Build per-image size overrides from main page (apply only when customSize=true)
      const styleOverrides: Record<string, { width?: number | string; height?: number | string }> =
        {};
      (p.images || []).forEach((img: any) => {
        if (!img?.src) return;
        if (img.customSize) {
          styleOverrides[String(img.src)] = { width: img.width, height: img.height };
        }
      });
      const html = renderToString(
        React.createElement(EventPrintTemplate as any, {
          event: eventWithDataUrls,
          baseUrl: req.nextUrl.origin,
          // Include documents but exclude those that are manually placed
          hideDocuments: false,
          docExcludeUrls: excludeFromTemplate,
          showNonImagePlaceholders: false,
          docImageStyles: styleOverrides,
          salleMap,
          classMap,
        }),
      );
      // Do not wrap: keep as full HTML so Puppeteer paginates across multiple pages as needed
      pageHtml = `<!DOCTYPE html>${html}`;
    } else if (p.type === 'images') {
      const imagesHtml = (p.images || [])
        .map((img: any) => {
          const docWithDataUrl = docsWithDataUrls.find(
            (doc: any) => doc.fileUrl === img.src || doc.url === img.src,
          );
          const imgSrc = docWithDataUrl?.dataUrl || img.src;
          return `<img src="${imgSrc}" alt="${img.title || 'Image'}" style="position: absolute; left: ${img.x}px; top: ${img.y}px; width: ${img.width}px; height: ${img.height}px; object-fit: contain; border: 1px solid #ddd;" />`;
        })
        .join('');
      pageHtml = wrapHtml(`
        <div style="position: absolute; left: 20px; top: 20px; right: 20px; bottom: 20px;">
          <div style="margin: 0 0 8px 0; font-size: 16px; color: #333; font-weight: 600;">${p.title || ''}</div>
          ${imagesHtml}
        </div>
      `);
    } else {
      continue;
    }

    const tab = await browser.newPage();
    if (cookieHeader) {
      try {
        await tab.setExtraHTTPHeaders({ cookie: cookieHeader });
      } catch {}
    }
    await tab.setContent(pageHtml, { waitUntil: 'networkidle0' });
    await tab.emulateMediaType('screen');
    const bytes = await tab.pdf({
      format: 'A4',
      printBackground: true,
      // Use CSS @page for margins; keep Puppeteer margins at 0
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await tab.close();
    perPagePdfBytes[String(p.id)] = bytes;
  }

  await browser.close();

  // If sequence includes PDFs, merge them according to order
  // Collect PDF docs
  const pdfDocs = (event.documents || []).filter((d: any) =>
    /\.pdf$/i.test(d.fileName || d.url || ''),
  );
  const fetchPdfBytes = async (doc: any): Promise<Uint8Array | null> => {
    const rawUrl = doc.fileUrl || doc.url;
    if (!rawUrl) return null;
    try {
      const baseUrl =
        process.env.NODE_ENV === 'production'
          ? process.env.NEXTAUTH_URL || req.nextUrl.origin
          : `http://localhost:${process.env.PORT || ''}`;
      const enc = encodeURIComponent(rawUrl);
      const abs = new URL(`/api/documents/proxy?fileUrl=${enc}`, baseUrl).toString();
      const res = await fetch(abs, { headers: { cookie: req.headers.get('cookie') ?? '' } });
      if (!res.ok) return null;
      const arr = new Uint8Array(await res.arrayBuffer());
      return arr;
    } catch {
      return null;
    }
  };

  if (sequence && sequence.length) {
    // Build a new doc according to sidebar order
    const out = await PDFDocument.create();
    const importPagesFrom = async (srcBytes: Uint8Array) => {
      const srcDoc = await PDFDocument.load(srcBytes);
      const srcPages = await out.copyPages(srcDoc, srcDoc.getPageIndices());
      srcPages.forEach((p: any) => out.addPage(p));
    };

    // Build small map for PDFs by id (use fileUrl or id string)
    const pdfByKey: Record<string, any> = {};
    for (const d of pdfDocs) {
      const key = String(d.id || d.fileUrl || d.fileName);
      pdfByKey[key] = d;
    }

    for (const item of sequence) {
      if (item.type === 'page') {
        const bytes = perPagePdfBytes[String(item.id)];
        if (bytes) await importPagesFrom(bytes);
      } else if (item.type === 'pdf') {
        const doc = pdfByKey[String(item.id)];
        if (!doc) continue;
        const bytes = await fetchPdfBytes(doc);
        if (bytes) {
          await importPagesFrom(bytes);
        }
      }
    }

    const outBytes = await out.save();
    const safeTitle = String(event.title || `evenement-${event.id || ''}`)
      .replace(/[\n\r]+/g, ' ')
      .replace(/[^\p{L}\p{N}_ -]+/gu, '_');
    return new Response(Buffer.from(outBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // Default: if no sequence provided, concat generated pages in their natural order
  const out = await PDFDocument.create();
  for (const p of pages) {
    const bytes = perPagePdfBytes[String(p.id)];
    if (!bytes) continue;
    const src = await PDFDocument.load(bytes);
    const srcPages = await out.copyPages(src, src.getPageIndices());
    srcPages.forEach((pg: any) => out.addPage(pg));
  }
  const outBytes = await out.save();
  const safeTitle = String(event.title || `evenement-${event.id || ''}`)
    .replace(/[\n\r]+/g, ' ')
    .replace(/[^\p{L}\p{N}_ -]+/gu, '_');
  return new Response(Buffer.from(outBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}

// Generate standard PDF layout (original logic)
async function generateStandardPdf(event: any, salleMap: any, classMap: any, req: NextRequest) {
  const { renderToString } = await import('react-dom/server');

  // Pre-fetch document images by reading directly from filesystem
  const docsWithDataUrls = await Promise.all(
    (event.documents || []).map(async (doc: any) => {
      const url = doc.fileUrl || doc.url;
      if (!url) return doc;

      const name = doc.fileName || 'document';
      const lowerName = name.toLowerCase();
      const isImg =
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.gif') ||
        lowerName.endsWith('.webp') ||
        lowerName.endsWith('.svg');

      if (!isImg) return doc;

      try {
        // Use internal fetch with correct host/port for production compatibility
        const baseUrl =
          process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL || req.nextUrl.origin
            : `http://localhost:${process.env.PORT || ''}`;

        const enc = encodeURIComponent(url);
        const absUrl = new URL(`/api/documents/proxy?fileUrl=${enc}`, baseUrl).toString();

        console.log('[PDF Route] Reading image file:', absUrl);
        const res = await fetch(absUrl, {
          headers: {
            cookie: req.headers.get('cookie') ?? '',
            'User-Agent': 'pdf-generator-internal',
          },
        });

        if (!res.ok) {
          console.log('[PDF Route] Fetch failed:', res.status, res.statusText);
          return doc;
        }

        const buffer = await res.arrayBuffer();
        const contentType = lowerName.endsWith('.png')
          ? 'image/png'
          : lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')
            ? 'image/jpeg'
            : lowerName.endsWith('.gif')
              ? 'image/gif'
              : lowerName.endsWith('.webp')
                ? 'image/webp'
                : lowerName.endsWith('.svg')
                  ? 'image/svg+xml'
                  : 'image/png';

        const base64 = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;

        console.log('[PDF Route] Successfully embedded image:', name);
        return { ...doc, dataUrl };
      } catch (e) {
        console.log('[PDF Route] Failed to read image file:', e);
      }

      return doc;
    }),
  );

  const eventWithDataUrls = { ...event, documents: docsWithDataUrls };

  const html = renderToString(
    React.createElement(EventPrintTemplate as any, {
      event: eventWithDataUrls,
      salleMap,
      classMap,
      baseUrl: req.nextUrl.origin,
    }),
  );

  // Wrap to ensure a full HTML document for page.setContent
  const doc = `<!DOCTYPE html>${html}`;

  // Launch Puppeteer (use args compatible with many Linux hosts)
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || undefined;
  const { userDataDir } = await prepareChromeWritableDirs();
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=medium',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-crash-reporter',
      `--user-data-dir=${userDataDir}`,
    ],
    headless: 'new',
    executablePath,
  });
  const page = await browser.newPage();
  const cookieHeader = req.headers.get('cookie') || '';
  if (cookieHeader) {
    try {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    } catch {}
  }
  await page.setContent(doc, { waitUntil: 'networkidle0' });
  await page.emulateMediaType('screen');
  const basePdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    // Use CSS @page for margins; keep Puppeteer margins at 0
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  });
  await browser.close();

  // Merge attachments: append any PDF documents from event.documents at the end
  const out = await PDFDocument.create();
  const baseDoc = await PDFDocument.load(basePdfBuffer);
  const basePages = await out.copyPages(baseDoc, baseDoc.getPageIndices());
  basePages.forEach((p: any) => out.addPage(p));

  const pdfDocs = (event.documents || []).filter((d: any) =>
    /\.pdf$/i.test(d.fileName || d.url || ''),
  );
  const fetchPdfBytes = async (doc: any): Promise<Uint8Array | null> => {
    const rawUrl = doc.fileUrl || doc.url;
    if (!rawUrl) return null;
    try {
      const baseUrl =
        process.env.NODE_ENV === 'production'
          ? process.env.NEXTAUTH_URL || req.nextUrl.origin
          : `http://localhost:${process.env.PORT || ''}`;
      const enc = encodeURIComponent(rawUrl);
      const abs = new URL(`/api/documents/proxy?fileUrl=${enc}`, baseUrl).toString();
      const res = await fetch(abs, { headers: { cookie: req.headers.get('cookie') ?? '' } });
      if (!res.ok) return null;
      const arr = new Uint8Array(await res.arrayBuffer());
      return arr;
    } catch {
      return null;
    }
  };
  for (const d of pdfDocs) {
    const bytes = await fetchPdfBytes(d);
    if (!bytes) continue;
    try {
      const doc = await PDFDocument.load(bytes);
      const pages = await out.copyPages(doc, doc.getPageIndices());
      pages.forEach((p: any) => out.addPage(p));
    } catch {}
  }

  // Return the generated PDF
  const pdfBytes = await out.save();
  const safeTitle = String(event.title || `evenement-${event.id || ''}`)
    .replace(/[\n\r]+/g, ' ')
    .replace(/[^\p{L}\p{N}_ -]+/gu, '_');

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
