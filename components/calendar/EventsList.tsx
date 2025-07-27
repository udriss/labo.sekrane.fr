// components/calendar/EventsList.tsx

"use client"

import React, { useState } from 'react'
import { 
  Typography, List, ListItem, ListItemIcon, ListItemText, 
  Avatar, Box, Chip, Stack, IconButton, Tooltip, 
  TextField, InputAdornment, FormControl, Select, MenuItem,
  Divider, Badge, ListItemAvatar, Collapse,
  Button, Paper, Menu, Dialog, DialogTitle, DialogContent,
  DialogActions
} from '@mui/material'
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { 
  Science, Schedule, Assignment, EventAvailable,
  CheckCircle, Cancel, SwapHoriz, HourglassEmpty,
  Search, FilterList, Visibility, Edit, Delete,
  ExpandMore, ExpandLess, MoreVert
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
  canValidateEvent,
  onStateChange,
  isMobile = false
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

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, "HH:mm", { locale: fr })
  }

  const formatDateTimeDay = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, "dd/MM/yyyy", { locale: fr })
  }
  const formatDateTimeHour = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, "HH:mm", { locale: fr })
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
    const stateInfo = getStateInfo(event.state)
    const showEditDelete = canEditEvent && canEditEvent(event)
    const showValidationActions = canValidateEvent && event.state === 'PENDING'
    const isCancelled = event.state === 'CANCELLED'
    const isPast = new Date(event.startDate) < new Date()
    
    // Créer un tableau des items de menu
    const menuItems = []
    
    // Ajouter les items de modification/suppression
    if (showEditDelete && onEventEdit && event.state !== 'VALIDATED') {
      menuItems.push(
        <MenuItem 
          key="edit"
          onClick={() => {
            if (selectedEvent) {
              onEventEdit(selectedEvent)
              handleMenuClose()
            }
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
            if (selectedEvent) {
              onEventDelete(selectedEvent)
              handleMenuClose()
            }
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
            if (selectedEvent) {
              handleStateChange(selectedEvent, 'VALIDATED')
            }
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
            if (selectedEvent) {
              openValidationDialog(selectedEvent, 'move')
            }
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
            if (selectedEvent) {
              openValidationDialog(selectedEvent, 'cancel')
            }
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
            
            {/* Menu pour les autres actions */}
            {menuItems.length > 0 && (
              <>
                <Tooltip title="Plus d'actions">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, event)}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                                </Tooltip>
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
                  label="Date passée" 
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
                📅 {formatDateTimeDay(event.startDate)}
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                🕒 {formatTime(event.startDate)} - {formatTime(event.endDate)}
              </Typography>
              
              {event.room && (
                <Typography variant="body2" color="text.secondary" component="div">
                  📍 {event.room}
                </Typography>
              )}
              
              {/* Chips pour matériels et réactifs */}
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
                {event.materials && event.materials.length > 0 && (
                  <Chip
                    size="small"
                    label={`${event.materials.length} matériel${event.materials.length > 1 ? 's' : ''}`}
                  />
                )}
                {event.chemicals && event.chemicals.length > 0 && (
                  <Chip
                    size="small"
                    label={`${event.chemicals.length} réactif${event.chemicals.length > 1 ? 's' : ''}`}
                    color="secondary"
                  />
                )}
              </Stack>

                            {/* Section documents */}
              {event.files && event.files.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" component="div">
                    📎 {event.files.length} document{event.files.length > 1 ? 's' : ''} joint{event.files.length > 1 ? 's' : ''} :
                  </Typography>
                  <Stack spacing={0.3} sx={{ mt: 0.5, ml: 2 }}>
                    {event.files.slice(0, 3).map((file, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">•</Typography>
                        <Typography
                          component="a"
                          href={file.fileUrl.startsWith('/uploads/') 
                            ? `/api/calendrier/files?path=${encodeURIComponent(file.fileUrl)}`
                            : file.fileUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="caption"
                          sx={{
                            color: 'primary.main',
                            textDecoration: 'none',
                            '&:hover': {
                              textDecoration: 'underline'
                            },
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {file.fileName}
                          {file.fileSize && (
                            <Typography component="span" variant="caption" color="text.secondary">
                              ({formatFileSize(file.fileSize)})
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    ))}
                    {event.files.length > 3 && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                        ... et {event.files.length - 3} autre(s) document(s)
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}
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
    <>
      <Box>
        <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
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