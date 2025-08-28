'use client';

import React, { useMemo } from 'react';
import { Box, Typography, Chip, IconButton, Tooltip, Stack } from '@mui/material';
import { CheckCircle, Circle, OpenInNew } from '@mui/icons-material';
// Lightweight sanitizer fallback (allow <b><strong><i><em><br>)
function sanitize(html: string): string {
  try {
    // Remove script/style tags entirely
    html = html
      .replace(/<\/(script|style)>/gi, '')
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
    // Escape all angle brackets then unescape allowed tags
    const escaped = html.replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c] as string,
    );
    // Unescape allowed paired tags
    let unescaped = escaped.replace(/&lt;(\/?)(b|strong|i|em)\s*&gt;/gi, '<$1$2>');
    // Unescape <br> or self-closing <br/>
    unescaped = unescaped.replace(/&lt;br\s*\/?&gt;/gi, '<br/>');
    return unescaped;
  } catch {
    return html.replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c] as string,
    );
  }
}
import type { WebSocketNotification } from '@/types/notifications';

export default function NotificationItem({
  n,
  onOpen,
  onRead,
}: {
  n: WebSocketNotification;
  onOpen?: (n: WebSocketNotification) => void;
  onRead?: (id: string) => void;
}) {
  const color = n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : 'info';

  const diffs = useMemo(() => {
    // Handle multiple change types from notification data
    const changes: string[] = [];

    // Quantity changes (existing)
    if (
      typeof n.quantityPrev === 'number' &&
      typeof n.quantityNew === 'number' &&
      n.quantityPrev !== n.quantityNew
    ) {
      changes.push(`Quantité : ${n.quantityPrev} → ${n.quantityNew}`);
    }

    // Stock changes (existing)
    if (
      typeof n.stockPrev === 'number' &&
      typeof n.stockNew === 'number' &&
      n.stockPrev !== n.stockNew
    ) {
      changes.push(`Stock : ${n.stockPrev} → ${n.stockNew}`);
    }

    // Multiple changes from data.changes array (preferred)
    if (n.data?.changes && Array.isArray(n.data.changes)) {
      changes.push(...n.data.changes);
    } else if (n.data?.changesSummary && Array.isArray(n.data.changesSummary)) {
      // Fallback: some APIs send changesSummary (array of strings)
      changes.push(...n.data.changesSummary);
    } else if (n.data?.changes && typeof n.data.changes === 'object') {
      // Fallback: some APIs send raw _changes object; transform to strings
      try {
        const entries = Object.entries(n.data.changes as Record<string, any>);
        for (const [field, change] of entries) {
          const before = (change || {}).before ?? (change || {}).old;
          const after = (change || {}).after ?? (change || {}).new;
          const labelMap: Record<string, string> = {
            quantity: 'Quantité',
            stock: 'Stock',
            minStock: 'Stock min',
            unit: 'Unité',
            salle: 'Salle',
            salleId: 'Salle',
            localisation: 'Localisation',
            localisationId: 'Localisation',
            category: 'Catégorie',
            categoryId: 'Catégorie',
            supplier: 'Fournisseur',
            supplierName: 'Fournisseur',
            supplierId: 'Fournisseur',
            purchaseDate: "Date d'achat",
            expirationDate: "Date d'expiration",
            notes: 'Notes',
            name: 'Nom',
            model: 'Modèle',
            serialNumber: 'N° série',
          };
          const label = labelMap[field] || field;
          const fmt = (v: any, emptyLabel = '(vide)') =>
            v == null || v === '' ? emptyLabel : String(v);
          const emptyNone = (v: any) => (v == null || v === '' ? '(aucune)' : String(v));
          if (label === 'Salle' || label === 'Localisation' || label === 'Catégorie') {
            changes.push(`${label} : ${emptyNone(before)} → ${emptyNone(after)}`);
          } else {
            changes.push(`${label} : ${fmt(before)} → ${fmt(after)}`);
          }
        }
      } catch {}
    }
    // Dedupe to avoid double entries (e.g., from quantityPrev and object changes)
    return Array.from(new Set(changes));
  }, [n.quantityPrev, n.quantityNew, n.stockPrev, n.stockNew, n.data]);

  const safeMessage = useMemo(() => {
    const raw = n.message || '';
    // Remove any trailing line breaks / "Modifications:" suffix; we'll render detailed chips instead
    let base = raw;
    if (base.includes('<br')) base = base.split('<br')[0];
    else {
      const idx = base.indexOf('Modifications');
      if (idx >= 0) base = base.slice(0, idx);
    }
    return sanitize(base);
  }, [n.message]);

  // Format a DB timestamp as "wall time" without timezone transposition
  const formatWallTime = (value: unknown): string => {
    try {
      if (typeof value === 'string') {
        // Normalize: replace space with T, drop trailing Z; keep milliseconds optional
        const s = value.replace(' ', 'T').replace(/Z$/i, '');
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
        if (m) {
          const hh = m[4];
          const mm = m[5];
          const ss = m[6];
          // Return HH:MM (keep seconds only if present)
          return ss ? `${hh} : ${mm} : ${ss}` : `${hh} : ${mm}`;
        }
      }
      if (value instanceof Date) {
        // Assume already local wall time
        return value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }
      if (typeof value === 'number') {
        // Epoch fallback (cannot avoid TZ shift reliably) – display HH:MM in local
        return new Date(value).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {}
    // Fallback: string cast
    return String(value ?? '');
  };

  // Prefer the original createdAt string to avoid timezone transposition (e.g., '+2h')
  const tsLabel = formatWallTime((n as any).createdAt ?? (n as any).ts);
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1,
        bgcolor: n.isRead ? 'background.paper' : 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {n.isRead ? (
          <CheckCircle fontSize="small" color="disabled" />
        ) : (
          <Circle fontSize="small" color="primary" />
        )}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="body2"
            noWrap
            sx={{ fontWeight: n.isRead ? 400 : 600 }}
            dangerouslySetInnerHTML={{ __html: safeMessage }}
          />
          {/* {diff && (
            <Typography variant="caption" color="text.secondary" noWrap>
              Changements : {diff}
            </Typography>
          )} */}
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {/* {n.module && (
              <Chip size="small" label={n.module} color={color as any} variant="outlined" />
            )}
            {n.actionType && <Chip size="small" label={n.actionType} variant="outlined" />}
            {n.severity && n.severity !== 'low' && (
              <Chip size="small" label={n.severity} variant="outlined" />
            )} */}
            {n.entityId && <Chip size="small" label={`#${n.entityId}`} variant="outlined" />}
            {Array.isArray(diffs) &&
              diffs.map((c, i) => <Chip size="small" key={`chg-${i}`} label={c} color="primary" />)}
          </Box>
        </Box>
        <Stack
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
          }}
        >
          <Chip
            size="small"
            label={tsLabel}
            variant="outlined"
            sx={{
              fontWeight: n.isRead ? 400 : 800,
            }}
          />
          <Stack direction="row" spacing={0.5}>
            {!!onOpen && (
              <Tooltip title="Ouvrir">
                <IconButton size="small" onClick={() => onOpen(n)}>
                  <OpenInNew fontSize="inherit" />
                </IconButton>
              </Tooltip>
            )}
            {!!onRead && (
              <Tooltip title="Marquer comme lu">
                <IconButton size="small" onClick={() => onRead(n.id)}>
                  <CheckCircle fontSize="inherit" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          {n.triggeredBy && (
            <Typography variant="caption" color="text.secondary" noWrap>
              Par : {n.triggeredBy}.
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
