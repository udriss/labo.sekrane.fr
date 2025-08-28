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
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search,
} from '@mui/icons-material';
import { materielPresetsService } from '@/lib/services/materiel-presets-service';
import { useSnackbar } from '@/components/providers/SnackbarProvider';

interface Props {
  discipline: string;
  presetFocusId?: number;
}

const DISCIPLINES = ['Physique', 'Chimie', 'SVT', 'Commun'];

export function MaterialPresetsManager({ discipline, presetFocusId }: Props) {
  const [presetSearch, setPresetSearch] = useState('');
  const [presets, setPresets] = useState<any[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [creating, setCreating] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'discipline'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPreset, setEditPreset] = useState<any | null>(null);
  const [updatingPresetId, setUpdatingPresetId] = useState<number | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const { showSnackbar } = useSnackbar();

  // Basic normalizer for case/diacritics-insensitive matching
  const normalize = useCallback((v: unknown) => {
    return (v ?? '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }, []);

  // Use lowercase values for Select options to accept values like 'chimie'
  // coming from the API. Keep labels capitalized.
  const disciplineValue = ((creating && creating.discipline) || discipline || '').toLowerCase();

  // Fetch presets
  const fetchPresets = useCallback(async () => {
    try {
      setLoadingPresets(true);
      // Fetch a large page to allow client-side search/pagination across merged results
      const params = {
        discipline: discipline.toLowerCase(),
        limit: 999,
        page: 1,
      } as any;

      const data = await materielPresetsService.getPresets(params);
      let list = data.presets || [];

      // Also load "commun" presets if discipline is set and not already commun
      if (discipline.toLowerCase() !== 'commun') {
        try {
          const commonParams = { ...params, discipline: 'commun' };
          const commonData = await materielPresetsService.getPresets(commonParams);
          const existingIds = new Set(list.map((p: any) => p.id));
          const merged = [
            ...list,
            ...(commonData.presets || []).filter((p: any) => !existingIds.has(p.id)),
          ];
          list = merged;
        } catch (e) {
          // ignore common fetch errors
        }
      }

      setPresets(list);
      setTotal(list.length);
    } catch (e: any) {
      showSnackbar(`Erreur: ${e.message}`, 'error');
    } finally {
      setLoadingPresets(false);
    }
  }, [discipline, showSnackbar]);

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchPresets();
  }, [fetchPresets]);

  // Focus sur un preset spécifié
  const focusRef = useRef<number | null>(null);
  useEffect(() => {
    if (!presetFocusId || !presets.length) return;
    if (focusRef.current === presetFocusId) return;
    const targetPreset = presets.find((p) => p.id === presetFocusId);
    const el = document.querySelector(`[data-preset-id="${presetFocusId}"]`);
    if (targetPreset) {
      setPresetSearch(targetPreset.name);
      setPage(1);
    }
    if (el) {
      focusRef.current = presetFocusId;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('preset-focus');
      setTimeout(() => el.classList.remove('preset-focus'), 2200);
    }
  }, [presetFocusId, presets]);

  // Load global categories
  const categoriesLoadedRef = useRef(false);
  useEffect(() => {
    if (!didInitRef.current || categoriesLoadedRef.current) return;
    (async () => {
      try {
        categoriesLoadedRef.current = true;
        const response = await fetch(
          `/api/materiel/categories?discipline=${discipline.toLowerCase()}`,
        );
        if (response.ok) {
          const data = await response.json();
          const categories = (data.categories || []).map((c: any) => c.name);

          // Also get common categories
          const commonResponse = await fetch('/api/materiel/categories?discipline=commun');
          if (commonResponse.ok) {
            const commonData = await commonResponse.json();
            const commonCategories = (commonData.categories || []).map((c: any) => c.name);
            setAllCategories(Array.from(new Set([...categories, ...commonCategories])).sort());
          } else {
            setAllCategories(categories.sort());
          }
        }
      } catch (e) {
        console.error('Error loading categories:', e);
      }
    })();
  }, [discipline]);

  const openEditDialog = (p: any) => {
    setEditPreset({ ...p });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    if (updatingPresetId) return;
    setEditDialogOpen(false);
    setEditPreset(null);
  };

  const saveDialogEdit = async () => {
    if (!editPreset?.id) return;
    setUpdatingPresetId(editPreset.id);
    try {
      const updated = await materielPresetsService.updatePreset(editPreset.id, editPreset);
      setPresets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showSnackbar('Preset mis à jour', 'success');
      setEditDialogOpen(false);
      setEditPreset(null);
    } catch (e: any) {
      showSnackbar(e.message || 'Erreur mise à jour', 'error');
    } finally {
      setUpdatingPresetId(null);
    }
  };

  const saveCreate = async () => {
    if (!creating) return;
    try {
      const created = await materielPresetsService.createPreset(creating);
      showSnackbar('Preset ajouté', 'success');
      setPresets((ps) => [created, ...ps]);
    } catch (e: any) {
      showSnackbar(e.message || 'Erreur création', 'error');
      return;
    }
    setCreating(null);
  };

  const removePreset = async (id: number) => {
    try {
      await materielPresetsService.deletePreset(id);
      setPresets((ps) => ps.filter((p) => p.id !== id));
      showSnackbar('Preset supprimé', 'info');
    } catch (e: any) {
      showSnackbar(e.message || 'Suppression impossible', 'error');
    }
  };

  // Filtered presets
  const filteredPresets = useMemo(() => {
    let filtered = presets;

    // Global search across name, category, description and quantity
    const term = normalize(presetSearch.trim());
    if (term) {
      filtered = filtered.filter((p) => {
        const name = normalize(p.name);
        const cat = normalize(p.category || p.categorie?.name || '');
        const desc = normalize(p.description || '');
        const qty = (p.defaultQty ?? '').toString();
        return (
          name.includes(term) || cat.includes(term) || desc.includes(term) || qty.includes(term)
        );
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => {
        if (!p.category) return selectedCategory === 'Sans catégorie';
        return p.category === selectedCategory || p.category?.name === selectedCategory;
      });
    }

    if (creating && creating.name.trim()) {
      const searchTerm = creating.name.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchTerm));
    }

    return filtered;
  }, [presets, selectedCategory, creating, presetSearch, normalize]);

  // Client-side pagination of filtered results
  const paginatedPresets = useMemo(() => {
    const sorted = [...filteredPresets].sort((a, b) => {
      let av: any;
      let bv: any;
      if (sortBy === 'name') {
        av = a.name || '';
        bv = b.name || '';
      } else if (sortBy === 'category') {
        av = a.category || a.categorie?.name || '';
        bv = b.category || b.categorie?.name || '';
      } else {
        av = a.discipline || '';
        bv = b.discipline || '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return av - bv;
      }
      return String(av).localeCompare(String(bv));
    });
    if (sortDir === 'desc') sorted.reverse();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sorted.slice(start, end);
  }, [filteredPresets, page, pageSize, sortBy, sortDir]);

  // Keep page within bounds when filters reduce total pages
  useEffect(() => {
    const maxPages = Math.max(1, Math.ceil(filteredPresets.length / pageSize));
    if (page > maxPages) setPage(maxPages);
  }, [filteredPresets.length, pageSize, page]);

  const canProceed = () => {
    return creating?.name?.trim() && creating?.discipline;
  };

  return (
    <Box
      sx={{
        p: 0,
      }}
    >
      {/* Pagination Top */}
      <Stack
        sx={{
          mt: 2,
          display: 'flex',
          gap: 2,
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexDirection: 'row',
        }}
      >
        <Pagination
          size="small"
          page={page}
          count={Math.max(1, Math.ceil(filteredPresets.length / pageSize))}
          onChange={(_, v) => setPage(v)}
          showFirstButton
          showLastButton
        />
      </Stack>
      {/* Header Controls (responsive layout aligned with chemical presets) */}
      <Stack
        sx={{
          my: 4,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          width: '100%',
          gap: 2,
        }}
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
              label="Rechercher..."
              value={presetSearch}
              placeholder="Nom, catégorie, quantité, ou description..."
              onChange={(e) => {
                setPresetSearch(e.target.value);
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
            <FormControl size="small" sx={{ minWidth: 180, flexGrow: 1, width: '100%' }}>
              <InputLabel>Catégorie</InputLabel>
              <Select
                value={selectedCategory}
                label="Catégorie"
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">Toutes</MenuItem>
                <MenuItem value="Sans catégorie">Sans catégorie</MenuItem>
                {allCategories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
            <FormControl size="small" sx={{ minWidth: 130, width: '100%' }}>
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
                <MenuItem value="category">Catégorie</MenuItem>
                <MenuItem value="discipline">Discipline</MenuItem>
              </Select>
            </FormControl>
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
              startIcon={<AddIcon />}
              variant="outlined"
              fullWidth
              sx={{
                maxWidth: 450,
                minWidth: 250,
              }}
              color="success"
              onClick={() =>
                setCreating({
                  name: '',
                  discipline: discipline,
                  category: '',
                  description: '',
                  defaultQty: 1,
                })
              }
            >
              Nouveau preset
            </Button>
          )}
          <Typography variant="caption" color="text.secondary">
            {filteredPresets.length} presets
          </Typography>
        </Box>
      </Stack>

      {/* Create Form */}
      {creating && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Ajouter un nouveau preset
            </Typography>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  label="Nom du preset"
                  fullWidth
                  value={creating.name || ''}
                  onChange={(e) => setCreating((c: any) => ({ ...c, name: e.target.value }))}
                  required
                />
                {creating.name && (
                  <Typography
                    variant="caption"
                    color="warning.dark"
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    Presets similaires:{' '}
                    {presets
                      .filter((p) => p.name.toLowerCase().includes(creating.name.toLowerCase()))
                      .slice(0, 3)
                      .map((p) => p.name)
                      .join(', ') || 'Aucun'}
                  </Typography>
                )}
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Autocomplete
                  freeSolo
                  options={allCategories}
                  value={creating.category || ''}
                  onChange={(_, value) =>
                    setCreating((c: any) => ({ ...c, category: value || '' }))
                  }
                  renderInput={(params) => <TextField {...params} label="Catégorie" />}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Discipline</InputLabel>
                  <Select
                    value={disciplineValue}
                    onChange={(e) =>
                      setCreating((c: any) => ({
                        ...c,
                        discipline: e.target.value,
                      }))
                    }
                  >
                    {DISCIPLINES.map((disc) => (
                      <MenuItem key={disc} value={disc.toLowerCase()}>
                        {disc}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={creating.description || ''}
                  onChange={(e) =>
                    setCreating((c: any) => ({
                      ...c,
                      description: e.target.value,
                    }))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Quantité par défaut"
                  type="number"
                  fullWidth
                  value={creating.defaultQty || 1}
                  onChange={(e) =>
                    setCreating((c: any) => ({
                      ...c,
                      defaultQty: parseInt(e.target.value) || 1,
                    }))
                  }
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={saveCreate} disabled={!canProceed()}>
                Ajouter
              </Button>
              <Button onClick={() => setCreating(null)}>Annuler</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Presets Grid */}
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
            key={`${page}-${presetSearch}-${creating?.name || ''}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {filteredPresets.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                Aucun preset trouvé.{' '}
                {creating
                  ? 'Vous pouvez ajouter le premier preset ci-dessus.'
                  : "Cliquez sur 'Nouveau preset' pour commencer."}
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {paginatedPresets.map((preset) => {
                  const loadingThis = updatingPresetId === preset.id;
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={preset.id}>
                      <Card
                        data-preset-id={preset.id}
                        sx={{
                          position: 'relative',
                          opacity: loadingThis ? 0.6 : 1,
                          outline: '2px solid transparent',
                          '&.preset-focus': { outlineColor: 'primary.main' },
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap gutterBottom>
                            {preset.name}
                          </Typography>

                          <Typography variant="caption" color="text.secondary" display="block">
                            {preset.discipline} • {preset.category || 'Sans catégorie'}
                          </Typography>

                          {preset.description && (
                            <Typography variant="body2" sx={{ mt: 1, mb: 1 }} noWrap>
                              {preset.description}
                            </Typography>
                          )}

                          <Typography variant="caption" display="block">
                            Quantité par défaut : {preset.defaultQty || 1}
                          </Typography>

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
                              size="small"
                              variant="outlined"
                              color="inherit"
                              startIcon={<EditIcon color="primary" />}
                              disabled={loadingThis}
                              onClick={() => openEditDialog(preset)}
                            >
                              Éditer
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="text"
                              startIcon={<DeleteIcon color="error" />}
                              disabled={loadingThis}
                              onClick={() => removePreset(preset.id!)}
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
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination Bottom */}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="flex-end"
        alignItems="center"
        sx={{ mt: 3 }}
      >
        <Pagination
          size="small"
          page={page}
          count={Math.max(1, Math.ceil(filteredPresets.length / pageSize))}
          onChange={(_, v) => setPage(v)}
          showFirstButton
          showLastButton
        />
      </Stack>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Éditer le preset</DialogTitle>
        <DialogContent dividers>
          {editPreset && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nom"
                value={editPreset.name || ''}
                onChange={(e) => setEditPreset((p: any) => ({ ...p, name: e.target.value }))}
                required
                fullWidth
              />

              <Autocomplete
                freeSolo
                options={allCategories}
                value={editPreset.category || ''}
                onChange={(_, value) =>
                  setEditPreset((p: any) => ({ ...p, category: value || '' }))
                }
                renderInput={(params) => <TextField {...params} label="Catégorie" />}
              />

              <FormControl fullWidth>
                <InputLabel>Discipline</InputLabel>
                <Select
                  // value={editPreset.discipline || ''}
                  value={disciplineValue}
                  onChange={(e) =>
                    setEditPreset((p: any) => ({
                      ...p,
                      discipline: e.target.value,
                    }))
                  }
                >
                  {DISCIPLINES.map((disc) => (
                    <MenuItem key={disc} value={disc.toLowerCase()}>
                      {disc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Description"
                multiline
                rows={2}
                value={editPreset.description || ''}
                onChange={(e) =>
                  setEditPreset((p: any) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                fullWidth
              />

              <TextField
                label="Quantité par défaut"
                type="number"
                value={editPreset.defaultQty || 1}
                onChange={(e) =>
                  setEditPreset((p: any) => ({
                    ...p,
                    defaultQty: parseInt(e.target.value) || 1,
                  }))
                }
                slotProps={{ htmlInput: { min: 1 } }}
                fullWidth
              />
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

export default MaterialPresetsManager;
