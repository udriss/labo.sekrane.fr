// components/calendar/ValidationSlotActions.tsx
// Composant pour la validation des modifications d'événements (owner ou operator)

"use client"

import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Stack, Button, Card, CardContent, TextField,
  Divider, Chip, Grid, IconButton, Paper, Alert
} from '@mui/material'
import {
  CheckCircle, Cancel, SwapHoriz, Edit, Undo, History, Gavel
} from '@mui/icons-material'
import { CalendarEvent, TimeSlot, ValidationState } from '@/types/calendar'
import { getDisplayTimeSlots } from '@/lib/timeslots-utils'
import { useSession } from 'next-auth/react'

interface ValidationSlotActionsProps {
  event: CalendarEvent
  canValidate: boolean // L'utilisateur peut-il valider ?
  isMobile?: boolean
  onEventUpdate?: (updatedEvent: CalendarEvent) => void
  discipline?: 'chimie' | 'physique'
  onClose?: () => void
}

interface ValidationAction {
  type: 'approve' | 'reject' | 'modify' | 'operator_validate' | 'operator_reject' | 'none'
  reason?: string
  modifications?: {
    [slotId: string]: {
      action: 'keep' | 'modify' | 'remove'
      newSlot?: TimeSlotForm
    }
  }
}

interface TimeSlotForm {
  date: string
  startTime: string
  endTime: string
}

const ValidationSlotActions: React.FC<ValidationSlotActionsProps> = ({
  event,
  canValidate,
  isMobile = false,
  onEventUpdate,
  discipline = 'chimie',
  onClose
}) => {
  const { data: session } = useSession()
  const [validationAction, setValidationAction] = useState<ValidationAction>({ type: 'none' })
  const [loading, setLoading] = useState(false)

  const displaySlots = getDisplayTimeSlots(event)
  
  // Déterminer le type de validation nécessaire
  const isOwner = session?.user && (
    event.createdBy === session.user.id || 
    event.createdBy === session.user.email
  )
  
  const validationType = event.validationState || 'noPending'
  const isOwnerValidation = validationType === 'ownerPending' && isOwner
  const isOperatorValidation = validationType === 'operatorPending' && canValidate
  
  // Récupérer l'historique des changements
  const lastStateChange = (event as any).lastStateChange // Type étendu avec lastStateChange
  const hasRecentChanges = lastStateChange && 
    new Date(lastStateChange.date).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Dernières 24h

  const formatTimeSlot = (slot: TimeSlot) => {
    const start = new Date(slot.startDate)
    const end = new Date(slot.endDate)
    
    const date = start.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
    const startTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const endTime = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    
    return { date, startTime, endTime }
  }

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const formatTimeForInput = (date: Date) => {
    return date.toTimeString().slice(0, 5)
  }

  const handleValidationAction = async (action: 'approve' | 'reject' | 'modify' | 'operator_validate' | 'operator_reject') => {
    try {
      setLoading(true)
      
      let apiEndpoint: string
      let apiAction: string
      let newState: string
      
      if (isOperatorValidation) {
        // Validation par opérateur - utiliser l'API simple-operator-action
        apiEndpoint = `/api/calendrier/${discipline}/simple-operator-action`
        
        switch (action) {
          case 'operator_validate':
          case 'approve':
            apiAction = 'VALIDATE'
            newState = 'VALIDATED'
            break
          case 'operator_reject':
          case 'reject':
            apiAction = 'CANCEL'
            newState = 'CANCELLED'
            break
          default:
            throw new Error('Action non valide pour la validation opérateur')
        }
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: event.id,
            action: apiAction,
            reason: validationAction.reason || `${action} par l'opérateur`
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Erreur lors de la ${action}`)
        }

        const data = await response.json()
        
        if (onEventUpdate && data.event) {
          onEventUpdate(data.event)
        }

        const messages = {
          operator_validate: 'Modifications validées par l\'opérateur',
          approve: 'Modifications validées par l\'opérateur',
          operator_reject: 'Événement rejeté par l\'opérateur',
          reject: 'Événement rejeté par l\'opérateur'
        }

        alert(messages[action as keyof typeof messages])
        
      } else if (isOwnerValidation) {
        // Validation par owner - utiliser l'API owner-validation
        apiEndpoint = `/api/calendrier/${discipline}/owner-validation`
        
        switch (action) {
          case 'approve':
            apiAction = 'APPROVE_CHANGES'
            newState = 'VALIDATED'
            break
          case 'reject':
            apiAction = 'REJECT_CHANGES'
            newState = 'PENDING' // Retour en attente pour l'opérateur
            break
          case 'modify':
            apiAction = 'OWNER_MODIFY'
            newState = 'PENDING'
            break
          default:
            throw new Error('Action non valide pour la validation owner')
        }

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: event.id,
            action: apiAction,
            reason: validationAction.reason || `${action} par l'owner`,
            modifications: validationAction.modifications,
            targetState: newState
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Erreur lors de la ${action}`)
        }

        const data = await response.json()
        
        if (onEventUpdate && data.event) {
          onEventUpdate(data.event)
        }

        const messages = {
          approve: 'Modifications approuvées avec succès',
          reject: 'Modifications rejetées, renvoyées à l\'opérateur',
          modify: 'Vos modifications ont été appliquées'
        }

        alert(messages[action as keyof typeof messages])
      } else {
        throw new Error('Aucune permission de validation')
      }
      
      if (onClose) {
        onClose()
      }

    } catch (error) {
      console.error(`Erreur lors de la ${action}:`, error)
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const renderChangeHistory = () => {
    if (!lastStateChange) return null

    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          <History fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
          Dernière modification
        </Typography>
        <Typography variant="body2">
          <strong>Date :</strong> {new Date(lastStateChange.date).toLocaleString('fr-FR')}
        </Typography>
        <Typography variant="body2">
          <strong>Par :</strong> {lastStateChange.userId}
        </Typography>
        <Typography variant="body2">
          <strong>Raison :</strong> {lastStateChange.reason}
        </Typography>
        <Typography variant="body2">
          <strong>État :</strong> {lastStateChange.from} → {lastStateChange.to}
        </Typography>
      </Alert>
    )
  }

  const renderSlotCard = (slot: TimeSlot, index: number) => {
    const { date, startTime, endTime } = formatTimeSlot(slot)
    const isRecentlyModified = slot.modifiedBy && slot.modifiedBy.length > 0 &&
      slot.modifiedBy.some(mod => 
        new Date(mod.date).getTime() > Date.now() - 24 * 60 * 60 * 1000
      )
    
    return (
      <Card 
        key={slot.id} 
        variant="outlined" 
        sx={{ 
          mb: 2,
          border: isRecentlyModified ? 2 : 1,
          borderColor: isRecentlyModified ? 'warning.main' : 'divider',
          bgcolor: isRecentlyModified ? 'warning.50' : 'background.paper'
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Typography variant="subtitle1">
                Créneau {index + 1}
                {isRecentlyModified && (
                  <Chip 
                    label="Modifié récemment" 
                    size="small" 
                    color="warning" 
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {date}
              </Typography>
              <Typography variant="body2">
                {startTime} - {endTime}
              </Typography>
              {slot.status && slot.status !== 'active' && (
                <Chip label={slot.status} size="small" sx={{ mt: 0.5 }} />
              )}
              
              {/* Afficher l'historique de modification */}
              {slot.modifiedBy && slot.modifiedBy.length > 0 && (
                <Box mt={1}>
                  <Typography variant="caption" color="text.secondary">
                    Dernière modification : {slot.modifiedBy[slot.modifiedBy.length - 1].note}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Stack spacing={3}>
      {/* Historique des changements */}
      {renderChangeHistory()}

      {/* État actuel de l'événement */}
      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Validation des modifications
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Chip
            label={event.state || 'PENDING'}
            color={event.state === 'PENDING' ? 'warning' : 'default'}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            {displaySlots.length} créneau{displaySlots.length > 1 ? 'x' : ''}
          </Typography>
        </Stack>

        {/* Créneaux avec modifications */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {isOperatorValidation ? 'Modifications en attente de validation opérateur' : 'Créneaux proposés'}
          </Typography>
          {displaySlots.map((slot, index) => renderSlotCard(slot, index))}
        </Box>

        {/* Actions de validation selon le type */}
        {(isOwnerValidation || isOperatorValidation) && event.state === 'PENDING' && (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Gavel fontSize="small" />
              <Typography variant="subtitle1" gutterBottom>
                {isOperatorValidation ? 'Validation opérateur' : 'Validation propriétaire'}
              </Typography>
            </Stack>
            
            <Stack spacing={2}>
              {/* Message d'information */}
              <Alert severity={isOperatorValidation ? 'info' : 'warning'}>
                {isOperatorValidation ? (
                  'En tant qu\'opérateur, vous pouvez valider ou rejeter ces modifications.'
                ) : (
                  'En tant que propriétaire, vous devez valider vos propres modifications avant qu\'elles ne soient effectives.'
                )}
              </Alert>

              {/* Champ raison */}
              <TextField
                label="Commentaire (optionnel)"
                multiline
                rows={2}
                value={validationAction.reason || ''}
                onChange={(e) => setValidationAction(prev => ({
                  ...prev,
                  reason: e.target.value
                }))}
                placeholder="Ajoutez un commentaire sur votre décision..."
                fullWidth
                size="small"
              />
              
              {/* Boutons d'action selon le type de validation */}
              {isOperatorValidation ? (
                <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
                  <Button
                    onClick={() => handleValidationAction('operator_validate')}
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    disabled={loading}
                    fullWidth={isMobile}
                  >
                    {loading ? 'En cours...' : 'Valider les modifications'}
                  </Button>
                  
                  <Button
                    onClick={() => handleValidationAction('operator_reject')}
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    disabled={loading}
                    fullWidth={isMobile}
                  >
                    Rejeter et annuler l'événement
                  </Button>
                </Stack>
              ) : (
                <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
                  <Button
                    onClick={() => handleValidationAction('approve')}
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    disabled={loading}
                    fullWidth={isMobile}
                  >
                    {loading ? 'En cours...' : 'Approuver mes modifications'}
                  </Button>
                  
                  <Button
                    onClick={() => handleValidationAction('reject')}
                    variant="outlined"
                    color="error"
                    startIcon={<Undo />}
                    disabled={loading}
                    fullWidth={isMobile}
                  >
                    Rejeter et renvoyer à l'opérateur
                  </Button>
                  
                  <Button
                    onClick={() => handleValidationAction('modify')}
                    variant="outlined"
                    color="primary"
                    startIcon={<Edit />}
                    disabled={loading}
                    fullWidth={isMobile}
                  >
                    Modifier et renvoyer
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
        )}

        {/* Messages d'erreur */}
        {!canValidate && (
          <Alert severity="info">
            Vous n'avez pas les permissions nécessaires pour valider cet événement.
          </Alert>
        )}

        {canValidate && event.state !== 'PENDING' && (
          <Alert severity="info">
            Cet événement n'est pas en attente de validation.
          </Alert>
        )}

        {canValidate && event.state === 'PENDING' && !isOwnerValidation && !isOperatorValidation && (
          <Alert severity="warning">
            Le type de validation requis ne correspond pas à votre rôle pour cet événement.
          </Alert>
        )}
      </Paper>
    </Stack>
  )
}

export default ValidationSlotActions
