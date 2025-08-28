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
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Edit, Save } from '@mui/icons-material';
import 'react-datepicker/dist/react-datepicker.css';
import { FrenchDateOnly } from '../shared/FrenchDatePicker';
import { ChemicalItem } from './ChemicalCard';
import { HazardClassSelector } from './HazardClassSelector';

interface Salle {
  id: number;
  name: string;
  localisations?: { id: number; name: string }[];
}

interface Supplier {
  id: number;
  name: string;
  kind: string;
}

interface FormData {
  salleId: number | null;
  localisationId: number | null;
  unit: string;
  minStock: string;
  supplierName: string;
  purchaseDate: string;
  expirationDate: string;
  notes: string;
}

interface ChemicalEditDialogProps {
  open: boolean;
  editing: ChemicalItem | null;
  form: FormData;
  formStock: number;
  salles: Salle[];
  supplierOptions: Supplier[];
  loadingSuppliers: boolean;
  loadingSalles: boolean;
  loadingAction: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onFormChange: (field: keyof FormData, value: any) => void;
  onStockChange: (value: number) => void;
  onGoToPreset?: (presetId?: number) => void;
}

export function ChemicalEditDialog({
  open,
  editing,
  form,
  formStock,
  salles,
  supplierOptions,
  loadingSuppliers,
  loadingSalles,
  loadingAction,
  onClose,
  onUpdate,
  onFormChange,
  onStockChange,
  onGoToPreset,
}: ChemicalEditDialogProps) {
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
            color: 'text.primary',
          },
        },
      }}
    >
      <DialogTitle sx={{ color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Edit />
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Modifier le réactif
            {editing?.name && (
              <span style={{ fontWeight: 200, fontSize: '1rem', marginLeft: 8 }}>
                ({editing.name})
              </span>
            )}
          </Typography>
        </Box>
      </DialogTitle>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
      <DialogContent sx={{ p: 3 }}>
        {editing && (
          <Stack spacing={3}>
            {/* Informations du réactif (lecture seule) */}
            <TextField label="Nom" value={editing.name} disabled fullWidth />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Formule" value={editing.formula || ''} disabled fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="CAS" value={editing.casNumber || ''} disabled fullWidth />
              </Grid>
            </Grid>

            <HazardClassSelector
              value={(() => {
                const hazardValue = editing.hazardClass || editing.hazard;
                if (!hazardValue) return [];
                return hazardValue.split(', ').filter(Boolean);
              })()}
              disabled={true}
              sx={{ width: '100%' }}
            />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                mt: 0,
                width: '100%',
              }}
            >
              <Button
                variant="outlined"
                size="small"
                color="inherit"
                disabled={!editing.reactifPresetId}
                onClick={() => {
                  if (editing.reactifPresetId) {
                    if (onGoToPreset) {
                      onGoToPreset(editing.reactifPresetId);
                      onClose();
                    } else {
                      try {
                        localStorage.setItem('presetFocusId', String(editing.reactifPresetId));
                        localStorage.setItem('reactifs-tab', '2');
                      } catch {}
                      window.location.href = '/reactifs';
                    }
                  }
                }}
                sx={{
                  color: 'text.primary',
                  p: 1,
                }}
              >
                Modifier le preset…
              </Button>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Stock et unités
            </Typography>

            {/* Stock et unités */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Stock"
                  type="number"
                  value={formStock}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onStockChange(Number.isNaN(v) ? 0 : v);
                  }}
                  slotProps={{ htmlInput: { step: 0.1, min: 0 } }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Unité"
                  value={form.unit}
                  onChange={(e) => onFormChange('unit', e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>

            <TextField
              label="Ajouter un stock minimum"
              type="number"
              value={form.minStock}
              onChange={(e) => onFormChange('minStock', e.target.value.replace(',', '.'))}
              fullWidth
            />

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Fournisseur
            </Typography>

            {/* Autocomplete fournisseur */}
            <Autocomplete
              fullWidth
              options={supplierOptions}
              loading={loadingSuppliers}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
              value={
                form.supplierName
                  ? supplierOptions.find(
                      (o) => o.name.toLowerCase() === form.supplierName.toLowerCase(),
                    ) || { id: 0, name: form.supplierName, kind: 'CUSTOM' }
                  : null
              }
              freeSolo
              onChange={(_, value) => {
                if (!value) {
                  onFormChange('supplierName', '');
                } else if (typeof value === 'string') {
                  onFormChange('supplierName', value);
                } else {
                  onFormChange('supplierName', value.name);
                }
              }}
              onInputChange={(_, newInput, reason) => {
                if (reason === 'input') {
                  onFormChange('supplierName', newInput);
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

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Dates
            </Typography>

            {/* Dates */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                  <Typography variant="caption" display="block" fontWeight={600} sx={{ mb: 1 }}>
                    Date d'achat
                  </Typography>
                  <FrenchDateOnly
                    selected={form.purchaseDate ? new Date(form.purchaseDate) : null}
                    onChange={(date: Date | null) =>
                      onFormChange('purchaseDate', date ? date.toISOString().split('T')[0] : '')
                    }
                    customInput={<TextField size="medium" />}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                  <Typography variant="caption" display="block" fontWeight={600} sx={{ mb: 1 }}>
                    Date d'expiration
                  </Typography>
                  <FrenchDateOnly
                    selected={form.expirationDate ? new Date(form.expirationDate) : null}
                    onChange={(date: Date | null) =>
                      onFormChange('expirationDate', date ? date.toISOString().split('T')[0] : '')
                    }
                    customInput={<TextField size="medium" />}
                  />
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Localisation
            </Typography>

            {/* Salle et Localisation */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'text.primary' }}>Salle</InputLabel>
                  <Select
                    label="Salle"
                    value={salles.find((s) => s.id === form.salleId) ? (form.salleId ?? '') : ''}
                    onChange={(e) => {
                      const newSalleId = e.target.value ? Number(e.target.value) : null;
                      // Met à jour la salle
                      onFormChange('salleId', newSalleId);
                      onFormChange('localisationId', null);
                    }}
                    sx={{
                      color: 'text.primary',
                      '& .MuiSvgIcon-root': { color: 'text.primary' },
                    }}
                  >
                    <MenuItem value="">
                      <em>Aucune</em>
                    </MenuItem>
                    {salles.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {/* On ne montre plus l'ancienne salle (source de confusion) : seul l'état courant compte */}
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl
                  fullWidth
                  disabled={!form.salleId}
                  key={`loc-select-${form.salleId || 'none'}`}
                >
                  <InputLabel sx={{ color: 'text.primary' }}>Localisation</InputLabel>
                  <Select
                    label="Localisation"
                    value={form.localisationId ?? ''}
                    onChange={(e) =>
                      onFormChange('localisationId', e.target.value ? Number(e.target.value) : null)
                    }
                    sx={{
                      color: 'text.primary',
                      '& .MuiSvgIcon-root': { color: 'text.primary' },
                    }}
                  >
                    <MenuItem value="">
                      <em>Aucune</em>
                    </MenuItem>
                    {salles
                      .find((s) => s.id === form.salleId)
                      ?.localisations?.map((loc: any) => (
                        <MenuItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </MenuItem>
                      ))}
                  </Select>
                  {/* Plus d'affichage "Localisation actuelle" basé sur l'item original : on reflète uniquement form.localisationId */}
                </FormControl>
              </Grid>
            </Grid>

            {loadingSalles && <CircularProgress size={24} />}

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Notes
            </Typography>

            {/* Notes */}
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={form.notes}
              onChange={(e) => onFormChange('notes', e.target.value)}
              fullWidth
            />

            {/* Modifier le preset */}
            <Box>
              {!editing.reactifPresetId && (
                <Typography
                  variant="caption"
                  color="rgba(255,255,255,0.7)"
                  display="block"
                  sx={{ mt: 0.5 }}
                >
                  Aucun preset associé
                </Typography>
              )}
            </Box>
            {loadingAction && <CircularProgress size={24} />}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Button onClick={onClose} disabled={loadingAction} color="error">
          Annuler
        </Button>
        <Button
          onClick={onUpdate}
          variant="contained"
          color="success"
          disabled={loadingAction || formStock < 0}
          startIcon={<Save />}
          sx={{ fontWeight: 'bold' }}
        >
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
}
