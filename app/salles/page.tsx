'use client';
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  Alert,
  Divider,
  List,
  ListItem,
  Autocomplete,
} from '@mui/material';
import DataExportTab from '@/components/export/DataExportTab';
import type { Column } from '@/types/export';
import { Add, Edit, Delete, Room, MeetingRoom } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useTabWithURL } from '@/lib/hooks/useTabWithURL';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';

interface Localisation {
  id?: number;
  name: string;
  description?: string | null;
  _delete?: boolean;
}
interface Salle {
  id: number;
  name: string;
  description?: string | null;
  batiment?: string | null;
  placesDisponibles?: number | null;
  userOwnerId?: number | null;
  localisations: Localisation[];
}

// Module-level cache to persist draft form & localisations while navigating / closing dialog
const salleDraftCache: { form?: any; locs?: Localisation[] } = {} as any;

export default function SallesPage() {
  const theme = useTheme();
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onError = (e: any) => {
      if (e?.message && /originalFactory\.call/.test(e.message)) {
        console.error('[Diagnostic] originalFactory.call error', e.error || e.message);
      }
    };
    window.addEventListener('error', onError);
    return () => window.removeEventListener('error', onError);
  }, []);
  const isAdmin = role === 'ADMIN' || role === 'ADMINLABO';

  // Hook pour la gestion des tabs avec URL
  const { tabValue: tab, handleTabChange } = useTabWithURL({
    defaultTab: 0,
    maxTabs: 3, // 0: mes salles, 1: toutes, 2: export
  });

  const [loading, setLoading] = useState(true);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [mine, setMine] = useState<Salle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Salle | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    batiment: '',
    placesDisponibles: '',
    userOwnerId: '' as string | number | '',
  });
  const [locs, setLocs] = useState<Localisation[]>([]);
  const [saving, setSaving] = useState(false);
  const [usersList, setUsersList] = useState<{ id: number; name: string | null; email: string }[]>(
    [],
  );
  const [loadingUsers, setLoadingUsers] = useState(false);
  // export via onglet

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch('/api/salles');
      if (!r.ok) throw new Error('Chargement salles échoué');
      const j = await r.json();
      setSalles(j.salles || []);
      setMine(j.mine || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    if (salleDraftCache.form) {
      setForm(salleDraftCache.form);
      setLocs(salleDraftCache.locs || []);
    } else {
      // Prefill owner for non-admins
      const sessionUserId = (session?.user as any)?.id;
      const ownerValue = isAdmin ? '' : sessionUserId?.toString() || '';
      setForm({
        name: '',
        description: '',
        batiment: '',
        placesDisponibles: '',
        userOwnerId: ownerValue,
      });
      setLocs([]);
    }
    setDialogOpen(true);
  };
  const openEdit = (s: Salle) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description || '',
      batiment: s.batiment || '',
      placesDisponibles: s.placesDisponibles?.toString() || '',
      userOwnerId: s.userOwnerId ? s.userOwnerId.toString() : '',
    });
    setLocs(s.localisations.map((l) => ({ ...l })));
    setDialogOpen(true);
  };

  // Fetch users list for admin when dialog opens (for owner autocomplete)
  useEffect(() => {
    let cancelled = false;
    if (dialogOpen && isAdmin) {
      setLoadingUsers(true);
      fetch('/api/users')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled) return;
          setUsersList(
            (d?.users || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email })),
          );
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoadingUsers(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, isAdmin]);
  const closeDialog = () => {
    if (!saving) {
      // cache current draft if new (not editing existing)
      if (!editing) {
        salleDraftCache.form = form;
        salleDraftCache.locs = locs;
      }
      setDialogOpen(false);
    }
  };

  const addLoc = () => setLocs((l) => [...l, { name: 'Nouvelle localisation' }]);
  const updateLoc = (idx: number, patch: Partial<Localisation>) =>
    setLocs((l) => l.map((loc, i) => (i === idx ? { ...loc, ...patch } : loc)));
  const deleteLoc = (idx: number) =>
    setLocs((l) => l.map((loc, i) => (i === idx ? { ...loc, _delete: true } : loc)));
  const restoreLoc = (idx: number) =>
    setLocs((l) => l.map((loc, i) => (i === idx ? { ...loc, _delete: false } : loc)));

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        batiment: form.batiment.trim() || undefined,
        placesDisponibles: form.placesDisponibles ? Number(form.placesDisponibles) : undefined,
        userOwnerId: form.userOwnerId ? Number(form.userOwnerId) : undefined,
        localisations: locs.map((l) => ({
          id: l.id,
          name: l.name,
          description: l.description,
          _delete: l._delete,
        })),
      };
      const url = editing ? '/api/salles' : '/api/salles';
      const method = editing ? 'PUT' : 'POST';
      if (editing) payload.id = editing.id;
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Echec sauvegarde salle');
      const json = await r.json().catch(() => ({}));
      const returnedSalle = json?.salle;
      if (returnedSalle) {
        setSalles((prev) => {
          if (editing) {
            return prev.map((s) => (s.id === returnedSalle.id ? returnedSalle : s));
          }
          // insertion triée par nom
          const next = [...prev, returnedSalle];
          next.sort((a, b) => a.name.localeCompare(b.name));
          return next;
        });
        // mettre à jour mine si propriétaire
        const sessionUserId = (session?.user as any)?.id;
        const numericUserId =
          typeof sessionUserId === 'string' ? parseInt(sessionUserId, 10) : sessionUserId;
        if (returnedSalle.userOwnerId && returnedSalle.userOwnerId === numericUserId) {
          setMine((prev) => {
            if (editing) {
              return prev.map((s) => (s.id === returnedSalle.id ? returnedSalle : s));
            }
            const exists = prev.some((s) => s.id === returnedSalle.id);
            if (exists) return prev;
            const next = [...prev, returnedSalle];
            next.sort((a, b) => a.name.localeCompare(b.name));
            return next;
          });
        } else if (editing) {
          // si on a modifié une salle qui n'est plus à l'utilisateur, l'en retirer
          setMine((prev) => prev.filter((s) => s.id !== returnedSalle.id));
        }
      } else {
        // fallback si pas de salle renvoyée: rechargement complet
        await load();
      }
      setDialogOpen(false);
      if (!editing) {
        salleDraftCache.form = undefined;
        salleDraftCache.locs = undefined;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeSalle = async (s: Salle) => {
    if (!confirm(`Supprimer la salle "${s.name}" ?`)) return;
    const r = await fetch(`/api/salles?id=${s.id}`, { method: 'DELETE' });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.message || 'Suppression impossible');
    }
    await load();
  };

  const list = tab === 0 ? mine : salles;

  const columns: Column<Salle>[] = [
    { id: 'name', header: 'Nom', cell: (r) => r.name, exportValue: (r) => r.name },
    {
      id: 'bat',
      header: 'Bâtiment',
      cell: (r) => r.batiment || '-',
      exportValue: (r) => r.batiment || '',
    },
    {
      id: 'places',
      header: 'Places',
      cell: (r) => r.placesDisponibles ?? '-',
      exportValue: (r) => r.placesDisponibles ?? '',
    },
    {
      id: 'locs',
      header: 'Localisations',
      cell: (r) => r.localisations.map((l) => l.name).join(', ') || '-',
      exportValue: (r) => r.localisations.map((l) => l.name).join(', '),
    },
  ];

  return (
    <Box
      sx={{
        p: 0,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        gap={1}
        mb={2}
      >
        <Typography
          variant="h4"
          component="div"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            <MeetingRoom fontSize="medium" />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            Gestion des salles
          </Box>
        </Typography>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          sx={{ width: isMobileSmall ? '100%' : 'auto' }}
        >
          <Button
            startIcon={<Add />}
            onClick={openNew}
            variant="contained"
            fullWidth={isMobileSmall}
          >
            Nouvelle salle
          </Button>
        </Stack>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Tabs
        value={tab}
        onChange={(_, v) => handleTabChange(v)}
        sx={{ mb: 2 }}
        variant={isMobileSmall ? 'scrollable' : 'standard'}
        scrollButtons={isMobileSmall ? 'auto' : false}
        allowScrollButtonsMobile
      >
        <Tab label={`Mes salles (${mine.length})`} />
        <Tab label={`Toutes (${salles.length})`} />
        <Tab label="Export" />
      </Tabs>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={34} />
        </Box>
      ) : tab === 2 ? (
        <Box sx={{ mt: 1 }}>
          <DataExportTab
            title="Export salles"
            rows={salles}
            columns={columns}
            filename="salles"
            defaultOrientation="portrait"
          />
        </Box>
      ) : (
        <Stack spacing={2}>
          {list.map((s) => (
            <Card key={s.id} variant="outlined" component={motion.div} whileHover={{ scale: 1.01 }}>
              <CardContent>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', md: 'flex-start' }}
                  gap={1}
                >
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>{s.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.batiment || '—'} • {s.placesDisponibles ?? 'n/c'} places
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0}
                      flexWrap="wrap"
                      sx={{
                        display: 'flex',
                        gap: 2,
                      }}
                    >
                      {s.localisations.map((l) => (
                        <Chip
                          key={l.id || l.name}
                          size="small"
                          icon={<Room fontSize="inherit" />}
                          label={l.name}
                        />
                      ))}
                      {!s.localisations.length && (
                        <Typography variant="caption" color="text.secondary">
                          Aucune localisation
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignSelf: { xs: 'flex-end', md: 'auto' } }}
                  >
                    <Tooltip title="Modifier">
                      <span>
                        <IconButton size="small" onClick={() => openEdit(s)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <span>
                        <IconButton size="small" color="error" onClick={() => removeSalle(s)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
              <CardActions sx={{ pt: 0 }}>
                <Button size="small" onClick={() => openEdit(s)} fullWidth={isMobileSmall}>
                  Détails & localisations
                </Button>
              </CardActions>
            </Card>
          ))}
          {!list.length && <Typography>Aucune salle.</Typography>}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Modifier la salle' : 'Nouvelle salle'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Nom"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              autoFocus
              required
            />
            {isAdmin ? (
              <Autocomplete
                options={usersList}
                getOptionLabel={(u: any) => `${u.name || u.email} (${u.id})`}
                value={usersList.find((u) => String(u.id) === String(form.userOwnerId)) || null}
                onChange={(_, v) => setForm((f) => ({ ...f, userOwnerId: v ? v.id : '' }))}
                loading={loadingUsers}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Owner"
                    placeholder="Laisser vide pour vous"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingUsers ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            ) : (
              <TextField
                label="Owner"
                value={`${(session?.user as any)?.name || ''} (${(session?.user as any)?.id || ''})`}
                fullWidth
                disabled
              />
            )}
            <TextField
              label="Bâtiment"
              value={form.batiment}
              onChange={(e) => setForm((f) => ({ ...f, batiment: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Places"
              value={form.placesDisponibles}
              onChange={(e) => setForm((f) => ({ ...f, placesDisponibles: e.target.value }))}
              type="number"
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={600}>
                Localisations ({locs.filter((l) => !l._delete).length})
              </Typography>
              <Button size="small" startIcon={<Add />} onClick={addLoc}>
                Ajouter
              </Button>
            </Stack>
            <List
              dense
              sx={{
                maxHeight: 240,
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              {locs.map((l, idx) => (
                <ListItem key={idx} alignItems="flex-start" sx={{ opacity: l._delete ? 0.4 : 1 }}>
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <TextField
                      variant="standard"
                      value={l.name}
                      onChange={(e) => updateLoc(idx, { name: e.target.value })}
                      fullWidth
                      placeholder="Nom"
                      slotProps={{ htmlInput: { 'aria-label': 'Nom localisation' } }}
                    />
                    <TextField
                      variant="standard"
                      value={l.description || ''}
                      onChange={(e) => updateLoc(idx, { description: e.target.value })}
                      fullWidth
                      placeholder="Description"
                      slotProps={{ htmlInput: { 'aria-label': 'Description localisation' } }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    <Tooltip title={l._delete ? 'Restaurer' : 'Supprimer'}>
                      <IconButton
                        size="small"
                        color={l._delete ? 'primary' : 'error'}
                        onClick={() => (l._delete ? restoreLoc(idx) : deleteLoc(idx))}
                      >
                        {l._delete ? <Add fontSize="small" /> : <Delete fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              ))}
              {!locs.length && (
                <Typography variant="caption" sx={{ p: 2 }} color="text.secondary">
                  Aucune localisation. Ajoutez-en.
                </Typography>
              )}
            </List>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Annuler
          </Button>
          <Button variant="contained" disabled={!form.name.trim() || saving} onClick={save}>
            {saving ? '…' : 'Sauvegarder'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Export tab used instead of dialog */}
    </Box>
  );
}
