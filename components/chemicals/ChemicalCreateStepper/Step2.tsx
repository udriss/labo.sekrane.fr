import React, { useRef } from 'react';
import {
  Stack,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Button,
  Box,
  Typography,
  Divider,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import 'react-datepicker/dist/react-datepicker.css';
import { FrenchDateOnly } from '../../shared/FrenchDatePicker';
import { FormState, ReactifPresetDTO } from './types';
import { HazardClassSelector } from '../HazardClassSelector';

interface Step2Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  selectedPreset: ReactifPresetDTO | null;
  presets: ReactifPresetDTO[];
  globalMeta: ReactifPresetDTO[];
  presetSearch: string;
  setPresetSearch: (search: string) => void;
  loadingPresets: boolean;
  showInlinePresetPicker: boolean;
  setShowInlinePresetPicker: (show: boolean) => void;
  applyingPreset: boolean;
  salles: any[];
  localisations: any[];
  loadingSalles: boolean;
  loadingLocalisations: boolean;
  supplierOptions: { id: number; name: string; kind?: string }[];
  supplierTimerRef: React.RefObject<NodeJS.Timeout | null>;
  setSupplierOptions: React.Dispatch<
    React.SetStateAction<{ id: number; name: string; kind?: string }[]>
  >;
  error: string | null;
  submitting: boolean;
  onCoreFieldChange: (field: 'name' | 'formula' | 'casNumber', value: string) => void;
  onApplyPreset: (preset: ReactifPresetDTO) => void;
  onSubmit: () => void;
  onBack: () => void;
  onReset: () => void;
  convertDisplay: (value: number, unit: string) => string | undefined;
}

export function Step2({
  form,
  setForm,
  selectedPreset,
  presets,
  globalMeta,
  presetSearch,
  setPresetSearch,
  loadingPresets,
  showInlinePresetPicker,
  setShowInlinePresetPicker,
  applyingPreset,
  salles,
  localisations,
  loadingSalles,
  loadingLocalisations,
  supplierOptions,
  supplierTimerRef,
  setSupplierOptions,
  error,
  submitting,
  onCoreFieldChange,
  onApplyPreset,
  onSubmit,
  onBack,
  onReset,
  convertDisplay,
}: Step2Props) {
  return (
    <Box>
      {selectedPreset && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>
              Basé sur le preset: <strong>{selectedPreset.name}</strong>
            </span>
          </Box>
        </Alert>
      )}

      <Box component="form">
        {/* Section informations générales */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Informations générales
          </Typography>

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Autocomplete
                freeSolo
                fullWidth
                options={presets.map((p) => p.name)}
                value={form.name}
                onChange={(_, v) => {
                  if (typeof v === 'string') {
                    const source = globalMeta.length ? globalMeta : presets;
                    const found = source.find((p) => p.name.toLowerCase() === v.toLowerCase());
                    if (found) onApplyPreset(found);
                    else onCoreFieldChange('name', v);
                  } else if (v == null) onCoreFieldChange('name', '');
                }}
                onInputChange={(_, v, reason) => {
                  if (reason === 'input') onCoreFieldChange('name', v);
                }}
                renderInput={(params) => <TextField {...params} label="Nom" required />}
              />
              <Autocomplete
                freeSolo
                fullWidth
                options={presets.filter((p) => p.formula).map((p) => p.formula!)}
                value={form.formula}
                onChange={(_, v) => {
                  if (typeof v === 'string' && v) {
                    onCoreFieldChange('formula', v);
                  } else if (v == null) onCoreFieldChange('formula', '');
                }}
                onInputChange={(_, v, reason) => {
                  if (reason === 'input') onCoreFieldChange('formula', v);
                }}
                renderInput={(params) => <TextField {...params} label="Formule" />}
              />
            </Stack>

            <Autocomplete
              freeSolo
              fullWidth
              options={presets.filter((p) => p.casNumber).map((p) => p.casNumber!)}
              value={form.casNumber}
              onChange={(_, v) => {
                if (typeof v === 'string' && v) {
                  onCoreFieldChange('casNumber', v);
                } else if (v == null) onCoreFieldChange('casNumber', '');
              }}
              onInputChange={(_, v, reason) => {
                if (reason === 'input') onCoreFieldChange('casNumber', v);
              }}
              renderInput={(params) => <TextField {...params} label="CAS" />}
            />
          </Stack>
          <Typography variant="subtitle1" sx={{ my: 2, fontWeight: 600, color: 'primary.main' }}>
            Classes de danger et propriétés
          </Typography>

          <Stack spacing={2}>
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
              <HazardClassSelector
                value={form.hazard}
                onChange={
                  selectedPreset ? undefined : (value) => setForm((f) => ({ ...f, hazard: value }))
                }
                disabled={!!selectedPreset}
                fullWidth
              />
              {selectedPreset && (
                <Tooltip title="Modifier le preset pour changer les classes de danger">
                  <IconButton
                    size="small"
                    onClick={() => {
                      try {
                        localStorage.setItem('presetFocusId', String(selectedPreset.id));
                        localStorage.setItem('reactifs-tab', '2');
                      } catch {}
                      window.open(
                        `/reactifs?tab=2&preset=${selectedPreset.id}`,
                        '_blank',
                        'noopener,noreferrer',
                      );
                    }}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                type="number"
                disabled
                label="Point d'ébullition (°C)"
                value={form.boilingPointC ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    boilingPointC: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
              />
              <TextField
                type="number"
                disabled
                label="Point de fusion (°C)"
                value={form.meltingPointC ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    meltingPointC: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
              />
              <TextField
                type="number"
                disabled
                label="Masse molaire (g/mol)"
                value={form.molarMass ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    molarMass: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
              />
              <TextField
                type="number"
                disabled
                label="Densité"
                value={form.density ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    density: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
              />
            </Stack>
          </Stack>
        </Paper>

        {/* Section suggestions de presets */}
        {showInlinePresetPicker && (
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Suggestions de presets
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Tapez pour filtrer les suggestions
            </Typography>
            <Autocomplete
              options={presets}
              getOptionLabel={(o) => o.name}
              loading={loadingPresets}
              noOptionsText={loadingPresets ? 'Chargement...' : 'Aucun'}
              onChange={(_, v) => v && onApplyPreset(v)}
              inputValue={presetSearch}
              onInputChange={(_, v) => setPresetSearch(v)}
              renderOption={(props, option) => (
                <li
                  {...props}
                  key={option.id || option.name}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <span style={{ fontWeight: 600 }}>{option.name}</span>
                  <small style={{ opacity: 0.7 }}>
                    {option.formula || '—'} {option.casNumber && `• ${option.casNumber}`}{' '}
                    {option.hazardClass && `• ${option.hazardClass}`}
                  </small>
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} size="small" placeholder="Rechercher un preset" />
              )}
            />
          </Paper>
        )}

        {/* Section quantité et stock */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Quantité et stock
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="number"
              label="Quantité"
              required
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))
              }
              helperText={convertDisplay(form.quantity, form.unit)}
            />
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Unité</InputLabel>
              <Select
                value={form.unit}
                label="Unité"
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              >
                <MenuItem value="g">g</MenuItem>
                <MenuItem value="kg">kg</MenuItem>
                <MenuItem value="mL">mL</MenuItem>
                <MenuItem value="L">L</MenuItem>
                <MenuItem value="mol">mol</MenuItem>
                <MenuItem value="pièce">pièce</MenuItem>
              </Select>
            </FormControl>
            <TextField
              type="number"
              label="Stock minimum"
              value={form.minQuantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, minQuantity: parseFloat(e.target.value) || 0 }))
              }
            />
          </Stack>
        </Paper>

        {/* Section fournisseur et acquisition */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Fournisseur et acquisition
          </Typography>

          <Stack spacing={2}>
            <Autocomplete
              freeSolo
              fullWidth
              options={supplierOptions.map((s) => s.name)}
              value={form.supplierName}
              onInputChange={(_, v) => {
                setForm((f) => ({ ...f, supplierName: v }));
                if ((supplierTimerRef as any).current)
                  clearTimeout((supplierTimerRef as any).current);
                (supplierTimerRef as any).current = window.setTimeout(async () => {
                  try {
                    const params = new URLSearchParams();
                    if (v.trim()) params.set('q', v.trim());
                    const r = await fetch('/api/suppliers?' + params.toString());
                    if (r.ok) {
                      const d = await r.json();
                      setSupplierOptions(d.suppliers || []);
                    }
                  } catch {
                    /* ignore */
                  }
                }, 250);
              }}
              renderInput={(params) => (
                <TextField {...params} label="Fournisseur" placeholder="Rechercher ou saisir" />
              )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>
                  Date d&apos;achat
                </Typography>
                <FrenchDateOnly
                  selected={form.purchaseDate}
                  onChange={(d: Date | null) => setForm((f) => ({ ...f, purchaseDate: d }))}
                  customInput={<TextField fullWidth size="medium" />}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>
                  Date d&apos;expiration
                </Typography>
                <FrenchDateOnly
                  selected={form.expirationDate}
                  onChange={(d: Date | null) => setForm((f) => ({ ...f, expirationDate: d }))}
                  customInput={<TextField fullWidth size="medium" />}
                />
              </Box>
            </Stack>
          </Stack>
        </Paper>

        {/* Section localisation */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Localisation
          </Typography>

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Salle</InputLabel>
                <Select
                  value={form.salleId || ''}
                  label="Salle"
                  disabled={loadingSalles}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      salleId: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <MenuItem value="">
                    <em>Aucune salle sélectionnée</em>
                  </MenuItem>
                  {salles.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth disabled={!form.salleId}>
                <InputLabel>Localisation</InputLabel>
                <Select
                  value={form.localisationId || ''}
                  label="Localisation"
                  disabled={!form.salleId || loadingLocalisations}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      localisationId: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <MenuItem value="">
                    <em>Aucune localisation précise</em>
                  </MenuItem>
                  {localisations.map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      {l.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {(form.salleId || form.localisationId) && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Salle: {form.salleId ? salles.find((s) => s.id === form.salleId)?.name : '—'} |
                  Localisation:{' '}
                  {form.localisationId
                    ? localisations.find((l) => l.id === form.localisationId)?.name
                    : '—'}
                </Typography>
              </Paper>
            )}
          </Stack>
        </Paper>

        {/* Section notes */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Informations complémentaires
          </Typography>

          <TextField
            label="Notes"
            multiline
            rows={3}
            fullWidth
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Informations complémentaires, notes de sécurité, remarques..."
          />
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
