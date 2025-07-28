// components/calendar/EventsList.tsx

"use client"

import React, { useState } from 'react'
import { 
  Typography, List, ListItem, ListItemIcon, ListItemText, 
  Avatar, Box, Chip, Stack, IconButton, Tooltip, 
  TextField, InputAdornment, FormControl, Select, MenuItem,
  Divider, Badge, ListItemAvatar, Collapse,
  Button, Paper, Menu, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid
} from '@mui/material'
import { format } from "date-fns"
import { fr, is } from "date-fns/locale"
import { 
  Science, Schedule, Assignment, EventAvailable,
  CheckCircle, Cancel, SwapHoriz, HourglassEmpty,
  Search, FilterList, Visibility, Edit, Delete,
  ExpandMore, ExpandLess, MoreVert, CalendarToday,
  AccessTime, Room, ManageHistory
} from '@mui/icons-material'

// Importer les types depuis le fichier partagé
import { CalendarEvent, EventType, EventState } from '@/types/calendar'

interface EventsListProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onEventEdit?: (event: CalendarEvent) => void
  onEventDelete?: (event: CalendarEvent) => void
  canEditEvent?: (event: CalendarEvent) => boolean
  canValidateEvent?: boolean
  onStateChange?: (event: CalendarEvent, newState: EventState, reason?: string) => void
  isMobile?: boolean
  isTablet?: boolean
}

const EVENT_TYPES = {
  TP: { label: "Travaux Pratiques", color: "#1976d2", icon: <Science /> },
  MAINTENANCE: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  INVENTORY: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  OTHER: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

// Fonction helper pour formater la taille des fichiers
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const getStateIcon = (state: string | undefined) => {
  switch (state) {
    case 'PENDING':
      return <HourglassEmpty sx={{ fontSize: 20 }} />
    case 'VALIDATED':
      return <CheckCircle sx={{ fontSize: 20 }} />
    case 'CANCELLED':
      return <Cancel sx={{ fontSize: 20 }} />
    case 'IN_PROGRESS':
      return <ManageHistory sx={{ fontSize: 20 }} />
    case 'MOVED':
      return <SwapHoriz sx={{ fontSize: 20 }} />
    default:
      return null
  }
}



const EventsList: React.FC<EventsListProps> = ({ 
  events, 
  onEventClick,
  onEventEdit,
  onEventDelete,
  canEditEvent,
  canValidateEvent,
  onStateChange,
  isMobile = false,
  isTablet = false
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | EventType>('all')
  const [filterState, setFilterState] = useState<'all' | string>('all')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    pending: true,
    upcoming: true,
    past: false
  })
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean
    event: CalendarEvent | null
    action: 'cancel' | 'move' | null
  }>({ open: false, event: null, action: null })
  const [validationReason, setValidationReason] = useState('')

  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
  }


  // Fonction pour obtenir l'icône et la couleur d'état
  const getStateInfo = (state: string | undefined) => {
    switch (state) {
      case 'PENDING':
        return { 
          icon: <HourglassEmpty sx={{ fontSize: 20 }} />, 
          color: 'warning',
          label: 'À valider' 
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
      case 'IN_PROGRESS':
        return { 
          icon: <ManageHistory sx={{ fontSize: 20 }} />, 
          color: 'info',
          label: 'En préparation' 
        }
      default:
        return null
    }
  }

  // Fonction pour gérer le changement d'état
  const handleStateChange = (event: CalendarEvent, newState: EventState, reason?: string) => {
    if (onStateChange) {
      onStateChange(event, newState, reason)
    }
    setValidationDialog({ open: false, event: null, action: null })
    setValidationReason('')
    setAnchorEl(null)
  }

  // Fonction pour ouvrir le dialog de validation
  const openValidationDialog = (event: CalendarEvent, action: 'cancel' | 'move') => {
    setValidationDialog({ open: true, event, action })
    setAnchorEl(null)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, calendarEvent: CalendarEvent) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setSelectedEvent(calendarEvent)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedEvent(null)
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
  const showEditDelete = canEditEvent && canEditEvent(event)
  const showValidationActions = canValidateEvent && event.state === 'PENDING'
  const isCancelled = event.state === 'CANCELLED'
  const stateInfo = getStateInfo(event.state)
  const isPast = new Date(event.startDate) < new Date()

  const menuItems = []

  // Ajouter les items de modification/suppression
  if (showEditDelete && onEventEdit && event.state !== 'VALIDATED') {
    menuItems.push(
      <MenuItem 
        key="edit"
        onClick={() => {
          onEventEdit(event)
          setAnchorEl(null)
        }}
      >
        <ListItemIcon>
          <Edit fontSize="small" />
        </ListItemIcon>
        <ListItemText>Modifier</ListItemText>
      </MenuItem>
    )
  }
  
  if (showEditDelete && onEventDelete) {
    menuItems.push(
      <MenuItem 
        key="delete"
        onClick={() => {
          onEventDelete(event)
          setAnchorEl(null)
        }}
      >
        <ListItemIcon>
          <Delete fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText>Supprimer</ListItemText>
      </MenuItem>
    )
  }
  
  // Ajouter les items de validation
  if (showValidationActions) {
    menuItems.push(
      <MenuItem 
        key="validate"
        onClick={() => {
          handleStateChange(event, 'VALIDATED')
          setAnchorEl(null)
        }}
      >
        <ListItemIcon>
          <CheckCircle fontSize="small" color="success" />
        </ListItemIcon>
        <ListItemText>Valider</ListItemText>
      </MenuItem>,
      
      <MenuItem 
        key="move"
        onClick={() => {
          openValidationDialog(event, 'move')
          setAnchorEl(null)
        }}
      >
        <ListItemIcon>
          <SwapHoriz fontSize="small" color="info" />
        </ListItemIcon>
        <ListItemText>Déplacer</ListItemText>
      </MenuItem>,
      
      <MenuItem 
        key="cancel"
        onClick={() => {
          openValidationDialog(event, 'cancel')
          setAnchorEl(null)
        }}
      >
        <ListItemIcon>
          <Cancel fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText>Annuler</ListItemText>
      </MenuItem>
    )
  }

  return (
    <ListItem
      key={event.id}
      sx={{
        opacity: isCancelled ? 0.6 : (isPast ? 0.8 : 1),
        bgcolor: isCancelled ? 'grey.50' : 'background.paper',
        mb: 1,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        '&:hover': {
          bgcolor: 'action.hover',
        }
      }}
      secondaryAction={
        <Stack direction="row" spacing={0.5}>
          {/* Bouton Voir détails - toujours visible */}
          <Tooltip title="Voir détails">
            <IconButton
              size="small"
              onClick={() => onEventClick(event)}
              color="primary"
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {/* Menu pour les autres actions */}
          {menuItems.length > 0 && (
            <>
              <Tooltip title="Plus d'actions">
                <IconButton
                  size="small"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                {menuItems}
              </Menu>
            </>
          )}
        </Stack>
      }
    >
      <Box sx={{ display: 'flex', 
        alignItems: 'center', 
        width: '100%',
        flexDirection: isMobile || isTablet ? 'column' : 'row',
      }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
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

      {/* Colonne principale avec titre et badges */}
      <ListItemText
        primary={
            <Box>
            <Typography 
              variant="subtitle1"
              sx={{ 
              textDecoration: isCancelled ? 'line-through' : 'none',
              fontWeight: 500,
              mb: 1
              }}
            >
              {event.title}
            </Typography>
            <Grid container spacing={1} sx={{ mb: 1, p: isMobile ? 1 : 2 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Chip 
                  label={typeInfo.label} 
                  size="small"
                  sx={{ height: 24, width: '100%', textTransform: 'uppercase' }}
                />
              </Grid>
              
              {event.class && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Chip 
                    label={event.class} 
                    size="small" 
                    variant="outlined"
                    sx={{ height: 24, width: '100%', textTransform: 'uppercase' }}
                  />
                </Grid>
              )}
              
              {stateInfo && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Chip 
                    label={stateInfo.label}
                    size="small"
                    color={stateInfo.color as any}
                    sx={{ height: 24, width: '100%', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                </Grid>
              )}
              
              {isPast && !isCancelled && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Chip 
                    label="Date passée" 
                    size="small" 
                    color="default"
                    sx={{ height: 24, width: '100%', textTransform: 'uppercase' }}
                  />
                </Grid>
              )}
            </Grid>
            </Box>
        }
        secondary={event.room && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            <Room sx={{ fontSize: 16, color: 'text.secondary' }} /> {event.room}
          </Typography>
        )}
      />
      </Box>

      {/* Colonne Ressources */}
      <Box
        component="div"
        sx={{
          minWidth: isMobile ? '100%' : 400,
          width: 'auto',
          flexShrink: 0,
          pl: 2,
          borderLeft: 1,
          borderColor: 'divider'
        }}
      >
        <Stack spacing={0.5}>
          {/* Date et heure avec icônes */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: isMobile ? 'flex-start' : 'center', 
            gap: isMobile ? 1 : 2,
            py: 0.5,
            borderLeft: 3,
            borderColor: 'primary.main',
            flexDirection: isMobile ? 'column' : 'row',
            pl: 1.5,
            mb: 1,
            width: '100%',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" fontWeight={500}>
                {format(event.startDate, 'EEEE d MMMM', { locale: fr })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {format(event.startDate, 'HH:mm')} - {format(event.endDate, 'HH:mm')}
              </Typography>
            </Box>
          </Box>

          {/* Chips pour matériels et réactifs */}
          <Stack 
            sx={{
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 1,
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            {event.materials && event.materials.length > 0 && (
              <Chip
                size="small"
                label={`${event.materials.length} matériel${event.materials.length > 1 ? 's' : ''}`}
                variant='outlined'
                sx={{ fontWeight: 'bold' }}
              />
            )}
            {event.chemicals && event.chemicals.length > 0 && (
              <Chip
                size="small"
                label={`${event.chemicals.length} réactif${event.chemicals.length > 1 ? 's' : ''}`}
                color="secondary"
                variant='outlined'
                sx={{ fontWeight: 'bold' }}
              />
            )}
          </Stack>

          {/* Documents - Liste complète */}
          {event.files && event.files.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                📎 {event.files.length} document{event.files.length > 1 ? 's' : ''}
              </Typography>
              <Stack spacing={0.3} sx={{ ml: 1 }}>
                {event.files.map((file, index) => {
                  // Construire l'URL de manière sûre
                  const fileUrl = file?.fileUrl
                  const href = fileUrl 
                    ? (fileUrl.startsWith('/uploads/') 
                        ? `/api/calendrier/files?path=${encodeURIComponent(fileUrl)}`
                        : fileUrl)
                    : '#'
                  
                  return (
                    <Typography
                      key={index}
                      component="a"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="caption"
                      sx={{
                        color: fileUrl ? 'primary.main' : 'text.disabled',
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: fileUrl ? 'underline' : 'none'
                        },
                        cursor: fileUrl ? 'pointer' : 'default',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!fileUrl) {
                          e.preventDefault()
                        }
                      }}
                    >
                      • {file?.fileName || 'Document sans nom'}
                    </Typography>
                  )
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
      </Box>
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
    <>
      <Box>
        <Paper elevation={0} sx={{ p: 0, mb: 3 }}>
          {/* Barre de recherche et filtres */}
            <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="Rechercher un événement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
              input: {
                startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
                ),
              },
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
                  <span>À valider</span>
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
                <MenuItem value="IN_PROGRESS">
                <Stack direction="row" spacing={1} alignItems="center">
                  <ManageHistory fontSize="small" color="primary" />
                  <span>En préparation</span>
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
            {/* Événements à valider (affichés seulement pour les laborantins) */}
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

      {/* Menu contextuel */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && selectedEvent !== null}
        onClose={handleMenuClose}
      >
        {selectedEvent && (() => {
          const showEditDelete = canEditEvent && canEditEvent(selectedEvent)
          const showValidationActions = canValidateEvent && selectedEvent.state === 'PENDING'
          const menuItems = []
          
          if (showEditDelete && onEventEdit && selectedEvent.state !== 'VALIDATED') {
            menuItems.push(
              <MenuItem 
                key="edit"
                onClick={() => {
                  onEventEdit(selectedEvent)
                  handleMenuClose()
                }}
              >
                <ListItemIcon>
                  <Edit fontSize="small" />
                </ListItemIcon>
                <ListItemText>Modifier</ListItemText>
                            </MenuItem>
            )
          }
          
          if (showEditDelete && onEventDelete) {
            menuItems.push(
              <MenuItem 
                key="delete"
                onClick={() => {
                  onEventDelete(selectedEvent)
                  handleMenuClose()
                }}
              >
                <ListItemIcon>
                  <Delete fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Supprimer</ListItemText>
              </MenuItem>
            )
          }
          
          if (showValidationActions) {
            menuItems.push(
              <MenuItem 
                key="validate"
                onClick={() => {
                  handleStateChange(selectedEvent, 'VALIDATED')
                }}
              >
                <ListItemIcon>
                  <CheckCircle fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText>Valider</ListItemText>
              </MenuItem>,
              
              <MenuItem 
                key="move"
                onClick={() => {
                  openValidationDialog(selectedEvent, 'move')
                }}
              >
                <ListItemIcon>
                  <SwapHoriz fontSize="small" color="info" />
                </ListItemIcon>
                <ListItemText>Déplacer</ListItemText>
              </MenuItem>,
              
              <MenuItem 
                key="cancel"
                onClick={() => {
                  openValidationDialog(selectedEvent, 'cancel')
                }}
              >
                <ListItemIcon>
                  <Cancel fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Annuler</ListItemText>
              </MenuItem>
            )
          }
          
          return menuItems
        })()}
      </Menu>

      {/* Dialog de confirmation pour annulation/déplacement */}
      <Dialog 
        fullScreen={isMobile}
        open={validationDialog.open} 
        onClose={() => {
          setValidationDialog({ open: false, event: null, action: null })
          setValidationReason('')
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {validationDialog.action === 'cancel' ? 'Annuler l\'événement' : 
           validationDialog.action === 'move' ? 'Déplacer l\'événement' : ''}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2">
              {validationDialog.action === 'cancel' 
                ? 'Êtes-vous sûr de vouloir annuler cet événement ?'
                : 'Êtes-vous sûr de vouloir marquer cet événement comme déplacé ?'
              }
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {validationDialog.event?.title}
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Raison (optionnel)"
              fullWidth
              multiline
              rows={3}
              value={validationReason}
              onChange={(e) => setValidationReason(e.target.value)}
              placeholder={
                validationDialog.action === 'cancel' 
                  ? 'Indiquez la raison de l\'annulation...'
                  : 'Indiquez la raison du déplacement...'
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setValidationDialog({ open: false, event: null, action: null })
              setValidationReason('')
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (validationDialog.event && validationDialog.action) {
                const newState = validationDialog.action === 'cancel' ? 'CANCELLED' : 'MOVED'
                handleStateChange(validationDialog.event, newState as EventState, validationReason)
              }
            }}
            variant="contained"
            color={validationDialog.action === 'cancel' ? 'error' : 'primary'}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default EventsList