'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Stack,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Autocomplete,
  Chip,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search,
} from '@mui/icons-material';
import {
  createReactifPreset,
  deleteReactifPreset,
  updateReactifPreset,
  ReactifPresetDTO,
} from '@/lib/services/chemical-presets-service';
import { useSnackbar } from '@/components/providers/SnackbarProvider';
import { HazardClassSelector } from './HazardClassSelector';
import ReactifPresetCreateCard from './ReactifPresetCreateCard';
import { parseLatexToReact } from '@/lib/utils/latex';

interface Props {
  presetFocusId?: number;
}

export function ReactifPresetsManager({ presetFocusId }: Props) {
  // Combined, persistent filters
  const [nameFilter, setNameFilter] = useState('');
  const [casFilter, setCasFilter] = useState('');
  const [formulaFilter, setFormulaFilter] = useState('');
  const [presets, setPresets] = useState<ReactifPresetDTO[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [creating, setCreating] = useState<ReactifPresetDTO | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'casNumber' | 'molarMass' | 'density'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPreset, setEditPreset] = useState<ReactifPresetDTO | null>(null);
  const [updatingPresetId, setUpdatingPresetId] = useState<number | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]); // global category list snapshot
  const [createError, setCreateError] = useState<string | null>(null);
  const { showSnackbar } = useSnackbar();

  // Extra: catalogue catégories & hazards (multi)
  const categorySet = useMemo(() => {
    if (allCategories.length) return allCategories;
    const s = new Set<string>();
    presets.forEach((p) => {
      if (p.category)
        p.category.split(',').forEach((c) => {
          const v = c.trim();
          if (v) s.add(v);
        });
      else s.add('Sans catégorie');
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [presets, allCategories]);

  const fetchPresets = useCallback(async () => {
    try {
      setLoadingPresets(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      // Prefer combined filters when any is set; otherwise fall back to none
      const n = nameFilter.trim();
      const c = casFilter.trim();
      const f = formulaFilter.trim();
      if (n) params.set('name', n.toLowerCase());
      if (c) params.set('cas', c.toLowerCase());
      if (f) params.set('formula', normalizeFormulaSearch(f));
      const res = await fetch(`/api/chemical-presets?${params.toString()}`);
      if (!res.ok) throw new Error('Chargement presets échoué');
      const data = await res.json();
      setPresets(data.presets || []);
      setTotal(data.total || 0);
    } catch (e) {
      /* silent */
    } finally {
      setLoadingPresets(false);
    }
  }, [nameFilter, casFilter, formulaFilter, page, pageSize, sortBy, sortDir]);
  // Fetch presets whenever search / page / paging / sort changes
  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // Focus sur un preset spécifié (simple scroll highlight)
  const focusRef = useRef<number | null>(null);
  const [desiredPresetId, setDesiredPresetId] = useState<number | null>(null);
  useEffect(() => {
    if (!presetFocusId) return;
    // Use an explicit desired id to avoid races with fetching/pagination: we'll try to open
    // the preset once it appears in the `presets` array.
    setDesiredPresetId(Number(presetFocusId));
  }, [presetFocusId]);

  // Try to open the desired preset once presets are loaded/updated
  useEffect(() => {
    if (!desiredPresetId || !presets.length) return;
    if (focusRef.current === desiredPresetId) return;
    const targetPreset = presets.find((p) => Number(p.id) === Number(desiredPresetId));

    if (targetPreset) {
      // Preset found in current page - open dialog directly
      setTimeout(() => {
        openEditDialog(targetPreset);
        setDesiredPresetId(null);
        focusRef.current = desiredPresetId;
      }, 100);
    } else {
      // Preset not found in current page - fetch it directly using search by ID
      (async () => {
        try {
          const response = await fetch(`/api/chemical-presets?pageSize=500&page=1`);
          if (response.ok) {
            const data = await response.json();
            const preset = data.presets?.find((p: any) => Number(p.id) === Number(desiredPresetId));
            if (preset) {
              openEditDialog(preset);
              setDesiredPresetId(null);
              focusRef.current = desiredPresetId;
            } else {
              setDesiredPresetId(null);
            }
          } else {
            setDesiredPresetId(null);
          }
        } catch (error) {
          setDesiredPresetId(null);
        }
      })();
    }
  }, [desiredPresetId, presets]);

  // Load global categories once after we have presets (large pageSize fetch)
  const categoriesLoadedRef = useRef(false);
  useEffect(() => {
    if (categoriesLoadedRef.current) return;
    if (!presets.length) return;
    (async () => {
      try {
        categoriesLoadedRef.current = true;
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', '500');
        const r = await fetch('/api/chemical-presets?' + params.toString());
        if (r.ok) {
          const d = await r.json();
          const s = new Set<string>();
          (d.presets || []).forEach((p: ReactifPresetDTO) => {
            if (p.category)
              p.category.split(',').forEach((c: string) => {
                const v = c.trim();
                if (v) s.add(v);
              });
            else s.add('Sans catégorie');
          });
          setAllCategories(Array.from(s).sort((a, b) => a.localeCompare(b)));
        }
      } catch (err) {
        // ignore
      }
    })();
  }, [presets]);

  // Helpers
  const normalizeList = (raw: string) =>
    Array.from(
      new Set(
        raw
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ).join(', ');

  const normalizeFormulaSearch = (raw: string) =>
    raw
      .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (m) => '0123456789'.charAt('₀₁₂₃₄₅₆₇₈₉'.indexOf(m)))
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (m) => '0123456789'.charAt('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(m)))
      .toLowerCase();

  const openEditDialog = (p: ReactifPresetDTO) => {
    // Prepare arrays for multi-selects without mutating original object
    const prep: any = { ...p };
    if (p.category)
      prep._categoriesArray = p.category
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
    if (p.hazardClass)
      prep._hazardsArray = p.hazardClass
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);
    setEditPreset(prep);
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditPreset(null);
  };

  const saveDialogEdit = async () => {
    if (!editPreset?.id) return;
    try {
      setUpdatingPresetId(editPreset.id);
      const payload: any = { ...editPreset };
      if ((payload as any)._categoriesArray) {
        payload.category = normalizeList((payload as any)._categoriesArray.join(','));
        delete (payload as any)._categoriesArray;
      }
      if ((payload as any)._hazardsArray) {
        payload.hazardClass = normalizeList((payload as any)._hazardsArray.join(','));
        delete (payload as any)._hazardsArray;
      }
      const { preset: updated } = await updateReactifPreset(payload);
      setPresets((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      showSnackbar('Preset mis à jour', 'success');
      closeEditDialog();
    } catch (e: any) {
      showSnackbar(e?.message || 'Échec de la mise à jour', 'error');
    } finally {
      setUpdatingPresetId(null);
    }
  };

  // Helper to insert sub/superscript numbers into formula field
  const subDigits = '₀₁₂₃₄₅₆₇₈₉'.split('');
  const supDigits = '⁰¹²³⁴⁵⁶⁷⁸⁹'.split('');

  const saveCreate = async () => {
    if (!creating) return;
    try {
      setCreateError(null);
      const payload: any = { ...creating };
      if ((payload as any)._categoriesArray) {
        payload.category = normalizeList((payload as any)._categoriesArray.join(','));
        delete (payload as any)._categoriesArray;
      }
      if ((payload as any)._hazardsArray) {
        payload.hazardClass = normalizeList((payload as any)._hazardsArray.join(','));
        delete (payload as any)._hazardsArray;
      }
      const { preset } = await createReactifPreset(payload);
      showSnackbar('Preset ajouté', 'success');
      setPresets((ps) => [preset, ...ps]);
    } catch (e: any) {
      const msg = e?.message || 'Erreur ajout';
      setCreateError(msg);
      showSnackbar(msg, 'error');
      return;
    }
    setCreating(null);
  };

  const removePreset = async (id: number) => {
    try {
      await deleteReactifPreset(id);
      setPresets((ps) => ps.filter((p) => p.id !== id));
      showSnackbar('Preset supprimé', 'info');
    } catch (e: any) {
      showSnackbar(e.message || 'Suppression impossible', 'error');
    }
  };

  // Live filtered view when user is creating a new preset (focus clarity)
  const visiblePresets = useMemo(() => {
    if (!creating) return presets;
    const raw = (creating.name || '').trim();
    const cas = (creating.casNumber || '').trim();
    const formula = (creating.formula || '').trim();
    if (!raw && !cas && !formula) return presets;
    const qn = raw.toLowerCase();
    const qcas = cas.toLowerCase();
    const qf = formula.toLowerCase();
    return presets.filter((p) => {
      const nameMatch = qn ? (p.name || '').toLowerCase().includes(qn) : false;
      const casMatch = qcas ? (p.casNumber || '').toLowerCase().includes(qcas) : false;
      const formulaMatch = qf ? (p.formula || '').toLowerCase().includes(qf) : false;
      return nameMatch || casMatch || formulaMatch;
    });
  }, [presets, creating]);

  // Mode insertion sub/superscript: toggle states
  const [subMode, setSubMode] = useState(false);
  const [supMode, setSupMode] = useState(false);
  const handleFormulaKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!subMode && !supMode) return; // no mode active
    const key = e.key;
    if (key.length === 1) {
      e.preventDefault();
      setCreating((c) => {
        const base = c?.formula || '';
        const mapDigits = (src: string, digits: string[]) =>
          src
            .split('')
            .map((ch) => (/[0-9]/.test(ch) ? digits[parseInt(ch, 10)] : ch))
            .join('');
        const allowSymbols = '+-=()';
        let transformed = key;
        if (/[0-9]/.test(key)) {
          transformed = subMode
            ? mapDigits(key, subDigits)
            : supMode
              ? mapDigits(key, supDigits)
              : key;
        } else if (/^[A-Za-z]$/.test(key)) {
          // letters remain normal (could style later)
        } else if (allowSymbols.includes(key)) {
          // keep as-is
        } else {
          return { ...(c as any), formula: base + key }; // unhandled char
        }
        return { ...(c as any), formula: base + transformed };
      });
    }
  };

  // Edit dialog formula sub/superscript support
  const [editSubMode, setEditSubMode] = useState(false);
  const [editSupMode, setEditSupMode] = useState(false);
  const handleEditFormulaKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!editSubMode && !editSupMode) return;
    const key = e.key;
    if (key.length === 1 && editPreset) {
      e.preventDefault();
      const mapDigits = (src: string, digits: string[]) =>
        src
          .split('')
          .map((ch) => (/[0-9]/.test(ch) ? digits[parseInt(ch, 10)] : ch))
          .join('');
      const allowSymbols = '+-=()';
      let transformed = key;
      if (/[0-9]/.test(key))
        transformed = editSubMode
          ? mapDigits(key, subDigits)
          : editSupMode
            ? mapDigits(key, supDigits)
            : key;
      else if (allowSymbols.includes(key)) transformed = key;
      setEditPreset((p) => ({
        ...(p as any),
        formula: (p?.formula || '') + transformed,
      }));
    }
  };

  return (
    <Box
      sx={{ p: 0 }}
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Pagination Top */}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="flex-end"
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

      {/* Header avec recherche et filtres */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ md: 'center' }}
        sx={{ my: 3, gap: 2, display: 'flex' }}
      >
        <Stack
          sx={{
            gap: 2,
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            alignItems: { md: 'center' },
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexGrow: 1,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              width: '100%',
            }}
          >
            <TextField
              size="small"
              placeholder="Recherche nom..."
              fullWidth
              label="Nom"
              value={nameFilter}
              onChange={(e) => {
                setNameFilter(e.target.value);
                setPage(1);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flexGrow: 1, width: '100%' }}
            />
            <TextField
              size="small"
              fullWidth
              label="CAS"
              placeholder="Recherche CAS..."
              value={casFilter}
              onChange={(e) => {
                setCasFilter(e.target.value);
                setPage(1);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              size="small"
              fullWidth
              label="Formule (LaTeX)"
              placeholder="Recherche formule..."
              value={formulaFilter}
              onChange={(e) => {
                setFormulaFilter(e.target.value);
                setPage(1);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flexGrow: 1 }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexGrow: 1,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              width: '100%',
            }}
          >
            <FormControl size="small" sx={{ minWidth: 110, width: '100%' }}>
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
            <FormControl size="small" sx={{ minWidth: 120, width: '100%' }}>
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
                <MenuItem value="casNumber">CAS</MenuItem>
                <MenuItem value="molarMass">M.M</MenuItem>
                <MenuItem value="density">Densité</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120, width: '100%' }}>
              <InputLabel>Taille</InputLabel>
              <Select
                value={pageSize}
                label="Taille"
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[9, 15, 25, 33, 99].map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 2,
          }}
        >
          {!creating && (
            <Button
              color="success"
              variant="outlined"
              fullWidth
              startIcon={<AddIcon />}
              sx={{
                maxWidth: 450,
                minWidth: 250,
              }}
              onClick={() => setCreating({ name: '' })}
            >
              Nouveau preset
            </Button>
          )}
          <Typography variant="caption" color="text.secondary">
            {total} éléments
          </Typography>
        </Box>
      </Stack>
      {creating && (
        <>
          {createError && (
            <Box sx={{ mb: 2 }}>
              <Card variant="outlined" sx={{ borderColor: 'error.light', bgcolor: 'error.50' }}>
                <CardContent>
                  <Typography color="error" variant="subtitle2" sx={{ mb: 0.5 }}>
                    Échec de l'ajout
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {createError}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}

          <ReactifPresetCreateCard
            value={creating as any}
            presets={presets}
            categoryOptions={categorySet}
            onChange={(next) => setCreating(next as any)}
            onCancel={() => setCreating(null)}
            onSave={async () => {
              // Before save: stronger duplicate detection for CAS / formula / name
              const cas = creating.casNumber?.trim();
              const formula = creating.formula?.trim();
              const name = creating.name.trim();
              const duplicate = presets.find(
                (p) =>
                  (!!cas &&
                    p.casNumber &&
                    p.casNumber.trim().toLowerCase() === cas.toLowerCase()) ||
                  (!!formula &&
                    p.formula &&
                    p.formula.trim().toLowerCase() === formula.toLowerCase()) ||
                  (!!name && p.name.trim().toLowerCase() === name.toLowerCase()),
              );
              if (duplicate) {
                showSnackbar('Ce preset existe déjà (CAS/Formule/Nom identique).', 'warning');
                return;
              }
              await saveCreate();
            }}
          />
        </>
      )}
      <AnimatePresence mode="wait">
        {loadingPresets ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Box py={4} textAlign="center">
              <CircularProgress size={32} />
            </Box>
          </motion.div>
        ) : (
          <motion.div
            key={`${page}-${nameFilter}-${casFilter}-${formulaFilter}-${creating?.name || ''}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <Grid container spacing={2}>
              {visiblePresets.map((p) => {
                const loadingThis = updatingPresetId === p.id;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={p.id}>
                    <Card
                      data-preset-id={p.id}
                      sx={{
                        position: 'relative',
                        opacity: loadingThis ? 0.6 : 1,
                        outline: '2px solid transparent',
                        '&.preset-focus': { outlineColor: 'primary.main' },
                      }}
                    >
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          {p.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          <span style={{ fontFamily: 'monospace' }}>
                            {p.formula ? parseLatexToReact(p.formula) : null}
                          </span>{' '}
                          {p.casNumber && `• ${p.casNumber}`}
                        </Typography>
                        {p.category && (
                          <Typography variant="caption" display="block">
                            {p.category}
                          </Typography>
                        )}
                        {p.hazardClass && (
                          <Typography variant="caption" color="error" display="block" noWrap>
                            {p.hazardClass}
                          </Typography>
                        )}
                        <Typography variant="caption" display="block">
                          M.M: {p.molarMass ?? '—'} g/mol • d: {(p as any).density ?? '—'}
                        </Typography>
                        {(p.meltingPointC !== undefined || p.boilingPointC !== undefined) && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {p.meltingPointC !== undefined && `Pf ${p.meltingPointC}°C`}{' '}
                            {p.meltingPointC !== undefined && p.boilingPointC !== undefined && '• '}
                            {p.boilingPointC !== undefined && `Eb ${p.boilingPointC}°C`}
                          </Typography>
                        )}
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{
                            mt: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Button
                            startIcon={<EditIcon color="primary" />}
                            size="small"
                            disabled={loadingThis}
                            variant="outlined"
                            onClick={() => openEditDialog(p)}
                            color="inherit"
                          >
                            Éditer
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="text"
                            startIcon={<DeleteIcon color="error" />}
                            disabled={loadingThis}
                            onClick={() => removePreset(p.id!)}
                          >
                            Suppr
                          </Button>
                        </Stack>
                        {loadingThis && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'rgba(255,255,255,0.5)',
                              borderRadius: 1,
                            }}
                          >
                            <CircularProgress size={28} />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </motion.div>
        )}
      </AnimatePresence>
      <Stack direction="row" spacing={2} justifyContent="end" alignItems="center" sx={{ mt: 2 }}>
        <Pagination
          size="small"
          page={page}
          count={Math.max(1, Math.ceil(total / pageSize))}
          onChange={(_, v) => setPage(v)}
          showFirstButton
          showLastButton
        />
      </Stack>
      <Dialog open={editDialogOpen} onClose={closeEditDialog} fullWidth maxWidth="md">
        <DialogTitle sx={{ color: 'text.primary' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EditIcon />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Éditer preset
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {editPreset && (
            <Stack
              spacing={2}
              sx={{
                display: 'flex',
                width: '100%',
                mt: 1,
              }}
            >
              <TextField
                sx={{
                  flex: 1,
                }}
                label="Nom"
                value={editPreset.name}
                onChange={(e) =>
                  setEditPreset((p) => ({
                    ...(p as any),
                    name: e.target.value,
                  }))
                }
                required
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <TextField
                    label="Formule (LaTeX)"
                    value={editPreset.formula || ''}
                    onChange={(e) =>
                      setEditPreset((p) => ({
                        ...(p as any),
                        formula: e.target.value || undefined,
                      }))
                    }
                    slotProps={{
                      input: {
                        sx: {
                          fontFamily: 'monospace',
                          lineHeight: 1.4,
                          overflow: 'auto',
                          whiteSpace: 'nowrap',
                        },
                      },
                    }}
                  />
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, alignItems: 'center' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        setEditPreset((p) => ({
                          ...(p as any),
                          formula: (p?.formula || '') + '_{}' || undefined,
                        }))
                      }
                    >
                      _{}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        setEditPreset((p) => ({
                          ...(p as any),
                          formula: (p?.formula || '') + '^{}' || undefined,
                        }))
                      }
                    >
                      ^{}
                    </Button>
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      Aperçu:{' '}
                      <span style={{ fontFamily: 'monospace' }}>
                        {parseLatexToReact(editPreset.formula || '')}
                      </span>
                    </Typography>
                  </Stack>
                </Box>
                <TextField
                  sx={{
                    flex: 1,
                  }}
                  label="CAS"
                  value={editPreset.casNumber || ''}
                  onChange={(e) =>
                    setEditPreset((p) => ({
                      ...(p as any),
                      casNumber: e.target.value || undefined,
                    }))
                  }
                />
              </Stack>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  width: '100%',
                  display: 'flex',
                }}
              >
                <Autocomplete
                  multiple
                  options={categorySet}
                  freeSolo
                  disableCloseOnSelect
                  value={
                    (editPreset as any)._categoriesArray ||
                    (editPreset.category
                      ? editPreset.category
                          .split(',')
                          .map((c) => c.trim())
                          .filter(Boolean)
                      : [])
                  }
                  onChange={(_, v) =>
                    setEditPreset((p) => ({
                      ...(p as any),
                      _categoriesArray: v,
                    }))
                  }
                  renderValue={(selected) =>
                    selected.map((opt: string, i: number) => (
                      <Chip size="small" label={opt} key={opt} sx={{ mr: 0.5 }} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Catégories" placeholder="Ajouter" />
                  )}
                  sx={{ flex: 1 }}
                />
                <HazardClassSelector
                  value={
                    (editPreset as any)._hazardsArray ||
                    (editPreset.hazardClass
                      ? editPreset.hazardClass
                          .split(',')
                          .map((h) => h.trim())
                          .filter(Boolean)
                      : [])
                  }
                  onChange={(v) => setEditPreset((p) => ({ ...(p as any), _hazardsArray: v }))}
                  fullWidth
                  label="Classes de danger"
                  sx={{ flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  label="M.M (g/mol)"
                  type="number"
                  value={editPreset.molarMass ?? ''}
                  onChange={(e) =>
                    setEditPreset((p) => ({
                      ...(p as any),
                      molarMass: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                />
                <TextField
                  label="Densité (d)"
                  type="number"
                  value={(editPreset as any).density ?? ''}
                  onChange={(e) =>
                    setEditPreset((p) => ({
                      ...(p as any),
                      density: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                />
                <TextField
                  label="Pf (°C)"
                  type="number"
                  value={editPreset.meltingPointC ?? ''}
                  onChange={(e) =>
                    setEditPreset((p) => ({
                      ...(p as any),
                      meltingPointC: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                />
                <TextField
                  label="Eb (°C)"
                  type="number"
                  value={editPreset.boilingPointC ?? ''}
                  onChange={(e) =>
                    setEditPreset((p) => ({
                      ...(p as any),
                      boilingPointC: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog} disabled={!!updatingPresetId}>
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={!editPreset?.name || !!updatingPresetId}
            onClick={saveDialogEdit}
            startIcon={updatingPresetId ? <CircularProgress size={16} /> : undefined}
          >
            Sauver
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ReactifPresetsManager;
