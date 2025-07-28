// components/calendar/CalendarFilters.tsx

import React, { useState } from 'react'
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
  Button,
  Badge,
  Typography
} from '@mui/material'
import {
  FilterList,
  Clear,
  Search,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material'
import { EventState, EventType } from '@/types/calendar'

interface FilterState {
  state?: EventState | 'ALL'
  type?: EventType | 'ALL'
  class?: string | 'ALL'
  search?: string
}

interface CalendarFiltersProps {
  onFilterChange: (filters: FilterState) => void
  classes?: string[]
  eventTypes?: { value: EventType; label: string }[]
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  onFilterChange,
  classes = [],
  eventTypes = [
    { value: 'TP' as EventType, label: 'Travaux Pratiques' },
    { value: 'MAINTENANCE' as EventType, label: 'Maintenance' },
    { value: 'INVENTORY' as EventType, label: 'Inventaire' },
    { value: 'OTHER' as EventType, label: 'Autre' }
  ]
}) => {
  const [filters, setFilters] = useState<FilterState>({
    state: 'ALL',
    type: 'ALL',
    class: 'ALL',
    search: ''
  })
  const [expanded, setExpanded] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  // Calculer le nombre de filtres actifs
  const calculateActiveFilters = (newFilters: FilterState) => {
    let count = 0
    if (newFilters.state && newFilters.state !== 'ALL') count++
    if (newFilters.type && newFilters.type !== 'ALL') count++
    if (newFilters.class && newFilters.class !== 'ALL') count++
    if (newFilters.search && newFilters.search.trim() !== '') count++
    return count
  }

  const handleFilterChange = (field: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [field]: value }
    setFilters(newFilters)
    setActiveFiltersCount(calculateActiveFilters(newFilters))
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    const clearedFilters = {
      state: 'ALL' as const,
      type: 'ALL' as const,
      class: 'ALL' as const,
      search: ''
    }
    setFilters(clearedFilters)
    setActiveFiltersCount(0)
    onFilterChange(clearedFilters)
  }

  const stateOptions = [
    { value: 'ALL', label: 'Tous les états' },
    { value: 'PENDING', label: 'À valider' },
    { value: 'VALIDATED', label: 'Validés' },
    { value: 'CANCELLED', label: 'Annulés' },
    { value: 'MOVED', label: 'Déplacés' },
    { value: 'IN_PROGRESS', label: 'En préparation' },
  ]

  return (
    <Box sx={{ mb: 3 }}>
      {/* Barre de recherche toujours visible */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Rechercher un événement..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: filters.search && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => handleFilterChange('search', '')}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
        />
        
        <Badge badgeContent={activeFiltersCount} color="primary">
          <Button
            variant={expanded ? "contained" : "outlined"}
            startIcon={<FilterList />}
            endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setExpanded(!expanded)}
            size="medium"
          >
            Filtres
          </Button>
        </Badge>
      </Stack>

      {/* Filtres avancés - collapsibles */}
      <Collapse in={expanded}>
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {/* Filtre par état */}
              <FormControl size="small" fullWidth>
                <InputLabel>État des événements</InputLabel>
                <Select
                  value={filters.state}
                  onChange={(e: SelectChangeEvent) => handleFilterChange('state', e.target.value)}
                  label="État des événements"
                >
                  {stateOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Filtre par type */}
              <FormControl size="small" fullWidth>
                <InputLabel>Type d'événement</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e: SelectChangeEvent) => handleFilterChange('type', e.target.value)}
                  label="Type d'événement"
                >
                  <MenuItem value="ALL">Tous les types</MenuItem>
                  {eventTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Filtre par classe */}
              {classes.length > 0 && (
                <FormControl size="small" fullWidth>
                  <InputLabel>Classe</InputLabel>
                  <Select
                    value={filters.class}
                    onChange={(e: SelectChangeEvent) => handleFilterChange('class', e.target.value)}
                    label="Classe"
                  >
                    <MenuItem value="ALL">Toutes les classes</MenuItem>
                    {classes.map(cls => (
                      <MenuItem key={cls} value={cls}>
                        {cls}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>

            {/* Bouton pour réinitialiser les filtres */}
            {activeFiltersCount > 0 && (
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                </Typography>
                <Button
                  size="small"
                  startIcon={<Clear />}
                  onClick={handleClearFilters}
                  color="secondary"
                >
                  Réinitialiser les filtres
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>
      </Collapse>

      {/* Chips des filtres actifs */}
      {activeFiltersCount > 0 && !expanded && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
          {filters.state !== 'ALL' && (
            <Chip
              label={stateOptions.find(o => o.value === filters.state)?.label}
              onDelete={() => handleFilterChange('state', 'ALL')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {filters.type !== 'ALL' && (
            <Chip
              label={eventTypes.find(t => t.value === filters.type)?.label}
              onDelete={() => handleFilterChange('type', 'ALL')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {filters.class !== 'ALL' && (
            <Chip
              label={`Classe: ${filters.class}`}
              onDelete={() => handleFilterChange('class', 'ALL')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {filters.search && (
            <Chip
              label={`Recherche: "${filters.search}"`}
              onDelete={() => handleFilterChange('search', '')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>
      )}
    </Box>
  )
}