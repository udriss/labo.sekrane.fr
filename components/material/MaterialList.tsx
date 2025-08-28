'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  IconButton,
  Typography,
  Tooltip,
  CircularProgress,
  TableSortLabel,
  Slider,
  Pagination,
} from '@mui/material';
import { Delete, Edit, LocationOn } from '@mui/icons-material';
import { Materiel } from './MaterielManagement';

interface MaterialListProps {
  materiels: Materiel[];
  onEditMateriel: (materiel: Materiel) => void;
  onDeleteMateriel: (materiel: Materiel) => void;
  onQuantityChange: (materielId: number, newQuantity: number) => void;
  // optional pagination (if provided, list will render Pagination controls)
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

type Order = 'asc' | 'desc';
type OrderBy = 'name' | 'category' | 'quantity' | 'location' | 'model';

export const MaterialList = React.memo(function MaterialList({
  materiels,
  onEditMateriel,
  onDeleteMateriel,
  onQuantityChange,
  page,
  pageSize,
  total,
  onPageChange,
}: MaterialListProps) {
  const [materialsState, setMaterialsState] = useState<Materiel[]>(materiels || []);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('name');
  const [quantityValues, setQuantityValues] = useState<{ [key: number]: number }>({});
  const [updatingCards, setUpdatingCards] = useState<Set<number>>(new Set());

  // Initialize quantity values
  useEffect(() => {
    const initialQuantities: { [key: number]: number } = {};
    materialsState.forEach((material) => {
      initialQuantities[material.id] = material.quantity;
    });
    setQuantityValues(initialQuantities);
  }, [materialsState]);

  // Update materials when props change
  useEffect(() => {
    setMaterialsState(materiels || []);
  }, [materiels]);

  // Debounced commit map (id -> timer) - exactly like ChemicalsList
  const commitTimers = React.useRef<Record<number, any>>({});

  const commitQuantityChange = (materielId: number, newValue: number) => {
    if (commitTimers.current[materielId]) {
      clearTimeout(commitTimers.current[materielId]);
    }
    commitTimers.current[materielId] = setTimeout(() => {
      onQuantityChange(materielId, newValue);
      delete commitTimers.current[materielId];
    }, 500);
  };

  const handleSliderChangeCommitted = (materielId: number, newValue: number) => {
    commitQuantityChange(materielId, newValue);
  };

  // Sorting functionality
  const sortData = useMemo(() => {
    return (data: Materiel[]) => {
      return [...data].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (orderBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'category':
            aValue = a.category?.name || '';
            bValue = b.category?.name || '';
            break;
          case 'quantity':
            aValue = a.quantity;
            bValue = b.quantity;
            break;
          case 'location': {
            const aSalle = a.salle?.name?.toLowerCase?.() || '';
            const bSalle = b.salle?.name?.toLowerCase?.() || '';
            if (aSalle !== bSalle) {
              const cmp = aSalle.localeCompare(bSalle, undefined, { sensitivity: 'base' });
              return order === 'asc' ? cmp : -cmp;
            }
            const aLoc = a.localisation?.name?.toLowerCase?.() || '';
            const bLoc = b.localisation?.name?.toLowerCase?.() || '';
            const cmpLoc = aLoc.localeCompare(bLoc, undefined, { sensitivity: 'base' });
            return order === 'asc' ? cmpLoc : -cmpLoc;
          }
          case 'model':
            aValue = a.model || '';
            bValue = b.model || '';
            break;
          default:
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        if (order === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    };
  }, [order, orderBy]);

  const sortedMaterials = sortData(materialsState);

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  if (materialsState.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Aucun matériel à afficher
        </Typography>
      </Paper>
    );
  }

  // Removed motion animations; using plain TableRow

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Optional top pagination */}
      {typeof page === 'number' && typeof total === 'number' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <Pagination
            size="small"
            page={page}
            count={Math.max(1, Math.ceil(total / (pageSize || 1)))}
            onChange={(_, v) => onPageChange?.(v)}
            showFirstButton
            showLastButton
          />
        </Box>
      )}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Nom
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'category'}
                    direction={orderBy === 'category' ? order : 'asc'}
                    onClick={() => handleRequestSort('category')}
                  >
                    Catégorie
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'quantity'}
                    direction={orderBy === 'quantity' ? order : 'asc'}
                    onClick={() => handleRequestSort('quantity')}
                  >
                    Quantité
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'model'}
                    direction={orderBy === 'model' ? order : 'asc'}
                    onClick={() => handleRequestSort('model')}
                  >
                    Modèle
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'location'}
                    direction={orderBy === 'location' ? order : 'asc'}
                    onClick={() => handleRequestSort('location')}
                  >
                    Localisation
                  </TableSortLabel>
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedMaterials.map((m) => (
                <TableRow
                  key={m.id}
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: 'action.hover',
                    },
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignContent: 'flex-start',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignContent: 'flex-start',
                          alignItems: 'flex-start',
                        }}
                      >
                        {updatingCards.has(m.id) && <CircularProgress size={16} />}
                        <Typography variant="body2" fontWeight={600}>
                          {m.name}
                        </Typography>
                      </Box>
                      {m.serialNumber && (
                        <Typography variant="caption" color="text.secondary">
                          S/N: {m.serialNumber}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{m.category?.name || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                      <Slider
                        value={quantityValues[m.id] || m.quantity}
                        onChange={(_, newValue) => {
                          const value = newValue as number;
                          // update UI immediately
                          setQuantityValues((prev) => ({ ...prev, [m.id]: value }));
                        }}
                        onChangeCommitted={(_, newValue) => {
                          const value = newValue as number;
                          handleSliderChangeCommitted(m.id, value);
                        }}
                        min={0}
                        max={Math.max(10, m.quantity * 3)}
                        step={1}
                        size="small"
                        sx={{
                          width: 100,
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {quantityValues[m.id] || m.quantity}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{m.model || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{m.salle?.name || '-'}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {m.localisation?.name || '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Modifier">
                        <IconButton onClick={() => onEditMateriel(m)} size="small" color="primary">
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton onClick={() => onDeleteMateriel(m)} size="small" color="error">
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* Optional bottom pagination */}
      {typeof page === 'number' && typeof total === 'number' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <Pagination
            size="small"
            page={page}
            count={Math.max(1, Math.ceil(total / (pageSize || 1)))}
            onChange={(_, v) => onPageChange?.(v)}
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </motion.div>
  );
});
