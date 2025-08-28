import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Chip,
  IconButton,
  Autocomplete,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import 'react-datepicker/dist/react-datepicker.css';
import { FrenchDateOnly } from '../../shared/FrenchDatePicker';
import { MaterialFormData, CustomCharacteristic, DISCIPLINES, CATEGORIES } from './types';

interface Step2Props {
  formData: MaterialFormData;
  setFormData: React.Dispatch<React.SetStateAction<MaterialFormData>>;
  selectedPreset: any;
  isModifiedFromPreset: () => boolean;
  availableCategories: string[];
  categoriesInfo: Array<{ id: number; name: string; discipline: string }>;
  catInput: string;
  setCatInput: (input: string) => void;
  disciplineLockedByCategory: boolean;
  setDisciplineLockedByCategory: (locked: boolean) => void;
  lockedDiscipline?: string;
  salles: any[];
  localisations: any[];
  loadingSalles: boolean;
  loadingLocalisations: boolean;
  suppliers: Array<{ id: number; name: string }>;
  onOpenCharacteristicDialog: () => void;
  onEditCharacteristic: (characteristic: CustomCharacteristic) => void;
  onDeleteCharacteristic: (id: string) => void;
  createCategoryIfNeededStep2: (name: string) => Promise<boolean>;
}

export function Step2({
  formData,
  setFormData,
  selectedPreset,
  isModifiedFromPreset,
  availableCategories,
  categoriesInfo,
  catInput,
  setCatInput,
  disciplineLockedByCategory,
  setDisciplineLockedByCategory,
  lockedDiscipline,
  salles,
  localisations,
  loadingSalles,
  loadingLocalisations,
  suppliers,
  onOpenCharacteristicDialog,
  onEditCharacteristic,
  onDeleteCharacteristic,
  createCategoryIfNeededStep2,
}: Step2Props) {
  return (
    <Box>
      {selectedPreset && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>
              Basé sur le preset: <strong>{selectedPreset.name}</strong>
            </span>
            {isModifiedFromPreset() && (
              <Chip label="Modifié" size="small" color="warning" variant="outlined" />
            )}
          </Box>
        </Alert>
      )}

      <Box component="form">
        {/* Section principale */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Informations générales
          </Typography>

          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              fullWidth
              label="Nom du matériel"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />

            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
            >
              <Autocomplete
                size="small"
                freeSolo
                options={
                  availableCategories.length ? availableCategories.sort() : CATEGORIES.sort()
                }
                value={(() => {
                  // Trouver la catégorie par ID si disponible
                  if (formData.categoryId) {
                    const cat = categoriesInfo.find((c) => c.id === formData.categoryId);
                    return cat?.name || '';
                  }
                  return '';
                })()}
                onChange={(_, v) => {
                  if (typeof v === 'string') {
                    const vTrim = v.trim();
                    let newDiscipline = formData.discipline;
                    let categoryId = null;

                    const cand = categoriesInfo.find(
                      (c) => c.name.toLowerCase() === vTrim.toLowerCase(),
                    );
                    if (cand) {
                      newDiscipline = cand.discipline;
                      categoryId = cand.id;
                      setDisciplineLockedByCategory(true);
                    }
                    setFormData((prev) => ({
                      ...prev,
                      categoryId: categoryId,
                      discipline: newDiscipline,
                    }));
                  }
                }}
                onInputChange={(_, v) => {
                  setCatInput(v);
                  // Si l'input ne correspond à aucune catégorie existante, on met categoryId à null
                  const matchingCategory = categoriesInfo.find(
                    (c) => c.name.toLowerCase() === v.toLowerCase(),
                  );
                  setFormData((prev) => ({
                    ...prev,
                    categoryId: matchingCategory?.id || null,
                  }));
                }}
                renderInput={(params) => {
                  const lower = (availableCategories.length ? availableCategories : CATEGORIES).map(
                    (c) => c.toLowerCase(),
                  );
                  const v = (catInput || '').trim();
                  const currentCategoryName = formData.categoryId
                    ? categoriesInfo.find((c) => c.id === formData.categoryId)?.name || ''
                    : '';
                  const displayValue = v || currentCategoryName;
                  const mismatch =
                    displayValue.length > 0 && !lower.includes(displayValue.toLowerCase());
                  return (
                    <TextField
                      {...params}
                      label="Catégorie"
                      slotProps={{
                        input: {
                          endAdornment: (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {mismatch && (
                                <IconButton
                                  size="small"
                                  title="Ajouter la catégorie"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    const ok = await createCategoryIfNeededStep2(v);
                                    if (ok) {
                                      const cand = categoriesInfo.find(
                                        (c) => c.name.toLowerCase() === v.toLowerCase(),
                                      );
                                      const newDisc = cand
                                        ? cand.discipline
                                        : formData.discipline || lockedDiscipline;
                                      if (cand) setDisciplineLockedByCategory(true);
                                      setFormData((prev) => ({
                                        ...prev,
                                        categoryId: cand?.id || null,
                                        discipline: newDisc || prev.discipline,
                                      }));
                                    }
                                  }}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              )}
                              {params.InputProps.endAdornment}
                            </Box>
                          ),
                        },
                      }}
                    />
                  );
                }}
              />

              <Box>
                <FormControl fullWidth disabled={!!lockedDiscipline || disciplineLockedByCategory}>
                  <InputLabel>Discipline</InputLabel>
                  <Select
                    value={formData.discipline}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, discipline: e.target.value }))
                    }
                  >
                    {DISCIPLINES.map((disc) => (
                      <MenuItem key={disc} value={disc}>
                        {disc}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {disciplineLockedByCategory && (
                  <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                    Discipline imposée par la catégorie
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Section caractéristiques */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Caractéristiques
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              label="Quantité"
              type="number"
              value={formData.quantity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
              }
              slotProps={{ htmlInput: { min: 1 } }}
            />

            <TextField
              fullWidth
              label="Stock minimum"
              type="number"
              value={formData.minStock || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, minStock: parseInt(e.target.value) || 1 }))
              }
              slotProps={{ htmlInput: { min: 0 } }}
            />

            <TextField
              fullWidth
              label="Modèle"
              value={formData.model || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
            />

            <TextField
              fullWidth
              label="N° de série"
              value={formData.serialNumber || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))}
            />
          </Box>
        </Paper>

        {/* Section acquisition */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Acquisition et fournisseur
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              alignItems: 'end',
            }}
          >
            <Autocomplete
              fullWidth
              options={suppliers}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
              value={suppliers.find((s) => s.name === formData.supplier) || formData.supplier || ''}
              freeSolo
              onChange={(_, value) => {
                const supplierName = typeof value === 'string' ? value : value?.name || '';
                setFormData((prev) => ({ ...prev, supplier: supplierName }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Fournisseur"
                  placeholder="Sélectionner ou taper un fournisseur"
                />
              )}
            />

            <Box>
              <Typography variant="caption" display="block" fontWeight={600} sx={{ mb: 1 }}>
                Date d'achat
              </Typography>
              <FrenchDateOnly
                selected={formData.purchaseDate ? new Date(formData.purchaseDate) : null}
                onChange={(date: Date | null) =>
                  setFormData((prev) => ({
                    ...prev,
                    purchaseDate: date ? date.toISOString().split('T')[0] : '',
                  }))
                }
                customInput={<TextField size="medium" />}
              />
            </Box>
          </Box>
        </Paper>

        {/* Section localisation */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Localisation
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth disabled={loadingSalles}>
              <InputLabel>Salle</InputLabel>
              <Select
                value={formData.salleId || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, salleId: Number(e.target.value) || null }))
                }
              >
                <MenuItem value="">
                  <em>Aucune salle</em>
                </MenuItem>
                {salles.map((salle) => (
                  <MenuItem key={salle.id} value={salle.id}>
                    {salle.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={loadingLocalisations || !formData.salleId}>
              <InputLabel>Localisation</InputLabel>
              <Select
                value={formData.localisationId || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    localisationId: Number(e.target.value) || null,
                  }))
                }
              >
                <MenuItem value="">
                  <em>Aucune localisation</em>
                </MenuItem>
                {localisations.map((localisation) => (
                  <MenuItem key={localisation.id} value={localisation.id}>
                    {localisation.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Section caractéristiques personnalisées */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Caractéristiques personnalisées
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={onOpenCharacteristicDialog}
            >
              Ajouter
            </Button>
          </Box>

          {formData.caracteristiques && formData.caracteristiques.length > 0 ? (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {formData.caracteristiques.map((characteristic) => (
                <Paper
                  key={characteristic.id}
                  variant="outlined"
                  sx={{ p: 2, backgroundColor: 'grey.50' }}
                >
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {characteristic.nom}
                        {characteristic.unite && (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            ({characteristic.unite})
                          </Typography>
                        )}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {characteristic.valeur.map((valeur, index) => (
                          <Chip key={index} label={valeur} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => onEditCharacteristic(characteristic)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onDeleteCharacteristic(characteristic.id)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 0 }}>
              Aucune caractéristique personnalisée ajoutée. Cliquez sur "Ajouter" pour définir une
              nouvelle.
            </Alert>
          )}
        </Paper>

        {/* Section notes */}
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Informations complémentaires
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes supplémentaires"
            value={formData.notes || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Informations complémentaires, état, remarques..."
          />
        </Paper>
      </Box>
    </Box>
  );
}
