'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

type LogItem = {
  id: number;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  userId?: number | null;
  role?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  module?: string | null;
  action?: string | null;
  message?: string | null;
};

export default function AdminLogsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<LogItem[]>([]);
  const [cursor, setCursor] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    method?: string;
    path?: string;
    userId?: string;
    status?: string;
  }>({});

  const role = (session?.user as any)?.role;
  const isAdmin = role === 'ADMIN' || role === 'ADMINLABO';

  const fetchLogs = async (append = false) => {
    setLoading(true);
    try {
      const url = new URL('/api/admin/logs', window.location.origin);
      url.searchParams.set('limit', '50');
      if (append && cursor) url.searchParams.set('cursor', String(cursor));
      if (filters.method) url.searchParams.set('method', filters.method);
      if (filters.path) url.searchParams.set('path', filters.path);
      if (filters.userId) url.searchParams.set('userId', filters.userId);
      if (filters.status) url.searchParams.set('status', filters.status);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('fetch logs failed');
      const data = await res.json();
      const list: LogItem[] = data.items || [];
      setItems((prev) => (append ? [...prev, ...list] : list));
      if (list.length) setCursor(list[list.length - 1].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography>Accès refusé</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={4} sx={{ p: 2, borderRadius: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5" fontWeight={700}>
            Journal des APIs
          </Typography>
          <Box display="flex" gap={1} alignItems="center">
            <TextField
              size="small"
              label="Méthode"
              value={filters.method || ''}
              onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
            />
            <TextField
              size="small"
              label="Chemin"
              value={filters.path || ''}
              onChange={(e) => setFilters((f) => ({ ...f, path: e.target.value }))}
            />
            <TextField
              size="small"
              label="User ID"
              value={filters.userId || ''}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
            />
            <TextField
              size="small"
              label="Statut"
              value={filters.status || ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            />
            <Button variant="outlined" onClick={() => fetchLogs(false)}>
              Appliquer
            </Button>
            <Tooltip title="Rafraîchir">
              <span>
                <IconButton onClick={() => fetchLogs(false)} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Box position="relative">
          {loading && (
            <Box position="absolute" top={8} right={8}>
              <CircularProgress size={24} />
            </Box>
          )}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Méthode</TableCell>
                <TableCell>Chemin</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Module</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id} hover>
                  <TableCell>{it.id}</TableCell>
                  <TableCell>{new Date(it.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip size="small" label={it.method} />
                  </TableCell>
                  <TableCell>{it.path}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={it.status}
                      color={it.status >= 500 ? 'error' : it.status >= 400 ? 'warning' : 'success'}
                    />
                  </TableCell>
                  <TableCell>{it.userId ?? '-'}</TableCell>
                  <TableCell>{it.role ?? '-'}</TableCell>
                  <TableCell>{it.ip ?? '-'}</TableCell>
                  <TableCell>{it.module ?? '-'}</TableCell>
                  <TableCell>{it.action ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="outlined"
              onClick={() => fetchLogs(true)}
              disabled={loading || !cursor}
            >
              Charger plus
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
