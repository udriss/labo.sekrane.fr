'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  Button,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Notification } from '@/types/notifications';

// Types de sévérité avec couleurs
const SEVERITY_COLORS = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#9c27b0',
};

const SEVERITY_LABELS = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
  critical: 'Critique',
};

interface NotificationLiveFeedProps {
  notifications: Notification[];
  loading: boolean;
  wsConnected: boolean;
  onRefresh: () => void;
  // Optional cursor loading callback if parent implements it; we mimic old behaviour
  onLoadMore?: () => void;
  // Optional callbacks to mark notifications as read (per-user)
  onMarkAsRead?: (id: number) => void;
  onMarkAllAsRead?: () => void;
  // Set of notification ids considered read (optional)
  readIds?: Set<number> | null;
}

// Lightweight sanitizer (copied from original page-old.tsx)
function sanitize(html: string): string {
  try {
    html = html
      .replace(/<\/(script|style)>/gi, '')
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
    const escaped = html.replace(
      /[&<>"']/g,
      (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }) as any)[c],
    );
    return escaped.replace(/&lt;(\/?)(b|strong|i|em|br)\s*&gt;/gi, '<$1$2>');
  } catch {
    return html.replace(
      /[&<>"']/g,
      (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }) as any)[c],
    );
  }
}

function DiffView({ data }: { data: any }) {
  if (!data) return null;
  const qp = (data as any).quantityPrev;
  const qn = (data as any).quantityNew;
  const sp = (data as any).stockPrev;
  const sn = (data as any).stockNew;
  const parts: string[] = [];
  if (qp !== undefined && qn !== undefined && qp !== qn) parts.push(`Quantité : ${qp} → ${qn}`);
  if (sp !== undefined && sn !== undefined && sp !== sn) parts.push(`Stock : ${sp} → ${sn}`);
  if (!parts.length) return null;
  return (
    <Box mt={0.5} display="flex" gap={1} flexWrap="wrap">
      {parts.map((p) => (
        <Chip key={p} size="small" label={p} />
      ))}
    </Box>
  );
}

export default function NotificationLiveFeed({
  notifications,
  loading,
  wsConnected,
  onRefresh,
  onLoadMore,
  onMarkAsRead,
  onMarkAllAsRead,
  readIds = null,
}: NotificationLiveFeedProps) {
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  // Filtres rapides
  const [ownerOnly, setOwnerOnly] = useState(false); // actionType commence par OWNER_
  const [accountOnly, setAccountOnly] = useState(false); // module === ACCOUNT
  const [live, setLive] = useState(true);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return 'Date invalide';
    }
  };
  const filtered = notifications.filter((n) => {
    const moduleOk = !filterModule || n.module === filterModule;
    const actionOk = !filterAction || n.actionType === filterAction;
    const severityOk = !filterSeverity || n.severity === filterSeverity;
    const ownerOk = !ownerOnly || (n.actionType || '').startsWith('OWNER_');
    const accountOk = !accountOnly || n.module === 'ACCOUNT';
    return moduleOk && actionOk && severityOk && ownerOk && accountOk;
  });

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Flux de notifications en temps réel
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Button
            onClick={() => onRefresh()}
            disabled={loading}
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Actualiser
          </Button>
          {onMarkAllAsRead && (
            <Button size="small" onClick={onMarkAllAsRead} disabled={loading} variant="outlined">
              Marquer tout comme lu
            </Button>
          )}
          {onLoadMore && (
            <Button onClick={onLoadMore} disabled={loading} variant="outlined">
              Charger plus
            </Button>
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={live}
                onChange={(e) => setLive(e.target.checked)}
                color="primary"
                disabled={!wsConnected}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
                  {live ? 'LIVE ACTIVÉ' : 'LIVE DÉSACTIVÉ'}
                </Typography>
                <Chip
                  size="small"
                  label={wsConnected ? 'Connecté' : 'Déconnecté'}
                  color={wsConnected ? 'success' : 'error'}
                  variant="outlined"
                />
              </Box>
            }
          />
        </Box>
      </Box>

      {/* Filtres rapides */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
        <Chip
          size="small"
          label="Ciblées OWNER_*"
          clickable
          color={ownerOnly ? 'primary' : 'default'}
          variant={ownerOnly ? 'filled' : 'outlined'}
          onClick={() => setOwnerOnly((v) => !v)}
        />
        <Chip
          size="small"
          label="Compte (ACCOUNT)"
          clickable
          color={accountOnly ? 'primary' : 'default'}
          variant={accountOnly ? 'filled' : 'outlined'}
          onClick={() => setAccountOnly((v) => !v)}
        />
      </Box>

      {/* Filtres avancés */}
      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <TextField
          size="small"
          label="Module"
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          select
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">(Tous)</MenuItem>
          {[...new Set(notifications.map((r) => r.module).filter(Boolean))].map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Action"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          select
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">(Toutes)</MenuItem>
          {[...new Set(notifications.map((r) => r.actionType).filter(Boolean))].map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Sévérité"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          select
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">(Toutes)</MenuItem>
          {[...new Set(notifications.map((r) => r.severity).filter(Boolean))].map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Module</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Sévérité</TableCell>
            <TableCell>Message</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((n) => (
            <TableRow key={n.id}>
              <TableCell>{formatDate(n.createdAt)}</TableCell>
              <TableCell>
                <Chip label={n.module} size="small" sx={{ bgcolor: '#9e9e9e', color: 'white' }} />
              </TableCell>
              <TableCell>
                <Chip
                  label={n.actionType}
                  size="small"
                  sx={{
                    bgcolor: (n.actionType || '').startsWith('OWNER_')
                      ? '#6a1b9a' // violet pour OWNER_*
                      : n.module === 'ACCOUNT'
                        ? '#2e7d32' // vert pour ACCOUNT
                        : '#607d8b',
                    color: 'white',
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={n.severity}
                  color={
                    n.severity === 'high' || n.severity === 'critical'
                      ? 'error'
                      : n.severity === 'medium'
                        ? 'warning'
                        : 'default'
                  }
                />
              </TableCell>
              <TableCell sx={{ maxWidth: 400 }}>
                <Box
                  dangerouslySetInnerHTML={{
                    __html: sanitize(
                      n.title
                        ? `<strong>${n.title}</strong>: ${n.message || ''}`
                        : n.message || 'Message vide',
                    ),
                  }}
                />
                <DiffView data={n.data} />
              </TableCell>
              <TableCell align="right">
                {onMarkAsRead ? (
                  <Button
                    size="small"
                    onClick={() => onMarkAsRead(n.id)}
                    disabled={readIds?.has?.(n.id)}
                  >
                    {readIds?.has?.(n.id) ? 'Lu' : 'Marquer lu'}
                  </Button>
                ) : null}
                {n.data?.eventId && (
                  <Button
                    size="small"
                    href={`/evenements/${n.data.eventId}/timeslots${Array.isArray(n.data.timeslotIds) && n.data.timeslotIds.length ? `?focus=${n.data.timeslotIds.join(',')}` : ''}`}
                  >
                    Ouvrir
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            Aucune notification trouvée. Cliquez sur "Actualiser" pour charger les données.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
