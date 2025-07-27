// components/calendar/EventsList.tsx

"use client"

import React, { useState } from 'react'
import { 
  Typography, List, ListItem, ListItemIcon, ListItemText, 
  Avatar, Box, Chip, Stack, IconButton, Tooltip, 
  TextField, InputAdornment, FormControl, Select, MenuItem,
  Divider, Badge, ListItemAvatar, Collapse,
  Button, Paper
} from '@mui/material'
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { 
  Science, Schedule, Assignment, EventAvailable,
  CheckCircle, Cancel, SwapHoriz, HourglassEmpty,
  Search, FilterList, Visibility, Edit, Delete,
  ExpandMore, ExpandLess
} from '@mui/icons-material'

// Importer les types depuis le fichier partagé
import { CalendarEvent, EventType } from '@/types/calendar'

interface EventsListProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onEventEdit?: (event: CalendarEvent) => void
  onEventDelete?: (event: CalendarEvent) => void
  canEditEvent?: (event: CalendarEvent) => boolean
  canValidateEvent?: boolean
}

const EVENT_TYPES = {
  TP: { label: "Travaux Pratiques", color: "#1976d2", icon: <Science /> },
  MAINTENANCE: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  INVENTORY: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  OTHER: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

const getStateIcon = (state: string | undefined) => {
  switch (state) {
    case 'PENDING':
      return <HourglassEmpty sx={{ fontSize: 20 }} />
    case 'VALIDATED':
      return <CheckCircle sx={{ fontSize: 20 }} />
    case 'CANCELLED':
      return <Cancel sx={{ fontSize: 20 }} />
    case 'MOVED':
      return <SwapHoriz sx={{ fontSize: 20 }} />
    default:
      return null
  }
}

const getStateColor = (state: string | undefined): any => {
  switch (state) {
    case 'PENDING': return 'warning'
    case 'VALIDATED': return 'success'
    case 'CANCELLED': return 'error'
    case 'MOVED': return 'info'
    default: return 'default'
  }
}

const EventsList: React.FC<EventsListProps> = ({ 
  events, 
  onEventClick,
  onEventEdit,
  onEventDelete,
  canEditEvent,
  canValidateEvent
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | EventType>('all')
  const [filterState, setFilterState] = useState<'all' | string>('all')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    pending: true,
    upcoming: true,
    past: false
  })

  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
  }

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, "HH:mm", { locale: fr })
  }

  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, "dd/MM/yyyy HH:mm", { locale: fr })
  }

  // Fonction pour obtenir l'icône et la couleur d'état
  const getStateInfo = (state: string | undefined) => {
    switch (state) {
      case 'PENDING':
        return { 
          icon: <HourglassEmpty sx={{ fontSize: 20 }} />, 
          color: 'warning',
          label: 'En attente' 
        }
      case 'VALIDATED':
        return { 
          icon: <CheckCircle sx={{ fontSize: 20 }} />, 
          color: 'success',
          label: 'Validé' 
        }
      case 'CANCELLED':
        return { 
          icon: <Cancel sx={{ fontSize: 20 }} />, 
          color: 'error',
          label: 'Annulé' 
        }
      case 'MOVED':
        return { 
          icon: <SwapHoriz sx={{ fontSize: 20 }} />, 
          color: 'info',
          label: 'Déplacé' 
        }
      default:
        return null
    }
  }

  // Filtrage des événements
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.class?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || event.type === filterType
    const matchesState = filterState === 'all' || event.state === filterState
    
    return matchesSearch && matchesType && matchesState
  })

  // Grouper les événements
  const groupedEvents = {
    pending: filteredEvents.filter(e => e.state === 'PENDING'),
    upcoming: filteredEvents.filter(e => {
      const eventDate = typeof e.startDate === 'string' ? new Date(e.startDate) : e.startDate
      return eventDate >= new Date() && e.state !== 'PENDING'
    }),
    past: filteredEvents.filter(e => {
      const eventDate = typeof e.startDate === 'string' ? new Date(e.startDate) : e.startDate
      return eventDate < new Date() && e.state !== 'PENDING'
    })
  }

  // Trier les événements dans chaque groupe
  Object.keys(groupedEvents).forEach(key => {
    groupedEvents[key as keyof typeof groupedEvents].sort((a, b) => {
      const dateA = typeof a.startDate === 'string' ? new Date(a.startDate) : a.startDate
      const dateB = typeof b.startDate === 'string' ? new Date(b.startDate) : b.startDate
      return key === 'past' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
    })
  })

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }))
  }

const renderEventItem = (event: CalendarEvent) => {
  const typeInfo = getEventTypeInfo(event.type)
  const stateInfo = getStateInfo(event.state)
  const showActions = canEditEvent && canEditEvent(event)
  const isCancelled = event.state === 'CANCELLED'
  const isPast = new Date(event.startDate) < new Date()
  
  return (
    <ListItem 
      key={event.id}
      sx={{ 
        border: 1, 
        borderColor: 'divider', 
        borderRadius: 1, 
        mb: 1,
        opacity: isCancelled ? 0.6 : (isPast ? 0.8 : 1),
        backgroundColor: isCancelled ? 'grey.50' : 'background.paper',
        transition: 'all 0.2s',
        '&:hover': { 
          bgcolor: 'action.hover',
          transform: 'translateX(4px)'
        }
      }}
      secondaryAction={
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Voir détails">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onEventClick(event)
              }}
              color="primary"
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {showActions && (
            <>
              {onEventEdit && event.state !== 'VALIDATED' && (
                <Tooltip title="Modifier">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventEdit(event)
                    }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              
              {onEventDelete && (
                <Tooltip title="Supprimer">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventDelete(event)
                    }}
                    color="error"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Stack>
      }
    >
      <ListItemIcon>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={stateInfo && (
            <Avatar 
              sx={{ 
                width: 22, 
                height: 22, 
                bgcolor: `${stateInfo.color}.main`,
                border: '2px solid white'
              }}
            >
              {React.cloneElement(stateInfo.icon, { sx: { fontSize: 14 } })}
            </Avatar>
          )}
        >
          <Avatar 
            sx={{ 
              bgcolor: isCancelled ? 'grey.500' : typeInfo.color, 
              width: 44, 
              height: 44 
            }}
          >
            {typeInfo.icon}
          </Avatar>
        </Badge>
      </ListItemIcon>
      
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography 
              variant="subtitle1"
              sx={{ 
                textDecoration: isCancelled ? 'line-through' : 'none',
                fontWeight: 500
              }}
            >
              {event.title}
            </Typography>
            <Chip 
              label={typeInfo.label} 
              size="small"
              sx={{ height: 24 }}
            />
            {event.class && (
              <Chip 
                label={event.class} 
                size="small" 
                variant="outlined"
                sx={{ height: 24 }}
              />
            )}
            {stateInfo && (
              <Chip 
                label={stateInfo.label}
                size="small"
                color={stateInfo.color as any}
                sx={{ height: 24 }}
              />
            )}
            {isPast && !isCancelled && (
              <Chip 
                label="Terminé" 
                size="small" 
                color="default"
                sx={{ height: 24 }}
              />
            )}
          </Box>
        }
        secondary={
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" component="div">
              📅 {formatDateTime(event.startDate)} - {formatTime(event.endDate)}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" component="div">
              {event.room && (
                <Typography variant="body2" color="text.secondary" component="span">
                  📍 {event.room}
                </Typography>
              )}
              {event.materials && event.materials.length > 0 && (
                <Typography variant="body2" color="text.secondary" component="span">
                  🧪 {event.materials.length} matériel(s)
                </Typography>
              )}
              {event.chemicals && event.chemicals.length > 0 && (
                <Typography variant="body2" color="text.secondary" component="span">
                  ⚗️ {event.chemicals.length} produit(s)
                </Typography>
              )}
              {(event.files && event.files.length > 0) || event.fileName ? (
                <Typography variant="body2" color="text.secondary" component="span">
                  📎 Document(s) joint(s)
                </Typography>
              ) : null}
            </Stack>
          </Stack>
        }
        slotProps={{
          secondary: { component: 'div' }
        }}
      />
    </ListItem>
  )
}

  const renderGroup = (title: string, events: CalendarEvent[], groupKey: string, color?: string) => {
    if (events.length === 0) return null
    
    return (
      <Box key={groupKey} sx={{ mb: 2 }}>
        <Button
          fullWidth
          onClick={() => toggleGroup(groupKey)}
          sx={{
            justifyContent: 'space-between',
            px: 0,
            py: 1,
            '&:hover': { backgroundColor: 'transparent' }
          }}
          endIcon={expandedGroups[groupKey] ? <ExpandLess /> : <ExpandMore />}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" color={color || 'text.primary'}>
              {title}
            </Typography>
            <Chip 
              label={events.length} 
              size="small" 
              color={color as any || 'default'}
            />
          </Stack>
        </Button>
        
        <Collapse in={expandedGroups[groupKey]}>
          <List sx={{ pt: 1 }}>
            {events.slice(0, groupKey === 'past' ? 10 : undefined).map(renderEventItem)}
            {groupKey === 'past' && events.length > 10 && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                textAlign="center" 
                sx={{ mt: 1 }}
              >
                ... et {events.length - 10} autre(s) événement(s)
              </Typography>
            )}
          </List>
        </Collapse>
      </Box>
    )
  }

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
        {/* Barre de recherche et filtres */}
                {/* Barre de recherche et filtres */}
        <Stack spacing={2}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Rechercher un événement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          
          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                displayEmpty
                startAdornment={
                  <InputAdornment position="start">
                    <FilterList fontSize="small" />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">Tous les types</MenuItem>
                {Object.entries(EVENT_TYPES).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                displayEmpty
              >
                <MenuItem value="all">Tous les états</MenuItem>
                <MenuItem value="PENDING">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <HourglassEmpty fontSize="small" />
                    <span>En attente</span>
                  </Stack>
                </MenuItem>
                <MenuItem value="VALIDATED">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircle fontSize="small" color="success" />
                    <span>Validés</span>
                  </Stack>
                </MenuItem>
                <MenuItem value="CANCELLED">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Cancel fontSize="small" color="error" />
                    <span>Annulés</span>
                  </Stack>
                </MenuItem>
                <MenuItem value="MOVED">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SwapHoriz fontSize="small" color="info" />
                    <span>Déplacés</span>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Paper>

      {/* Groupes d'événements */}
      {filteredEvents.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary" variant="h6" gutterBottom>
            Aucun événement trouvé
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {searchTerm && `Aucun résultat pour "${searchTerm}"`}
            {filterType !== 'all' && ` dans le type ${EVENT_TYPES[filterType]?.label}`}
            {filterState !== 'all' && ` avec l'état ${getStateInfo(filterState)?.label}`}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Événements en attente (affichés seulement pour les laborantins) */}
          {groupedEvents.pending.length > 0 && (
            <>
              {renderGroup('En attente de validation', groupedEvents.pending, 'pending', 'warning')}
              {(groupedEvents.upcoming.length > 0 || groupedEvents.past.length > 0) && (
                <Divider sx={{ my: 2 }} />
              )}
            </>
          )}
          
          {/* Événements à venir */}
          {groupedEvents.upcoming.length > 0 && (
            <>
              {renderGroup('Événements à venir', groupedEvents.upcoming, 'upcoming', 'primary')}
              {groupedEvents.past.length > 0 && (
                <Divider sx={{ my: 2 }} />
              )}
            </>
          )}
          
          {/* Événements passés */}
          {groupedEvents.past.length > 0 && (
            renderGroup('Événements passés', groupedEvents.past, 'past')
          )}
          
          {/* Message si tous les événements sont passés */}
          {groupedEvents.upcoming.length === 0 && groupedEvents.pending.length === 0 && groupedEvents.past.length > 0 && (
            <Paper 
              sx={{ 
                p: 2, 
                bgcolor: 'info.light', 
                color: 'info.contrastText',
                borderRadius: 1,
                mt: 2
              }}
            >
              <Typography variant="body2">
                ℹ️ Aucun événement futur programmé. Affichage des événements passés.
              </Typography>
            </Paper>
          )}
          
          {/* Résumé des filtres actifs */}
          {(searchTerm || filterType !== 'all' || filterState !== 'all') && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Affichage de {filteredEvents.length} événement(s) sur {events.length} au total
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

export default EventsList