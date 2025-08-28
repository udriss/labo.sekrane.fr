'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Tooltip,
  Stack,
} from '@mui/material';
import { Tabs, Tab } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Edit, Delete, PersonAdd, Send, Search as SearchIcon } from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
// import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useSession } from 'next-auth/react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useImpersonation } from '@/lib/contexts/ImpersonationContext';
import { useTabWithURL } from '@/lib/hooks/useTabWithURL';
import { useWebSocketNotifications } from '@/lib/hooks/useWebSocketNotifications';
// Timeline MUI Lab pour la progression d'envoi
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';

interface UserRow {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive?: boolean;
  hasPassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminUsersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState<{
    email: string;
    name: string;
    role: string;
    password: string;
  }>({ email: '', name: '', role: 'ENSEIGNANT', password: '' });
  // Persist tabs in URL using indexes: 0=list, 1=bulk
  const { tabValue, handleTabChange } = useTabWithURL({ defaultTab: 0, maxTabs: 2 });
  const tab = tabValue === 1 ? 'bulk' : 'list';
  const setTab = (v: string) => handleTabChange(v === 'bulk' ? 1 : 0);
  const [bulkText, setBulkText] = useState('');
  const [bulkFormat, setBulkFormat] = useState<'csv' | 'txt' | 'manual'>('csv');
  const [manualCount, setManualCount] = useState<number>(0);
  const [manualRows, setManualRows] = useState<
    Array<{ email: string; name: string; role: string; password: string }>
  >([]);
  const [bulkResult, setBulkResult] = useState<null | { createdCount: number; created: any[] }>(
    null,
  );
  const [sendActivation] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [bulkFileName, setBulkFileName] = useState<string>('');
  const [preview, setPreview] = useState<null | {
    rows: Array<{
      email: string;
      name?: string;
      role?: string;
      password?: string;
      issues: string[];
      overwrite?: boolean;
    }>;
    hasErrors: boolean;
  }>(null);
  const [previewInfo, setPreviewInfo] = useState<
    Record<string, { id: number; name: string | null; lastLoginAt?: string | null }>
  >({});
  const [editRowIdx, setEditRowIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{
    email: string;
    name: string;
    role: string;
    password: string;
  }>({ email: '', name: '', role: 'ELEVE', password: '' });
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTargets, setEmailTargets] = useState<Array<{ email: string; name?: string }>>([]);
  const [emailStatuses, setEmailStatuses] = useState<
    Record<string, 'pending' | 'processing' | 'success' | 'error'>
  >({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState<Record<string, string>>({});
  // Suppression en lot
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { startImpersonation } = useImpersonation();
  const { url: wsUrl } = useWebSocketNotifications({
    userId: (session?.user as any)?.id || 'guest',
  });
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const handler = (e: any) => {
      const detail = e.detail || {};
      if (!detail || !detail.userId) return;
      setOnlineIds((prev) => {
        const next = new Set(prev);
        const uid = parseInt(String(detail.userId), 10);
        if (Number.isNaN(uid)) return prev;
        if (detail.status === 'online') next.add(uid);
        else if (detail.status === 'offline') next.delete(uid);
        return next;
      });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('ws-presence', handler as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('ws-presence', handler as any);
      }
    };
  }, []);

  // Initialize presence list via helper endpoint exposed by combined Next+WS server
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const loc = window.location;
        const base = `${loc.protocol}//${loc.host}`;
        const res = await fetch(`${base}/internal/online`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.userIds)) {
            const set = new Set<number>(
              json.userIds.map((n: any) => Number(n)).filter((n: number) => !Number.isNaN(n)),
            );
            if (!stop) setOnlineIds(set);
          }
        }
      } catch {}
      if (!stop) setTimeout(poll, 10000);
    };
    poll();
    return () => {
      stop = true;
    };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Erreur chargement');
      const json = await res.json();
      setUsers(json.users || []);
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) load();
    else if (status === 'authenticated') setLoading(false);
  }, [status, isAdmin]);

  const handleUpdate = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editUser.id, name: editUser.name, role: editUser.role }),
      });
      if (!res.ok) throw new Error('Échec mise à jour');
      await load();
      setEditUser(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Supprimer l'utilisateur ${u.email}?`)) return;
    try {
      const res = await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Échec suppression');
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const resendActivation = async (u: UserRow) => {
    try {
      const res = await fetch('/api/users/resend-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [u.email] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Échec envoi activation');
      alert("Email d'activation renvoyé (si applicable).");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const validateEmail = useCallback((email: string) => /.+@.+\..+/.test(email), []);
  const allowedRoles = React.useMemo(
    () =>
      new Set([
        'ADMIN',
        'ADMINLABO',
        'ENSEIGNANT',
        'LABORANTIN_PHYSIQUE',
        'LABORANTIN_CHIMIE',
        'ELEVE',
      ]),
    [],
  );

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [] as any[];
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    const out: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const email = cols[idx('email')] || '';
      const name = idx('name') >= 0 ? cols[idx('name')] : '';
      const role = idx('role') >= 0 ? cols[idx('role')] : 'ELEVE';
      const password = idx('password') >= 0 ? cols[idx('password')] : '';
      if (email) out.push({ email, name, role, password });
    }
    return out;
  };

  const parseTXT = (text: string) =>
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [email, name, role, password] = l.split(/[;,\t]/).map((s) => s.trim());
        return { email, name, role: role || 'ELEVE', password: password || '' };
      })
      .filter((r) => !!r.email);

  const makePreview = useCallback(() => {
    const rows = (
      bulkFormat === 'manual'
        ? manualRows
        : bulkFormat === 'csv'
          ? parseCSV(bulkText)
          : parseTXT(bulkText)
    ) as Array<{
      email: string;
      name?: string;
      role?: string;
      password?: string;
    }>;
    const seen = new Set<string>();
    const existing = new Set(users.map((u) => u.email.toLowerCase()));
    const prevOverwrite: Record<string, boolean> = {};
    if (preview?.rows?.length) {
      for (const pr of preview.rows) {
        prevOverwrite[pr.email.toLowerCase()] = !!pr.overwrite;
      }
    }
    const previewRows = rows.map((r) => {
      const issues: string[] = [];
      if (!validateEmail(r.email)) issues.push('Email invalide');
      if (!r.name || !r.name.trim()) issues.push('Nom manquant');
      const role = (r.role || 'ELEVE').toUpperCase();
      if (!allowedRoles.has(role)) issues.push('Rôle invalide');
      const low = r.email.toLowerCase();
      if (seen.has(low)) issues.push('Doublon dans le fichier');
      if (existing.has(low)) issues.push('Email déjà existant');
      seen.add(low);
      return { ...r, role, issues, overwrite: prevOverwrite[low] || false };
    });
    const hasErrors = previewRows.some((r) => {
      // If overwrite is checked, ignore the 'Email déjà existant' issue
      const issues = r.overwrite
        ? r.issues.filter((x) => !x.includes('Email déjà existant'))
        : r.issues;
      return issues.length > 0;
    });
    setPreview({ rows: previewRows, hasErrors });
    // Fetch existing account snap for emails flagged as existing
    (async () => {
      const emails = previewRows
        .filter((r) => r.issues.some((x) => x.includes('Email déjà existant')))
        .map((r) => r.email.toLowerCase());
      const unique = Array.from(new Set(emails));
      const entries: Record<
        string,
        { id: number; name: string | null; lastLoginAt?: string | null }
      > = {};
      await Promise.all(
        unique.map(async (email) => {
          try {
            const res = await fetch(`/api/admin/users/lookup?email=${encodeURIComponent(email)}`);
            const j = await res.json().catch(() => ({}));
            if (res.ok && j?.user?.id) {
              entries[email] = {
                id: j.user.id,
                name: j.user.name || null,
                lastLoginAt: j.user.lastLoginAt || null,
              };
            }
          } catch {}
        }),
      );
      setPreviewInfo(entries);
    })();
  }, [bulkFormat, bulkText, users, allowedRoles, validateEmail, manualRows, preview]);

  const recomputePreviewFlags = useCallback(
    (
      rows: Array<{
        email: string;
        name?: string;
        role?: string;
        password?: string;
        issues: string[];
        overwrite?: boolean;
      }>,
    ) => {
      const seen = new Set<string>();
      const existing = new Set(users.map((u) => u.email.toLowerCase()));
      const updated = rows.map((r) => {
        const issues: string[] = [];
        if (!validateEmail(r.email)) issues.push('Email invalide');
        if (!r.name || !r.name.trim()) issues.push('Nom manquant');
        const role = (r.role || 'ELEVE').toUpperCase();
        if (!allowedRoles.has(role)) issues.push('Rôle invalide');
        const low = (r.email || '').toLowerCase();
        if (seen.has(low)) issues.push('Doublon dans le fichier');
        if (existing.has(low)) issues.push('Email déjà existant');
        seen.add(low);
        return { ...r, role, issues };
      });
      const hasErrors = updated.some((r) => {
        const list = r.overwrite
          ? r.issues.filter((x) => !x.includes('Email déjà existant'))
          : r.issues;
        return list.length > 0;
      });
      setPreview({ rows: updated, hasErrors });
    },
    [allowedRoles, users, validateEmail, setPreview],
  );

  const beginEditRow = (idx: number) => {
    if (!preview) return;
    const r = preview.rows[idx];
    setEditRowIdx(idx);
    setEditDraft({
      email: r.email || '',
      name: r.name || '',
      role: (r.role || 'ELEVE') as string,
      password: r.password || '',
    });
  };

  const applyEditRow = () => {
    if (editRowIdx === null || !preview) return;
    const copy = preview.rows.slice();
    copy[editRowIdx] = {
      ...copy[editRowIdx],
      email: editDraft.email.trim(),
      name: editDraft.name,
      role: (editDraft.role || 'ELEVE').toUpperCase(),
      password: editDraft.password,
    };
    recomputePreviewFlags(copy as any);
    setEditRowIdx(null);
  };

  const removeRow = (idx: number) => {
    if (!preview) return;
    const copy = preview.rows.slice();
    copy.splice(idx, 1);
    recomputePreviewFlags(copy as any);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    const text = await f.text();
    const isCsv = /\.csv$/i.test(f.name);
    setBulkFormat(isCsv ? 'csv' : 'txt');
    setBulkText(text);
    setBulkFileName(f.name);
    setPreview(null);
    setBulkResult(null); // Réinitialiser les résultats lors du chargement d'un nouveau fichier
  };

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
        <Alert severity="error">Accès refusé. Administrateurs uniquement.</Alert>
      </Container>
    );
  }

  return (
    // Suppression minHeight 100vh pour éviter scroll inutile (navbar fixe déjà prise en compte)
    <Box
      sx={{
        p: 0,
      }}
    >
      <Box
        sx={{ px: 2, pt: 2 }}
        component={motion.div}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Box
          display="flex"
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          mb={1}
          flexDirection={{ xs: 'column', md: 'row' }}
          gap={1}
        >
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Gestion des utilisateurs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ajout, mise à jour, suppression et ajout en lot
            </Typography>
          </Box>
          <Tabs
            value={tab}
            onChange={(_e: any, v: string) => {
              setTab(v);
              setError(null); // Réinitialiser l'erreur lors du changement d'onglet
            }}
            aria-label="tabs users"
            variant={isMobileSmall ? 'scrollable' : 'standard'}
            scrollButtons={isMobileSmall ? 'auto' : false}
            allowScrollButtonsMobile
          >
            <Tab label="Liste" value="list" />
            <Tab
              icon={<UploadFileIcon fontSize="small" />}
              iconPosition="start"
              label="Ajouter en lot"
              value="bulk"
            />
          </Tabs>
        </Box>
      </Box>
      {tab === 'list' && (
        <Box sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 'bold',
              }}
            >
              {bulkDeleteMode ? 'Mode suppression en lot' : 'Liste des utilisateurs'}
            </Typography>
            <Box display="flex" gap={1} flexDirection={{ xs: 'column', sm: 'row' }}>
              {bulkDeleteMode ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setBulkDeleteMode(false);
                      setSelectedIds(new Set());
                    }}
                    fullWidth={isMobileSmall}
                  >
                    Annuler
                  </Button>
                  <Button
                    color="error"
                    variant="contained"
                    disabled={selectedIds.size === 0 || saving}
                    onClick={async () => {
                      if (selectedIds.size === 0) return;
                      if (!confirm(`Supprimer ${selectedIds.size} utilisateur(s) ?`)) return;
                      setSaving(true);
                      try {
                        // Suppression séquentielle avec l'API existante
                        for (const id of Array.from(selectedIds)) {
                          const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
                          if (!res.ok) throw new Error('Échec suppression');
                        }
                        await load();
                        setSelectedIds(new Set());
                        setBulkDeleteMode(false);
                      } catch (e: any) {
                        setError(e.message || 'Erreur suppression');
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    Supprimer la sélection ({selectedIds.size})
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    color="error"
                    variant="outlined"
                    onClick={() => setBulkDeleteMode(true)}
                    fullWidth={isMobileSmall}
                  >
                    Suppression en lot
                  </Button>
                  <Button
                    startIcon={<PersonAdd />}
                    variant="outlined"
                    color="success"
                    onClick={() => setCreateOpen(true)}
                    fullWidth={isMobileSmall}
                  >
                    Ajouter
                  </Button>
                </>
              )}
            </Box>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                {bulkDeleteMode && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedIds.size > 0 && selectedIds.size < users.length}
                      checked={
                        users.filter((u) => u.id !== 1).length > 0 &&
                        selectedIds.size === users.filter((u) => u.id !== 1).length
                      }
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedIds(new Set(users.filter((u) => u.id !== 1).map((u) => u.id)));
                        else setSelectedIds(new Set());
                      }}
                    />
                  </TableCell>
                )}
                <TableCell>ID</TableCell>
                <TableCell>Connexion</TableCell>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                {!bulkDeleteMode && <TableCell>Statut</TableCell>}
                {!bulkDeleteMode && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  {bulkDeleteMode && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        disabled={u.id === 1}
                        checked={u.id !== 1 && selectedIds.has(u.id)}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(u.id);
                            else next.delete(u.id);
                            return next;
                          });
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell>{u.id}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={onlineIds.has(u.id) ? 'success' : 'default'}
                      label={onlineIds.has(u.id) ? 'En ligne' : 'Hors ligne'}
                      variant={onlineIds.has(u.id) ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>{u.name || <em>(non défini)</em>}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={u.role}
                      color={u.role === 'ADMIN' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  {!bulkDeleteMode && (
                    <TableCell>
                      {u.hasPassword ? (
                        <Chip
                          size="small"
                          color="success"
                          label={u.isActive === false ? 'Mot de passe défini (inactif)' : 'Actif'}
                        />
                      ) : (
                        <Chip
                          size="small"
                          color="warning"
                          label={
                            u.isActive === false
                              ? 'Inactif (sans mot de passe)'
                              : 'Sans mot de passe'
                          }
                        />
                      )}
                    </TableCell>
                  )}
                  {!bulkDeleteMode && (
                    <TableCell align="right">
                      <Stack
                        sx={{
                          flexDirection: 'row',
                          gap: 1,
                          display: 'flex',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <Tooltip title="Modifier">
                          <IconButton
                            size="small"
                            onClick={() => setEditUser(u)}
                            sx={{
                              py: 0,
                              px: 0.5,
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Inspecter ce profil">
                          <IconButton
                            size="small"
                            onClick={() =>
                              startImpersonation({
                                id: u.id,
                                email: u.email,
                                name: u.name || undefined,
                                role: u.role,
                              })
                            }
                            sx={{ py: 0, px: 0.5 }}
                          >
                            <SearchIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Stack
                        sx={{
                          flexDirection: 'row',
                          gap: 1,
                          display: 'flex',
                          justifyContent: 'flex-end',
                        }}
                      >
                        {(!u.hasPassword || u.isActive === false) && (
                          <Tooltip title="Renvoyer activation">
                            <IconButton
                              size="small"
                              color="primary"
                              sx={{
                                py: 0,
                                px: 0.5,
                              }}
                              onClick={() => resendActivation(u)}
                            >
                              <Send fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(u)}
                            sx={{
                              py: 0,
                              px: 0.5,
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Aucun utilisateur
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </Box>
        </Box>
      )}
      {tab === 'bulk' && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Importer en lot (CSV ou TXT)
          </Typography>
          {/* Tutoriels: communs puis spécifiques au mode */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" gutterBottom>
              Consignes communes
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div" sx={{ mb: 1.5 }}>
              • Une ligne par utilisateur (ou une ligne du tableau en mode Manuel).
              <br />• Champs requis: <strong>email</strong> et <strong>name</strong>.<br />• Champs
              optionnels: <strong>role</strong> et <strong>password</strong>.<br />• Rôles
              autorisés: <code>ELEVE</code>, <code>LABORANTIN_PHYSIQUE</code>,{' '}
              <code>LABORANTIN_CHIMIE</code>, <code>ENSEIGNANT</code>, <code>ADMINLABO</code>,{' '}
              <code>ADMIN</code> (par défaut: <strong>ELEVE</strong>).
              <br />• Les doublons (dans le fichier ou déjà existants en base) seront signalés à la
              prévisualisation.
            </Typography>

            {bulkFormat === 'csv' && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Spécifiques au format CSV
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" sx={{ mb: 1 }}>
                  • Le fichier doit commencer par une ligne d’en-têtes.
                  <br />• En-têtes acceptées: <code>email</code>, <code>name</code>,{' '}
                  <code>role</code>, <code>password</code>.<br />• Exemple:
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre',
                    p: 1,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {`email,name,role,password\n`}
                  {`jane.doe@ex.fr,Jane Doe,ENSEIGNANT,\n`}
                  {`paul@ex.fr,Paul Dupont,ELEVE,`}
                </Box>
              </>
            )}

            {bulkFormat === 'txt' && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Spécifiques au format TXT
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" sx={{ mb: 1 }}>
                  • Une ligne par utilisateur au format <strong>email;name;role;password</strong>.
                  <br />• Séparateurs acceptés: point-virgule (<code>;</code>), virgule (
                  <code>,</code>) ou tabulation.
                  <br />• Exemple:
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre',
                    p: 1,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {`jane.doe@ex.fr;Jane Doe;ENSEIGNANT;\n`}
                  {`paul@ex.fr;Paul Dupont;ELEVE;`}
                </Box>
              </>
            )}

            {bulkFormat === 'manual' && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Spécifiques au mode Manuel
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Renseignez les colonnes du tableau. Vous pouvez ajouter le nombre de lignes
                  souhaité, puis prévisualiser et importer.
                </Typography>
              </>
            )}
          </Paper>
          <Box display="flex" flexDirection="column" gap={2} mb={2}>
            <Box>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={bulkFormat}
                onChange={(_e: unknown, v: 'csv' | 'txt' | 'manual' | null) => {
                  if (!v) return;
                  setBulkFormat(v);
                  setBulkResult(null); // Réinitialiser les résultats lors du changement de format
                  setPreview(null); // Réinitialiser la prévisualisation
                }}
              >
                <ToggleButton value="csv" aria-label="CSV">
                  <UploadFileIcon fontSize="small" />
                  <Box component="span" sx={{ ml: 1 }}>
                    CSV
                  </Box>
                </ToggleButton>
                <ToggleButton value="txt" aria-label="TXT">
                  <UploadFileIcon fontSize="small" />
                  <Box component="span" sx={{ ml: 1 }}>
                    TXT
                  </Box>
                </ToggleButton>
                <ToggleButton value="manual" aria-label="MANUAL">
                  <Edit fontSize="small" />
                  <Box component="span" sx={{ ml: 1 }}>
                    Manuel
                  </Box>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {bulkFormat !== 'manual' ? (
              <Box
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={onDrop}
                sx={{
                  flex: 1,
                  p: 2,
                  border: '2px dashed',
                  borderColor: dragOver ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  minHeight: 160,
                  bgcolor: dragOver ? 'action.hover' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
                onClick={async () => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv,.txt';
                  input.onchange = async (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const text = await file.text();
                      const isCsv = /\.csv$/i.test(file.name);
                      setBulkFormat(isCsv ? 'csv' : 'txt');
                      setBulkText(text);
                      setBulkFileName(file.name);
                      setPreview(null);
                      setBulkResult(null); // Réinitialiser les résultats lors du chargement d'un nouveau fichier
                    }
                  };
                  input.click();
                }}
              >
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Glissez-déposez votre fichier ici
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ou cliquez pour sélectionner un fichier (.csv ou .txt)
                  </Typography>
                  {bulkFileName && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Fichier sélectionné: <strong>{bulkFileName}</strong>
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : (
              <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Box display="flex" gap={2} alignItems="center" sx={{ mb: 2 }}>
                  <TextField
                    type="number"
                    label="Nombre de lignes"
                    size="small"
                    inputProps={{ min: 0, max: 1000 }}
                    value={manualCount}
                    onChange={(e) => {
                      const n = Math.max(0, Math.min(1000, Number(e.target.value) || 0));
                      setManualCount(n);
                      setManualRows((rows) => {
                        const copy = rows.slice();
                        if (n > copy.length) {
                          for (let i = copy.length; i < n; i++) {
                            copy.push({ email: '', name: '', role: 'ELEVE', password: '' });
                          }
                        } else if (n < copy.length) {
                          copy.length = n;
                        }
                        return copy;
                      });
                    }}
                    sx={{ width: 200 }}
                  />
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Nom</TableCell>
                      <TableCell>Rôle</TableCell>
                      <TableCell>Mot de passe</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {manualRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            value={r.email}
                            onChange={(e) =>
                              setManualRows((rows) => {
                                const copy = rows.slice();
                                copy[i] = { ...copy[i], email: e.target.value };
                                return copy;
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            value={r.name}
                            onChange={(e) =>
                              setManualRows((rows) => {
                                const copy = rows.slice();
                                copy[i] = { ...copy[i], name: e.target.value };
                                return copy;
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            fullWidth
                            value={r.role}
                            onChange={(e) =>
                              setManualRows((rows) => {
                                const copy = rows.slice();
                                copy[i] = { ...copy[i], role: e.target.value } as any;
                                return copy;
                              })
                            }
                          >
                            {[
                              'ELEVE',
                              'LABORANTIN_PHYSIQUE',
                              'LABORANTIN_CHIMIE',
                              'ENSEIGNANT',
                              'ADMINLABO',
                              'ADMIN',
                            ].map((rr) => (
                              <MenuItem key={rr} value={rr}>
                                {rr}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="password"
                            fullWidth
                            value={r.password}
                            onChange={(e) =>
                              setManualRows((rows) => {
                                const copy = rows.slice();
                                copy[i] = { ...copy[i], password: e.target.value };
                                return copy;
                              })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {manualRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">
                            Aucune ligne. Choisissez un nombre au-dessus.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              startIcon={<UploadFileIcon />}
              variant="outlined"
              color="success"
              disabled={bulkFormat === 'manual' ? manualRows.length === 0 : !bulkText.trim()}
              onClick={async () => {
                setSaving(true);
                setBulkResult(null);
                try {
                  // Always compute preview-like validation on the fly if not present
                  if (!preview) {
                    makePreview();
                  }
                  // Wait a tick to allow makePreview to update state
                  await new Promise((r) => setTimeout(r, 0));
                  if (preview && preview.hasErrors) {
                    setSaving(false);
                    setError('Corrigez les lignes en rouge avant import.');
                    return;
                  }

                  // Build rows to send: honor preview edits when available
                  let rowsToSend: Array<{
                    email: string;
                    name?: string;
                    role?: string;
                    password?: string;
                    overwrite?: boolean;
                  }> = [];
                  if (bulkFormat === 'manual') {
                    rowsToSend = preview
                      ? preview.rows.map((r) => ({
                          email: r.email,
                          name: r.name,
                          role: r.role,
                          password: r.password,
                          overwrite: !!r.overwrite,
                        }))
                      : manualRows;
                  } else if (preview) {
                    rowsToSend = preview.rows.map((r) => ({
                      email: r.email,
                      name: r.name,
                      role: r.role,
                      password: r.password,
                      overwrite: !!r.overwrite,
                    }));
                  } else {
                    // Should not happen, but fallback
                    rowsToSend = bulkFormat === 'csv' ? parseCSV(bulkText) : parseTXT(bulkText);
                  }

                  const res = await fetch('/api/users/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rows: rowsToSend, sendActivation: false }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || 'Import échoué');
                  setBulkResult(json);
                  await load();
                  // Ouvrir automatiquement le dialogue d'envoi des emails
                  const created = json.created || [];
                  // Politique: n'envoyer qu'aux comptes inactifs (sans mot de passe)
                  const targets = created
                    .filter((u: any) => u && (u.isActive === false || u.hasPassword === false))
                    .map((u: any) => ({ email: u.email, name: u.name }));
                  const statusInit: Record<string, 'pending' | 'processing' | 'success' | 'error'> =
                    {};
                  targets.forEach((t: { email: string }) => (statusInit[t.email] = 'pending'));
                  setEmailTargets(targets);
                  setEmailStatuses(statusInit);
                  setEmailLogs({});
                  setEmailError(null);
                  setEmailDialogOpen(true);
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Importer
            </Button>
            {/* Envoi automatique désactivé: l'envoi se fait via le dialogue après import */}
            <Button
              disabled={bulkFormat === 'manual' ? manualRows.length === 0 : !bulkText.trim()}
              onClick={() => {
                makePreview();
                setBulkResult(null); // Réinitialiser les résultats lors de la prévisualisation
              }}
            >
              Prévisualiser
            </Button>
          </Box>
          {preview && (
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="body2"
                gutterBottom
                sx={{
                  fontWeight: 'bold',
                  color: preview.hasErrors ? 'error.main' : 'success.main',
                }}
              >
                Aperçu ({preview.rows.length} lignes)
              </Typography>
              <Alert severity={preview.hasErrors ? 'error' : 'success'} sx={{ my: 2 }}>
                {preview.hasErrors
                  ? 'Corrigez les lignes en rouge avant import.'
                  : 'Aucun problème détecté.'}
              </Alert>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Écraser</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Nom</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell>Problèmes</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.rows.map((r, i) => {
                    const exists = r.issues.some((x) => x.includes('Email déjà existant'));
                    const info = previewInfo[r.email.toLowerCase()];
                    return (
                      <React.Fragment key={i}>
                        <TableRow
                          sx={{
                            bgcolor: (
                              r.overwrite
                                ? r.issues.filter((x) => !x.includes('Email déjà existant')).length
                                : r.issues.length
                            )
                              ? 'error.lighter'
                              : undefined,
                          }}
                        >
                          <TableCell width={96}>
                            {exists ? (
                              <Checkbox
                                size="small"
                                checked={!!r.overwrite}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const copy = preview!.rows.slice();
                                  copy[i] = { ...copy[i], overwrite: checked } as any;
                                  recomputePreviewFlags(copy as any);
                                }}
                              />
                            ) : (
                              <Tooltip title="Aucun compte existant — rien à écraser">
                                <span>
                                  <Checkbox size="small" disabled />
                                </span>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              color: r.issues.some((x) => x.includes('Email'))
                                ? 'error.main'
                                : undefined,
                              fontWeight: r.issues.some((x) => x.includes('Email')) ? 500 : 400,
                            }}
                          >
                            {r.email}
                          </TableCell>
                          <TableCell>{r.name || ''}</TableCell>
                          <TableCell
                            sx={{
                              color: r.issues.some((x) => x.includes('Rôle'))
                                ? 'error.main'
                                : undefined,
                              fontWeight: r.issues.some((x) => x.includes('Rôle')) ? 500 : 400,
                            }}
                          >
                            {r.role}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const effectiveIssues = r.overwrite
                                ? r.issues.filter((x) => !x.includes('Email déjà existant'))
                                : r.issues;
                              if (effectiveIssues.length === 0) {
                                return <Chip size="small" color="success" label="OK" />;
                              }
                              if (
                                r.overwrite &&
                                r.issues.some((x) => x.includes('Email déjà existant'))
                              ) {
                                return (
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: 0.5,
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Chip size="small" color="info" label="Écrasement activé" />
                                    {effectiveIssues.map((iss, idx) => (
                                      <Chip key={idx} size="small" color="error" label={iss} />
                                    ))}
                                  </Box>
                                );
                              }
                              return (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 0.5,
                                    alignItems: 'center',
                                  }}
                                >
                                  {r.issues.map((iss, idx) => (
                                    <Chip key={idx} size="small" color="error" label={iss} />
                                  ))}
                                </Box>
                              );
                            })()}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Modifier la ligne">
                              <IconButton size="small" onClick={() => beginEditRow(i)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer la ligne">
                              <IconButton size="small" color="error" onClick={() => removeRow(i)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                        {exists && info && (
                          <TableRow>
                            <TableCell colSpan={6} sx={{ py: 0.5, bgcolor: 'background.default' }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: r.overwrite ? 'text.disabled' : 'text.secondary',
                                  textDecoration: r.overwrite ? 'line-through' : 'none',
                                }}
                              >
                                Compte existant: ID #{info.id} — {info.name || '(sans nom)'}
                                {info.lastLoginAt && (
                                  <>
                                    {' '}
                                    • Dernière connexion:{' '}
                                    {new Date(info.lastLoginAt).toLocaleString()}
                                  </>
                                )}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
          {bulkResult && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                {bulkResult.createdCount ?? bulkResult.created?.length ?? 0}{' '}
                {(bulkResult.createdCount ?? bulkResult.created?.length ?? 0) === 1
                  ? 'utilisateur ajouté.'
                  : 'utilisateurs ajoutés.'}
              </Alert>
              {bulkResult.created?.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Nom</TableCell>
                      <TableCell>Rôle</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bulkResult.created.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.name || ''}</TableCell>
                        <TableCell>{u.role}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<Send />}
                  onClick={() => {
                    // Politique: n'envoyer qu'aux comptes inactifs (sans mot de passe)
                    const targets = (bulkResult.created || [])
                      .filter((u: any) => u && (u.isActive === false || u.hasPassword === false))
                      .map((u: any) => ({ email: u.email, name: u.name }));
                    setEmailTargets(targets);
                    const init: Record<string, 'pending' | 'processing' | 'success' | 'error'> = {};
                    targets.forEach((t: { email: string }) => (init[t.email] = 'pending'));
                    setEmailStatuses(init);
                    setEmailLogs({});
                    setEmailError(null);
                    setEmailDialogOpen(true);
                  }}
                >
                  Envoyer emails d'activation
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Dialog de modification d'utilisateur */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Modifier utilisateur</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Nom"
            size="small"
            value={editUser?.name || ''}
            onChange={(e) => setEditUser((u) => (u ? { ...u, name: e.target.value } : u))}
            fullWidth
          />
          <TextField label="Email" size="small" value={editUser?.email || ''} disabled fullWidth />
          <TextField
            label="Rôle"
            select
            size="small"
            value={editUser?.role || ''}
            onChange={(e) => setEditUser((u) => (u ? { ...u, role: e.target.value } : u))}
            fullWidth
          >
            {['ENSEIGNANT', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE', 'ADMINLABO', 'ADMIN'].map(
              (r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ),
            )}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Annuler</Button>
          <Button onClick={handleUpdate} disabled={saving} variant="contained">
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de création d'utilisateur */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Ajouter un utilisateur</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Email"
            size="small"
            value={newUser.email}
            onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Nom"
            size="small"
            value={newUser.name}
            onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Mot de passe"
            type="password"
            size="small"
            value={newUser.password}
            onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Rôle"
            select
            size="small"
            value={newUser.role}
            onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
            fullWidth
          >
            {[
              'ENSEIGNANT',
              'LABORANTIN_PHYSIQUE',
              'LABORANTIN_CHIMIE',
              'ADMINLABO',
              'ADMIN',
              'ELEVE',
            ].map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button
            onClick={async () => {
              setSaving(true);
              try {
                const res = await fetch('/api/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newUser),
                });
                if (!res.ok) throw new Error('Erreur création');
                setCreateOpen(false);
                setNewUser({ email: '', name: '', role: 'ENSEIGNANT', password: '' });
                await load();
              } catch (e: any) {
                setError(e.message);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !newUser.email || !newUser.password}
            variant="contained"
          >
            {saving ? 'Création…' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'édition de ligne (aperçu) */}
      <Dialog
        open={editRowIdx !== null}
        onClose={() => setEditRowIdx(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Modifier une ligne</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Email"
            size="small"
            value={editDraft.email}
            onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Nom"
            size="small"
            value={editDraft.name}
            onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Rôle"
            select
            size="small"
            value={editDraft.role}
            onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value }))}
            fullWidth
          >
            {[
              'ELEVE',
              'LABORANTIN_PHYSIQUE',
              'LABORANTIN_CHIMIE',
              'ADMINLABO',
              'ADMIN',
              'ENSEIGNANT',
            ].map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Mot de passe (optionnel)"
            size="small"
            value={editDraft.password}
            onChange={(e) => setEditDraft((d) => ({ ...d, password: e.target.value }))}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRowIdx(null)}>Annuler</Button>
          <Button onClick={applyEditRow} variant="contained">
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'envoi d'emails d'activation */}
      <Dialog
        open={emailDialogOpen}
        onClose={() => !emailSending && setEmailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Envoi d'emails d'activation</DialogTitle>
        <DialogContent>
          {emailError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {emailError}
            </Alert>
          )}
          {emailTargets.length === 0 ? (
            <Alert severity="info">Aucun destinataire détecté (tous ont un mot de passe).</Alert>
          ) : (
            <>
              <Typography variant="body2" gutterBottom>
                {emailTargets.length} destinataire(s) recevront un lien d'activation valable 7
                jours. L'envoi sera effectué séquentiellement.
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                {emailTargets.map((t) => {
                  const status = emailStatuses[t.email] || 'pending';
                  return (
                    <Box
                      key={t.email}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ py: 0.5, gap: 1 }}
                    >
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {t.name || '(sans nom)'} — {t.email}
                      </Typography>
                      <Chip
                        size="small"
                        label={status}
                        color={
                          status === 'success'
                            ? 'success'
                            : status === 'error'
                              ? 'error'
                              : status === 'processing'
                                ? 'info'
                                : 'default'
                        }
                      />
                      <Tooltip title="Envoyer uniquement à cet utilisateur">
                        <span>
                          <IconButton
                            size="small"
                            disabled={emailSending}
                            onClick={async () => {
                              setEmailStatuses((s) => ({ ...s, [t.email]: 'processing' }));
                              try {
                                const res = await fetch('/api/users/resend-activation', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ emails: [t.email] }),
                                });
                                const j = await res.json().catch(() => ({}));
                                const ok = !!(
                                  res.ok &&
                                  j?.ok === true &&
                                  Array.isArray(j?.results) &&
                                  j.results[0]?.ok === true
                                );
                                const msg =
                                  j?.results?.[0]?.message ||
                                  j?.error ||
                                  (ok ? 'OK' : 'Échec envoi');
                                setEmailLogs((l) => ({ ...l, [t.email]: msg }));
                                setEmailStatuses((s) => ({
                                  ...s,
                                  [t.email]: ok ? 'success' : 'error',
                                }));
                                if (!ok) setEmailError(msg);
                              } catch (e: any) {
                                setEmailStatuses((s) => ({ ...s, [t.email]: 'error' }));
                                setEmailError(e.message || 'Erreur envoi');
                              }
                            }}
                          >
                            <Send fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Paper>
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Progression
                </Typography>
                <Timeline sx={{ mt: 0, pt: 0 }}>
                  {emailTargets.map((t, idx) => {
                    const status = emailStatuses[t.email] || 'pending';
                    const color: 'grey' | 'error' | 'primary' | 'success' =
                      status === 'success'
                        ? 'success'
                        : status === 'error'
                          ? 'error'
                          : status === 'processing'
                            ? 'primary'
                            : 'grey';
                    return (
                      <TimelineItem key={`tl-${t.email}`}>
                        <TimelineSeparator>
                          <TimelineDot
                            color={color === 'grey' ? undefined : (color as any)}
                            variant={status === 'pending' ? 'outlined' : 'filled'}
                          />
                          {idx < emailTargets.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent sx={{ py: 0.5 }}>
                          <Typography variant="body2">
                            {t.name || '(sans nom)'} — {t.email}
                          </Typography>
                          {emailLogs[t.email] && (
                            <Box
                              component="pre"
                              sx={{
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                p: 1,
                                fontSize: 12,
                                whiteSpace: 'pre-wrap',
                                maxHeight: 200,
                                overflow: 'auto',
                                borderRadius: 1,
                                mt: 0.5,
                              }}
                            >
                              {emailLogs[t.email]}
                            </Box>
                          )}
                        </TimelineContent>
                      </TimelineItem>
                    );
                  })}
                </Timeline>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEmailDialogOpen(false);
              setEmailError(null); // Réinitialiser l'erreur d'email
            }}
            disabled={emailSending}
          >
            Fermer
          </Button>
          <Button
            variant="contained"
            disabled={emailSending || emailTargets.length === 0}
            onClick={async () => {
              setEmailSending(true);
              setEmailError(null);
              // envoi séquentiel pour suivi fin
              for (const t of emailTargets) {
                setEmailStatuses((s) => ({ ...s, [t.email]: 'processing' }));
                try {
                  const res = await fetch('/api/users/resend-activation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emails: [t.email] }),
                  });
                  const j = await res.json().catch(() => ({}));
                  const ok = !!(
                    res.ok &&
                    j?.ok === true &&
                    Array.isArray(j?.results) &&
                    j.results[0]?.ok === true
                  );
                  const msg = j?.results?.[0]?.message || j?.error || (ok ? 'OK' : 'Échec envoi');
                  setEmailLogs((l) => ({ ...l, [t.email]: msg }));
                  setEmailStatuses((s) => ({ ...s, [t.email]: ok ? 'success' : 'error' }));
                  if (!ok) throw new Error(msg);
                } catch (e: any) {
                  setEmailStatuses((s) => ({ ...s, [t.email]: 'error' }));
                  setEmailError(e.message || 'Erreur envoi');
                }
              }
              setEmailSending(false);
            }}
          >
            Lancer l'envoi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
