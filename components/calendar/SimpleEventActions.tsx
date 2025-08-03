// components/calendar/SimpleEventActions.tsx
// Version simplifiée des actions d'événements

"use client"

import React, { useState } from 'react'
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, TextField, Box,
  Stack, IconButton, Tooltip, Grid
} from '@mui/material'
import {
  CheckCircle, Cancel, SwapHoriz, CalendarToday, Add, Delete
} from '@mui/icons-material'
import { DatePicker, TimePicker } from '@mui/x-date-pickers'
import { CalendarEvent, EventState } from '@/types/calendar'

interface SimpleEventActionsProps {
  event: CalendarEvent
  canOperate: boolean
  isMobile?: boolean
  onActionComplete?: (updatedEvent: CalendarEvent) => void
}

interface TimeSlotForm {
  date: string
  startTime: string
  endTime: string
}

const SimpleEventActions: React.FC<SimpleEventActionsProps> = ({
  event,
  canOperate,
  isMobile = false,
  onActionComplete
}) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<'VALIDATE' | 'CANCEL' | 'MOVE' | null>(null)
  const [reason, setReason] = useState('')
  const [timeSlots, setTimeSlots] = useState<TimeSlotForm[]>([
    { date: '', startTime: '', endTime: '' }
  ])
  const [loading, setLoading] = useState(false)

  const handleOpenDialog = (action: 'VALIDATE' | 'CANCEL' | 'MOVE') => {
    setSelectedAction(action)
    setDialogOpen(true)
    setReason('')
    
    // Pour l'action MOVE, préremplir avec les créneaux actuels
    if (action === 'MOVE') {
      const currentSlots = getCurrentTimeSlots()
      if (currentSlots.length > 0) {
        setTimeSlots(currentSlots.map(slot => ({
          date: new Date(slot.startDate).toISOString().split('T')[0],
          startTime: new Date(slot.startDate).toTimeString().slice(0, 5),
          endTime: new Date(slot.endDate).toTimeString().slice(0, 5)
        })))
      }
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedAction(null)
    setReason('')
    setTimeSlots([{ date: '', startTime: '', endTime: '' }])
  }

  const getCurrentTimeSlots = () => {
    // Logique simple : utiliser les timeSlots actifs
    return event.timeSlots?.filter(slot => slot.status === 'active') || []
  }

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { date: '', startTime: '', endTime: '' }])
  }

  const removeTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((_, i) => i !== index))
    }
  }

  const updateTimeSlot = (index: number, field: keyof TimeSlotForm, value: string) => {
    const updated = [...timeSlots]
    updated[index][field] = value
    setTimeSlots(updated)
  }

  const handleConfirmAction = async () => {
    if (!selectedAction) return

    setLoading(true)
    try {
      const requestBody: any = {
        eventId: event.id,
        action: selectedAction,
        reason: reason || undefined
      }

      // Pour l'action MOVE, valider et ajouter les créneaux
      if (selectedAction === 'MOVE') {
        const validSlots = timeSlots.filter(slot => 
          slot.date && slot.startTime && slot.endTime
        )
        
        if (validSlots.length === 0) {
          alert('Veuillez saisir au moins un créneau valide')
          setLoading(false)
          return
        }

        requestBody.proposedTimeSlots = validSlots.map(slot => ({
          startDate: `${slot.date}T${slot.startTime}:00.000Z`,
          endDate: `${slot.date}T${slot.endTime}:00.000Z`
        }))
      }

      const response = await fetch('/api/calendrier/chimie/simple-operator-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'action')
      }

      const data = await response.json()
      
      if (onActionComplete && data.event) {
        onActionComplete(data.event)
      }

      alert(data.message || 'Action effectuée avec succès')
      handleCloseDialog()

    } catch (error) {
      console.error('Erreur lors de l\'action:', error)
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const getActionTitle = () => {
    switch (selectedAction) {
      case 'VALIDATE':
        return 'Valider l\'événement'
      case 'CANCEL':
        return 'Annuler l\'événement'
      case 'MOVE':
        return 'Déplacer l\'événement'
      default:
        return 'Action'
    }
  }

  const getActionColor = () => {
    switch (selectedAction) {
      case 'VALIDATE':
        return 'success'
      case 'CANCEL':
        return 'error'
      case 'MOVE':
        return 'primary'
      default:
        return 'primary'
    }
  }

  if (!canOperate) {
    return null
  }

  return (
    <>
      <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
        <Button
          onClick={() => handleOpenDialog('VALIDATE')}
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          size="small"
          disabled={event.state === 'VALIDATED'}
        >
          Valider
        </Button>
        
        <Button
          onClick={() => handleOpenDialog('MOVE')}
          variant="outlined"
          color="primary"
          startIcon={<SwapHoriz />}
          size="small"
        >
          Déplacer
        </Button>
        
        <Button
          onClick={() => handleOpenDialog('CANCEL')}
          variant="outlined"
          color="error"
          startIcon={<Cancel />}
          size="small"
          disabled={event.state === 'CANCELLED'}
        >
          Annuler
        </Button>
      </Stack>

      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {getActionTitle()}
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3}>
            <Typography variant="h6" component="div">
              {event.title}
            </Typography>

            {/* Créneaux actuels */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Créneaux actuels :
              </Typography>
              {getCurrentTimeSlots().map((slot, index) => (
                <Typography key={index} variant="body2" color="text.secondary">
                  {new Date(slot.startDate).toLocaleDateString()} : {' '}
                  {new Date(slot.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {' '}
                  {new Date(slot.endDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              ))}
            </Box>

            {/* Champ raison */}
            <TextField
              label="Raison (optionnel)"
              multiline
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Indiquez la raison ${
                selectedAction === 'VALIDATE' ? 'de la validation' : 
                selectedAction === 'CANCEL' ? 'de l\'annulation' : 
                'du déplacement'
              }...`}
            />

            {/* Créneaux proposés pour MOVE */}
            {selectedAction === 'MOVE' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Nouveaux créneaux proposés :
                </Typography>
                
                {timeSlots.map((slot, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems="center">
                      <DatePicker
                        label="Date"
                        value={slot.date ? new Date(slot.date) : null}
                        onChange={(newValue) => {
                          if (newValue) {
                            updateTimeSlot(index, 'date', newValue.toISOString().split('T')[0])
                          }
                        }}
                        slotProps={{
                          textField: { size: "small", sx: { minWidth: 140 } }
                        }}
                      />
                      
                      <TimePicker
                        label="Début"
                        value={slot.startTime ? new Date(`2000-01-01T${slot.startTime}`) : null}
                        onChange={(newValue) => {
                          if (newValue) {
                            const hours = newValue.getHours().toString().padStart(2, '0')
                            const minutes = newValue.getMinutes().toString().padStart(2, '0')
                            updateTimeSlot(index, 'startTime', `${hours}:${minutes}`)
                          }
                        }}
                        slotProps={{
                          textField: { size: "small", sx: { minWidth: 120 } }
                        }}
                      />
                      
                      <TimePicker
                        label="Fin"
                        value={slot.endTime ? new Date(`2000-01-01T${slot.endTime}`) : null}
                        onChange={(newValue) => {
                          if (newValue) {
                            const hours = newValue.getHours().toString().padStart(2, '0')
                            const minutes = newValue.getMinutes().toString().padStart(2, '0')
                            updateTimeSlot(index, 'endTime', `${hours}:${minutes}`)
                          }
                        }}
                        slotProps={{
                          textField: { size: "small", sx: { minWidth: 120 } }
                        }}
                      />
                      
                      {timeSlots.length > 1 && (
                        <IconButton
                          onClick={() => removeTimeSlot(index)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Stack>
                  </Box>
                ))}
                
                <Button
                  onClick={addTimeSlot}
                  variant="outlined"
                  startIcon={<Add />}
                  size="small"
                >
                  Ajouter un créneau
                </Button>
              </Box>
            )}
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={getActionColor() as any}
            disabled={loading}
          >
            {loading ? 'En cours...' : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default SimpleEventActions
