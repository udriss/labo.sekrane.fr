// components/calendar/EventsList.tsx

"use client"

import React, { useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Stack,
  Paper,
  Badge,
  Collapse,
  Button
} from '@mui/material'
import {
  Science,
  Schedule,
  Assignment,
  EventAvailable,
  Search,
  FilterList,
  Visibility,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  SwapHoriz,
  HourglassEmpty,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material'
import { format, isPast, isFuture, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
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
  TP: { label: "TP", color: "#1976d2", icon: <Science /> },
  MAINTENANCE: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  INVENTORY: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  OTHER: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
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
    past: false,
    today: true,
    future: true,
    pending: true
  })

  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
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

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }))
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
    past: filteredEvents.filter(e => isPast(e.endDate) && e.state !== 'PENDING'),
    today: filteredEvents.filter(e => isToday(e.startDate) && e.state !== 'PENDING'),
    future: filteredEvents.filter(e => isFuture(e.startDate) && !isToday(e.startDate) && e.state !== 'PENDING')
  }

  const renderEventItem = (event: CalendarEvent) => {
    const typeInfo = getEventTypeInfo(event.type)
    const showActions = canEditEvent && canEditEvent(event)
    const isCancelled = event.state === 'CANCELLED'
    
    return (
      <ListItem
        key={event.id}
        sx={{
          opacity: isCancelled ? 0.6 : 1,
          bgcolor: 'background.paper',
          mb: 1,
          borderRadius: 1,
          '&:hover': {
            bgcolor: 'action.hover',
          }
        }}
        // Utiliser secondaryAction au lieu de ListItemSecondaryAction
        secondaryAction={
          <Stack direction="row" spacing={1}>
            <Tooltip title="Voir détails">
              <IconButton
                edge="end"
                onClick={() => onEventClick(event)}
                color="primary"
              >
                <Visibility />
              </IconButton>
            </Tooltip>
            
            {showActions && (
              <>
                {onEventEdit && event.state !== 'VALIDATED' && (
                  <Tooltip title="Modifier">
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventEdit(event)
                      }}
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                )}
                
                {onEventDelete && (
                  <Tooltip title="Supprimer">
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventDelete(event)
                      }}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
          </Stack>
        }
      >
        <ListItemAvatar>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            badgeContent={getStateIcon(event.state)}
          >
            <Avatar sx={{ bgcolor: isCancelled ? 'grey.500' : typeInfo.color }}>
              {typeInfo.icon}
            </Avatar>
          </Badge>
        </ListItemAvatar>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{ textDecoration: isCancelled ? 'line-through' : 'none' }}
              >
                {event.title}
              </Typography>
              {event.state && (
                <Chip
                  label={
                    event.state === 'PENDING' ? 'En attente' :
                    event.state === 'VALIDATED' ? 'Validé' :
                    event.state === 'CANCELLED' ? 'Annulé' :
                    event.state === 'MOVED' ? 'Déplacé' : event.state
                  }
                  size="small"
                  color={getStateColor(event.state)}
                />
              )}
            </Box>
          }
          secondary={
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary" component="div">
                📅 {format(event.startDate, 'dd/MM/yyyy')} • 
                🕒 {format(event.startDate, 'HH:mm')} - {format(event.endDate, 'HH:mm')}
              </Typography>
              {event.class && (
                <Typography variant="body2" color="text.secondary" component="div">
                  🎓 {event.class}
                </Typography>
              )}
              {event.room && (
                <Typography variant="body2" color="text.secondary" component="div">
                  📍 {event.room}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {event.materials && event.materials.length > 0 && (
                  <Chip size="small" label={`${event.materials.length} matériel(s)`} />
                )}
                {event.chemicals && event.chemicals.length > 0 && (
                  <Chip size="small" label={`${event.chemicals.length} produit(s)`} color="secondary" />
                )}
                {event.files && event.files.length > 0 && (
                  <Chip size="small" label={`${event.files.length} document(s)`} />
                )}
              </Stack>
            </Stack>
          }
          // Correction importante : dire à ListItemText de rendre secondary comme div
          slotProps={{
            secondary: { component: 'div' }
          }}
        />
      </ListItem>
    )
  }

  const renderGroup = (title: string, events: CalendarEvent[], groupKey: string, color?: any) => {
    if (events.length === 0) return null
    
    return (
      <Box key={groupKey} sx={{ mb: 3 }}>
        <Button
          fullWidth
          onClick={() => toggleGroup(groupKey)}
          sx={{
            justifyContent: 'space-between',
            textAlign: 'left',
            mb: 1,
            color: color || 'text.primary'
          }}
          endIcon={expandedGroups[groupKey] ? <ExpandLess /> : <ExpandMore />}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              {title}
            </Typography>
            <Chip label={events.length} size="small" color={color || 'default'} />
          </Box>
        </Button>
        
        <Collapse in={expandedGroups[groupKey]}>
          <List>
            {events.map(renderEventItem)}
          </List>
        </Collapse>
      </Box>
    )
  }

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      {/* Barre de recherche et filtres */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <TextField
          fullWidth
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
              startAdornment={
                <InputAdornment position="start">
                  <FilterList />
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
            >
              <MenuItem value="all">Tous les états</MenuItem>
              <MenuItem value="PENDING">En attente</MenuItem>
              <MenuItem value="VALIDATED">Validés</MenuItem>
              <MenuItem value="CANCELLED">Annulés</MenuItem>
              <MenuItem value="MOVED">Déplacés</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {/* Groupes d'événements */}
      {canValidateEvent && groupedEvents.pending.length > 0 && (
        <>
          {renderGroup('En attente de validation', groupedEvents.pending, 'pending', 'warning')}
          <Divider sx={{ my: 2 }} />
        </>
      )}
      
      {renderGroup("Aujourd'hui", groupedEvents.today, 'today', 'primary')}
      {renderGroup('À venir', groupedEvents.future, 'future', 'info')}
      {renderGroup('Passés', groupedEvents.past, 'past')}
      
      {filteredEvents.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            Aucun événement trouvé
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

export default EventsList