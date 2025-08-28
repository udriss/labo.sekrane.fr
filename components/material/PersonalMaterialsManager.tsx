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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useSnackbar } from '@/components/providers/SnackbarProvider';
import { CharacteristicDialog, CustomCharacteristic } from './AddMaterialStepper/index';

interface Props {
  discipline: string;
  materielPersoFocusId?: number;
}

const DISCIPLINES = ['Physique', 'Chimie', 'SVT', 'Commun'];

export function PersonalMaterialsManager({ discipline, materielPersoFocusId }: Props) {
  const [search, setSearch] = useState('');
  const [materielPersos, setMaterielPersos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMaterielPerso, setEditMaterielPerso] = useState<any | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // States pour les caractéristiques personnalisées
  const [customCharacteristicDialog, setCustomCharacteristicDialog] = useState(false);
  const [editingCharacteristic, setEditingCharacteristic] = useState<CustomCharacteristic | null>(
    null,
  );
  const [expandedCharacteristics, setExpandedCharacteristics] = useState<Set<number>>(new Set());

  const { showSnackbar } = useSnackbar();

  // Use lowercase values so API values like 'chimie' match the options
  const disciplineValue = ((creating && creating.discipline) || discipline || '').toLowerCase();

  useEffect(() => {
    // ensure creating.discipline is always a string value
    if (!creating) return;
    setCreating((c: any) => ({
      ...c,
      discipline: String(c.discipline || discipline || '').toLowerCase(),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fonction utilitaire pour convertir les caractéristiques JSON en format du composant
  const parseCaracteristiques = (caracteristiques: any) => {
    if (!caracteristiques) return [];

    try {
      // Si c'est déjà un array, le retourner
      if (Array.isArray(caracteristiques)) return caracteristiques;

      // Si c'est un string JSON, le parser
      if (typeof caracteristiques === 'string') {
        const parsed = JSON.parse(caracteristiques);

        // Convertir l'objet en array de caractéristiques
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          return Object.entries(parsed).map(([key, value], index) => ({
            id: `char_${index}`,
            name: key,
            type: 'text', // type par défaut
            unit: '', // unité vide par défaut
            value: String(value), // La valeur réelle
            displayValue: String(value), // Pour l'affichage
          }));
        }

        // Si c'est déjà un array, le retourner
        if (Array.isArray(parsed)) return parsed;
      }

      // Si c'est un objet, le convertir
      if (typeof caracteristiques === 'object') {
        return Object.entries(caracteristiques).map(([key, value], index) => ({
          id: `char_${index}`,
          name: key,
          type: 'text',
          unit: '',
          value: String(value),
          displayValue: String(value),
        }));
      }
    } catch (e) {
      console.warn('Erreur lors du parsing des caractéristiques:', e);
    }

    return [];
  };

  // Fonction utilitaire pour convertir les caractéristiques du composant vers JSON
  const formatCaracteristiquesForAPI = (caracteristiques: any[]) => {
    if (!caracteristiques || caracteristiques.length === 0) return {};

    // Convertir en objet clé-valeur pour la DB
    const obj: { [key: string]: any } = {};
    caracteristiques.forEach((char) => {
      if (char.name && char.name.trim()) {
        obj[char.name] = char.displayValue || char.value || 'N/A';
      }
    });

    return obj;
  };

  // Convertir une caractéristique d'affichage vers le format CharacteristicDialog
  const toCharacteristicDialogFormat = (char: any): CustomCharacteristic => {
    return {
      id: char.id || `char_${Date.now()}`,
      nom: char.name || '',
      valeur: [char.displayValue || char.value || ''],
      unite: char.unit || '',
    };
  };

  // Convertir une caractéristique de CharacteristicDialog vers le format d'affichage
  const fromCharacteristicDialogFormat = (char: CustomCharacteristic) => {
    return {
      id: char.id,
      name: char.nom,
      type: 'text',
      unit: char.unite || '',
      value: Array.isArray(char.valeur) ? char.valeur[0] : char.valeur,
      displayValue: Array.isArray(char.valeur) ? char.valeur[0] : char.valeur,
    };
  };

  // Fetch matériel perso
  const fetchMaterielPersos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      params.append('discipline', discipline.toLowerCase());
      params.append('limit', pageSize.toString());
      params.append('page', page.toString());

      const response = await fetch(`/api/materiel-perso?${params.toString()}`);
      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      let list = data.materielPersons || [];

      // Also load "commun" if not already commun
      if (discipline.toLowerCase() !== 'commun') {
        try {
          const commonParams = new URLSearchParams();
          if (search.trim()) commonParams.append('search', search.trim());
          commonParams.append('discipline', 'commun');
          commonParams.append('limit', pageSize.toString());
          commonParams.append('page', page.toString());

          const commonResponse = await fetch(`/api/materiel-perso?${commonParams.toString()}`);
          if (commonResponse.ok) {
            const commonData = await commonResponse.json();
            const existingIds = new Set(list.map((mp: any) => mp.id));
            const merged = [
              ...list,
              ...(commonData.materielPersons || []).filter((mp: any) => !existingIds.has(mp.id)),
            ];
            list = merged;
          }
        } catch (e) {
          // ignore common fetch errors
        }
      }

      setMaterielPersos(
        list.map((materiel: any) => ({
          ...materiel,
          caracteristiques: parseCaracteristiques(materiel.caracteristiques),
        })),
      );
      setTotal(data.pagination?.total || list.length);
    } catch (e: any) {
      showSnackbar(`Erreur: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize, discipline, showSnackbar]);

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchMaterielPersos();
  }, [fetchMaterielPersos]);

  // Focus sur un matériel perso spécifié
  const focusRef = useRef<number | null>(null);
  useEffect(() => {
    if (!materielPersoFocusId || !materielPersos.length) return;
    if (focusRef.current === materielPersoFocusId) return;
    const targetMateriel = materielPersos.find((mp) => mp.id === materielPersoFocusId);
    const el = document.querySelector(`[data-materiel-perso-id="${materielPersoFocusId}"]`);
    if (targetMateriel) {
      setSearch(targetMateriel.name);
      setPage(1);
    }
    if (el) {
      focusRef.current = materielPersoFocusId;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('materiel-perso-focus');
      setTimeout(() => el.classList.remove('materiel-perso-focus'), 2200);
    }
  }, [materielPersoFocusId, materielPersos]);

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

  const openEditDialog = (mp: any) => {
    setEditMaterielPerso({ ...mp });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    if (updatingId) return;
    setEditDialogOpen(false);
    setEditMaterielPerso(null);
  };

  const saveDialogEdit = async () => {
    if (!editMaterielPerso?.id) return;
    setUpdatingId(editMaterielPerso.id);
    try {
      const response = await fetch(`/api/materiel-perso/${editMaterielPerso.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editMaterielPerso,
          caracteristiques: formatCaracteristiquesForAPI(editMaterielPerso.caracteristiques),
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour');

      const updated = await response.json();
      // Parser les caractéristiques de la réponse
      const formattedUpdated = {
        ...updated,
        caracteristiques: parseCaracteristiques(updated.caracteristiques),
      };
      setMaterielPersos((prev) => prev.map((mp) => (mp.id === updated.id ? formattedUpdated : mp)));
      showSnackbar('Matériel perso mis à jour', 'success');
      setEditDialogOpen(false);
      setEditMaterielPerso(null);
    } catch (e: any) {
      showSnackbar(e.message || 'Erreur mise à jour', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const saveCreate = async () => {
    if (!creating) return;
    try {
      // Trouver le categorieId si une catégorie est spécifiée
      let categorieId = null;
      if (creating.category) {
        const categoryResponse = await fetch(
          `/api/materiel/categories?discipline=${creating.discipline.toLowerCase()}`,
        );
        if (categoryResponse.ok) {
          const categoryData = await categoryResponse.json();
          const foundCategory = (categoryData.categories || []).find(
            (c: any) => c.name === creating.category,
          );
          if (foundCategory) {
            categorieId = foundCategory.id;
          }
        }
      }

      const response = await fetch('/api/materiel-perso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...creating,
          categorieId,
          caracteristiques: formatCaracteristiquesForAPI(creating.caracteristiques),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'ajout');
      }

      const created = await response.json();
      // Parser les caractéristiques de la réponse
      const formattedCreated = {
        ...created,
        caracteristiques: parseCaracteristiques(created.caracteristiques),
      };
      showSnackbar('Matériel perso ajouté', 'success');
      setMaterielPersos((prev) => [formattedCreated, ...prev]);
    } catch (e: any) {
      showSnackbar(e.message || 'Erreur ajout', 'error');
      return;
    }
    setCreating(null);
  };

  const removeMaterielPerso = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce matériel personnalisé ?')) return;

    try {
      const response = await fetch(`/api/materiel-perso/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      setMaterielPersos((prev) => prev.filter((mp) => mp.id !== id));
      showSnackbar('Matériel perso supprimé', 'info');
    } catch (e: any) {
      showSnackbar(e.message || 'Suppression impossible', 'error');
    }
  };

  // Handlers pour les caractéristiques
  const openAddCharacteristicDialog = () => {
    setEditingCharacteristic(null);
    setCustomCharacteristicDialog(true);
  };

  const openEditCharacteristicDialog = (characteristic: any) => {
    // Convertir au format attendu par CharacteristicDialog
    const dialogChar = toCharacteristicDialogFormat(characteristic);
    setEditingCharacteristic(dialogChar);
    setCustomCharacteristicDialog(true);
  };

  const closeCharacteristicDialog = () => {
    setCustomCharacteristicDialog(false);
    setEditingCharacteristic(null);
  };

  const saveCharacteristic = (characteristic: CustomCharacteristic) => {
    // Convertir du format CharacteristicDialog vers le format d'affichage
    const displayChar = fromCharacteristicDialogFormat(characteristic);

    if (creating) {
      if (editingCharacteristic) {
        // Modification
        setCreating((prev: any) => ({
          ...prev,
          caracteristiques: (prev.caracteristiques || []).map((char: any) =>
            char.id === editingCharacteristic.id ? displayChar : char,
          ),
        }));
      } else {
        // Ajout
        setCreating((prev: any) => ({
          ...prev,
          caracteristiques: [...(prev.caracteristiques || []), displayChar],
        }));
      }
    } else if (editMaterielPerso) {
      if (editingCharacteristic) {
        // Modification
        setEditMaterielPerso((prev: any) => ({
          ...prev,
          caracteristiques: (prev.caracteristiques || []).map((char: any) =>
            char.id === editingCharacteristic.id ? displayChar : char,
          ),
        }));
      } else {
        // Ajout
        setEditMaterielPerso((prev: any) => ({
          ...prev,
          caracteristiques: [...(prev.caracteristiques || []), displayChar],
        }));
      }
    }

    closeCharacteristicDialog();
    showSnackbar(
      editingCharacteristic ? 'Caractéristique modifiée' : 'Caractéristique ajoutée',
      'success',
    );
  };

  const deleteCharacteristic = (id: string) => {
    if (creating) {
      setCreating((prev: any) => ({
        ...prev,
        caracteristiques: (prev.caracteristiques || []).filter((char: any) => char.id !== id),
      }));
    } else if (editMaterielPerso) {
      setEditMaterielPerso((prev: any) => ({
        ...prev,
        caracteristiques: (prev.caracteristiques || []).filter((char: any) => char.id !== id),
      }));
    }
    showSnackbar('Caractéristique supprimée', 'success');
  };

  // Filtered matériel perso
  const filteredMaterielPersos = useMemo(() => {
    let filtered = materielPersos;

    if (selectedCategory) {
      filtered = filtered.filter((mp) => {
        if (!mp.categorie) return selectedCategory === 'Sans catégorie';
        return mp.categorie.name === selectedCategory;
      });
    }

    return filtered;
  }, [materielPersos, selectedCategory]);

  const canProceed = () => {
    return creating?.name?.trim() && creating?.discipline;
  };

  const toggleCharacteristicsExpanded = (id: number) => {
    setExpandedCharacteristics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <Box>
      {/* Pagination Top */}
      <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mt: 2 }}>
        <Pagination
          size="small"
          page={page}
          count={Math.max(1, Math.ceil(total / pageSize))}
          onChange={(_, v) => setPage(v)}
          showFirstButton
          showLastButton
        />
      </Stack>
      {/* Header Controls */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          my: 4,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'center' },
          justifyContent: { xs: 'center', md: 'space-between' },
          gap: 2,
        }}
      >
        {/* Search and Filter Controls */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ md: 'center' }}
          sx={{
            display: 'flex',
            gap: 2,
            width: '100%',
          }}
        >
          <TextField
            size="small"
            label="Recherche..."
            fullWidth
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 200, width: '100%' }}
          />
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
            }}
          >
            <FormControl size="small" sx={{ minWidth: 120, width: '100%' }}>
              <InputLabel>Catégorie</InputLabel>
              <Select
                value={selectedCategory}
                label="Catégorie"
                onChange={(e) => setSelectedCategory(e.target.value)}
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
        <Stack
          sx={{
            ml: 0,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexDirection: 'column',
          }}
        >
          {!creating && (
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              color="success"
              fullWidth
              sx={{
                maxWidth: 450,
                minWidth: 300,
              }}
              onClick={() =>
                setCreating({
                  name: '',
                  discipline: discipline,
                  description: '',
                  defaultQty: 1,
                  caracteristiques: [],
                })
              }
            >
              Nouveau matériel perso
            </Button>
          )}
          <Typography variant="caption" color="text.secondary">
            {total} matériels perso
          </Typography>
        </Stack>
      </Stack>

      {/* Create Form */}
      {creating && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Ajouter un nouveau matériel personnalisé
            </Typography>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  label="Nom du matériel"
                  fullWidth
                  value={creating.name || ''}
                  onChange={(e) => setCreating((c: any) => ({ ...c, name: e.target.value }))}
                  required
                />
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
                      setCreating((c: any) => ({ ...c, discipline: e.target.value }))
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
                  onChange={(e) => setCreating((c: any) => ({ ...c, description: e.target.value }))}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Quantité par défaut"
                  type="number"
                  fullWidth
                  value={creating.defaultQty || 1}
                  onChange={(e) =>
                    setCreating((c: any) => ({ ...c, defaultQty: parseInt(e.target.value) || 1 }))
                  }
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Grid>

              {/* Caractéristiques */}
              <Grid size={12}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2">Caractéristiques personnalisées</Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={openAddCharacteristicDialog}
                  >
                    Ajouter une caractéristique
                  </Button>
                </Stack>

                {creating.caracteristiques && creating.caracteristiques.length > 0 ? (
                  <Stack spacing={1}>
                    {creating.caracteristiques.map((char: any) => (
                      <Card key={char.id} variant="outlined" sx={{ p: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {char.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {char.displayValue || char.value || 'Aucune valeur'}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={() => openEditCharacteristicDialog(char)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteCharacteristic(char.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Aucune caractéristique définie
                  </Typography>
                )}
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

      {/* Matériel Perso Grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Box py={6} textAlign="center">
              <CircularProgress size={32} />
            </Box>
          </motion.div>
        ) : (
          <motion.div
            key={`${page}-${search}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {filteredMaterielPersos.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                Aucun matériel personnalisé trouvé.{' '}
                {creating
                  ? 'Vous pouvez ajouter le premier matériel ci-dessus.'
                  : "Cliquez sur 'Nouveau matériel perso' pour commencer."}
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {filteredMaterielPersos.map((materielPerso) => {
                  const loadingThis = updatingId === materielPerso.id;
                  const hasCharacteristics =
                    materielPerso.caracteristiques && materielPerso.caracteristiques.length > 0;
                  const isExpanded = expandedCharacteristics.has(materielPerso.id);

                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={materielPerso.id}>
                      <Card
                        data-materiel-perso-id={materielPerso.id}
                        sx={{
                          position: 'relative',
                          opacity: loadingThis ? 0.6 : 1,
                          outline: '2px solid transparent',
                          '&.materiel-perso-focus': { outlineColor: 'primary.main' },
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap gutterBottom>
                            {materielPerso.name}
                          </Typography>

                          <Typography variant="caption" color="text.secondary" display="block">
                            {materielPerso.discipline} •{' '}
                            {materielPerso.categorie?.name || 'Sans catégorie'}
                          </Typography>

                          {materielPerso.description && (
                            <Typography variant="body2" sx={{ mt: 1, mb: 1 }} noWrap>
                              {materielPerso.description}
                            </Typography>
                          )}

                          <Typography variant="caption" display="block">
                            Quantité par défaut : {materielPerso.defaultQty || 1}
                          </Typography>

                          {hasCharacteristics && (
                            <Box sx={{ mt: 1 }}>
                              <Button
                                size="small"
                                startIcon={<SettingsIcon />}
                                endIcon={
                                  <ExpandMoreIcon
                                    sx={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                                  />
                                }
                                onClick={() => toggleCharacteristicsExpanded(materielPerso.id)}
                                sx={{ mb: 1 }}
                              >
                                {materielPerso.caracteristiques.length} caractéristique(s)
                              </Button>

                              {isExpanded && (
                                <Stack spacing={0.5}>
                                  {materielPerso.caracteristiques.map(
                                    (char: any, index: number) => (
                                      <Card key={index} variant="outlined" sx={{ p: 1 }}>
                                        <Typography
                                          variant="caption"
                                          fontWeight={500}
                                          display="block"
                                        >
                                          {char.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {char.displayValue || char.value || 'Aucune valeur'}
                                        </Typography>
                                      </Card>
                                    ),
                                  )}
                                </Stack>
                              )}
                            </Box>
                          )}

                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}
                          >
                            <Button
                              size="small"
                              startIcon={<EditIcon color="primary" />}
                              disabled={loadingThis}
                              onClick={() => openEditDialog(materielPerso)}
                              variant="outlined"
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
                              onClick={() => removeMaterielPerso(materielPerso.id!)}
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
          count={Math.max(1, Math.ceil(total / pageSize))}
          onChange={(_, v) => setPage(v)}
          showFirstButton
          showLastButton
        />
      </Stack>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={closeEditDialog}
        fullWidth
        maxWidth="md"
        sx={{
          p: 2,
        }}
      >
        <DialogTitle sx={{ color: 'text.primary' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EditIcon />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Éditer le matériel personnalisé
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {editMaterielPerso && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nom"
                value={editMaterielPerso.name || ''}
                onChange={(e) =>
                  setEditMaterielPerso((mp: any) => ({ ...mp, name: e.target.value }))
                }
                required
                fullWidth
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    freeSolo
                    options={allCategories}
                    value={editMaterielPerso.categorie?.name || editMaterielPerso.category || ''}
                    onChange={(_, value) =>
                      setEditMaterielPerso((mp: any) => ({ ...mp, category: value || '' }))
                    }
                    renderInput={(params) => <TextField {...params} label="Catégorie" />}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Discipline</InputLabel>
                    <Select
                      value={editMaterielPerso.discipline || ''}
                      onChange={(e) =>
                        setEditMaterielPerso((mp: any) => ({ ...mp, discipline: e.target.value }))
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
              </Grid>

              <TextField
                label="Description"
                multiline
                rows={2}
                value={editMaterielPerso.description || ''}
                onChange={(e) =>
                  setEditMaterielPerso((mp: any) => ({ ...mp, description: e.target.value }))
                }
                fullWidth
              />

              <TextField
                label="Quantité par défaut"
                type="number"
                value={editMaterielPerso.defaultQty || 1}
                onChange={(e) =>
                  setEditMaterielPerso((mp: any) => ({
                    ...mp,
                    defaultQty: parseInt(e.target.value) || 1,
                  }))
                }
                slotProps={{ htmlInput: { min: 1 } }}
                fullWidth
              />

              {/* Caractéristiques dans l'édition */}
              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2">Caractéristiques personnalisées</Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={openAddCharacteristicDialog}
                  >
                    Ajouter une caractéristique
                  </Button>
                </Stack>

                {editMaterielPerso.caracteristiques &&
                editMaterielPerso.caracteristiques.length > 0 ? (
                  <Stack spacing={1}>
                    {editMaterielPerso.caracteristiques.map((char: any) => (
                      <Card key={char.id} variant="outlined" sx={{ p: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {char.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {char.displayValue || char.value || 'Aucune valeur'}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={() => openEditCharacteristicDialog(char)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteCharacteristic(char.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Aucune caractéristique définie
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog} disabled={!!updatingId}>
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={!editMaterielPerso?.name || !!updatingId}
            onClick={saveDialogEdit}
            startIcon={updatingId ? <CircularProgress size={16} /> : undefined}
          >
            Sauver
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour les caractéristiques personnalisées */}
      <CharacteristicDialog
        open={customCharacteristicDialog}
        editingCharacteristic={editingCharacteristic}
        onClose={closeCharacteristicDialog}
        onSave={saveCharacteristic}
      />
    </Box>
  );
}

export default PersonalMaterialsManager;
