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
  Button,
} from '@mui/material'
import {
  Science,
  Schedule,
  Assignment,
  EventAvailable,
  Search,
  FilterList,
  Visibility,
  HourglassEmpty,
  CalendarToday,
  ManageHistory,
  CheckCircle,
  Cancel,
  SwapHoriz,
  AccessTime,
} from '@mui/icons-material'
import { format, isToday, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarEvent, EventType, EventState } from '@/types/calendar'
import { getActiveTimeSlots } from '@/lib/calendar-utils-client'
import EventActions from './EventActions'
import PendingModifications from './PendingModifications'

interface DailyPlanningProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onEventEdit?: (event: CalendarEvent) => void
  onEventDelete?: (event: CalendarEvent) => void
  canEditEvent?: (event: CalendarEvent) => boolean
  canValidateEvent?: boolean
  onStateChange?: (event: CalendarEvent, newState: EventState, reason?: string, timeSlots?: any[]) => void
  onMoveDate?: (event: CalendarEvent, timeSlots: any[], reason?: string, state?: EventState) => void
  onConfirmModification?: (event: CalendarEvent, modificationId: string, action: 'confirm' | 'reject') => void
  isCreator?: (event: CalendarEvent) => boolean
  currentUserId?: string
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
  onMoveDate,
  onConfirmModification,
  isCreator,
  currentUserId,
  isMobile = false
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | EventType>('all')
  const [filterState, setFilterState] = useState<'all' | string>('all')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

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

  // Filtrer uniquement les événements qui ont des créneaux aujourd'hui
  const todayEvents = events.filter(event => {
    const activeSlots = getActiveTimeSlots(event);
    return activeSlots.some(slot => isToday(new Date(slot.startDate)));
  });

  // Appliquer les filtres de recherche et de type
  const filteredEvents = todayEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.class?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || event.type === filterType
    const matchesState = filterState === 'all' || event.state === filterState
    
    return matchesSearch && matchesType && matchesState
  })

  // Trier par heure de début du premier créneau actif
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const aSlots = getActiveTimeSlots(a);
    const bSlots = getActiveTimeSlots(b);
    const aStart = aSlots[0] ? new Date(aSlots[0].startDate).getTime() : 0;
    const bStart = bSlots[0] ? new Date(bSlots[0].startDate).getTime() : 0;
    return aStart - bStart;
  })

  const renderEventItem = (event: CalendarEvent): React.ReactNode => {
    const typeInfo = getEventTypeInfo(event.type);
    const canEdit = canEditEvent && canEditEvent(event);
    const isCancelled = event.state === 'CANCELLED';
    const stateInfo = getStateInfo(event.state);
    const activeSlots = getActiveTimeSlots(event);
    const todaySlots = activeSlots.filter(slot => isToday(new Date(slot.startDate)));

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
            
            {/* Utilisation du composant EventActions */}
            <EventActions
              event={event}
              canEdit={canEdit || false}
              canValidate={canValidateEvent || false}
              isCreator={isCreator ? isCreator(event) : false}
              isMobile={isMobile}
              onEdit={onEventEdit}
              onDelete={onEventDelete}
              onStateChange={onStateChange}
              onMoveDate={onMoveDate}
              onConfirmModification={onConfirmModification}
              showAsMenu={true}
              anchorEl={anchorEl}
              setAnchorEl={setAnchorEl}
            />
          </Stack>
        }
      >
        <ListItemAvatar>
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
        </ListItemAvatar>

        <ListItemText
          primary={
            <Stack spacing={0.5}>
              <Typography variant="subtitle1" component="div">
                {event.title}
              </Typography>
              
              {/* Affichage des créneaux horaires du jour */}
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTime fontSize="small" color="action" />
                {todaySlots.length === 1 ? (
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(todaySlots[0].startDate), 'HH:mm')} - 
                    {format(new Date(todaySlots[0].endDate), 'HH:mm')}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {todaySlots.length} créneaux aujourd'hui
                  </Typography>
                )}
              </Stack>

              {/* Affichage détaillé si plusieurs créneaux */}
              {todaySlots.length > 1 && (
                <Box sx={{ ml: 3 }}>
                  {todaySlots.map((slot, index) => (
                    <Typography key={slot.id} variant="caption" color="text.secondary">
                      • {format(new Date(slot.startDate), 'HH:mm')} - 
                      {format(new Date(slot.endDate), 'HH:mm')}
                    </Typography>
                  ))}
                </Box>
              )}
            </Stack>
          }
          secondaryTypographyProps={{
            component: 'div'  // Force le secondary à être un div au lieu de p
          }}
          secondary={
            <Stack spacing={1} sx={{ mt: 1 }}>
              {/* Classe et salle */}
              <Stack direction="row" spacing={1} alignItems="center">
                {event.class && (
                  <Chip 
                    label={event.class} 
                    size="small" 
                    variant="outlined"
                  />
                )}
                {event.room && (
                  <Chip 
                    label={event.room} 
                    size="small" 
                    variant="outlined"
                  />
                )}
              </Stack>

              {/* Description */}
              {event.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {event.description}
                </Typography>
              )}
            </Stack>
          }
        />

        {/* Colonne Ressources */}
        <Box
          component="div"
          sx={{
            minWidth: 200,
            width: 'auto',
            flexShrink: 0,
            pl: 2,
            borderLeft: 1,
            borderColor: 'divider'
          }}
        >
          <Stack spacing={0.5}>
            {/* Matériel et Réactifs */}
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

            {/* Modifications en attente */}
            <PendingModifications 
              event={event}
              isCreator={isCreator ? isCreator(event) : false}
              onConfirmModification={onConfirmModification || (() => {})}
              compact={true}
            />
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
                  label={`${sortedEvents.filter(e => e.state === 'PENDING').length} à valider`}
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
    </>
  )
}

export default DailyPlanning