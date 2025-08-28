import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Pagination,
  Chip,
} from '@mui/material';
import { Search, Add, Bookmark, Inventory } from '@mui/icons-material';
import { PresetForm } from './PresetForm';
import { CATEGORIES } from './types';

interface Step1Props {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  search: string;
  setSearch: (search: string) => void;
  availableCategories: string[];
  categoriesInfo: Array<{ id: number; name: string; discipline: string }>;
  presets: any[];
  filteredPresets: any[];
  loadingPresets: boolean;
  materielPersos: any[];
  filteredMaterielPersos: any[];
  loadingMaterielPersos: boolean;
  creating: any | null;
  setCreating: (creating: any | null) => void;
  editing: Record<number, any>;
  setEditing: React.Dispatch<React.SetStateAction<Record<number, any>>>;
  formData: any;
  lockedDiscipline?: string;
  onPresetSelect: (preset: any) => void;
  onMaterielPersoSelect: (materielPerso: any) => void;
  onPresetSave: (preset: any) => void;
}

export function Step1({
  selectedCategory,
  setSelectedCategory,
  search,
  setSearch,
  availableCategories,
  categoriesInfo,
  presets,
  filteredPresets,
  loadingPresets,
  materielPersos,
  filteredMaterielPersos,
  loadingMaterielPersos,
  creating,
  setCreating,
  editing,
  setEditing,
  formData,
  lockedDiscipline,
  onPresetSelect,
  onMaterielPersoSelect,
  onPresetSave,
}: Step1Props) {
  const [currentTab, setCurrentTab] = useState(0);
  const [pageSize] = useState(15); // Affichage de 15 presets à la fois
  const [currentPage, setCurrentPage] = useState(1);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    setCurrentPage(1); // Reset page when switching tabs
  };

  // Calculate paginated data for presets
  const paginatedPresets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredPresets.slice(startIndex, endIndex);
  }, [filteredPresets, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPresets.length / pageSize);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choisissez un preset prédéfini ou un matériel personnalisé déjà présent pour gagner du temps
      </Typography>

      {/* Categories Filter */}
      <Box mb={3}>
        <Typography
          variant="body2"
          sx={{
            mb: 1,
            fontWeight: 600,
          }}
        >
          Filtrer par catégorie (optionnel)
        </Typography>
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key="all">
            <Card
              sx={{
                border: selectedCategory === '' ? 2 : 1,
                borderColor: selectedCategory === '' ? 'primary.main' : 'divider',
                cursor: 'pointer',
                p: 0,
              }}
              onClick={() => setSelectedCategory('')}
            >
              <CardActionArea>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" fontWeight={600}>
                    Toutes
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          {(availableCategories.length > 0 ? availableCategories : CATEGORIES).map((category) => {
            const sel = selectedCategory === category;
            const presetCount = presets.filter((p) => {
              if (!p.category) return category === 'Sans catégorie';
              return p.category === category;
            }).length;
            const materielPersoCount = materielPersos.filter((mp) => {
              if (!mp.categorie?.name) return category === 'Sans catégorie';
              return mp.categorie.name === category;
            }).length;
            const totalCount = presetCount + materielPersoCount;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category}>
                <Card
                  sx={{
                    border: sel ? 2 : 1,
                    borderColor: sel ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedCategory(sel ? '' : category)}
                >
                  <CardActionArea>
                    <CardContent
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="caption" fontWeight={600}>
                        {category}
                      </Typography>
                      {totalCount > 0 && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          ({totalCount})
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Search and Add */}
      <Stack direction="row" spacing={2} mb={3} alignItems="center">
        <TextField
          placeholder="Rechercher un preset..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          slotProps={{
            input: {
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            },
          }}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() =>
            setCreating({
              name: '',
              category: selectedCategory || '',
              discipline: lockedDiscipline || '',
              description: '',
              defaultQty: 1,
            })
          }
        >
          Nouveau Preset
        </Button>
      </Stack>

      {/* New Preset Form */}
      {creating && (
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Ajouter un nouveau preset
            </Typography>
            <PresetForm
              preset={creating}
              onChange={setCreating}
              onSave={() => onPresetSave(creating)}
              onCancel={() => setCreating(null)}
              availableCategories={availableCategories}
              categoriesInfo={categoriesInfo}
              preferDiscipline={formData.discipline || lockedDiscipline || ''}
              disableDiscipline
            />
          </CardContent>
        </Card>
      )}

      {/* Onglets pour séparer presets et matériels personnalisés */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="types de modèles">
          <Tab
            icon={<Bookmark />}
            label={`Presets (${filteredPresets.length})`}
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<Inventory />}
            label={`Matériels personnalisés (${filteredMaterielPersos.length})`}
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
        </Tabs>
      </Box>

      {/* Presets Grid */}
      {currentTab === 0 && (
        <>
          {loadingPresets ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexDirection: { xs: 'column', sm: 'row' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">Presets disponibles</Typography>
                  <Chip
                    label={`${filteredPresets.length} éléments`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                {totalPages > 1 && (
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(event, page) => setCurrentPage(page)}
                    size="small"
                    color="primary"
                    showLastButton
                    showFirstButton
                  />
                )}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Modèles prédéfinis pour discipline "
                {formData.discipline || lockedDiscipline || 'aucune'}"
              </Typography>

              <Grid container spacing={2}>
                {paginatedPresets.map((preset) => (
                  <Grid key={preset.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card
                      sx={{
                        height: '100%',
                        cursor: editing[preset.id!] ? 'default' : 'pointer',
                        transition: 'all 0.3s',
                        border: '1px solid',
                        borderColor: 'primary.light',
                        '&:hover': editing[preset.id!]
                          ? {}
                          : {
                              transform: 'translateY(-2px)',
                              boxShadow: 2,
                              borderColor: 'primary.main',
                            },
                      }}
                    >
                      <CardContent>
                        {editing[preset.id!] ? (
                          <PresetForm
                            preset={editing[preset.id!]}
                            onChange={(updated) =>
                              setEditing((prev) => ({ ...prev, [preset.id!]: updated }))
                            }
                            onSave={() => onPresetSave(editing[preset.id!])}
                            onCancel={() =>
                              setEditing((prev) => {
                                const { [preset.id!]: _, ...rest } = prev;
                                return rest;
                              })
                            }
                            availableCategories={availableCategories}
                            categoriesInfo={categoriesInfo}
                            preferDiscipline={formData.discipline || lockedDiscipline || ''}
                            disableDiscipline
                          />
                        ) : (
                          <Box onClick={() => onPresetSelect(preset)}>
                            <Typography variant="h6" component="h3" gutterBottom>
                              {preset.name}
                            </Typography>

                            {preset.description && (
                              <Typography variant="body2" color="text.secondary" mb={1} noWrap>
                                {preset.description}
                              </Typography>
                            )}

                            {preset.defaultQty && (
                              <Typography variant="caption" color="text.secondary">
                                Quantité par défaut : {preset.defaultQty}
                              </Typography>
                            )}

                            <Box sx={{ mt: 1 }}>
                              <Chip
                                label="Preset"
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {paginatedPresets.length === 0 && filteredPresets.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Page {currentPage} vide. Utilisez la pagination ci-dessus.
                </Alert>
              )}

              {filteredPresets.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Aucun preset trouvé. Créez-en un nouveau ou modifiez vos critères de recherche.
                </Alert>
              )}
            </>
          )}
        </>
      )}

      {/* Matériels personnalisés Grid */}
      {currentTab === 1 && (
        <>
          {loadingMaterielPersos ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">Matériels personnalisés</Typography>
                <Chip
                  label={`${filteredMaterielPersos.length} éléments`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Matériels personnalisés ajoutés pour discipline "
                {formData.discipline || lockedDiscipline || 'aucune'}"
              </Typography>

              <Grid container spacing={2}>
                {filteredMaterielPersos.map((materielPerso) => (
                  <Grid key={materielPerso.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card
                      sx={{
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        border: '1px solid',
                        borderColor: 'secondary.light',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2,
                          borderColor: 'secondary.main',
                        },
                      }}
                      onClick={() => onMaterielPersoSelect(materielPerso)}
                    >
                      <CardContent>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {materielPerso.name}
                        </Typography>

                        {materielPerso.description && (
                          <Typography variant="body2" color="text.secondary" mb={1} noWrap>
                            {materielPerso.description}
                          </Typography>
                        )}

                        {materielPerso.defaultQty && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Quantité par défaut : {materielPerso.defaultQty}
                          </Typography>
                        )}

                        {materielPerso.caracteristiques &&
                          materielPerso.caracteristiques.length > 0 && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {materielPerso.caracteristiques.length} caractéristique(s)
                              personnalisée(s)
                            </Typography>
                          )}

                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                          <Chip
                            label="Personnalisé"
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                          {materielPerso.caracteristiques &&
                            materielPerso.caracteristiques.length > 0 && (
                              <Chip
                                label="Avec caractéristiques"
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {filteredMaterielPersos.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Aucun matériel personnalisé trouvé. Ils seront ajoutés automatiquement lors de la
                  personnalisation des presets.
                </Alert>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}
