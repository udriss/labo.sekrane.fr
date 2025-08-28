import React from 'react';
import {
  Stack,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Button,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  East,
  West,
} from '@mui/icons-material';
import { ReactifPresetDTO } from './types';
import { parseLatexToReact } from '@/lib/utils/latex';

interface Step1Props {
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedPreset: ReactifPresetDTO | null;
  presetSearch: string;
  setPresetSearch: (search: string) => void;
  categories: string[];
  filteredPresets: ReactifPresetDTO[];
  loadingPresets: boolean;
  presetTotal: number;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  totalPages: number;
  viewMode: 'cards' | 'list';
  setViewMode: (mode: 'cards' | 'list') => void;
  inventoryKeys: Set<string>;
  globalMeta: ReactifPresetDTO[];
  onPresetSelect: (preset: ReactifPresetDTO) => void;
  onAdvanceToManualEntry: () => void;
}

export function Step1({
  selectedCategory,
  setSelectedCategory,
  selectedPreset,
  presetSearch,
  setPresetSearch,
  categories,
  filteredPresets,
  loadingPresets,
  presetTotal,
  page,
  setPage,
  pageSize,
  totalPages,
  viewMode,
  setViewMode,
  inventoryKeys,
  globalMeta,
  onPresetSelect,
  onAdvanceToManualEntry,
}: Step1Props) {
  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Sélectionnez un preset (ou saisie manuelle)
      </Typography>

      {/* Categories Grid */}
      <Grid container spacing={1}>
        <Grid size={{ xs: 6, md: 3 }} key="all">
          <Card
            sx={{
              border: !selectedCategory ? 2 : 1,
              borderColor: !selectedCategory ? 'primary.main' : 'divider',
              cursor: 'pointer',
              p: 0,
            }}
            onClick={() => setSelectedCategory(null)}
          >
            <CardActionArea>
              <CardContent sx={{ p: 1 }}>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{
                    fontSize: 14,
                  }}
                >
                  Toutes
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        {categories.map((cat) => {
          const sel = selectedCategory === cat;
          const source = globalMeta.length ? globalMeta : filteredPresets;
          const count = source.filter((c) => {
            if (!c.category) return cat === 'Sans catégorie';
            return c.category
              .split(',')
              .map((x) => x.trim())
              .includes(cat);
          }).length;
          return (
            <Grid size={{ xs: 6, md: 3 }} key={cat}>
              <Card
                sx={{
                  border: sel ? 2 : 1,
                  borderColor: sel ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedCategory(sel ? null : cat)}
              >
                <CardActionArea>
                  <CardContent
                    sx={{
                      p: 1,
                      px: 3,
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      alignContent: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      noWrap
                      sx={{
                        fontSize: 14,
                      }}
                    >
                      {cat}
                    </Typography>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{
                        fontWeight: 600,
                        color: (theme) => alpha(theme.palette.warning.dark, 1),
                      }}
                    >
                      {count}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Search and View Controls */}
      <TextField
        size="small"
        placeholder="Recherche (nom, formule, CAS)"
        value={presetSearch}
        onChange={(e) => setPresetSearch(e.target.value)}
        slotProps={{
          input: {
            endAdornment: (
              <Stack direction="row" spacing={0} alignItems="center">
                <Tooltip title="Vue cartes">
                  <span>
                    <IconButton
                      size="small"
                      color={viewMode === 'cards' ? 'primary' : 'default'}
                      onClick={() => setViewMode('cards')}
                    >
                      <ViewModuleIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Vue liste">
                  <span>
                    <IconButton
                      size="small"
                      color={viewMode === 'list' ? 'primary' : 'default'}
                      onClick={() => setViewMode('list')}
                    >
                      <ViewListIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ),
          },
        }}
      />

      {/* Empty State */}
      {filteredPresets.length === 0 && !loadingPresets && (
        <Alert severity="info">Aucun preset pour ces filtres. Saisie manuelle possible.</Alert>
      )}

      {/* Loading State */}
      {loadingPresets && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="caption">Chargement...</Typography>
        </Stack>
      )}

      {/* Presets Display */}
      {viewMode === 'cards' ? (
        <Grid container spacing={2}>
          {filteredPresets.map((p) => {
            const sel = selectedPreset?.name === p.name;
            const exists =
              inventoryKeys.has('name:' + p.name.toLowerCase()) ||
              (p.casNumber && inventoryKeys.has('cas:' + p.casNumber.toLowerCase()));
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id ?? p.name}>
                <Card
                  sx={{
                    border: sel ? 2 : 1,
                    borderColor: sel ? 'primary.main' : 'divider',
                    height: '100%',
                    '&:hover': { boxShadow: 4 },
                    position: 'relative',
                    bgcolor: exists
                      ? (theme) => alpha(theme.palette.success.light, 0.15)
                      : undefined,
                  }}
                >
                  <CardActionArea onClick={() => onPresetSelect(p)} sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          {p.name}
                        </Typography>
                        {p.hazardClass && (
                          <Typography
                            variant="caption"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              mt: 0.5,
                              bgcolor: 'warning.light',
                              color: 'warning.contrastText',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: '0.7rem',
                            }}
                          >
                            {p.hazardClass}
                          </Typography>
                        )}
                      </Stack>
                      {(p.formula || p.casNumber) && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          <span style={{ fontFamily: 'monospace' }}>
                            {p.formula ? parseLatexToReact(p.formula) : null}
                          </span>{' '}
                          {p.formula && p.casNumber && '•'} {p.casNumber}
                        </Typography>
                      )}
                      {(p.boilingPointC !== undefined || p.meltingPointC !== undefined) && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {p.meltingPointC !== undefined && `Pf: ${p.meltingPointC}°C`}
                          {p.meltingPointC !== undefined && p.boilingPointC !== undefined && ' • '}
                          {p.boilingPointC !== undefined && `Eb: ${p.boilingPointC}°C`}
                        </Typography>
                      )}
                      {exists && (
                        <Typography variant="overline" color="success.main" display="block">
                          Déjà dans inventaire
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex',
              px: 1,
              py: 0.5,
              bgcolor: 'action.hover',
              typography: 'caption',
              fontWeight: 600,
            }}
          >
            <Box flex={2}>Nom</Box>
            <Box flex={1}>Formule</Box>
            <Box flex={1}>CAS</Box>
            <Box flex={2}>Catégories</Box>
            <Box flex={1}>Hazards</Box>
            <Box flex={1}>Pf / Eb</Box>
          </Box>
          {filteredPresets.map((p) => {
            const sel = selectedPreset?.name === p.name;
            const exists =
              inventoryKeys.has('name:' + p.name.toLowerCase()) ||
              (p.casNumber && inventoryKeys.has('cas:' + p.casNumber.toLowerCase()));
            return (
              <Box
                key={p.id ?? p.name}
                sx={{
                  display: 'flex',
                  px: 1,
                  py: 0.5,
                  cursor: 'pointer',
                  bgcolor: sel
                    ? 'action.selected'
                    : exists
                      ? (theme) => alpha(theme.palette.success.light, 0.15)
                      : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => onPresetSelect(p)}
              >
                <Box
                  flex={2}
                  sx={{ pr: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
                >
                  {p.name}
                </Box>
                <Box flex={1} sx={{ fontFamily: 'monospace' }}>
                  {p.formula ? parseLatexToReact(p.formula) : '—'}
                </Box>
                <Box flex={1}>{p.casNumber || '—'}</Box>
                <Box flex={2}>{p.category || 'Sans catégorie'}</Box>
                <Box flex={1}>{p.hazardClass || '—'}</Box>
                <Box flex={1}>
                  {p.meltingPointC ?? '—'} / {p.boilingPointC ?? '—'}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Pagination and Manual Entry */}
      <Stack
        sx={{
          mt: 1,
          display: 'flex',
          flexDirection: { sm: 'column', md: 'row' },
          alignItems: { md: 'center' },
          justifyContent: { md: 'space-between' },
          gap: 1,
        }}
      >
        <Stack
          sx={{
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { md: 'center' },
            justifyContent: { md: 'space-between' },
            display: { xs: 'flex', md: 'flex' },
            gap: 1,
            width: '100%',
          }}
        >
          {!selectedCategory && (
            <>
              <Button
                size="small"
                color="inherit"
                startIcon={<West />}
                disabled={page <= 1 || loadingPresets}
                onClick={() => setPage(Math.max(1, page - 1))}
                fullWidth
              >
                Page précédente
              </Button>
              <Button
                size="small"
                color="inherit"
                endIcon={<East />}
                disabled={page >= totalPages || loadingPresets}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                fullWidth
              >
                Page suivante
              </Button>
            </>
          )}
        </Stack>
        <Button variant="outlined" onClick={onAdvanceToManualEntry} fullWidth>
          Saisie manuelle sans preset
        </Button>
      </Stack>
    </Stack>
  );
}
