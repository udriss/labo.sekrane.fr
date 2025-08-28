'use client';
import React, { useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  Button,
  Typography,
  Chip,
  Autocomplete,
  Paper,
} from '@mui/material';
import { HazardClassSelector } from './HazardClassSelector';
import { parseLatexToReact } from '@/lib/utils/latex';
import { ReactifPresetDTO } from '@/lib/services/chemical-presets-service';

interface Props {
  value: ReactifPresetDTO & { _categoriesArray?: string[]; _hazardsArray?: string[] };
  onChange: (
    next: ReactifPresetDTO & { _categoriesArray?: string[]; _hazardsArray?: string[] },
  ) => void;
  onSave: () => void;
  onCancel: () => void;
  presets: ReactifPresetDTO[];
  categoryOptions: string[];
}

export default function ReactifPresetCreateCard({
  value,
  onChange,
  onSave,
  onCancel,
  presets,
  categoryOptions,
}: Props) {
  const normalizeFormulaSearch = (v: string) =>
    v
      .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (m) => '0123456789'.charAt('₀₁₂₃₄₅₆₇₈₉'.indexOf(m)))
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (m) => '0123456789'.charAt('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(m)))
      .toLowerCase();

  const handleFormulaKey = (_e: React.KeyboardEvent<HTMLInputElement>) => {
    // With LaTeX input, we don't transform keys anymore
  };

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        {/* Section informations générales */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Informations générales
          </Typography>
          <Stack
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              flexDirection: 'column',
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Box sx={{ flex: '1 1 240px', minWidth: 200 }}>
                <TextField
                  label="Nom"
                  fullWidth
                  value={value.name}
                  onChange={(e) => onChange({ ...(value as any), name: e.target.value })}
                />
              </Box>

              <Box sx={{ flex: '1 1 140px', minWidth: 140 }}>
                <TextField
                  label="CAS"
                  fullWidth
                  value={value.casNumber || ''}
                  onChange={(e) => onChange({ ...(value as any), casNumber: e.target.value })}
                />
                {value.casNumber && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {presets
                      .filter(
                        (p) =>
                          p.casNumber &&
                          value.casNumber &&
                          p.casNumber.toLowerCase().includes(value.casNumber.toLowerCase()),
                      )
                      .slice(0, 3)
                      .map((p) => p.casNumber)
                      .join(' · ') || '—'}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'nowrap',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
              }}
            >
              <TextField
                label="Formule"
                sx={{
                  minWidth: 120,
                  display: 'flex',
                  flexGrow: 1,
                }}
                value={value.formula || ''}
                onChange={(e) => onChange({ ...(value as any), formula: e.target.value })}
                onKeyDown={handleFormulaKey}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    onChange({
                      ...(value as any),
                      formula: (value.formula || '') + '_{}',
                    })
                  }
                >
                  Indice _{}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    onChange({
                      ...(value as any),
                      formula: (value.formula || '') + '^{}',
                    })
                  }
                >
                  Exposant ^{}
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() =>
                    onChange({
                      ...(value as any),
                      formula: (value?.formula || '').slice(0, -1),
                    })
                  }
                >
                  ←
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() =>
                    onChange({
                      ...(value as any),
                      formula: (value?.formula || '').slice(0, +1),
                    })
                  }
                >
                  →
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => onChange({ ...(value as any), formula: '' })}
                >
                  Reset
                </Button>
              </Box>
            </Box>
            {value.formula && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption">
                  Aperçu de la formule en cours :{' '}
                  <Box component="span" sx={{ fontFamily: 'monospace' }}>
                    {parseLatexToReact(value.formula)}
                  </Box>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Contenu déjà enregistré et correspondant :
                  {presets
                    .filter(
                      (p) =>
                        p.formula &&
                        value.formula &&
                        p.formula.toLowerCase().includes(value.formula.toLowerCase()),
                    )
                    .slice(0, 3)
                    .map((p) => p.formula)
                    .join(' · ') || '—'}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Section classes de danger et catégories */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Classes de danger et catégories
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Box sx={{ flex: '2 1 320px', minWidth: 260 }}>
              <Autocomplete
                multiple
                options={categoryOptions}
                freeSolo
                disableCloseOnSelect
                value={
                  (value as any)._categoriesArray ||
                  (value.category
                    ? value.category
                        .split(',')
                        .map((c) => c.trim())
                        .filter(Boolean)
                    : [])
                }
                onChange={(_, v) => onChange({ ...(value as any), _categoriesArray: v })}
                renderTags={(selected, getTagProps) =>
                  selected.map((opt, i) => (
                    <Chip size="small" label={opt} {...getTagProps({ index: i })} key={opt} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Catégories" placeholder="Ajouter" />
                )}
              />
            </Box>
            <Box sx={{ flex: '2 1 400px', minWidth: 300 }}>
              <HazardClassSelector
                value={
                  (value as any)._hazardsArray ||
                  (value.hazardClass
                    ? value.hazardClass
                        .split(',')
                        .map((h) => h.trim())
                        .filter(Boolean)
                    : [])
                }
                onChange={(v) => onChange({ ...(value as any), _hazardsArray: v })}
                fullWidth
                label="Classes de danger"
              />
            </Box>
          </Box>
        </Paper>

        {/* Section propriétés */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            Propriétés
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Box sx={{ flex: '1 1 120px', minWidth: 120 }}>
              <TextField
                label="M.M (g/mol)"
                type="number"
                fullWidth
                value={value.molarMass || ''}
                onChange={(e) =>
                  onChange({
                    ...(value as any),
                    molarMass: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </Box>
            <Box sx={{ flex: '1 1 120px', minWidth: 120 }}>
              <TextField
                label="Densité (d)"
                type="number"
                fullWidth
                value={(value as any).density || ''}
                onChange={(e) =>
                  onChange({
                    ...(value as any),
                    density: e.target.value ? parseFloat(e.target.value) || undefined : undefined,
                  })
                }
              />
            </Box>
            <Box sx={{ flex: '1 1 120px', minWidth: 120 }}>
              <TextField
                label="Pf (°C)"
                type="number"
                fullWidth
                value={value.meltingPointC || ''}
                onChange={(e) =>
                  onChange({
                    ...(value as any),
                    meltingPointC: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </Box>
            <Box sx={{ flex: '1 1 120px', minWidth: 120 }}>
              <TextField
                label="Eb (°C)"
                type="number"
                fullWidth
                value={value.boilingPointC || ''}
                onChange={(e) =>
                  onChange({
                    ...(value as any),
                    boilingPointC: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </Box>
          </Box>
        </Paper>

        <Stack direction="row" spacing={1}>
          <Button onClick={onSave} disabled={!value.name} variant="contained">
            Ajouter
          </Button>
          <Button onClick={onCancel}>Annuler</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
