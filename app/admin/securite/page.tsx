'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  Button,
  TextField,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import SecurityIcon from '@mui/icons-material/Security';
import HttpsIcon from '@mui/icons-material/Https';
import LockResetIcon from '@mui/icons-material/LockReset';
import DangerousIcon from '@mui/icons-material/Dangerous';
import HistoryIcon from '@mui/icons-material/History';

interface SecurityStats {
  sslEnabled: boolean;
  failedLogins24h: number;
  successfulLogins24h: number;
  lastPasswordReset?: string | null;
  accountLockThreshold?: number;
  failedAttemptsWindowMinutes?: number;
  env: string;
  nodeVersion?: string;
  totalUsers?: number;
  lockedUsers?: number;
  lockThreshold?: number;
  lockWindowMinutes?: number;
  lockDurationMinutes?: number;
}

interface LockedUser {
  id: number;
  email: string;
  name?: string | null;
  lockedUntil: string;
}

export default function AdminSecurityPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState<LockedUser[]>([]);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [unlocks, setUnlocks] = useState<any[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logFilters, setLogFilters] = useState({ kind: '', success: '', email: '', days: 7 });
  const [forceUserId, setForceUserId] = useState('');
  const [forceMinutes, setForceMinutes] = useState('60');
  const [forceLockMsg, setForceLockMsg] = useState<string | null>(null);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const loadLogs = useCallback(
    (page: number, filters = logFilters) => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '50');
      params.set('days', String(filters.days));
      if (filters.kind) params.set('kind', filters.kind);
      if (filters.success) params.set('success', filters.success);
      if (filters.email) params.set('email', filters.email);
      fetch('/api/admin/security/logs?' + params.toString())
        .then((r) => r.json())
        .then((d) => {
          setLogs(d.entries || []);
          setUnlocks(d.unlocks || []);
          setLogPage(d.page);
          setLogTotalPages(d.pages);
        })
        .catch(() => {});
    },
    [logFilters],
  );

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetch('/api/admin/security')
        .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
        .then((data) => setStats(data))
        .catch(() => setStats(null))
        .finally(() => setLoading(false));
      // load locked users list
      fetch('/api/admin/users/locked')
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => setLocked(d.users || []))
        .catch(() => setLocked([]));
      loadLogs(1, logFilters);
    } else if (status === 'authenticated') {
      setLoading(false);
    }
  }, [status, isAdmin, loadLogs, logFilters]);

  // loadLogs now a callback

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">Accès refusé. Réservé aux administrateurs.</Alert>
      </Container>
    );
  }

  return (
    // IMPORTANT: suppression de minHeight: '100vh' (AppShell + navbar fixe ajoutaient un dépassement)
    <Box
      sx={{
        p: 0,
      }}
    >
      <Box component={motion.div} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <SecurityIcon fontSize="large" color="primary" />
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Sécurité du Système
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Surveillance des principaux paramètres de sécurité
            </Typography>
          </Box>
        </Box>
        <Box display="flex" flexWrap="wrap" gap={2}>
          <Box flex="1 1 220px" minWidth={220}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <HttpsIcon color={stats?.sslEnabled ? 'success' : 'error'} />
                <Typography variant="subtitle2">SSL</Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>
                {stats?.sslEnabled ? 'Activé' : 'Inactif'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Transmission chiffrée
              </Typography>
            </Paper>
          </Box>
          <Box flex="1 1 220px" minWidth={220}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <DangerousIcon color="error" />
                <Typography variant="subtitle2">Connexions échouées (24h)</Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>
                {stats?.failedLogins24h}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tentatives suspectes surveillées
              </Typography>
            </Paper>
          </Box>
          <Box flex="1 1 220px" minWidth={220}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <HistoryIcon color="primary" />
                <Typography variant="subtitle2">Connexions réussies (24h)</Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>
                {stats?.successfulLogins24h}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Activité légitime
              </Typography>
            </Paper>
          </Box>
          <Box flex="1 1 220px" minWidth={220} mt={2}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <LockResetIcon color="warning" />
                <Typography variant="subtitle2">Seuil verrouillage</Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>
                {stats?.lockThreshold}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats?.lockWindowMinutes} min / durée {stats?.lockDurationMinutes}m
              </Typography>
            </Paper>
          </Box>
        </Box>
        <Divider sx={{ my: 4 }} />
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Comptes verrouillés
        </Typography>
        <Table size="small" sx={{ mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>Utilisateur</TableCell>
              <TableCell>Verrouillé jusqu'à</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locked.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>Aucun compte verrouillé</TableCell>
              </TableRow>
            )}
            {locked.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name || u.email}</TableCell>
                <TableCell>{new Date(u.lockedUntil).toLocaleString()}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      fetch(`/api/admin/users/unlock?id=${u.id}`, { method: 'POST' })
                        .then((r) => (r.ok ? r.json() : Promise.reject()))
                        .then(() => {
                          setLocked((prev) => prev.filter((x) => x.id !== u.id));
                        })
                        .catch(() => {});
                    }}
                  >
                    Déverrouiller
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Divider sx={{ my: 4 }} />
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Réinitialisation de mot de passe (outil d'administration)
        </Typography>
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <TextField
            size="small"
            label="Email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            fullWidth={isMobile}
          />
          <Button
            variant="contained"
            onClick={() => {
              fetch('/api/auth/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail }),
              })
                .then((r) => r.json())
                .then((d) => setResetToken(d.token || 'envoyé'))
                .catch(() => setResetToken(null));
            }}
          >
            Générer jeton
          </Button>
        </Box>
        {resetToken && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Jeton généré (dev): {resetToken}
          </Alert>
        )}
        <Divider sx={{ my: 4 }} />
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Forcer le verrouillage d'un compte
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap" mb={1}>
          <TextField
            size="small"
            label="User ID"
            value={forceUserId}
            onChange={(e) => setForceUserId(e.target.value.replace(/[^0-9]/g, ''))}
            fullWidth={isMobileSmall}
          />
          <TextField
            size="small"
            label="Minutes"
            value={forceMinutes}
            onChange={(e) => setForceMinutes(e.target.value.replace(/[^0-9]/g, ''))}
            fullWidth={isMobileSmall}
          />
          <Button
            size="small"
            variant="outlined"
            disabled={!forceUserId}
            onClick={() => {
              setForceLockMsg(null);
              const id = Number(forceUserId);
              const minutes = Number(forceMinutes) || 60;
              fetch(`/api/admin/users/force-lock?id=${id}&minutes=${minutes}`, { method: 'POST' })
                .then((r) => r.json())
                .then((d) => {
                  if (d?.ok) {
                    setForceLockMsg(
                      `Utilisateur ${id} verrouillé jusqu'à ${new Date(d.lockedUntil).toLocaleString()}`,
                    );
                    fetch('/api/admin/users/locked')
                      .then((r) => (r.ok ? r.json() : Promise.reject()))
                      .then((d2) => setLocked(d2.users || []))
                      .catch(() => {});
                  } else setForceLockMsg('Echec du verrouillage');
                })
                .catch(() => setForceLockMsg('Echec du verrouillage'));
            }}
          >
            Verrouiller
          </Button>
          <TextField
            size="small"
            label="Recherche email"
            placeholder="user@exemple"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim();
                if (!v) return;
                fetch(`/api/admin/users/lookup?email=${encodeURIComponent(v)}`)
                  .then((r) => r.json())
                  .then((d) => {
                    if (d?.user?.id) {
                      setForceUserId(String(d.user.id));
                      setForceLockMsg(
                        `ID trouvé: ${d.user.id}${d.user.lockedUntil ? ' (déjà verrouillé)' : ''}`,
                      );
                    } else {
                      setForceLockMsg('Email introuvable');
                    }
                  })
                  .catch(() => setForceLockMsg('Recherche échouée'));
              }
            }}
            fullWidth={isMobile}
          />
        </Box>
        {forceLockMsg && (
          <Typography variant="caption" color="text.secondary" display="block" mb={3}>
            {forceLockMsg}
          </Typography>
        )}
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Contexte d'exécution
        </Typography>
        <Divider sx={{ my: 4 }} />
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Journal d'authentification
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <TextField
            size="small"
            label="Type"
            value={logFilters.kind}
            onChange={(e) => setLogFilters((f) => ({ ...f, kind: e.target.value }))}
            fullWidth={isMobileSmall}
          />
          <TextField
            size="small"
            label="Succès (true/false)"
            value={logFilters.success}
            onChange={(e) => setLogFilters((f) => ({ ...f, success: e.target.value }))}
            fullWidth={isMobileSmall}
          />
          <TextField
            size="small"
            label="Email"
            value={logFilters.email}
            onChange={(e) => setLogFilters((f) => ({ ...f, email: e.target.value }))}
            fullWidth={isMobile}
          />
          <TextField
            size="small"
            label="Jours"
            type="number"
            value={logFilters.days}
            onChange={(e) => setLogFilters((f) => ({ ...f, days: Number(e.target.value) || 7 }))}
            fullWidth={isMobileSmall}
          />
          <Button size="small" variant="outlined" onClick={() => loadLogs(1, logFilters)}>
            Filtrer
          </Button>
        </Box>
      </Box>
      <Table size="small" sx={{ mb: 4 }}>
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Succès</TableCell>
            <TableCell>Ajouté</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>Aucune entrée</TableCell>
            </TableRow>
          )}
          {logs.map((l, i) => (
            <TableRow key={i}>
              <TableCell>{l.kind || 'LOGIN'}</TableCell>
              <TableCell>{l.email || '—'}</TableCell>
              <TableCell>{l.success ? '✔' : '❌'}</TableCell>
              <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="caption" display="block" gutterBottom>
        Page {logPage}/{logTotalPages}
      </Typography>
      <Box mb={4} display="flex" gap={1}>
        <Button size="small" disabled={logPage <= 1} onClick={() => loadLogs(logPage - 1)}>
          Précédent
        </Button>
        <Button
          size="small"
          disabled={logPage >= logTotalPages}
          onClick={() => loadLogs(logPage + 1)}
        >
          Suivant
        </Button>
      </Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Déverrouillages récents
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {unlocks.length === 0 && (
            <TableRow>
              <TableCell colSpan={2}>Aucun</TableCell>
            </TableRow>
          )}
          {unlocks.map((u, i) => (
            <TableRow key={i}>
              <TableCell>{u.email || '—'}</TableCell>
              <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Paramètre</TableCell>
            <TableCell>Valeur</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Environnement</TableCell>
            <TableCell>{stats?.env}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Utilisateurs total</TableCell>
            <TableCell>{stats?.totalUsers}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Utilisateurs verrouillés</TableCell>
            <TableCell>{stats?.lockedUsers}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Version Node.js</TableCell>
            <TableCell>{stats?.nodeVersion}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Dernière réinitialisation MDP</TableCell>
            <TableCell>{stats?.lastPasswordReset || 'Aucune'}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
}
