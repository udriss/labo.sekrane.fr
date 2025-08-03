// components/calendar/ImprovedEventBlock.tsx
// Composant amélioré pour afficher un événement comme un bloc unique avec créneaux multiples

"use client"

import React, { useState } from 'react'
import {
  Card, CardContent, Typography, Stack, Chip, Box, Collapse, IconButton,
  Divider, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material'
import {
  ExpandMore, ExpandLess, Person, LocationOn, Schedule, CalendarToday,
  CheckCircle, Cancel, SwapHoriz, Gavel, Edit, Handyman, ContentCopy
} from '@mui/icons-material'
import { CalendarEvent, EventState, TimeSlot } from '@/types/calendar'
import { getDisplayTimeSlots } from '@/lib/calendar-migration-utils'
import { useSession } from 'next-auth/react'
import ImprovedTimeSlotActions from './ImprovedTimeSlotActions'
import ValidationSlotActions from './ValidationSlotActions'

interface ImprovedEventBlockProps {
  event: CalendarEvent
  canOperate: boolean
  isMobile?: boolean
  onEventUpdate?: (updatedEvent: CalendarEvent) => void
  discipline?: 'chimie' | 'physique'
  onEdit?: (event: CalendarEvent) => void
  onEventCopy?: (event: CalendarEvent) => void
  onEventDelete?: (event: CalendarEvent) => void
}

const ImprovedEventBlock: React.FC<ImprovedEventBlockProps> = ({
  event,
  canOperate,
  isMobile = false,
  onEventUpdate,
  discipline = 'chimie',
  onEdit,
  onEventCopy,
  onEventDelete
}) => {
  const { data: session } = useSession()
  const [expanded, setExpanded] = useState(false)
  const [timeSlotActionsOpen, setTimeSlotActionsOpen] = useState(false)
  const [validationActionsOpen, setValidationActionsOpen] = useState(false)

  const displaySlots = getDisplayTimeSlots(event)

  // Déterminer le rôle de l'utilisateur par rapport à cet événement
  const isOwner = session?.user && (
    event.createdBy === session.user.id || 
    event.createdBy === session.user.email
  )
  
  // Un opérateur peut agir sur l'événement mais n'en est pas le propriétaire
  const isOperator = canOperate && !isOwner

  // Détermine le type d'interface à afficher
  const showValidationInterface = isOwner && event.state === 'PENDING' && event.validationState === 'ownerPending'
  const showOperatorValidationInterface = canOperate && event.state === 'PENDING' && event.validationState === 'operatorPending'
  const showOperatorInterface = isOperator && event.state !== 'PENDING'
  const showOwnerInterface = isOwner
  console.log({
    'event;': event,
    'isOwner': isOwner,
    'isOperator': isOperator,
    'showValidationInterface': showValidationInterface,
    'showOperatorValidationInterface': showOperatorValidationInterface,
    'showOperatorInterface': showOperatorInterface,
    'showOwnerInterface': showOwnerInterface
  })


  const getEventStateColor = (state: EventState) => {
    switch (state) {
      case 'PENDING':
        return 'warning'
      case 'VALIDATED':
        return 'success'
      case 'CANCELLED':
        return 'error'
      case 'MOVED':
        return 'info'
      case 'IN_PROGRESS':
        return 'primary'
      default:
        return 'default'
    }
  }

  const getEventStateLabel = (state: EventState) => {
    switch (state) {
      case 'PENDING':
        return 'En attente'
      case 'VALIDATED':
        return 'Validé'
      case 'CANCELLED':
        return 'Annulé'
      case 'MOVED':
        return 'Déplacé'
      case 'IN_PROGRESS':
        return 'En cours'
      default:
        return state
    }
  }

  const formatTimeSlot = (slot: TimeSlot) => {
    const start = new Date(slot.startDate)
    const end = new Date(slot.endDate)
    
    const date = start.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    })
    const startTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const endTime = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    
    return { date, time: `${startTime} - ${endTime}`, fullDate: start }
  }

  const groupSlotsByDate = (slots: TimeSlot[]) => {
    const grouped = new Map<string, TimeSlot[]>()
    
    slots.forEach(slot => {
      const date = new Date(slot.startDate).toDateString()
      if (!grouped.has(date)) {
        grouped.set(date, [])
      }
      grouped.get(date)!.push(slot)
    })
    
    return Array.from(grouped.entries()).map(([dateString, slots]) => ({
      date: dateString,
      slots: slots.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    }))
  }

  const groupedSlots = groupSlotsByDate(displaySlots)

  const handleGlobalAction = async (action: 'VALIDATE' | 'CANCEL', reason?: string): Promise<void> => {
    try {
      const response = await fetch(`/api/calendrier/${discipline}/simple-operator-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          action,
          reason
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'action')
      }

      const data = await response.json()
      
      if (onEventUpdate && data.event) {
        onEventUpdate(data.event)
      }

      alert(data.message || 'Action effectuée avec succès')

    } catch (error) {
      console.error('Erreur lors de l\'action:', error)
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      throw error // Re-throw pour permettre la gestion dans handleCancel
    }
  }

  const handleValidate = () => {
    handleGlobalAction('VALIDATE', 'Événement validé globalement')
  }

  const handleCancel = () => {
    if (confirm('Êtes-vous sûr de vouloir annuler cet événement ?')) {
      handleGlobalAction('CANCEL', 'Événement annulé par l\'opérateur')
        .then(() => {
          // Ne pas fermer ou masquer l'événement, il doit rester visible avec l'état CANCELLED
          console.log('Événement annulé, mais reste visible dans l\'interface')
        })
    }
  }

  const handleMove = () => {
    setTimeSlotActionsOpen(true)
  }

  const handleValidationActions = () => {
    setValidationActionsOpen(true)
  }

  const handleOwnerModify = () => {
    // Pour les owners, utiliser le EditEventDialog de la page principale
    if (onEdit) {
      onEdit(event)
    } else {
      // Fallback vers l'interface de modification qui créera un état PENDING
      setTimeSlotActionsOpen(true)
    }
  }

  const handleOwnerCopy = () => {
    if (onEventCopy) {
      onEventCopy(event)
    }
  }

  const handleOwnerDelete = () => {
    if (onEventDelete && confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      onEventDelete(event)
    }
  }

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            {/* En-tête de l'événement */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" component="div">
                  {event.title}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Chip
                    label={getEventStateLabel(event.state || 'PENDING')}
                    color={getEventStateColor(event.state || 'PENDING')}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {displaySlots.length} créneau{displaySlots.length > 1 ? 'x' : ''}
                  </Typography>
                </Stack>
              </Box>
              
              <IconButton
                onClick={() => setExpanded(!expanded)}
                size="small"
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            {/* Résumé des créneaux (toujours visible) */}
            <Box>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                <Schedule fontSize="small" />
                <Typography variant="body2" fontWeight="medium">
                  Créneaux :
                </Typography>
              </Stack>
              
              {groupedSlots.map((group, index) => {
                const firstSlot = group.slots[0]
                const { date } = formatTimeSlot(firstSlot)
                const times = group.slots.map(slot => formatTimeSlot(slot).time).join(', ')
                
                return (
                  <Typography key={index} variant="body2" color="text.secondary">
                    • {date} : {times}
                  </Typography>
                )
              })}
            </Box>

            {/* Actions selon le rôle */}
            {showValidationInterface && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Gavel fontSize="small" />
                  <Typography variant="body2" fontWeight="medium" color="warning.main">
                    Cet événement nécessite votre validation
                  </Typography>
                </Stack>
                <Button
                  onClick={handleValidationActions}
                  variant="contained"
                  color="warning"
                  startIcon={<Gavel />}
                  size="small"
                  fullWidth={isMobile}
                >
                  Gérer la validation
                </Button>
              </Box>
            )}

            {showOperatorValidationInterface && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Gavel fontSize="small" />
                  <Typography variant="body2" fontWeight="medium" color="primary.main">
                    En attente de validation opérateur
                  </Typography>
                </Stack>
                <Button
                  onClick={handleValidationActions}
                  variant="contained"
                  color="primary"
                  startIcon={<Gavel />}
                  size="small"
                  fullWidth={isMobile}
                >
                  Valider les modifications
                </Button>
              </Box>
            )}

            {showOperatorInterface && (
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Actions opérateur :
                </Typography>
                <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
                  <Button
                    onClick={handleValidate}
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    size="small"
                    disabled={event.state === 'VALIDATED'}
                  >
                    Valider l'événement
                  </Button>
                  
                  <Button
                    onClick={handleMove}
                    variant="outlined"
                    color="primary"
                    endIcon={<Handyman color='warning' />}
                    startIcon={<SwapHoriz />}
                    size="small"
                    disabled
                  >
                    Déplacer/Modifier
                  </Button>
                  
                  <Button
                    onClick={handleCancel}
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    size="small"
                    disabled={event.state === 'CANCELLED'}
                  >
                    Annuler l'événement
                  </Button>
                </Stack>
              </Box>
            )}

            {showOwnerInterface && (
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Actions propriétaire :
                </Typography>
                <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
                  <Button
                    onClick={handleOwnerModify}
                    variant="outlined"
                    color="primary"
                    startIcon={<Edit />}
                    size="small"
                  >
                    Modifier l'événement
                  </Button>
                  {onEventCopy && (
                    <Button
                      onClick={handleOwnerCopy}
                      variant="outlined"
                      color="secondary"
                      startIcon={<ContentCopy />}
                      size="small"
                    >
                      Copier l'événement
                    </Button>
                  )}
                  {onEventDelete && (
                    <Button
                      onClick={handleOwnerDelete}
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      size="small"
                    >
                      Supprimer
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Vos modifications nécessiteront une validation
                </Typography>
              </Box>
            )}

            {/* Détails étendus */}
            <Collapse in={expanded}>
              <Divider sx={{ my: 2 }} />
              
              {event.description && (
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {event.description}
                </Typography>
              )}
              
              <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
                {event.createdBy && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Person fontSize="small" />
                    <Typography variant="body2">
                      {event.createdBy}
                    </Typography>
                  </Stack>
                )}
                
                {(event.room || event.location) && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <LocationOn fontSize="small" />
                    <Typography variant="body2">
                      {event.room || event.location}
                    </Typography>
                  </Stack>
                )}
                
                {event.class && (
                  <Typography variant="body2">
                    Classe : {event.class}
                  </Typography>
                )}
              </Stack>

              {/* Détail des créneaux */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Créneaux détaillés :
                </Typography>
                {displaySlots.map((slot, index) => {
                  const { date, time } = formatTimeSlot(slot)
                  return (
                    <Typography key={index} variant="body2" color="text.secondary">
                      {index + 1}. {date} de {time}
                      {slot.status && slot.status !== 'active' && ` (${slot.status})`}
                    </Typography>
                  )
                })}
              </Box>
            </Collapse>
          </Stack>
        </CardContent>
      </Card>

      {/* Dialog pour les actions sur créneaux individuels */}
      <Dialog 
        open={timeSlotActionsOpen} 
        onClose={() => setTimeSlotActionsOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {isOwner ? 'Modifier l\'événement' : 'Gestion des créneaux'} - {event.title}
        </DialogTitle>
        
        <DialogContent>
          <ImprovedTimeSlotActions
            event={event}
            canOperate={canOperate}
            isMobile={isMobile}
            onEventUpdate={onEventUpdate}
            discipline={discipline}
            onClose={() => setTimeSlotActionsOpen(false)}
            userRole={isOwner ? 'owner' : 'operator'}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setTimeSlotActionsOpen(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour la validation des modifications */}
      <Dialog 
        open={validationActionsOpen} 
        onClose={() => setValidationActionsOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Validation de l'événement - {event.title}
        </DialogTitle>
        
        <DialogContent>
          <ValidationSlotActions
            event={event}
            canValidate={canOperate}
            isMobile={isMobile}
            onEventUpdate={onEventUpdate}
            discipline={discipline}
            onClose={() => setValidationActionsOpen(false)}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setValidationActionsOpen(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ImprovedEventBlock
