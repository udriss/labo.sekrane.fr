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
  MoreVert,
  ManageHistory,
} from '@mui/icons-material'
import { format, isToday } from 'date-fns'
import { fr, is } from 'date-fns/locale'
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
    action: 'cancel' | 'move' | 'validate' | 'in-progress' | 'other' | null
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
            label: 'À valider' 
          }
        case 'IN_PROGRESS':
          return { 
            icon: <ManageHistory sx={{ fontSize: 20 }} />, 
            color: 'primary',
            label: 'En préparation' 
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
  const openValidationDialog = (event: CalendarEvent, action: 'cancel' | 'move' | 'validate' | 'in-progress') => {
    setValidationDialog({ open: true, event, action })
  }


const renderEventItem = (event: CalendarEvent): React.ReactNode => {
  const typeInfo = getEventTypeInfo(event.type);
  const showEditDelete = canEditEvent && canEditEvent(event);
  // Modification : Afficher les actions de validation pour tous les états si l'utilisateur a les droits
  const showValidationActions = canValidateEvent;
  const isCancelled = event.state === 'CANCELLED';
  const stateInfo = getStateInfo(event.state);

  const menuItems: React.ReactNode[] = [];

  // Ajouter les items de modification/suppression
  if (showEditDelete && onEventEdit) {
    menuItems.push(
      <MenuItem 
        key="edit"
        onClick={() => {
          onEventEdit(event);
          setAnchorEl(null);
        }}
      >
        <ListItemIcon>
          <Edit fontSize="small" />
        </ListItemIcon>
        <ListItemText>Modifier</ListItemText>
      </MenuItem>
    );
  }
  
  if (showEditDelete && onEventDelete) {
    menuItems.push(
      <MenuItem 
        key="delete"
        onClick={() => {
          onEventDelete(event);
          setAnchorEl(null);
        }}
      >
        <ListItemIcon>
          <Delete fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText>Supprimer</ListItemText>
      </MenuItem>
    );
  }
  
// Ajouter les items de validation pour tous les états si l'utilisateur peut valider
  if (showValidationActions) {
    menuItems.push(
      <MenuItem 
        key="validate"
        onClick={() => {
          openValidationDialog(event, 'validate');
          setAnchorEl(null);
        }}
        disabled={event.state === 'VALIDATED'} // Griser si l'état est déjà VALIDATED
      >
        <ListItemIcon>
          <CheckCircle fontSize="small" color="success" />
        </ListItemIcon>
        <ListItemText>Valider</ListItemText>
      </MenuItem>,
      
      <MenuItem 
        key="move"
        onClick={() => {
          openValidationDialog(event, 'move');
          setAnchorEl(null);
        }}
        disabled={event.state === 'MOVED'} // Griser si l'état est déjà MOVED
      >
        <ListItemIcon>
          <SwapHoriz fontSize="small" color="primary" />
        </ListItemIcon>
        <ListItemText>Déplacer</ListItemText>
      </MenuItem>,

      <MenuItem 
        key="in-progress"
        onClick={() => {
          openValidationDialog(event, 'in-progress');
          setAnchorEl(null);
        }}
        disabled={event.state === 'IN_PROGRESS'} // Griser si l'état est déjà IN_PROGRESS
      >
        <ListItemIcon>
          <ManageHistory fontSize="small" color="info" />
        </ListItemIcon>
        <ListItemText>En préparation</ListItemText>
      </MenuItem>,

      <MenuItem 
        key="cancel"
        onClick={() => {
          openValidationDialog(event, 'cancel');
          setAnchorEl(null);
        }}
        disabled={event.state === 'CANCELLED'} // Griser si l'état est déjà CANCELLED
      >
        <ListItemIcon>
          <Cancel fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText>Annuler</ListItemText>
      </MenuItem>
    );
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
      {/* Colonne Ressources */}
      <Box
        component="div"
        sx={{
          minwidth: 200,
          width: 'auto',
          flexShrink: 0,
          pl: 2,
          borderLeft: 1,
          borderColor: 'divider'
        }}
      >
        <Stack spacing={0.5}>
          {/* Matériel et Réactifs */}
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
    </ListItem>
  );
}

  return (
    <>
      <Paper elevation={0} sx={{ p: 0 }}>
        {/* En-tête avec la date du jour */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday color="primary" />
          <Typography variant="h6" color="primary">
            Planning du {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </Typography>
        </Box>

        {/* Barre de recherche et filtres 
        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Rechercher dans le planning du jour..."
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
                <MenuItem value="PENDING">À valider</MenuItem>
                <MenuItem value="VALIDATED">Validés</MenuItem>
                <MenuItem value="CANCELLED">Annulés</MenuItem>
                <MenuItem value="MOVED">Déplacés</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>
        */}
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
              <Typography component={'div'} variant="body2" color="text.secondary">
                <Chip 
                  label={`${sortedEvents.length} événement${sortedEvents.length > 1 ? 's' : ''} aujourd'hui`}
                  size="small"
                  color='info'
                  variant='outlined'
                  sx={{ textTransform: 'uppercase' }}
                />
              </Typography>
              {sortedEvents.filter(e => e.state === 'PENDING').length > 0 && (
                <Chip 
                  label={`${sortedEvents.filter(e => e.state === 'PENDING').length} événement à valider`}
                  size="small"
                  color="warning"
                  variant='filled'
                  sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}
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
{/* Dialog de confirmation pour annulation/déplacement/validation/préparation */}
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
     validationDialog.action === 'move' ? 'Déplacer l\'événement' :
     validationDialog.action === 'validate' ? 'Valider l\'événement' :
     validationDialog.action === 'in-progress' ? 'Marquer en préparation' : 
     'Action non reconnue'
    }
  </DialogTitle>
  <DialogContent>
    <Stack spacing={2}>
      <Typography variant="body2">
        {validationDialog.action === 'cancel' 
          ? 'Êtes-vous sûr de vouloir annuler cet événement ?'
          : validationDialog.action === 'move' 
            ? 'Êtes-vous sûr de vouloir marquer cet événement comme déplacé ?'
            : validationDialog.action === 'validate'
              ? 'Êtes-vous sûr de vouloir valider cet événement ?'
              : validationDialog.action === 'in-progress'
                ? 'Êtes-vous sûr de vouloir marquer cet événement comme étant en préparation ?'
                : 'Action non reconnue. Veuillez réessayer.'}
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
            : validationDialog.action === 'move' 
              ? 'Indiquez la raison du déplacement...'
              : validationDialog.action === 'validate'
                ? 'Indiquez la raison de la validation...'
                : validationDialog.action === 'in-progress'
                  ? 'Indiquez la raison de la mise en préparation...'
                  : 'Indiquez une raison...'
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
          let newState: EventState;
          switch (validationDialog.action) {
            case 'cancel':
              newState = 'CANCELLED';
              break;
            case 'move':
              newState = 'MOVED';
              break;
            case 'validate':
              newState = 'VALIDATED';
              break;
            case 'in-progress':
              newState = 'IN_PROGRESS';
              break;
            default:
              return; // Ne rien faire si l'action n'est pas reconnue
          }
          handleStateChange(validationDialog.event, newState, validationReason);
        }
      }}
      variant="contained"
      color={
        validationDialog.action === 'cancel' 
          ? 'error' 
          : validationDialog.action === 'move'
            ? 'primary'
            : validationDialog.action === 'validate'
              ? 'success'
              : validationDialog.action === 'in-progress'
                ? 'info'
                : 'warning'
      }
    >
      Confirmer
    </Button>
  </DialogActions>
</Dialog>
    </>
  )
}

export default DailyPlanning