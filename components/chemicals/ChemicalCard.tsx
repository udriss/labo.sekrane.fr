'use client';

import React, { memo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  Grid,
  Chip,
  Slider,
  CardActions,
  Button,
  IconButton,
} from '@mui/material';
import { Delete, Edit, Warning, Inventory, LocationOn } from '@mui/icons-material';
import { parseLatexToReact } from '@/lib/utils/latex';
import { TbTruckDelivery } from 'react-icons/tb';

export interface ChemicalItem {
  id: number;
  name: string;
  formula?: string;
  casNumber?: string | null;
  hazard?: string | null;
  stock: number;
  unit?: string;
  location?: string | null;
  expirationDate?: string | null;
  status?: string;
  minQuantity?: number;
  supplier?: string;
  supplierKind?: 'NORMAL' | 'CUSTOM';
  minStock?: number;
  purchaseDate?: string | null;
  notes?: string | null;
  supplierId?: number | null;
  createdAt: string;
  updatedAt: string;
  salleId?: number | null;
  localisationId?: number | null;
  reactifPresetId?: number;
  category?: string | null;
  hazardClass?: string | null;
  molarMass?: number | null;
  density?: number | null;
  meltingPointC?: number | null;
  boilingPointC?: number | null;
}

interface ChemicalCardProps {
  chemical: ChemicalItem;
  quantityValue?: number;
  isUpdating?: boolean;
  onSliderChange: (chemicalId: number, newValue: number) => void;
  onSliderCommit?: (chemicalId: number, newValue: number) => void;
  onEdit: (chemical: ChemicalItem) => void;
  onDelete: (id: number) => void;
  getMaxSliderValue: (currentQuantity: number) => number;
  getStatusColor: (status?: string) => string;
  getStatusLabel: (status?: string) => string;
}

export const ChemicalCard = memo(
  ({
    chemical,
    quantityValue,
    isUpdating = false,
    onSliderChange,
    onSliderCommit,
    onEdit,
    onDelete,
    getMaxSliderValue,
    getStatusColor,
    getStatusLabel,
  }: ChemicalCardProps) => {
    const [showSpinner, setShowSpinner] = useState(false);

    useEffect(() => {
      if (isUpdating) {
        // Délai de 250ms avant d'afficher le spinner
        const timer = setTimeout(() => setShowSpinner(true), 250);
        return () => clearTimeout(timer);
      } else {
        setShowSpinner(false);
      }
    }, [isUpdating]);
    // Calculate dynamic status based on current quantity and minStock (if provided by API)
    const currentQuantity = quantityValue ?? chemical.stock;
    const minStock = chemical.minStock ?? null;

    let dynamicStatus: string;
    if (currentQuantity <= 0) dynamicStatus = 'OUT_OF_STOCK';
    else if (minStock != null && currentQuantity <= minStock) dynamicStatus = 'LOW_STOCK';
    else dynamicStatus = 'IN_STOCK';

    return (
      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={chemical.id}>
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4,
            },
            // Prevent hover effects when interacting with slider
            '&:has(.slider-container:hover)': {
              transform: 'none',
              transition: 'none',
            },
            opacity: isUpdating ? 0.5 : 1,
          }}
        >
          {showSpinner && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                borderRadius: 1,
              }}
            >
              <CircularProgress size={46} />
            </Box>
          )}
          <CardContent sx={{ pb: 1, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="subtitle2" fontWeight={600} noWrap>
                  {chemical.name}
                </Typography>
                <Chip
                  label={getStatusLabel(dynamicStatus)}
                  color={getStatusColor(dynamicStatus) as any}
                  size="small"
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                <span style={{ fontFamily: 'monospace' }}>
                  {chemical.formula ? parseLatexToReact(chemical.formula) : null}
                </span>{' '}
                {chemical.casNumber && `• ${chemical.casNumber}`}
              </Typography>
              {chemical.category && (
                <Typography variant="caption" display="block">
                  {chemical.category}
                </Typography>
              )}
              {chemical.hazardClass && (
                <Typography variant="caption" color="error" display="block" noWrap>
                  {chemical.hazardClass}
                </Typography>
              )}
              <Typography variant="caption" display="block">
                M.M: {chemical.molarMass ?? '—'} g/mol
                {` • d: ${chemical.density ?? '—'}`}
              </Typography>
              {(chemical.meltingPointC !== null && chemical.meltingPointC !== undefined) ||
              (chemical.boilingPointC !== null && chemical.boilingPointC !== undefined) ? (
                <Typography variant="caption" color="text.secondary" display="block">
                  {chemical.meltingPointC !== undefined &&
                    chemical.meltingPointC !== null &&
                    `Pf ${chemical.meltingPointC}°C`}{' '}
                  {chemical.meltingPointC !== undefined &&
                    chemical.meltingPointC !== null &&
                    chemical.boilingPointC !== undefined &&
                    chemical.boilingPointC !== null &&
                    '• '}
                  {chemical.boilingPointC !== undefined &&
                    chemical.boilingPointC !== null &&
                    `Eb ${chemical.boilingPointC}°C`}
                </Typography>
              ) : null}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Inventory sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {quantityValue ?? chemical.stock} {chemical.unit || ''}
                  </Typography>
                  {minStock != null && (quantityValue ?? chemical.stock) <= minStock && (
                    <Tooltip title="Stock faible">
                      <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
                    </Tooltip>
                  )}
                </Stack>
                <Box
                  className="slider-container"
                  sx={{
                    px: 1,
                    // Prevent card transform interference with slider
                    '&:hover': {
                      transform: 'none !important',
                    },
                    // Ensure slider can capture all mouse events
                    position: 'relative',
                    zIndex: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    // Disable card transforms when hovering slider area
                    const card = e.currentTarget.closest('.MuiCard-root') as HTMLElement;
                    if (card) {
                      card.style.transform = 'none';
                      card.style.transition = 'none';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    // Re-enable card transforms when leaving slider area
                    const card = e.currentTarget.closest('.MuiCard-root') as HTMLElement;
                    if (card) {
                      card.style.transform = '';
                      card.style.transition = '';
                    }
                  }}
                >
                  <Slider
                    value={quantityValue ?? chemical.stock}
                    onChange={(_, newValue) => {
                      const value = newValue as number;
                      onSliderChange(chemical.id, value);
                    }}
                    onChangeCommitted={(_, newValue) => {
                      const value = newValue as number;
                      onSliderCommit?.(chemical.id, value);
                    }}
                    min={0}
                    max={getMaxSliderValue(chemical.stock)}
                    step={0.1}
                    size="small"
                    valueLabelDisplay="auto"
                    sx={{
                      color:
                        minStock != null && (quantityValue ?? chemical.stock) <= minStock
                          ? 'warning.main'
                          : 'primary.main',
                      // Ensure slider track is interactive
                      '& .MuiSlider-thumb': {
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: 'inherit',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
              {chemical.location && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {chemical.location}
                  </Typography>
                </Stack>
              )}
              {chemical.supplier && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TbTruckDelivery fontSize={16} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    Fournisseur :{' '}
                    {typeof chemical.supplier === 'object' && chemical.supplier
                      ? (chemical.supplier as any).name
                      : chemical.supplier}
                  </Typography>
                  {/* {chemical.supplierKind && (
                    <Chip
                      label={
                        chemical.supplierKind === 'CUSTOM'
                          ? 'Fournisseur personnalisé'
                          : 'Fournisseur standard'
                      }
                      size="small"
                      color={chemical.supplierKind === 'CUSTOM' ? 'secondary' : 'primary'}
                      variant={chemical.supplierKind === 'CUSTOM' ? 'outlined' : 'filled'}
                      sx={{ ml: 0, mt: 0.5 }}
                    />
                  )} */}
                </Stack>
              )}
              {chemical.supplierKind && !chemical.supplier && (
                <Chip
                  label={
                    chemical.supplierKind === 'CUSTOM' ? 'Fournisseur (custom)' : 'Fournisseur'
                  }
                  size="small"
                  color={chemical.supplierKind === 'CUSTOM' ? 'secondary' : 'default'}
                  variant={chemical.supplierKind === 'CUSTOM' ? 'outlined' : 'filled'}
                />
              )}
              {(chemical.purchaseDate || chemical.expirationDate) && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {chemical.purchaseDate &&
                    `Achat: ${new Date(chemical.purchaseDate).toLocaleDateString('fr-FR')}`}
                  {chemical.purchaseDate && chemical.expirationDate && ' • '}
                  {chemical.expirationDate &&
                    `Exp: ${new Date(chemical.expirationDate).toLocaleDateString('fr-FR')}`}
                </Typography>
              )}
              {chemical.notes && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {chemical.notes}
                </Typography>
              )}
            </Stack>
          </CardContent>
          <CardActions sx={{ justifyContent: 'space-between', pt: 0, mt: 'auto' }}>
            <Button size="small" onClick={() => onEdit(chemical)}>
              Voir détails
            </Button>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Modifier">
                <IconButton size="small" onClick={() => onEdit(chemical)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Supprimer">
                <IconButton size="small" color="error" onClick={() => onDelete(chemical.id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </CardActions>
        </Card>
      </Grid>
    );
  },
  (prevProps, nextProps) =>
    prevProps.chemical === nextProps.chemical &&
    prevProps.quantityValue === nextProps.quantityValue &&
    prevProps.isUpdating === nextProps.isUpdating,
);

ChemicalCard.displayName = 'ChemicalCard';
