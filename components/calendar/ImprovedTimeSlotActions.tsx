// components/calendar/ImprovedTimeSlotActions.tsx
// Composant pour la gestion avancée des créneaux individuels

"use client"

import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Stack, Button, Card, CardContent, TextField,
  Divider, Chip, Grid, IconButton, Paper
} from '@mui/material'
import {
  Add, CheckCircle, Cancel, SwapHoriz, Delete, Edit
} from '@mui/icons-material'
import { DatePicker, TimePicker } from '@mui/x-date-pickers'
import { CalendarEvent, TimeSlot } from '@/types/calendar'
import { getDisplayTimeSlots } from '@/lib/calendar-migration-utils'

interface ImprovedTimeSlotActionsProps {
  event: CalendarEvent
  canOperate: boolean
  isMobile?: boolean
  onEventUpdate?: (updatedEvent: CalendarEvent) => void
  discipline?: 'chimie' | 'physique'
  onClose?: () => void
  userRole?: 'owner' | 'operator'
}

interface TimeSlotForm {
  date: string
  startTime: string
  endTime: string
}

interface SlotAction {
  type: 'accept' | 'cancel' | 'move' | 'none'
  reason?: string
  newSlot?: TimeSlotForm
}

const ImprovedTimeSlotActions: React.FC<ImprovedTimeSlotActionsProps> = ({
  event,
  canOperate,
  isMobile = false,
  onEventUpdate,
  discipline = 'chimie',
  onClose,
  userRole = 'operator'
}) => {
  const [slotActions, setSlotActions] = useState<{ [key: string]: SlotAction }>({})
  const [loading, setLoading] = useState(false)

  const displaySlots = getDisplayTimeSlots(event)
  
  // Déterminer l'API à utiliser selon le rôle
  const getApiEndpoint = () => {
    return userRole === 'owner' 
      ? `/api/calendrier/${discipline}/owner-modify`
      : `/api/calendrier/${discipline}/slot-action`
  }

  // Initialiser les actions pour chaque créneau - utiliser event.id pour éviter les loops
  useEffect(() => {
    const currentSlots = getDisplayTimeSlots(event)
    const initialActions: { [key: string]: SlotAction } = {}
    currentSlots.forEach(slot => {
      initialActions[slot.id] = { type: 'none' }
    })
    setSlotActions(initialActions)
  }, [event.id, event.timeSlots]) // Dépendre des champs stables

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

  const updateSlotAction = (slotId: string, action: SlotAction) => {
    setSlotActions(prev => ({
      ...prev,
      [slotId]: action
    }))
  }

  const handleApplyActions = async () => {
    try {
      setLoading(true)
      
      // Grouper les actions par type
      const acceptedSlots: string[] = []
      const cancelledSlots: string[] = []
      const movedSlots: { oldSlotId: string, newSlot: TimeSlotForm, reason: string }[] = []
      
      Object.entries(slotActions).forEach(([slotId, action]) => {
        switch (action.type) {
          case 'accept':
            acceptedSlots.push(slotId)
            break
          case 'cancel':
            cancelledSlots.push(slotId)
            break
          case 'move':
            if (action.newSlot) {
              movedSlots.push({
                oldSlotId: slotId,
                newSlot: action.newSlot,
                reason: action.reason || 'Créneau déplacé par l\'opérateur'
              })
            }
            break
        }
      })

      // Exécuter les actions individuellement
      for (const slotId of acceptedSlots) {
        await executeSlotAction(slotId, 'VALIDATE', 'Créneau accepté par l\'opérateur')
      }
      
      for (const slotId of cancelledSlots) {
        const action = slotActions[slotId]
        await executeSlotAction(slotId, 'CANCEL', action.reason || 'Créneau annulé par l\'opérateur')
      }
      
      for (const moveAction of movedSlots) {
        await executeSlotAction(
          moveAction.oldSlotId, 
          'MOVE', 
          moveAction.reason,
          [moveAction.newSlot]
        )
      }

      alert('Actions appliquées avec succès')
      
      if (onClose) {
        onClose()
      }

    } catch (error) {
      console.error('Erreur lors de l\'application des actions:', error)
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const executeSlotAction = async (
    slotId: string, 
    action: 'VALIDATE' | 'CANCEL' | 'MOVE', 
    reason: string,
    proposedTimeSlots?: TimeSlotForm[]
  ) => {
    const body: any = {
      eventId: event.id,
      action,
      reason,
      slotId
    }

    if (proposedTimeSlots) {
      body.proposedTimeSlots = proposedTimeSlots.map(slot => ({
        startDate: `${slot.date}T${slot.startTime}:00.000Z`,
        endDate: `${slot.date}T${slot.endTime}:00.000Z`
      }))
    }

    const response = await fetch(getApiEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Erreur lors de l'action ${action}`)
    }

    const data = await response.json()
    
    if (onEventUpdate && data.event) {
      onEventUpdate(data.event)
    }

    return data
  }

  const renderSlotCard = (slot: TimeSlot, index: number, isProposal: boolean = false) => {
    const { date, startTime, endTime } = formatTimeSlot(slot)
    const action = slotActions[slot.id] || { type: 'none' }
    
    return (
      <Card 
        key={slot.id} 
        variant="outlined" 
        sx={{ 
          mb: 2,
          border: action.type !== 'none' ? 2 : 1,
          borderColor: action.type === 'accept' ? 'success.main' :
                      action.type === 'cancel' ? 'error.main' :
                      action.type === 'move' ? 'warning.main' : 'divider'
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Typography variant="subtitle1">
                Créneau {index + 1}
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
            </Box>
            
            {canOperate && !isProposal && (
              <Stack direction="row" spacing={1}>
                <IconButton
                  size="small"
                  color={action.type === 'accept' ? 'success' : 'default'}
                  onClick={(e) => {
                    e.stopPropagation()
                    updateSlotAction(slot.id, { type: action.type === 'accept' ? 'none' : 'accept' })
                  }}
                  title="Accepter ce créneau"
                >
                  <CheckCircle />
                </IconButton>
                <IconButton
                  size="small"
                  color={action.type === 'cancel' ? 'error' : 'default'}
                  onClick={(e) => {
                    e.stopPropagation()
                    updateSlotAction(slot.id, { type: action.type === 'cancel' ? 'none' : 'cancel' })
                  }}
                  title="Annuler ce créneau"
                >
                  <Cancel />
                </IconButton>
                <IconButton
                  size="small"
                  color={action.type === 'move' ? 'warning' : 'default'}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (action.type === 'move') {
                      updateSlotAction(slot.id, { type: 'none' })
                    } else {
                      const startDate = new Date(slot.startDate)
                      updateSlotAction(slot.id, {
                        type: 'move',
                        newSlot: {
                          date: formatDateForInput(startDate),
                          startTime: formatTimeForInput(startDate),
                          endTime: formatTimeForInput(new Date(slot.endDate))
                        }
                      })
                    }
                  }}
                  title="Déplacer ce créneau"
                >
                  <SwapHoriz />
                </IconButton>
              </Stack>
            )}
          </Box>
          
          {/* Formulaire de déplacement si action = move */}
          {action.type === 'move' && action.newSlot && (
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>
                Nouveau créneau proposé
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Date"
                  type="date"
                  value={action.newSlot.date}
                  onChange={(e) => updateSlotAction(slot.id, {
                    ...action,
                    newSlot: { ...action.newSlot!, date: e.target.value }
                  })}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Heure début"
                    type="time"
                    value={action.newSlot.startTime}
                    onChange={(e) => updateSlotAction(slot.id, {
                      ...action,
                      newSlot: { ...action.newSlot!, startTime: e.target.value }
                    })}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Heure fin"
                    type="time"
                    value={action.newSlot.endTime}
                    onChange={(e) => updateSlotAction(slot.id, {
                      ...action,
                      newSlot: { ...action.newSlot!, endTime: e.target.value }
                    })}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              </Stack>
            </Box>
          )}
          
          {/* Champ raison pour cancel */}
          {action.type === 'cancel' && (
            <TextField
              label="Raison de l'annulation"
              multiline
              rows={2}
              value={action.reason || ''}
              onChange={(e) => updateSlotAction(slot.id, {
                ...action,
                reason: e.target.value
              })}
              placeholder="Expliquez pourquoi vous annulez ce créneau..."
              fullWidth
              size="small"
              sx={{ mt: 2 }}
            />
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={3}>
      {/* Colonne gauche : Créneaux actuels */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Créneaux actuels
          </Typography>
          
          {displaySlots.map((slot, index) => renderSlotCard(slot, index, false))}
        </Paper>
      </Grid>

      {/* Colonne droite : Actions proposées */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Actions proposées
          </Typography>
          
          {canOperate ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Sélectionnez les actions à effectuer sur chaque créneau :
                • ✓ Accepter • ✗ Annuler • ↔ Déplacer
              </Typography>
              
              {Object.keys(slotActions).length > 0 && 
               Object.values(slotActions).some(action => action.type !== 'none') && (
                <Button
                  onClick={handleApplyActions}
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  fullWidth
                  startIcon={<CheckCircle />}
                >
                  {loading ? 'Application en cours...' : 'Appliquer les actions'}
                </Button>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Vous n'avez pas les permissions nécessaires pour modifier les créneaux.
            </Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  )
}

export default ImprovedTimeSlotActions
