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
  Grid,
  CircularProgress,
  Snackbar,
} from '@mui/material'
import { Alert as MuiAlert } from '@mui/material'
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
  onApproveTimeSlotChanges?: (event: CalendarEvent) => void // NOUVEAU: approuver les créneaux proposés
  onRejectTimeSlotChanges?: (event: CalendarEvent) => void // NOUVEAU: rejeter les créneaux proposés
  isCreator?: (event: CalendarEvent) => boolean
  currentUserId?: string
  isMobile?: boolean
  discipline?: 'chimie' | 'physique' // NOUVEAU: discipline pour les appels API
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
  onApproveTimeSlotChanges,
  onRejectTimeSlotChanges,
  isCreator,
  currentUserId,
  isMobile = false,
  discipline = 'chimie' // Valeur par défaut
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | EventType>('all')
  const [filterState, setFilterState] = useState<'all' | string>('all')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  
  // États pour gérer le chargement des boutons de timeslot
  const [loadingTimeslotActions, setLoadingTimeslotActions] = useState<Record<string, 'approve' | 'reject' | null>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [usersInfo, setUsersInfo] = useState<Record<string, {id: string, name: string, email: string}>>({})

  // Fonction pour récupérer les informations des utilisateurs qui ont modifié les créneaux
  const fetchUsersInfo = async (userIds: string[]) => {
    if (userIds.length === 0) return {}
    
    try {
      const response = await fetch('/api/utilisateurs/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [...new Set(userIds)] })
      })
      
      if (response.ok) {
        const users = await response.json()
        setUsersInfo(prev => ({ ...prev, ...users }))
        return users
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error)
    }
    return {}
  }

  // Fonction pour obtenir le nom de l'utilisateur qui a modifié un créneau
  const getModifierName = (event: CalendarEvent) => {
    if (!event.timeSlots) return 'Des utilisateurs'
    
    const modifierIds = new Set<string>()
    
    // Collecter tous les IDs des utilisateurs qui ont modifié les créneaux
    event.timeSlots.forEach(slot => {
      if (slot.modifiedBy && Array.isArray(slot.modifiedBy)) {
        slot.modifiedBy.forEach(modification => {
          if (typeof modification === 'object' && modification.userId) {
            modifierIds.add(modification.userId)
          } else if (typeof modification === 'string') {
            modifierIds.add(modification)
          }
        })
      }
    })
    
    const modifierNames = Array.from(modifierIds)
      .map(id => usersInfo[id]?.name || usersInfo[id]?.email || `Utilisateur ${id}`)
      .filter(Boolean)
    
    if (modifierNames.length === 0) return 'Des utilisateurs'
    if (modifierNames.length === 1) return modifierNames[0]
    if (modifierNames.length === 2) return `${modifierNames[0]} et ${modifierNames[1]}`
    return `${modifierNames.slice(0, -1).join(', ')} et ${modifierNames[modifierNames.length - 1]}`
  }

  // Fonctions pour gérer les actions de timeslot avec optimisme
  const handleApproveTimeslot = async (eventId: string, slotId: string, event: CalendarEvent) => {
    const key = `${eventId}-${slotId}`
    setLoadingTimeslotActions(prev => ({ ...prev, [key]: 'approve' }))
    
    try {
      const apiEndpoint = discipline === 'physique' ? '/api/calendrier/physique' : '/api/calendrier/chimie'
      const response = await fetch(`${apiEndpoint}/approve-single-timeslot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventId,
          slotId: slotId
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSuccessMessage('Créneau approuvé avec succès')
        // Mise à jour avec les données de l'API
        if (onApproveTimeSlotChanges && data.event) {
          onApproveTimeSlotChanges(data.event)
        }
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || 'Erreur lors de l\'approbation du créneau')
        setTimeout(() => setErrorMessage(null), 3000)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur de connexion')
      setTimeout(() => setErrorMessage(null), 3000)
    } finally {
      setLoadingTimeslotActions(prev => ({ ...prev, [key]: null }))
    }
  }

  const handleRejectTimeslot = async (eventId: string, slotId: string, event: CalendarEvent) => {
    const key = `${eventId}-${slotId}`
    setLoadingTimeslotActions(prev => ({ ...prev, [key]: 'reject' }))
    
    try {
      const apiEndpoint = discipline === 'physique' ? '/api/calendrier/physique' : '/api/calendrier/chimie'
      const response = await fetch(`${apiEndpoint}/reject-single-timeslot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventId,
          slotId: slotId
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSuccessMessage('Créneau rejeté avec succès')
        // Mise à jour avec les données de l'API
        if (onRejectTimeSlotChanges && data.event) {
          onRejectTimeSlotChanges(data.event)
        }
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || 'Erreur lors du rejet du créneau')
        setTimeout(() => setErrorMessage(null), 3000)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur de connexion')
      setTimeout(() => setErrorMessage(null), 3000)
    } finally {
      setLoadingTimeslotActions(prev => ({ ...prev, [key]: null }))
    }
  }

  // Fonction pour trouver le créneau actuel correspondant à un créneau proposé
  // Nouvelle version : utilise referentActuelTimeID pour la correspondance directe
  const findCorrespondingActualSlot = (proposedSlot: any, actualSlots: any[]) => {
    if (!actualSlots || actualSlots.length === 0) {
      return null;
    }

    // Correspondance directe par referentActuelTimeID si présent
    if (proposedSlot.referentActuelTimeID) {
      const byRef = actualSlots.find(slot => slot.id === proposedSlot.referentActuelTimeID);
      if (byRef) return byRef;
    }

    // Sinon, correspondance par ID (créneau inchangé)
    const byId = actualSlots.find(slot => slot.id === proposedSlot.id);
    if (byId) return byId;

    // Si aucune correspondance, retourner null (plus de matching heuristique)
    return null;
  };

  // Fonction pour vérifier si un créneau proposé est différent du créneau actuel
  const isSlotChanged = (proposedSlot: any, event: CalendarEvent) => {
    const correspondingActual = findCorrespondingActualSlot(proposedSlot, event.actuelTimeSlots || []);
    
    if (!correspondingActual) {
      // Nouveau créneau proposé
      return true;
    }
    
    // Comparer les dates
    return correspondingActual.startDate !== proposedSlot.startDate || 
           correspondingActual.endDate !== proposedSlot.endDate;
  };

  // Fonction pour détecter s'il y a des changements en attente
  const hasPendingChanges = (event: CalendarEvent): boolean => {
    if (!event.timeSlots || !event.actuelTimeSlots) return false;
    
    // Filtrer les créneaux valides (exclure ceux avec status "invalid")
    const activeTimeSlots = event.timeSlots.filter(slot => slot.status === 'active');
    
    // Si l'événement est PENDING et que c'est le propriétaire qui a fait les modifications,
    // ne pas considérer comme ayant des changements en attente
    if (event.state === 'PENDING' && event.createdBy === currentUserId) {
      return false;
    }
    
    // Vérifier s'il y a des créneaux en attente d'approbation (pas encore approuvés)
    const pendingSlots = activeTimeSlots.filter(slot => getSlotStatus(slot, event) !== 'approved');
    return pendingSlots.length > 0;
  };

  // Fonction pour obtenir l'état d'un créneau (validé, en attente, nouveau)
  const getSlotStatus = (proposedSlot: any, event: CalendarEvent) => {

    const correspondingActual = findCorrespondingActualSlot(proposedSlot, event.actuelTimeSlots || []);
    
    if (!correspondingActual) {
      return 'new'; // Nouveau créneau
    }
    
    // Vérifier d'abord si c'est une correspondance par ID (créneau inchangé)
    const isExactMatch = correspondingActual.id === proposedSlot.id;
    const isSameDate = correspondingActual.startDate === proposedSlot.startDate && 
                      correspondingActual.endDate === proposedSlot.endDate;
    
    if (isSameDate) {
      return 'approved'; // Créneau validé (identique)
    }
    
    return 'pending'; // Créneau modifié en attente (remplace le créneau correspondingActual)
  };

  // useEffect pour charger les informations des utilisateurs
  React.useEffect(() => {
    const loadUsersInfo = async () => {
      const allUserIds = new Set<string>()
      
      events.forEach(event => {
        if (event.timeSlots) {
          event.timeSlots.forEach(slot => {
            if (slot.modifiedBy && Array.isArray(slot.modifiedBy)) {
              slot.modifiedBy.forEach(modification => {
                if (typeof modification === 'object' && modification.userId) {
                  allUserIds.add(modification.userId)
                } else if (typeof modification === 'string') {
                  allUserIds.add(modification)
                }
              })
            }
          })
        }
      })
      
      if (allUserIds.size > 0) {
        await fetchUsersInfo(Array.from(allUserIds))
      }
    }
    
    loadUsersInfo()
  }, [events])

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
    // Utiliser la nouvelle logique : propositions en priorité, sinon actuelTimeSlots
    const slotsToCheck = getActiveTimeSlots(event)
    return slotsToCheck.some(slot => isToday(new Date(slot.startDate)));
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

  // Trier par heure de début du premier créneau actuel
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    // Utiliser actuelTimeSlots en priorité pour le tri
    const aSlotsToUse = a.actuelTimeSlots || a.timeSlots?.filter(slot => slot.status === 'active') || []
    const bSlotsToUse = b.actuelTimeSlots || b.timeSlots?.filter(slot => slot.status === 'active') || []
    const aStart = aSlotsToUse[0] ? new Date(aSlotsToUse[0].startDate).getTime() : 0;
    const bStart = bSlotsToUse[0] ? new Date(bSlotsToUse[0].startDate).getTime() : 0;
    return aStart - bStart;
  })

  const renderEventItem = (event: CalendarEvent): React.ReactNode => {
    const typeInfo = getEventTypeInfo(event.type);
    const canEdit = canEditEvent && canEditEvent(event);
    const isCancelled = event.state === 'CANCELLED';
    const stateInfo = getStateInfo(event.state);
    
    // Utiliser la nouvelle logique : propositions en priorité, sinon actuelTimeSlots
    const slotsToUse = getActiveTimeSlots(event)
    const todaySlots = slotsToUse.filter(slot => slot && slot.startDate && isToday(new Date(slot.startDate)));


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
                    {todaySlots.length} créneaux aujourd'hui :
                  </Typography>
                )}
              </Stack>

              {/* Affichage détaillé si plusieurs créneaux */}
              {todaySlots.length > 1 && (
              <Stack spacing={0.5}>
                {todaySlots.map((slot, idx) => (
                  <Box key={slot.id || idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(slot.startDate), 'HH:mm')} - {format(new Date(slot.endDate), 'HH:mm')}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              )}
            </Stack>
          }
          slotProps={{
            secondary: { component: 'div' } // Force le secondary à être un div au lieu de p
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

              {isCreator && isCreator(event) && hasPendingChanges(event) && (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  bgcolor: hasPendingChanges(event) ? 'warning.50' : 'info.50', 
                  borderRadius: 1, 
                  border: '1px solid',
                  borderColor: hasPendingChanges(event) ? 'warning.200' : 'info.200'
                }}>
                  <Alert 
                    severity="warning" 
                    sx={{ mb: 2 }}
                    icon={<ManageHistory />}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      Modifications en attente de votre validation
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {getModifierName(event)} {getModifierName(event) === 'Des utilisateurs' ? 'ont' : 'a'} proposé des modifications pour les créneaux de cet événement. 
                      Veuillez les examiner et les approuver ou les rejeter.
                    </Typography>
                  </Alert>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Comparaison des créneaux :
                    </Typography>
                    
                    {/* Tableau de comparaison des créneaux - exclure les créneaux invalid */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {event.timeSlots?.filter(slot => slot.status === 'active').map((proposedSlot) => {
                        
                        const correspondingActual = findCorrespondingActualSlot(proposedSlot, event.actuelTimeSlots || []);
                        const slotStatus = getSlotStatus(proposedSlot, event);
                        const slotKey = `${event.id}-${proposedSlot.id}`;
                        
                        return (
                          <Box key={proposedSlot.id} sx={{ 
                            p: 2, 
                            border: '1px solid', 
                            borderColor: slotStatus === 'approved' ? 'success.main' : 
                                        slotStatus === 'new' ? 'info.main' : 'warning.main',
                            borderRadius: 1,
                            bgcolor: slotStatus === 'approved' ? 'success.50' : 
                                    slotStatus === 'new' ? 'info.50' : 'warning.50'
                          }}>
                            <Grid container spacing={2} alignItems="center">
                              <Grid size={{ xs: 12, md: 4 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  <strong>Actuel :</strong>
                                </Typography>
                                <Typography variant="body2">
                                  {correspondingActual ? 
                                    `${format(new Date(correspondingActual.startDate), 'dd/MM/yyyy HH:mm')} - ${format(new Date(correspondingActual.endDate), 'HH:mm')}` :
                                    'Aucun créneau correspondant'
                                  }
                                </Typography>
                                {correspondingActual && correspondingActual.id !== proposedSlot.id && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    (sera remplacé)
                                  </Typography>
                                )}
                              </Grid>
                              
                              <Grid size={{ xs: 12, md: 4 }}>
                                <Typography variant="body2" color="primary.main" gutterBottom>
                                  <strong>Proposé :</strong>
                                </Typography>
                                <Typography variant="body2" color="primary.main">
                                  {format(new Date(proposedSlot.startDate), 'dd/MM/yyyy HH:mm')} - 
                                  {format(new Date(proposedSlot.endDate), 'HH:mm')}
                                </Typography>
                              </Grid>

                              <Grid size={{ xs: 12, md: 4 }}>
                                {slotStatus === 'approved' ? (
                                  <Chip 
                                    label="✓ Validé" 
                                    color="success" 
                                    size="small" 
                                    variant="outlined"
                                  />
                                ) : (
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      startIcon={loadingTimeslotActions[slotKey] === 'approve' ? 
                                        <CircularProgress size={16} color="inherit" /> : 
                                        <CheckCircle />
                                      }
                                      disabled={!!loadingTimeslotActions[slotKey]}
                                      onClick={() => handleApproveTimeslot(event.id, proposedSlot.id, event)}
                                    >
                                      {loadingTimeslotActions[slotKey] === 'approve' ? 'Validation...' : 
                                        slotStatus === 'new' ? 'Valider nouveau' : 'Valider modif'}
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      startIcon={loadingTimeslotActions[slotKey] === 'reject' ? 
                                        <CircularProgress size={16} color="inherit" /> : 
                                        <Cancel />
                                      }
                                      disabled={!!loadingTimeslotActions[slotKey]}
                                      onClick={() => handleRejectTimeslot(event.id, proposedSlot.id, event)}
                                    >
                                      {loadingTimeslotActions[slotKey] === 'reject' ? 'Rejet...' : 'Rejeter'}
                                    </Button>
                                  </Box>
                                )}
                              </Grid>
                            </Grid>
                            
                            {/* Indicateur de statut */}
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Statut: 
                              </Typography>
                              <Chip
                                size="small"
                                label={
                                  slotStatus === 'approved' ? 'Validé' :
                                  slotStatus === 'new' ? 'Nouveau créneau' : 
                                  'Modification en attente'
                                }
                                color={
                                  slotStatus === 'approved' ? 'success' :
                                  slotStatus === 'new' ? 'info' : 'warning'
                                }
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  </Box>
                  
                  {/* Boutons d'accès rapide */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                    {(() => {
                      const activeSlots = event.timeSlots?.filter(slot => slot.status === 'active') || [];
                      const pendingSlots = activeSlots.filter(slot => getSlotStatus(slot, event) !== 'approved');
                      const hasAnyPending = pendingSlots.length > 0;
                      
                      return (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircle />}
                            disabled={!hasAnyPending}
                            onClick={async () => {
                              try {
                                const apiEndpoint = discipline === 'physique' ? '/api/calendrier/physique' : '/api/calendrier/chimie'
                                const response = await fetch(`${apiEndpoint}/approve-timeslots`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ eventId: event.id })
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  if (onApproveTimeSlotChanges && data.event) {
                                    onApproveTimeSlotChanges(data.event);
                                  }
                                }
                              } catch (error) {
                                console.error('Erreur lors de l\'approbation:', error);
                              }
                            }}
                          >
                            Valider tous les créneaux ({pendingSlots.length})
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel />}
                            disabled={!hasAnyPending}
                            onClick={async () => {
                              try {
                                const apiEndpoint = discipline === 'physique' ? '/api/calendrier/physique' : '/api/calendrier/chimie'
                                const response = await fetch(`${apiEndpoint}/reject-timeslots`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ eventId: event.id })
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  if (onRejectTimeSlotChanges && data.event) {
                                    onRejectTimeSlotChanges(data.event);
                                  }
                                }
                              } catch (error) {
                                console.error('Erreur lors du rejet:', error);
                              }
                            }}
                          >
                            Rejeter toutes les modifications
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => {
                              onEventClick(event)
                            }}
                          >
                            Voir détails
                          </Button>
                        </>
                      )
                    })()}
                  </Box>
                </Box>
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

      {/* Snackbar pour les messages de succès */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setSuccessMessage(null)} 
          severity="success" 
          variant="filled"
        >
          {successMessage}
        </MuiAlert>
      </Snackbar>

      {/* Snackbar pour les messages d'erreur */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setErrorMessage(null)} 
          severity="error" 
          variant="filled"
        >
          {errorMessage}
        </MuiAlert>
      </Snackbar>
    </>
  )
}

export default DailyPlanning