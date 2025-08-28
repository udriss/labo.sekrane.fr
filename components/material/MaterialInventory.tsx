'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Grid,
  Paper,
  Typography,
  Pagination,
  Stack,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewModule as CardViewIcon,
  ViewList as ListViewIcon,
} from '@mui/icons-material';
import { MaterialCard } from './MaterialCard';
import { MaterialList } from './MaterialList';
import { Materiel } from './MaterielManagement';

interface Category {
  id: number;
  name: string;
  discipline: string;
  description?: string;
}

interface MaterialInventoryProps {
  materiels: Materiel[];
  categories: Category[];
  searchTerm: string;
  selectedCategory: string;
  viewMode: 'card' | 'list';
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onViewModeChange: (mode: 'card' | 'list') => void;
  onEditMateriel: (materiel: Materiel) => void;
  onDeleteMateriel: (materiel: Materiel) => void;
  onQuantityChange: (materielId: number, newQuantity: number) => void;
}

export const MaterialInventory = React.memo(function MaterialInventory({
  materiels,
  categories,
  searchTerm,
  selectedCategory,
  viewMode,
  onSearchChange,
  onCategoryChange,
  onViewModeChange,
  onEditMateriel,
  onDeleteMateriel,
  onQuantityChange,
}: MaterialInventoryProps) {
  const [quantityValues, setQuantityValues] = useState<{
    [key: number]: number;
  }>({});
  const [updatingCards, setUpdatingCards] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Initialize quantity values
  useEffect(() => {
    const initialQuantities: { [key: number]: number } = {};
    materiels.forEach((item) => {
      initialQuantities[item.id] = item.quantity;
    });
    setQuantityValues(initialQuantities);
  }, [materiels]);

  // Debounced commit map (id -> timer) - for cards only
  const commitTimers = React.useRef<Record<number, any>>({});

  const commitQuantityChange = (itemId: number, newValue: number) => {
    // Clear existing timer
    if (commitTimers.current[itemId]) {
      clearTimeout(commitTimers.current[itemId]);
    }

    // Debounce API call (only after user stops dragging)
    commitTimers.current[itemId] = setTimeout(() => {
      onQuantityChange(itemId, newValue);
      // No need for updating state here, parent will do it
      delete commitTimers.current[itemId];
    }, 500); // 500ms debounce
  };

  const handleSliderChange = (itemId: number, newValue: number) => {
    // Update UI immediately for responsive feel
    setQuantityValues((prev) => ({ ...prev, [itemId]: newValue }));
    // Debounce the actual API call
    commitQuantityChange(itemId, newValue);
  };

  const filteredMateriels = useMemo(() => {
    return materiels.filter((item) => {
      if (!item || !item.name) return false; // Safety check for undefined items
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || item.category?.name === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materiels, searchTerm, selectedCategory]);

  const total = filteredMateriels.length;
  const paginatedMateriels = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMateriels.slice(start, start + pageSize);
  }, [filteredMateriels, page, pageSize]);

  // Reset page when filters change
  useEffect(() => setPage(1), [searchTerm, selectedCategory, pageSize]);

  return (
    <Box>
      <Stack direction="row" spacing={2} justifyContent="end" alignItems="center" sx={{ mt: 2 }}>
        <Pagination
          size="small"
          page={page}
          count={Math.max(1, Math.ceil(total / pageSize))}
          onChange={(_, v) => setPage(v)}
          showFirstButton
          showLastButton
        />
        <Box className="flex gap-1">
          <IconButton
            onClick={() => onViewModeChange('card')}
            color={viewMode === 'card' ? 'primary' : 'default'}
          >
            <CardViewIcon />
          </IconButton>
          <IconButton
            onClick={() => onViewModeChange('list')}
            color={viewMode === 'list' ? 'primary' : 'default'}
          >
            <ListViewIcon />
          </IconButton>
        </Box>
      </Stack>
      {/* Header recherché/tri (mis en forme comme ChemicalsList) */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        sx={{ my: 4 }}
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
              placeholder="Rechercher un matériel..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flexGrow: 1, width: '100%' }}
            />
            <FormControl size="small" sx={{ minWidth: 180, width: '100%' }}>
              <InputLabel>Catégorie</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value)}
                label="Catégorie"
              >
                <MenuItem value="all">Toutes</MenuItem>
                {categories.map((category, index) => (
                  <MenuItem key={index} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 50, width: '100%' }}>
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
      </Stack>

      {viewMode === 'card' ? (
        <>
          <Grid container spacing={2}>
            {paginatedMateriels.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                <MaterialCard
                  item={item}
                  onEdit={onEditMateriel}
                  onDelete={onDeleteMateriel}
                  onQuantityChange={handleSliderChange}
                  quantityValue={quantityValues[item.id]}
                  isUpdating={updatingCards.has(item.id)}
                />
              </Grid>
            ))}
          </Grid>
          {/* Pagination for cards */}
          {total > pageSize && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignContent: 'flex-end',
                my: 3,
              }}
            >
              <Pagination
                size="small"
                page={page}
                count={Math.max(1, Math.ceil(total / pageSize))}
                onChange={(_, v) => setPage(v)}
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      ) : (
        <>
          <MaterialList
            materiels={paginatedMateriels}
            onEditMateriel={onEditMateriel}
            onDeleteMateriel={onDeleteMateriel}
            onQuantityChange={onQuantityChange}
            // pass pagination props so MaterialList can render controls too
            // @ts-ignore - extend props optional
            page={page}
            // @ts-ignore
            pageSize={pageSize}
            // @ts-ignore
            total={total}
            // @ts-ignore
            onPageChange={(p: number) => setPage(p)}
          />
          {/* Optionally show pagination below table as well (MaterialList will show top one) */}
        </>
      )}

      {filteredMateriels.length === 0 && (
        <Paper className="p-8 text-center">
          <Typography variant="h6" color="text.secondary">
            Aucun matériel trouvé
          </Typography>
          <Typography color="text.secondary">
            {searchTerm ? "Essayez avec d'autres mots-clés" : 'Commencez par ajouter du matériel'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
});
