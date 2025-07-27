// components/calendar/DailyPlanning.tsx

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
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Stack,
  Paper,
  Badge,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button, 
  Menu,
  ListItemIcon,
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
  CalendarToday,
  MoreVert
} from '@mui/icons-material'
import { format, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarEvent, EventType, EventState } from '@/types/calendar'

interface DailyPlanningProps {
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
  TP: { label: "TP", color: "#1976d2", icon: <Science /> },
  MAINTENANCE: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  INVENTORY: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  OTHER: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

const DailyPlanning: React.FC<DailyPlanningProps> = ({
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
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean
    event: CalendarEvent | null
    action: 'cancel' | 'move' | null
  }>({ open: false, event: null, action: null })
  const [validationReason, setValidationReason] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
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

  const getStateColor = (state: string | undefined): any => {
    switch (state) {
      case 'PENDING': return 'warning'
      case 'VALIDATED': return 'success'
      case 'CANCELLED': return 'error'
      case 'MOVED': return 'info'
      default: return 'default'
    }
  }

  // Filtrer uniquement les événements d'aujourd'hui
  const todayEvents = events.filter(event => isToday(event.startDate))

  // Appliquer les filtres de recherche et de type
  const filteredEvents = todayEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.class?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || event.type === filterType
    const matchesState = filterState === 'all' || event.state === filterState
    
    return matchesSearch && matchesType && matchesState
  })

  // Trier par heure de début
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  })

  // Fonction pour gérer le changement d'état
  const handleStateChange = (event: CalendarEvent, newState: EventState, reason?: string) => {
    if (onStateChange) {
      onStateChange(event, newState, reason)
    }
    setValidationDialog({ open: false, event: null, action: null })
    setValidationReason('')
  }

  // Fonction pour ouvrir le dialog de validation
  const openValidationDialog = (event: CalendarEvent, action: 'cancel' | 'move') => {
    setValidationDialog({ open: true, event, action })
  }

  const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

  const renderEventItem = (event: CalendarEvent) => {
    const typeInfo = getEventTypeInfo(event.type)
    const showEditDelete = canEditEvent && canEditEvent(event)
    const showValidationActions = canValidateEvent && event.state === 'PENDING'
    const isCancelled = event.state === 'CANCELLED'
    const stateInfo = getStateInfo(event.state)

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
          opacity: isCancelled ? 0.6 : 1,
          bgcolor: 'background.paper',
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{ textDecoration: isCancelled ? 'line-through' : 'none' }}
              >
                {event.title}
              </Typography>
              {stateInfo && (
                <Chip 
                  label={stateInfo.label}
                  size="small"
                  color={stateInfo.color as any}
                  sx={{ height: 24 }}
                />
              )}
            </Box>
          }
          secondary={
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary" component="div">
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
              
              {/* Chips existants */}
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
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
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" component="div">
                    📎 {event.files.length} document{event.files.length > 1 ? 's' : ''} joint{event.files.length > 1 ? 's' : ''} :
                  </Typography>
                  <Stack spacing={0.3} sx={{ mt: 0.5, ml: 2 }}>
                    {event.files.map((file, index) => (
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

  return (
    <>
      <Paper elevation={0} sx={{ p: 2 }}>
        {/* En-tête avec la date du jour */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday color="primary" />
          <Typography variant="h6" color="primary">
            Planning du {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </Typography>
        </Box>

        {/* Barre de recherche et filtres */}
        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Rechercher dans le planning du jour..."
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

        {/* Liste des événements du jour */}
        {todayEvents.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Aucun événement prévu aujourd'hui
          </Alert>
        ) : filteredEvents.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Aucun événement ne correspond à vos critères de recherche
          </Alert>
        ) : (
          <>
            {/* Résumé */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {sortedEvents.length} événement{sortedEvents.length > 1 ? 's' : ''} aujourd'hui
              </Typography>
              {sortedEvents.filter(e => e.state === 'PENDING').length > 0 && (
                <Chip 
                  label={`${sortedEvents.filter(e => e.state === 'PENDING').length} en attente`}
                  size="small"
                  color="warning"
                />
              )}
            </Box>

            {/* Liste des événements */}
            <List>
              {sortedEvents.map(renderEventItem)}
            </List>
          </>
        )}
      </Paper>

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

export default DailyPlanning