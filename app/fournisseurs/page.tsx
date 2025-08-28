'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Stack,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, Info, Search } from '@mui/icons-material';
import { TbTruckDelivery } from 'react-icons/tb';
import { useSession } from 'next-auth/react';
import { useTabWithURL } from '@/lib/hooks/useTabWithURL';
import DataExportTab from '@/components/export/DataExportTab';

interface Supplier {
  id: number;
  name: string;
  kind: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Draft cache pour conserver un formulaire en cours (ajout)
const supplierDraftCache: { form?: Partial<Supplier> } = {} as any;

export default function FournisseurPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canManage = ['ADMIN', 'ADMINLABO', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE'].includes(
    role,
  );
  // Trois onglets: 0 = liste, 1 = ajouter, 2 = export
  const { tabValue: tab, handleTabChange } = useTabWithURL({ defaultTab: 0, maxTabs: 3 });

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: '',
    contactEmail: '',
    phone: '',
    address: '',
    notes: '',
    kind: 'CUSTOM',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      if (search.trim()) params.set('q', search.trim());
      const r = await fetch('/api/suppliers?' + params.toString());
      if (!r.ok) throw new Error('Chargement fournisseurs échoué');
      const j = await r.json();
      setSuppliers(j.suppliers || []);
      setTotal(j.total || (j.suppliers || []).length || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir, search]);
  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    if (supplierDraftCache.form) {
      setForm({
        name: supplierDraftCache.form.name || '',
        contactEmail: supplierDraftCache.form.contactEmail || '',
        phone: supplierDraftCache.form.phone || '',
        address: supplierDraftCache.form.address || '',
        notes: supplierDraftCache.form.notes || '',
        kind: supplierDraftCache.form.kind || 'CUSTOM',
      });
    } else {
      setForm({ name: '', contactEmail: '', phone: '', address: '', notes: '', kind: 'CUSTOM' });
    }
    setDialogOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      contactEmail: s.contactEmail || '',
      phone: s.phone || '',
      address: s.address || '',
      notes: s.notes || '',
      kind: s.kind || 'CUSTOM',
    });
    setDialogOpen(true);
  };
  const closeDialog = () => {
    if (!saving && !editing) supplierDraftCache.form = { ...form };
    if (!saving) setDialogOpen(false);
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        name: form.name.trim(),
        contactEmail: form.contactEmail.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        kind: form.kind,
      };
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/suppliers?id=${editing.id}` : '/api/suppliers';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Echec sauvegarde');
      const returned = j.supplier;
      if (returned) {
        setSuppliers((prev) => {
          if (editing)
            return prev
              .map((p) => (p.id === returned.id ? returned : p))
              .sort((a, b) => a.name.localeCompare(b.name));
          const next = [...prev, returned];
          next.sort((a, b) => a.name.localeCompare(b.name));
          return next;
        });
      } else {
        await load();
      }
      setDialogOpen(false);
      if (!editing) supplierDraftCache.form = undefined;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeSupplier = async (s: Supplier) => {
    if (!confirm(`Supprimer le fournisseur "${s.name}" ?`)) return;
    const r = await fetch(`/api/suppliers?id=${s.id}`, { method: 'DELETE' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j.error || 'Suppression impossible');
      return;
    }
    setSuppliers((prev) => prev.filter((p) => p.id !== s.id));
  };

  return (
    <Box
      sx={{
        p: 0,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
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
            <TbTruckDelivery fontSize={25} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            Gestion des fournisseurs
          </Box>
        </Typography>
        {canManage && (
          <Button startIcon={<Add />} onClick={openNew} variant="contained">
            Nouveau fournisseur
          </Button>
        )}
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, v) => handleTabChange(v)} sx={{ mb: 2 }}>
        <Tab label={`Fournisseurs disponibles (${total})`} />
        <Tab label="Ajouter" disabled={!canManage} />
        <Tab label="Export" />
      </Tabs>
      {tab === 0 && (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ md: 'center' }}
          sx={{ my: 4 }}
        >
          <TextField
            size="small"
            label="Recherche"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ maxWidth: 260 }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Tri</InputLabel>
            <Select
              value={sortBy}
              label="Tri"
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setPage(1);
              }}
            >
              <MenuItem value="name">Nom</MenuItem>
              <MenuItem value="createdAt">Ajouté</MenuItem>
              <MenuItem value="updatedAt">Maj</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Ordre</InputLabel>
            <Select
              value={sortDir}
              label="Ordre"
              onChange={(e) => {
                setSortDir(e.target.value as any);
                setPage(1);
              }}
            >
              <MenuItem value="asc">Asc</MenuItem>
              <MenuItem value="desc">Desc</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Taille</InputLabel>
            <Select
              value={pageSize}
              label="Taille"
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[5, 7, 11, 15].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            {total} éléments
          </Typography>
        </Stack>
      )}
      {tab === 1 && canManage ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Ajouter un fournisseur
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Nom"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Téléphone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Adresse"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
              />
              <TextField
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={form.kind} size="small" />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setForm((f) => ({ ...f, kind: f.kind === 'CUSTOM' ? 'NORMAL' : 'CUSTOM' }))
                  }
                >
                  Basculer {form.kind === 'CUSTOM' ? 'NORMAL' : 'CUSTOM'}
                </Button>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  mt: 2,
                }}
              >
                <Button
                  disabled={saving}
                  color="error"
                  onClick={() =>
                    setForm({
                      name: '',
                      contactEmail: '',
                      phone: '',
                      address: '',
                      notes: '',
                      kind: 'CUSTOM',
                    })
                  }
                >
                  Réinitialiser
                </Button>
                <Button
                  disabled={!form.name.trim() || saving}
                  variant="outlined"
                  color="success"
                  onClick={save}
                  startIcon={<Add />}
                >
                  {saving ? '…' : 'Ajouter'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : tab === 0 && loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={34} />
        </Box>
      ) : tab === 0 ? (
        <Stack spacing={1}>
          {suppliers.map((s) => (
            <Card key={s.id} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={600}>{s.name}</Typography>
                      <Chip size="small" label={s.kind} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {s.contactEmail || '—'} • {s.phone || '—'}
                    </Typography>
                    {s.address && (
                      <Typography variant="caption" color="text.secondary">
                        {s.address}
                      </Typography>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Détails / Modifier">
                      <span>
                        <IconButton size="small" onClick={() => openEdit(s)} disabled={!canManage}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {canManage && (
                      <Tooltip title="Supprimer">
                        <span>
                          <IconButton size="small" color="error" onClick={() => removeSupplier(s)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
              <CardActions sx={{ pt: 0 }}>
                <Button
                  size="small"
                  startIcon={<Info fontSize="inherit" />}
                  onClick={() => openEdit(s)}
                  disabled={!canManage}
                >
                  Détails
                </Button>
              </CardActions>
            </Card>
          ))}
          {!suppliers.length && <Typography>Aucun fournisseur.</Typography>}
          <Stack
            direction="row"
            spacing={2}
            justifyContent="end"
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <Pagination
              size="small"
              page={page}
              count={Math.max(1, Math.ceil(total / pageSize))}
              onChange={(_, v) => setPage(v)}
              showFirstButton
              showLastButton
            />
          </Stack>
        </Stack>
      ) : tab === 2 ? (
        <DataExportTab
          title="Export fournisseurs"
          rows={suppliers}
          columns={[
            { id: 'id', header: 'ID', cell: (r) => r.id, exportValue: (r) => r.id },
            { id: 'name', header: 'Nom', cell: (r) => r.name, exportValue: (r) => r.name },
            { id: 'kind', header: 'Type', cell: (r) => r.kind, exportValue: (r) => r.kind },
            {
              id: 'contactEmail',
              header: 'Email de contact',
              cell: (r) => r.contactEmail || '—',
              exportValue: (r) => r.contactEmail || '',
            },
            {
              id: 'phone',
              header: 'Téléphone',
              cell: (r) => r.phone || '—',
              exportValue: (r) => r.phone || '',
            },
            {
              id: 'address',
              header: 'Adresse',
              cell: (r) => r.address || '—',
              exportValue: (r) => r.address || '',
            },
            {
              id: 'notes',
              header: 'Notes',
              cell: (r) => r.notes || '—',
              exportValue: (r) => r.notes || '',
            },
            {
              id: 'createdAt',
              header: 'Créé le',
              cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '—'),
              exportValue: (r) =>
                r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '',
            },
            {
              id: 'updatedAt',
              header: 'Modifié le',
              cell: (r) => (r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('fr-FR') : '—'),
              exportValue: (r) =>
                r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('fr-FR') : '',
            },
          ]}
          filename="fournisseurs"
          defaultOrientation="landscape"
        />
      ) : null}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Nom"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Téléphone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Adresse"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={form.kind} size="small" />
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  setForm((f) => ({ ...f, kind: f.kind === 'CUSTOM' ? 'NORMAL' : 'CUSTOM' }))
                }
              >
                Basculer {form.kind === 'CUSTOM' ? 'NORMAL' : 'CUSTOM'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Annuler
          </Button>
          {canManage && (
            <Button variant="contained" disabled={!form.name.trim() || saving} onClick={save}>
              {saving ? '…' : editing ? 'Sauvegarder' : 'Ajouter'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
