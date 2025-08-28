// /components/pdf/EventPrintTemplate.tsx
// Server-rendered print template

import React from 'react';

type AnyMap = Record<number, string>;

export interface EventPrintTemplateProps {
  event: any;
  salleMap: AnyMap;
  classMap: AnyMap;
  baseUrl?: string; // for resolving relative document URLs when rendering in Puppeteer
  hideDocuments?: boolean; // optional: hide Documents section (used by custom layout preview/export)
  bare?: boolean; // optional: render only the inner content (no html/head/body) for embedding in preview
  docExcludeUrls?: string[]; // optional: exclude documents by their fileUrl/url (used to avoid duplicates with placed images)
  showNonImagePlaceholders?: boolean; // optional: show a text line for non-image docs (default true)
  docImageStyles?: Record<string, { width?: number | string; height?: number | string }>; // optional: per-image sizing overrides keyed by fileUrl/url
}

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

const fmtDateTime = (v: any) => {
  const d = toDate(v);
  if (!d) return '';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
};

const fmtDateOnly = (v: any) => {
  const d = toDate(v);
  if (!d) return '';
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
};

const fmtTime = (v: any) => {
  const d = toDate(v);
  if (!d) return '';
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
};

const styles = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif; color: #142033; }
  .page { padding: 10mm 8mm; }
  /* Ensure a 30px empty header on every printed page */
  @page { size: A4; margin: 30px 0 0 0; }
  .title {
    background: linear-gradient(45deg, #d2e3f3ff, #e6e7ffff);
    color: #000000ff;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 14px;
  }
  .title-top { display: flex; align-items: center; gap: 8px; }
  .owner { font-weight: 900; font-size: 18px; }
  .chip { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,.22); color: #000000ff; font-weight: 600; font-size: 12px; }
  .subtitle { color: rgba(0, 0, 0, 0.95); font-size: 12px; margin-top: 2px; }
  h2 { font-size: 16px; margin: 16px 0 8px; }
  .slots { margin-top: 8px; }
  .slot { border: 1px solid #e3e7ef; border-radius: 8px; padding: 10px 12px; margin: 8px 0; }
  .slot-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .slot-date { font-weight: 600; color: #1f2a44; }
  .slot-time { color: #4a5a7a; }
  .kv { display: inline-flex; gap: 4px; align-items: center; color: #4a5a7a; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip-outline { border: 1px solid #d1d9e6; color: #24324a; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e3e7ef; padding: 8px; font-size: 12px; }
  th { background: #e8f1fd; color: #1e4aad; text-align: left; font-weight: 700; }
  /* Better pagination for long tables */
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { page-break-inside: avoid; }
  table { page-break-inside: auto; }
  h2 { page-break-after: avoid; }
  .section { margin: 12px 0; page-break-inside: auto; break-inside: auto; }
  .muted { color: #7486a3; font-style: italic; }
  .doc-img { display: block; margin: 2mm auto; border: 1px solid #e3e7ef; border-radius: 4px; width: auto; height: auto; max-width: 100%; max-height: 230mm; object-fit: contain; }
  .doc-container { display: block; margin: 4mm 0; text-align: center; page-break-inside: avoid; width: 100%; }
  .doc-grid { display: block; }
  .caption { text-align: center; font-size: 10px; color: #6b7b98; margin-top: 2px; word-wrap: break-word; }
  .footer { margin-top: 16px; color: #6b7b98; font-size: 11px; }
`;

export default function EventPrintTemplate({
  event,
  salleMap,
  classMap,
  baseUrl,
  hideDocuments,
  bare,
  docExcludeUrls,
  showNonImagePlaceholders = true,
  docImageStyles,
}: EventPrintTemplateProps) {
  const salleIds: number[] = Array.isArray(event.salleIds)
    ? event.salleIds
    : (() => {
        try {
          const p = JSON.parse(String(event.salleIds || '[]'));
          return Array.isArray(p) ? p : [];
        } catch {
          return [];
        }
      })();
  const classIds: number[] = Array.isArray(event.classIds)
    ? event.classIds
    : (() => {
        try {
          const p = JSON.parse(String(event.classIds || '[]'));
          return Array.isArray(p) ? p : [];
        } catch {
          return [];
        }
      })();

  const slots: any[] = Array.isArray(event.timeslots) ? event.timeslots : [];
  const hasMateriels =
    (event.materiels || []).length > 0 || (event.customMaterielRequests || []).length > 0;
  const hasChemicals =
    (event.reactifs || []).length > 0 || (event.customReactifRequests || []).length > 0;
  const documents: any[] = Array.isArray(event.documents) ? event.documents : [];
  const filteredDocs = documents.filter((d) => {
    const url = d.fileUrl || d.url || '';
    return !(docExcludeUrls && url && docExcludeUrls.includes(url));
  });
  const hasDocs = filteredDocs.length > 0 && !hideDocuments;

  // Use data URL if available, otherwise fall back to proxy URL
  const resolveDocUrl = (doc: any) => {
    if (doc.dataUrl) {
      return doc.dataUrl;
    }
    const rawUrl = doc.fileUrl || doc.url;
    if (!rawUrl) return '';
    // Always use proxy API for auth and headers (same logic as EventDetailsDialog)
    const enc = encodeURIComponent(rawUrl);
    return baseUrl
      ? `${baseUrl}/api/documents/proxy?fileUrl=${enc}`
      : `/api/documents/proxy?fileUrl=${enc}`;
  };

  const content = (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="page">
        <div className="title">
          <div className="title-top">
            <div className="owner">{event?.owner?.name || '—'}</div>
            <span className="chip">{event?.discipline || '—'}</span>
          </div>
          <div className="subtitle">{event?.title || <i>Aucun titre fourni</i>}</div>
        </div>

        <section className="section">
          <h2>Créneaux</h2>
          <div className="slots">
            {slots.length === 0 && <div className="muted">Aucun créneau</div>}
            {slots.map((s, idx) => {
              const day = s.timeslotDate
                ? fmtDateOnly(s.timeslotDate)
                : s.startDate
                  ? fmtDateOnly(s.startDate)
                  : '';
              const start = s.startDate ? fmtTime(s.startDate) : '';
              const end = s.endDate ? fmtTime(s.endDate) : '';
              const sSalle: number[] = Array.isArray(s.salleIds) ? s.salleIds : [];
              const sClass: number[] = Array.isArray(s.classIds) ? s.classIds : [];
              return (
                <div className="slot" key={`slot-${idx}`}>
                  <div className="slot-row">
                    {day && <span className="slot-date">{day}</span>}
                    {(start || end) && (
                      <span className="slot-time">{[start, end].filter(Boolean).join(' → ')}</span>
                    )}
                  </div>
                  {(sSalle.length > 0 || sClass.length > 0) && (
                    <div className="slot-row" style={{ marginTop: 6 }}>
                      {sSalle.length > 0 && (
                        <span className="kv">
                          Salles:
                          <span className="chips">
                            {sSalle.map((id: number) => (
                              <span className="chip-outline" key={`ss-${id}`}>
                                {salleMap?.[id] || `Salle ${id}`}
                              </span>
                            ))}
                          </span>
                        </span>
                      )}
                      {sClass.length > 0 && (
                        <span className="kv">
                          Classes:
                          <span className="chips">
                            {sClass.map((id: number) => (
                              <span className="chip-outline" key={`sc-${id}`}>
                                {classMap?.[id] || `Classe ${id}`}
                              </span>
                            ))}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="section"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
        >
          <div>
            <h2>{salleIds.length === 1 ? 'Salle' : 'Salles'}</h2>
            <div className="chips">
              {salleIds.length ? (
                salleIds.map((id) => (
                  <span className="chip-outline" key={`evs-${id}`}>
                    {salleMap?.[id] || `Salle ${id}`}
                  </span>
                ))
              ) : (
                <span className="muted">Pas de salle</span>
              )}
            </div>
          </div>
          <div>
            <h2>{classIds.length === 1 ? 'Classe' : 'Classes'}</h2>
            <div className="chips">
              {classIds.length ? (
                classIds.map((id) => (
                  <span className="chip-outline" key={`evc-${id}`}>
                    {classMap?.[id] || `Classe ${id}`}
                  </span>
                ))
              ) : (
                <span className="muted">Pas de classe</span>
              )}
            </div>
          </div>
        </section>

        {hasMateriels && (
          <section className="section">
            <h2>Matériel</h2>
            <table>
              <thead>
                <tr>
                  <th>Type / Nom</th>
                  <th style={{ textAlign: 'right' as const }}>Quantité</th>
                </tr>
              </thead>
              <tbody>
                {(event.materiels || []).map((m: any) => (
                  <tr key={`m-${m.id}`}>
                    <td>{m.materielName || m.name || '—'}</td>
                    <td style={{ textAlign: 'right' as const }}>{m.quantity ?? '—'}</td>
                  </tr>
                ))}
                {(event.customMaterielRequests || []).map((m: any) => (
                  <tr key={`cm-${m.id}`}>
                    <td>{(m.name || '—') + ' (PERSO)'}</td>
                    <td style={{ textAlign: 'right' as const }}>{m.quantity ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {hasChemicals && (
          <section className="section">
            <h2>Réactifs Chimiques</h2>
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th style={{ textAlign: 'right' as const }}>Quantité</th>
                </tr>
              </thead>
              <tbody>
                {(event.reactifs || []).map((r: any) => (
                  <tr key={`r-${r.id}`}>
                    <td>{r.reactifName || r.name || '—'}</td>
                    <td style={{ textAlign: 'right' as const }}>
                      {(r.requestedQuantity ?? '—') + (r.unit ? ` ${r.unit}` : '')}
                    </td>
                  </tr>
                ))}
                {(event.customReactifRequests || []).map((r: any) => (
                  <tr key={`cr-${r.id}`}>
                    <td>{(r.name || '—') + ' (PERSO)'}</td>
                    <td style={{ textAlign: 'right' as const }}>
                      {(r.requestedQuantity ?? '—') + (r.unit ? ` ${r.unit}` : '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {hasDocs && (
          <section className="section">
            <h2>Documents</h2>
            <div className="doc-grid">
              {filteredDocs.map((d: any, i: number) => {
                const name = d.fileName || `document_${i + 1}`;
                const url = resolveDocUrl(d);
                const fileType = (d.fileType || '').toLowerCase();
                const lower = String(d.fileName || '').toLowerCase();
                const isImg =
                  fileType.startsWith('image/') ||
                  lower.endsWith('.png') ||
                  lower.endsWith('.jpg') ||
                  lower.endsWith('.jpeg') ||
                  lower.endsWith('.gif') ||
                  lower.endsWith('.webp') ||
                  lower.endsWith('.svg');

                // Only inline preview images here; PDFs/DOCX/ODT get appended by the server merge step.
                if (isImg && url) {
                  const ov = docImageStyles?.[String(d.fileUrl || d.url || '')] || {};
                  const styleObj: React.CSSProperties | undefined =
                    ov.width || ov.height
                      ? {
                          ...(ov.width ? { width: ov.width } : {}),
                          ...(ov.height ? { height: ov.height } : {}),
                          marginLeft: 'auto',
                          marginRight: 'auto',
                          display: 'block',
                          objectFit: 'contain',
                        }
                      : undefined;
                  return (
                    <div key={`doc-${i}`} className="doc-container">
                      <img src={url} alt={name} className="doc-img" style={styleObj} />
                      <div className="caption">{name}</div>
                    </div>
                  );
                }
                return showNonImagePlaceholders ? (
                  <div
                    key={`doc-${i}`}
                    className="muted"
                    style={{ width: '100%', margin: '4px 0' }}
                  >
                    {name} — inclus dans les pages jointes du PDF
                  </div>
                ) : null;
              })}
            </div>
          </section>
        )}

        <div className="footer">
          Ajouté le {fmtDateTime(event.createdAt)} • Modifié le {fmtDateTime(event.updatedAt)}
        </div>
      </div>
    </>
  );

  if (bare) return content;

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <title>Fiche événement</title>
      </head>
      <body>{content}</body>
    </html>
  );
}
