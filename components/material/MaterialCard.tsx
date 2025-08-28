'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  IconButton,
  Tooltip,
  Chip,
  Slider,
  CardActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { Edit, Delete, LocationOn, Inventory, Warning } from '@mui/icons-material';
import { Materiel } from './MaterielManagement';
import { useTheme, alpha } from '@mui/material/styles';

interface MaterialCardProps {
  item: Materiel;
  onEdit: (item: Materiel) => void;
  onDelete: (item: Materiel) => void;
  onQuantityChange?: (itemId: number, newQuantity: number) => void;
  quantityValue?: number;
  isUpdating?: boolean;
}

export const MaterialCard = React.memo(
  function MaterialCard({
    item,
    onEdit,
    onDelete,
    onQuantityChange,
    quantityValue,
    isUpdating = false,
  }: MaterialCardProps) {
    const [localQuantity, setLocalQuantity] = useState(quantityValue ?? item.quantity);
    const [showSpinner, setShowSpinner] = useState(false);
    const theme = useTheme();

    useEffect(() => {
      setLocalQuantity(quantityValue ?? item.quantity);
    }, [quantityValue, item.quantity]);

    useEffect(() => {
      if (isUpdating) {
        // Délai de 250ms avant d'afficher le spinner
        const timer = setTimeout(() => setShowSpinner(true), 250);
        return () => clearTimeout(timer);
      } else {
        setShowSpinner(false);
      }
    }, [isUpdating]);

    const handleSliderChange = (newValue: number) => {
      setLocalQuantity(newValue);
      if (onQuantityChange) {
        onQuantityChange(item.id, newValue);
      }
    };

    const getMaxSliderValue = (currentQuantity: number) => {
      return Math.max(currentQuantity * 2.5, 10);
    };

    const getStatusColor = (quantity: number) => {
      const minStock = item.minStock ?? null;
      if (quantity <= 0) return 'error';
      if (minStock != null && quantity <= minStock) return 'warning';
      return 'success';
    };

    const getStatusLabel = (quantity: number) => {
      const minStock = item.minStock ?? null;
      if (quantity <= 0) return 'Rupture';
      if (minStock != null && quantity <= minStock) return 'Stock faible';
      return 'En stock';
    };

    const location =
      [item.salle?.name, item.localisation?.name].filter(Boolean).join(' / ') || null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Card
          sx={{
            height: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
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
                backgroundColor: alpha(theme.palette.background.paper, 0.7),
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
                  {item.name}
                </Typography>
                <Chip
                  label={getStatusLabel(localQuantity)}
                  color={getStatusColor(localQuantity) as any}
                  size="small"
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                {item.discipline} {item.model && `• ${item.model}`}
              </Typography>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Inventory sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {localQuantity}
                  </Typography>
                  {item.minStock != null && localQuantity <= item.minStock && (
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
                    value={localQuantity}
                    onChange={(_, newValue) => {
                      const value = newValue as number;
                      handleSliderChange(value);
                    }}
                    min={0}
                    max={getMaxSliderValue(item.quantity)}
                    step={1}
                    size="small"
                    valueLabelDisplay="auto"
                    sx={{
                      color:
                        item.minStock != null && localQuantity <= item.minStock
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
              {location && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {location}
                  </Typography>
                </Stack>
              )}
              {item.category && (
                <Typography variant="caption" display="block">
                  {item.category.name}
                </Typography>
              )}
              {item.supplier && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Fournisseur : {item.supplier}
                </Typography>
              )}
              {item.serialNumber && (
                <Typography variant="caption" display="block">
                  N° série : {item.serialNumber}
                </Typography>
              )}
              {item.purchaseDate && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Achat : {new Date(item.purchaseDate).toLocaleDateString('fr-FR')}
                </Typography>
              )}
              {/* Affichage des caractéristiques personnalisées */}
              {((item as any).caracteristiques &&
                Array.isArray((item as any).caracteristiques) &&
                (item as any).caracteristiques.length > 0) ||
              (item.materielPerso?.caracteristiques &&
                Array.isArray(item.materielPerso.caracteristiques) &&
                item.materielPerso.caracteristiques.length > 0) ? (
                <Box>
                  <Typography
                    variant="caption"
                    color="primary"
                    sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                  >
                    Caractéristiques:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(
                      (item as any).caracteristiques ||
                      item.materielPerso?.caracteristiques ||
                      []
                    ).map((char: any, index: number) => (
                      <Chip
                        key={index}
                        label={`${char.nom}: ${Array.isArray(char.valeur) ? char.valeur.join(', ') : char.valeur}${char.unite ? ` ${char.unite}` : ''}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Box>
                </Box>
              ) : null}
              {item.notes && (
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
                  {item.notes}
                </Typography>
              )}
            </Stack>
          </CardContent>
          <CardActions sx={{ justifyContent: 'space-between', pt: 0, mt: 'auto' }}>
            <Button size="small" onClick={() => onEdit(item)}>
              Voir détails
            </Button>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Modifier">
                <IconButton size="small" onClick={() => onEdit(item)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Supprimer">
                <IconButton size="small" color="error" onClick={() => onDelete(item)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </CardActions>
        </Card>
      </motion.div>
    );
  },
  (prev, next) => {
    // Avoid re-rendering card unless relevant props changed
    if (prev.item.id !== next.item.id) return false;
    if (prev.isUpdating !== next.isUpdating) return false;
    if ((prev.quantityValue ?? prev.item.quantity) !== (next.quantityValue ?? next.item.quantity))
      return false;
    // shallow compare some fields that might appear in UI
    const keys: (keyof Materiel)[] = [
      'name',
      'discipline',
      'model',
      'category',
      'supplier',
      'serialNumber',
    ];
    for (const k of keys) {
      // @ts-ignore
      if (prev.item[k] !== next.item[k]) return false;
    }
    return true;
  },
);
