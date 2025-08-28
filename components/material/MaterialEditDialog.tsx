'use client';
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Autocomplete,
  Typography,
  Divider,
  Box,
  Stack,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Edit, Save } from '@mui/icons-material';
import 'react-datepicker/dist/react-datepicker.css';
import { FrenchDateOnly } from '../shared/FrenchDatePicker';
import { Materiel } from './MaterielManagement';

interface Salle {
  id: number;
  name: string;
  description?: string;
  batiment?: string;
}

interface Localisation {
  id: number;
  name: string;
  description?: string;
  salleId: number;
}

interface Category {
  id: number;
  name: string;
  discipline: string;
  description?: string;
}

interface Supplier {
  id: number;
  name: string;
  kind: string;
}

interface FormData {
  name: string;
  categoryId: number | null;
  quantity: number;
  minStock: number;
  model: string;
  serialNumber: string;
  supplier: string;
  purchaseDate: string;
  notes: string;
  salleId: number | null;
  localisationId: number | null;
}

interface MaterialEditDialogProps {
  open: boolean;
  editingItem: Materiel | null;
  formData: FormData;
  categories: Category[];
  salles: Salle[];
  localisations: Localisation[];
  supplierOptions: Supplier[];
  loadingSuppliers: boolean;
  onClose: () => void;
  onSave: () => void;
  onInputChange: (field: keyof FormData, value: any) => void;
  onSalleChange: (value: number | null) => void;
  onLocalisationChange: (value: number | null) => void;
}

export function MaterialEditDialog({
  open,
  editingItem,
  formData,
  categories,
  salles,
  localisations,
  supplierOptions,
  loadingSuppliers,
  onClose,
  onSave,
  onInputChange,
  onSalleChange,
  onLocalisationChange,
}: MaterialEditDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
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
      <DialogTitle sx={{ color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Edit />
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Modifier le matériel
            {editingItem?.name && (
              <span style={{ fontWeight: 200, fontSize: '1rem', marginLeft: 8 }}>
                ({editingItem.name})
              </span>
            )}
          </Typography>
        </Box>
      </DialogTitle>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 1 }} />
      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Nom du matériel */}
          <TextField
            label="Nom du matériel"
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            fullWidth
            required
          />

          {/* Catégorie */}
          <Autocomplete
            options={categories}
            getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
            value={categories.find((c) => c.id === formData.categoryId) || null}
            onChange={(_, value) =>
              onInputChange('categoryId', typeof value === 'string' ? null : value?.id || null)
            }
            renderInput={(params) => <TextField {...params} label="Ajouter une catégorie" />}
            freeSolo
          />

          {/* Quantité, Stock minimum et Modèle */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Ajouter quantité"
                type="number"
                value={formData.quantity}
                onChange={(e) => onInputChange('quantity', parseInt(e.target.value) || 0)}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Ajouter un stock minimum"
                type="number"
                value={formData.minStock}
                onChange={(e) => onInputChange('minStock', parseInt(e.target.value) || 0)}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Modèle"
                value={formData.model}
                onChange={(e) => onInputChange('model', e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Localisation
          </Typography>

          {/* Salle et Localisation */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={salles}
                getOptionLabel={(option) => option.name}
                value={salles.find((s) => s.id === formData.salleId) || null}
                onChange={(_, value) => onSalleChange(value?.id || null)}
                renderInput={(params) => <TextField {...params} label="Ajouter une salle" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={localisations.filter((l) => l.salleId === formData.salleId)}
                getOptionLabel={(option) => option.name}
                value={localisations.find((l) => l.id === formData.localisationId) || null}
                onChange={(_, value) => onLocalisationChange(value?.id || null)}
                disabled={!formData.salleId}
                renderInput={(params) => <TextField {...params} label="Ajouter une localisation" />}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Informations complémentaires
          </Typography>

          {/* Numéro de série et Fournisseur */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Numéro de série"
                value={formData.serialNumber}
                onChange={(e) => onInputChange('serialNumber', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {/* Autocomplete fournisseur */}
              <Autocomplete
                fullWidth
                options={supplierOptions}
                loading={loadingSuppliers}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                value={
                  formData.supplier
                    ? supplierOptions.find(
                        (o) => o.name.toLowerCase() === formData.supplier.toLowerCase(),
                      ) || { id: 0, name: formData.supplier, kind: 'CUSTOM' }
                    : null
                }
                freeSolo
                onChange={(_, value) => {
                  if (!value) {
                    onInputChange('supplier', '');
                  } else if (typeof value === 'string') {
                    onInputChange('supplier', value);
                  } else {
                    onInputChange('supplier', value.name);
                  }
                }}
                onInputChange={(_, newInput, reason) => {
                  if (reason === 'input') {
                    onInputChange('supplier', newInput);
                  }
                }}
                renderInput={(params) => {
                  const { InputProps, ...rest } = params;
                  return (
                    <TextField
                      {...rest}
                      label="Ajouter un fournisseur"
                      placeholder="Sélectionner ou saisir un fournisseur"
                      slotProps={{
                        input: {
                          ...InputProps,
                          endAdornment: (
                            <>
                              {loadingSuppliers ? <CircularProgress size={16} /> : null}
                              {InputProps?.endAdornment}
                            </>
                          ),
                        },
                      }}
                    />
                  );
                }}
                renderOption={(props, option) => {
                  const { key, ...other } = props as any;
                  return (
                    <Box
                      component="li"
                      key={key}
                      {...other}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between !important',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <Typography>{option.name}</Typography>
                      <Chip
                        label={option.kind === 'CUSTOM' ? 'Custom' : 'Normal'}
                        size="small"
                        color={option.kind === 'CUSTOM' ? 'secondary' : 'default'}
                        variant={option.kind === 'CUSTOM' ? 'outlined' : 'filled'}
                      />
                    </Box>
                  );
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 12 }}>
              <Box>
                <Typography variant="caption" display="block" fontWeight={600} sx={{ mb: 1 }}>
                  Date d'achat
                </Typography>
                <FrenchDateOnly
                  selected={formData.purchaseDate ? new Date(formData.purchaseDate) : null}
                  onChange={(date: Date | null) =>
                    onInputChange('purchaseDate', date ? date.toISOString().split('T')[0] : '')
                  }
                  customInput={<TextField size="medium" />}
                />
              </Box>
            </Grid>
          </Grid>

          {/* Notes */}
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={(e) => onInputChange('notes', e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="error">
          Annuler
        </Button>
        <Button
          variant="outlined"
          onClick={onSave}
          disabled={!formData.name.trim()}
          startIcon={<Save />}
          color="success"
          sx={{ fontWeight: 'bold' }}
        >
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
}
