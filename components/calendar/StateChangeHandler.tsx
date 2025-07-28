// components/calendar/StateChangeHandler.tsx

"use client"

import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Typography, TextField
} from '@mui/material'
import { CalendarEvent, EventState } from '@/types/calendar'
import { CheckCircle, Cancel, SwapHoriz, ManageHistory } from '@mui/icons-material'

interface StateChangeHandlerProps {
  open: boolean
  event: CalendarEvent | null
  action: 'cancel' | 'move' | 'validate' | 'in-progress' | null
  onClose: () => void
  onConfirm: (event: CalendarEvent, newState: EventState, reason?: string) => void
  isMobile?: boolean
}

const StateChangeHandler: React.FC<StateChangeHandlerProps> = ({
  open,
  event,
  action,
  onClose,
  onConfirm,
  isMobile = false
}) => {
  const [reason, setReason] = useState('')

  if (!event || !action) return null

  const getDialogTitle = () => {
    switch (action) {
      case 'cancel': return "Annuler l'événement"
      case 'move': return "Déplacer l'événement"
      case 'validate': return "Valider l'événement"
      case 'in-progress': return "Marquer en préparation"
      default: return "Action non reconnue"
    }
  }

  const getDialogMessage = () => {
    switch (action) {
      case 'cancel': return "Êtes-vous sûr de vouloir annuler cet événement ?"
      case 'move': return "Êtes-vous sûr de vouloir marquer cet événement comme déplacé ?"
      case 'validate': return "Êtes-vous sûr de vouloir valider cet événement ?"
      case 'in-progress': return "Êtes-vous sûr de vouloir marquer cet événement comme étant en préparation ?"
      default: return "Action non reconnue. Veuillez réessayer."
    }
  }

  const getPlaceholder = () => {
    switch (action) {
      case 'cancel': return "Indiquez la raison de l'annulation..."
      case 'move': return "Indiquez la raison du déplacement..."
      case 'validate': return "Indiquez la raison de la validation..."
      case 'in-progress': return "Indiquez la raison de la mise en préparation..."
      default: return "Indiquez une raison..."
    }
  }

  const getNewState = (): EventState => {
    switch (action) {
      case 'cancel': return 'CANCELLED'
      case 'move': return 'MOVED'
      case 'validate': return 'VALIDATED'
      case 'in-progress': return 'IN_PROGRESS'
      default: return 'PENDING'
    }
  }

  const getButtonColor = () => {
    switch (action) {
      case 'cancel': return 'error'
      case 'move': return 'primary'
      case 'validate': return 'success'
      case 'in-progress': return 'info'
      default: return 'warning'
    }
  }

  return (
    <Dialog 
      fullScreen={isMobile}
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{getDialogTitle()}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2">{getDialogMessage()}</Typography>
          <Typography variant="body2" fontWeight="bold">{event.title}</Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Raison (optionnel)"
            fullWidth
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={getPlaceholder()}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={() => {
            onConfirm(event, getNewState(), reason);
          }}
          variant="contained"
          color={getButtonColor()}
        >
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default StateChangeHandler