'use client';
import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Alert,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  InputAdornment,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Category as CategoryIcon,
  Search,
} from '@mui/icons-material';

interface Category {
  id: number;
  name: string;
  discipline: string;
  description?: string;
  presetCount?: number;
}

interface Preset {
  id: number;
  name: string;
  discipline: string;
  description?: string;
  categoryId?: number | null;
  defaultQty?: number;
  supplier?: string;
}

interface MaterielPerso {
  id: number;
  name: string;
  discipline: string;
  description?: string | null;
  categorieId?: number | null;
  defaultQty?: number | null;
  caracteristiques?: any;
  volumes?: any;
  categorie?: Category | null;
  createdAt: string;
  updatedAt: string;
}

interface MaterialCategoriesProps {
  discipline: string;
  categories: Category[];
  commonCategories: Category[];
  allPresets: Preset[];
  allMaterielPersos?: MaterielPerso[];
  catLoading: boolean;
  presetsLoading?: boolean;
  materielPersoLoading?: boolean;
  catError: string | null;
  catSearch: string;
  catSort: 'name-asc' | 'name-desc' | 'count-desc';
  editingCatId: number | null;
  editingCatName: string;
  editingCatDesc: string;
  updatingPresetId: number | null;
  creatingCatForPreset: number | null;
  expandedCats: Set<number | string>;
  onCatSearchChange: (value: string) => void;
  onCatSortChange: (value: 'name-asc' | 'name-desc' | 'count-desc') => void;
  onStartEditCategory: (cat: Category) => void;
  onCancelEditCategory: () => void;
  onSaveEditCategory: () => void;
  onConfirmDeleteCategory: (cat: Category) => void;
  onUpdatePresetCategoryId: (preset: Preset, newCategoryId: number | null) => void;
  onUpdateMaterielPersoCategoryId?: (
    materielPerso: MaterielPerso,
    newCategoryId: number | null,
  ) => void;
  onCreateCategoryInline: (name: string, discipline: string) => Promise<number | null>;
  onFetchCategories: () => void;
  setCatError: (error: string | null) => void;
  setEditingCatName: (name: string) => void;
  setEditingCatDesc: (desc: string) => void;
  setExpandedCats: React.Dispatch<React.SetStateAction<Set<number | string>>>;
  setCreatingCatForPreset: (id: number | null) => void;
}

export function MaterialCategories({
  discipline,
  categories,
  commonCategories,
  allPresets,
  allMaterielPersos = [],
  catLoading,
  presetsLoading = false,
  materielPersoLoading = false,
  catError,
  catSearch,
  catSort,
  editingCatId,
  editingCatName,
  editingCatDesc,
  updatingPresetId,
  creatingCatForPreset,
  expandedCats,
  onCatSearchChange,
  onCatSortChange,
  onStartEditCategory,
  onCancelEditCategory,
  onSaveEditCategory,
  onConfirmDeleteCategory,
  onUpdatePresetCategoryId,
  onUpdateMaterielPersoCategoryId,
  onCreateCategoryInline,
  onFetchCategories,
  setCatError,
  setEditingCatName,
  setEditingCatDesc,
  setExpandedCats,
  setCreatingCatForPreset,
}: MaterialCategoriesProps) {
  const [globalCatDialogOpen, setGlobalCatDialogOpen] = useState(false);
  const [globalCatName, setGlobalCatName] = useState('');
  const [globalCatDesc, setGlobalCatDesc] = useState('');
  const [newCatDialogOpen, setNewCatDialogOpen] = useState(false);
  const [newCatDialogForPreset, setNewCatDialogForPreset] = useState<Preset | null>(null);
  const [dialogCatName, setDialogCatName] = useState('');

  const matchingCategoryIds = useMemo(() => {
    const s = catSearch.trim().toLowerCase();
    if (!s) return null;

    const set = new Set<number>();

    allPresets.forEach((p) => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      if (name.includes(s) || desc.includes(s)) {
        if (p.categoryId) set.add(p.categoryId);
      }
    });

    allMaterielPersos.forEach((m) => {
      const name = (m.name || '').toLowerCase();
      const desc = (m.description || '').toLowerCase();
      if (name.includes(s) || desc.includes(s)) {
        if (m.categorieId) set.add(m.categorieId);
      }
    });

    return set;
  }, [catSearch, allPresets, allMaterielPersos]);

  const filteredSortedCategories = (
    matchingCategoryIds ? categories.filter((c) => matchingCategoryIds.has(c.id)) : categories
  ).sort((a, b) => {
    switch (catSort) {
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'count-desc':
        return (b.presetCount || 0) - (a.presetCount || 0) || a.name.localeCompare(b.name);
      case 'name-asc':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const handleCreateGlobalCategory = async () => {
    const name = globalCatName.trim();
    if (!name) return;

    try {
      const res = await fetch('/api/materiel/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          discipline,
          description: globalCatDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ajout impossible');

      setGlobalCatDialogOpen(false);
      setGlobalCatName('');
      setGlobalCatDesc('');
      await onFetchCategories();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateCategoryForPreset = async () => {
    const preset = newCatDialogForPreset;
    const name = dialogCatName.trim();
    if (!preset || !name) return;

    setCreatingCatForPreset(preset.id);
    const newId = await onCreateCategoryInline(name, preset.discipline || discipline);
    if (newId !== null) {
      // Vérifier si c'est un preset ou un matériel perso
      if ('categoryId' in preset) {
        // C'est un preset
        await onUpdatePresetCategoryId(preset as Preset, newId);
      } else if (onUpdateMaterielPersoCategoryId && 'categorieId' in preset) {
        // C'est un matériel perso
        await onUpdateMaterielPersoCategoryId(preset as MaterielPerso, newId);
      }
    }
    setCreatingCatForPreset(null);
    setNewCatDialogOpen(false);
  };

  // Composant pour afficher un élément (preset ou materielPerso)
  const CategoryItem = ({
    item,
    type,
    categoryOptions,
  }: {
    item: Preset | MaterielPerso;
    type: 'preset' | 'materielPerso';
    categoryOptions: Category[];
  }) => {
    const isPreset = type === 'preset';
    const categoryId = isPreset ? (item as Preset).categoryId : (item as MaterielPerso).categorieId;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
          p: 1.5,
          bgcolor: isPreset ? 'grey.50' : 'blue.50',
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: isPreset ? 'grey.200' : 'blue.300',
          boxShadow: isPreset ? 'none' : '0 2px 4px rgba(25, 118, 210, 0.1)',
          '&:hover': {
            bgcolor: isPreset ? 'grey.100' : 'blue.100',
            borderColor: isPreset ? 'grey.300' : 'blue.400',
          },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap title={item.name}>
              {item.name}
            </Typography>
            {!isPreset && (
              <Typography
                variant="caption"
                sx={{
                  px: 0.8,
                  py: 0.3,
                  bgcolor: 'blue.600',
                  color: 'default',
                  borderRadius: 1,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 1px 3px rgba(25, 118, 210, 0.3)',
                }}
              >
                Perso
              </Typography>
            )}
          </Box>
          {(item.description || (isPreset && (item as Preset).supplier)) && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.2 }}
              noWrap
              title={`${item.description || ''}${isPreset && (item as Preset).supplier ? (item.description ? ' • ' : '') + (item as Preset).supplier : ''}`}
            >
              {item.description}
              {isPreset && (item as Preset).supplier && (
                <span style={{ color: 'rgb(25, 118, 210)', marginLeft: item.description ? 4 : 0 }}>
                  {item.description ? ' • ' : ''}
                  {(item as Preset).supplier}
                </span>
              )}
            </Typography>
          )}
        </Box>
        {(isPreset || (!isPreset && onUpdateMaterielPersoCategoryId)) && (
          <>
            <Autocomplete
              size="small"
              options={categoryOptions}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
              value={categoryOptions.find((x) => x.id === categoryId) || null}
              onChange={(_, v) => {
                if (v && typeof v !== 'string') {
                  if (isPreset) {
                    onUpdatePresetCategoryId(item as Preset, v.id);
                  } else if (onUpdateMaterielPersoCategoryId) {
                    onUpdateMaterielPersoCategoryId(item as MaterielPerso, v.id);
                  }
                }
              }}
              freeSolo
              renderInput={(params) => (
                <TextField {...params} label="Catégorie" variant="outlined" size="small" />
              )}
              sx={{ minWidth: 180 }}
            />
            <Button
              size="small"
              variant="outlined"
              color="primary"
              disabled={creatingCatForPreset === item.id}
              onClick={() => {
                if (isPreset) {
                  setNewCatDialogForPreset(item as Preset);
                } else {
                  setNewCatDialogForPreset(item as any); // Pour les matériels perso, on utilise la même structure
                }
                setDialogCatName('');
                setNewCatDialogOpen(true);
              }}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              + Cat
            </Button>
            {updatingPresetId === item.id && <CircularProgress size={16} />}
          </>
        )}
      </Box>
    );
  };

  return (
    <div>
      {catError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCatError(null)}>
          {catError}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          my: 3,
          flexWrap: 'wrap',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Stack
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            flexGrow: 1,
          }}
        >
          <TextField
            size="small"
            label="Catégorie"
            placeholder="Rechercher une catégorie..."
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              },
            }}
            value={catSearch}
            onChange={(e) => onCatSearchChange(e.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 140, width: '100%' }}>
            <InputLabel>Tri</InputLabel>
            <Select
              value={catSort}
              label="Tri"
              onChange={(e) => onCatSortChange(e.target.value as any)}
            >
              <MenuItem value="name-asc">Nom A→Z</MenuItem>
              <MenuItem value="name-desc">Nom Z→A</MenuItem>
              <MenuItem value="count-desc">Plus de presets</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Stack
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            flexDirection: { sm: 'column', md: 'row' },
            gap: 2,
            flexGrow: 1,
          }}
        >
          <Stack
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              flexGrow: 1,
              width: '100%',
            }}
          >
            <Button
              variant="outlined"
              color="success"
              fullWidth
              sx={{
                minWidth: 270,
              }}
              startIcon={<AddIcon />}
              onClick={() => setGlobalCatDialogOpen(true)}
            >
              Nouvelle catégorie
            </Button>
            <Button fullWidth variant="outlined" onClick={onFetchCategories} disabled={catLoading}>
              Rafraîchir
            </Button>
          </Stack>
          {(() => {
            const uncategorizedPresets = allPresets.filter((p) => !p.categoryId);
            const uncategorizedMaterielPersos = allMaterielPersos.filter((mp) => !mp.categorieId);
            const totalUncategorized =
              uncategorizedPresets.length + uncategorizedMaterielPersos.length;
            return (
              <Alert severity="info" sx={{ py: 0, minWidth: 300 }}>
                Sans catégorie: {totalUncategorized}
                {uncategorizedPresets.length > 0 &&
                  uncategorizedMaterielPersos.length > 0 &&
                  ` (${uncategorizedPresets.length} preset${uncategorizedPresets.length > 1 ? 's' : ''}, ${uncategorizedMaterielPersos.length} perso)`}
              </Alert>
            );
          })()}
        </Stack>
      </Box>

      <Box>
        {/* Catégories de la discipline */}
        <AnimatePresence>
          {filteredSortedCategories.map((c) => {
            const editing = editingCatId === c.id;
            const catPresets = allPresets.filter((p) => p.categoryId === c.id);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <Card
                  key={c.id}
                  variant={editing ? 'outlined' : undefined}
                  sx={{ mb: 2, boxShadow: 2 }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 3,
                        flexDirection: 'column',
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 280, width: '100%' }}>
                        {editing ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                              size="small"
                              label="Nom"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              fullWidth
                            />
                            <TextField
                              size="small"
                              label="Description"
                              value={editingCatDesc}
                              onChange={(e) => setEditingCatDesc(e.target.value)}
                              multiline
                              minRows={3}
                              fullWidth
                            />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={onSaveEditCategory}
                                disabled={!editingCatName.trim()}
                              >
                                Enregistrer
                              </Button>
                              <Button
                                size="small"
                                startIcon={<CloseIcon />}
                                onClick={onCancelEditCategory}
                              >
                                Annuler
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <CategoryIcon color="primary" fontSize="small" />
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: 600, color: 'primary.main' }}
                              >
                                {c.name}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 2, lineHeight: 1.5, whiteSpace: 'pre-line' }}
                            >
                              {c.description || 'Aucune description'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              {(() => {
                                const catPresets = allPresets.filter((p) => p.categoryId === c.id);
                                const catMaterielPersos = allMaterielPersos.filter(
                                  (mp) => mp.categorieId === c.id,
                                );
                                const totalItems = catPresets.length + catMaterielPersos.length;
                                return (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      px: 1.5,
                                      py: 0.5,
                                      bgcolor: 'primary.50',
                                      color: 'primary.700',
                                      borderRadius: 1,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {totalItems} élément{totalItems > 1 ? 's' : ''}
                                    {catPresets.length > 0 &&
                                      catMaterielPersos.length > 0 &&
                                      ` (${catPresets.length} preset${catPresets.length > 1 ? 's' : ''}, ${catMaterielPersos.length} perso)`}
                                  </Typography>
                                );
                              })()}
                              <Typography variant="caption" color="text.secondary">
                                Discipline: {c.discipline}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                startIcon={<EditIcon color="primary" />}
                                onClick={() => onStartEditCategory(c)}
                              >
                                Éditer
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="text"
                                startIcon={<DeleteIcon color="error" />}
                                onClick={() => onConfirmDeleteCategory(c)}
                              >
                                Supprimer
                              </Button>
                            </Box>
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 400, width: '100%' }}>
                        {presetsLoading || materielPersoLoading ? (
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              py: 6,
                              px: 3,
                              borderRadius: 2,
                              bgcolor: 'grey.50',
                              border: '1px solid',
                              borderColor: 'grey.200',
                            }}
                          >
                            <CircularProgress size={32} sx={{ mb: 2 }} />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ textAlign: 'center' }}
                            >
                              Chargement des éléments...
                            </Typography>
                          </Box>
                        ) : (
                          (() => {
                            const catPresets = allPresets.filter((p) => p.categoryId === c.id);
                            const catMaterielPersos = allMaterielPersos.filter(
                              (mp) => mp.categorieId === c.id,
                            );
                            const totalItems = catPresets.length + catMaterielPersos.length;

                            return totalItems === 0 ? (
                              <Box
                                sx={{
                                  textAlign: 'center',
                                  py: 4,
                                  border: '2px dashed',
                                  borderColor: 'grey.300',
                                  borderRadius: 2,
                                  bgcolor: 'grey.50',
                                }}
                              >
                                <Typography variant="body2" color="text.secondary">
                                  Aucun élément dans cette catégorie
                                </Typography>
                              </Box>
                            ) : (
                              <Box sx={{ overflow: 'auto', pr: 1 }}>
                                {/* Matériel Perso */}
                                {catMaterielPersos.map((materielPerso) => (
                                  <motion.div
                                    key={`materielperso-${materielPerso.id}`}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.16 }}
                                  >
                                    <CategoryItem
                                      key={`materielperso-${materielPerso.id}`}
                                      item={materielPerso}
                                      type="materielPerso"
                                      categoryOptions={[]}
                                    />
                                  </motion.div>
                                ))}
                                {/* Presets */}
                                {catPresets.map((preset) => {
                                  const categoryOptions = [...categories, ...commonCategories];
                                  return (
                                    <motion.div
                                      key={`preset-${preset.id}`}
                                      initial={{ opacity: 0, y: 6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -6 }}
                                      transition={{ duration: 0.16 }}
                                    >
                                      <CategoryItem
                                        key={`preset-${preset.id}`}
                                        item={preset}
                                        type="preset"
                                        categoryOptions={categoryOptions}
                                      />
                                    </motion.div>
                                  );
                                })}
                              </Box>
                            );
                          })()
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Divider entre discipline et commun */}
        {commonCategories.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              my: 4,
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1, height: 1, bgcolor: 'grey.300' }} />
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                px: 2,
                py: 1,
                bgcolor: 'grey.100',
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'grey.400',
                }}
              />
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'grey.400',
                }}
              />
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'grey.400',
                }}
              />
            </Box>
            <Box sx={{ flex: 1, height: 1, bgcolor: 'grey.300' }} />
          </Box>
        )}

        {/* Catégories communes */}
        {commonCategories.map((c) => {
          const editing = editingCatId === c.id;
          const catPresets = allPresets.filter((p) => p.categoryId === c.id);
          return (
            <Card
              key={`common-${c.id}`}
              variant={editing ? 'outlined' : undefined}
              sx={{ mb: 2, boxShadow: 2, bgcolor: 'grey.50' }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 3,
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ flex: 1, width: '100%' }}>
                    {/* Similar structure for common categories... */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CategoryIcon color="secondary" fontSize="small" />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                          {c.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            px: 1,
                            py: 0.3,
                            bgcolor: 'secondary.100',
                            color: 'secondary.700',
                            borderRadius: 0.5,
                            fontWeight: 500,
                          }}
                        >
                          Commun
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2, lineHeight: 1.5, whiteSpace: 'pre-line' }}
                      >
                        {c.description || 'Aucune description'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        {(() => {
                          const catPresets = allPresets.filter((p) => p.categoryId === c.id);
                          const catMaterielPersos = allMaterielPersos.filter(
                            (mp) => mp.categorieId === c.id,
                          );
                          const totalItems = catPresets.length + catMaterielPersos.length;
                          return (
                            <Typography
                              variant="caption"
                              sx={{
                                px: 1.5,
                                py: 0.5,
                                bgcolor: 'secondary.50',
                                color: 'secondary.700',
                                borderRadius: 1,
                                fontWeight: 500,
                              }}
                            >
                              {totalItems} élément{totalItems > 1 ? 's' : ''}
                              {catPresets.length > 0 &&
                                catMaterielPersos.length > 0 &&
                                ` (${catPresets.length} preset${catPresets.length > 1 ? 's' : ''}, ${catMaterielPersos.length} perso)`}
                            </Typography>
                          );
                        })()}
                        <Typography variant="caption" color="text.secondary">
                          Discipline: {c.discipline}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1, width: '100%' }}>
                    {presetsLoading || materielPersoLoading ? (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          py: 6,
                          px: 3,
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'grey.200',
                        }}
                      >
                        <CircularProgress size={32} sx={{ mb: 2 }} />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textAlign: 'center' }}
                        >
                          Chargement des éléments...
                        </Typography>
                      </Box>
                    ) : (
                      (() => {
                        const catPresets = allPresets.filter((p) => p.categoryId === c.id);
                        const catMaterielPersos = allMaterielPersos.filter(
                          (mp) => mp.categorieId === c.id,
                        );
                        const totalItems = catPresets.length + catMaterielPersos.length;

                        return totalItems === 0 ? (
                          <Box
                            sx={{
                              textAlign: 'center',
                              py: 4,
                              border: '2px dashed',
                              borderColor: 'secondary.300',
                              borderRadius: 2,
                              bgcolor: 'background.paper',
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              Aucun élément dans cette catégorie
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ overflow: 'auto', pr: 1 }}>
                            {/* Presets */}
                            {catPresets.map((preset) => {
                              const categoryOptions = [...categories, ...commonCategories];
                              return (
                                <CategoryItem
                                  key={`preset-${preset.id}`}
                                  item={preset}
                                  type="preset"
                                  categoryOptions={categoryOptions}
                                />
                              );
                            })}
                            {/* Matériel Perso */}
                            {catMaterielPersos.map((materielPerso) => (
                              <CategoryItem
                                key={`materielperso-${materielPerso.id}`}
                                item={materielPerso}
                                type="materielPerso"
                                categoryOptions={[]}
                              />
                            ))}
                          </Box>
                        );
                      })()
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}

        {/* Sans catégorie pseudo-card */}
        {(() => {
          const uncategorizedPresets = allPresets.filter((p) => !p.categoryId);
          const uncategorizedMaterielPersos = allMaterielPersos.filter((mp) => !mp.categorieId);
          const totalUncategorized =
            uncategorizedPresets.length + uncategorizedMaterielPersos.length;

          return (
            totalUncategorized > 0 && (
              <Card
                key="__none"
                sx={{
                  mb: 2,
                  border: '2px dashed',
                  borderColor: 'warning.main',
                  bgcolor: 'warning.50',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 2,
                      flexDirection: 'column',
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                      Sans catégorie
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        bgcolor: 'warning.200',
                        color: 'warning.800',
                        borderRadius: 1,
                        fontWeight: 500,
                      }}
                    >
                      {totalUncategorized} élément{totalUncategorized > 1 ? 's' : ''}
                      {uncategorizedPresets.length > 0 &&
                        uncategorizedMaterielPersos.length > 0 &&
                        ` (${uncategorizedPresets.length} preset${uncategorizedPresets.length > 1 ? 's' : ''}, ${uncategorizedMaterielPersos.length} perso)`}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Éléments qui n'ont pas encore été assignés à une catégorie
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => {
                        setExpandedCats((prev) => {
                          const n = new Set(prev);
                          if (n.has('__none')) n.delete('__none');
                          else n.add('__none');
                          return n;
                        });
                      }}
                    >
                      {expandedCats.has('__none') ? 'Masquer les éléments' : 'Voir les éléments'}
                    </Button>
                  </Box>
                  {expandedCats.has('__none') &&
                    (presetsLoading || materielPersoLoading ? (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          py: 6,
                          px: 3,
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'warning.200',
                        }}
                      >
                        <CircularProgress size={32} sx={{ mb: 2, color: 'warning.main' }} />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textAlign: 'center' }}
                        >
                          Chargement des éléments...
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ overflow: 'auto', pr: 1 }}>
                        {/* Presets sans catégorie */}
                        {uncategorizedPresets.map((preset) => {
                          const categoryOptions = [...categories, ...commonCategories];
                          return (
                            <CategoryItem
                              key={`preset-${preset.id}`}
                              item={preset}
                              type="preset"
                              categoryOptions={categoryOptions}
                            />
                          );
                        })}
                        {/* MaterielPerso sans catégorie */}
                        {uncategorizedMaterielPersos.map((materielPerso) => (
                          <CategoryItem
                            key={`materielperso-${materielPerso.id}`}
                            item={materielPerso}
                            type="materielPerso"
                            categoryOptions={[]}
                          />
                        ))}
                      </Box>
                    ))}
                </CardContent>
              </Card>
            )
          );
        })()}

        {filteredSortedCategories.length === 0 && !catLoading && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="info">Aucune catégorie pour cette discipline.</Alert>
          </Grid>
        )}

        {catLoading && (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} />{' '}
              <Typography variant="caption">Chargement...</Typography>
            </Box>
          </Grid>
        )}
      </Box>

      {/* Dialog pour ajouter une nouvelle catégorie globale */}
      <Dialog
        open={globalCatDialogOpen}
        onClose={() => setGlobalCatDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              padding: 2,
              color: 'primary.contrastText',
            },
          },
        }}
      >
        <DialogTitle color="textPrimary">
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Ajouter une nouvelle catégorie
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Nom"
            value={globalCatName}
            onChange={(e) => setGlobalCatName(e.target.value)}
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Description"
            value={globalCatDesc}
            onChange={(e) => setGlobalCatDesc(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGlobalCatDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateGlobalCategory}>
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour ajouter une catégorie pour un preset */}
      <Dialog open={newCatDialogOpen} onClose={() => setNewCatDialogOpen(false)}>
        <DialogTitle>Nouvelle catégorie</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Nom"
            value={dialogCatName}
            onChange={(e) => setDialogCatName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCatDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateCategoryForPreset}>
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
