// components/calendar/EventActions.tsx

"use client"

import React, { useState } from 'react'
import {
  Button, IconButton, Tooltip, Stack, Grid, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Typography, TextField, Box,
  Stepper, Step, StepLabel, StepContent, Divider
} from '@mui/material'
import {
  Visibility, Edit, Delete, CheckCircle, Cancel, SwapHoriz, ManageHistory,
  MoreVert, CalendarToday, Add, Schedule, SkipNext, CheckCircleOutline
} from '@mui/icons-material'
import { CalendarEvent, EventState } from '@/types/calendar'
import { DatePicker, TimePicker } from '@mui/x-date-pickers'

interface TimeSlotFormData {
  id: string
  date: string
  startTime: string
  endTime: string
  userIDAdding: string
  createdBy: string
  modifiedBy: Array<{
    userId: string
    date: string
    action: 'created' | 'modified' | 'deleted'
  }>
}

interface EventActionsProps {
  event: CalendarEvent
  canEdit: boolean
  canValidate: boolean
  isCreator?: boolean // Nouveau : indique si l'utilisateur actuel est le créateur
  isMobile?: boolean
  isTablet?: boolean
  onViewDetails?: (event: CalendarEvent) => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
  onStateChange?: (event: CalendarEvent, newState: EventState, reason?: string, timeSlots?: any[]) => void
  onMoveDate?: (event: CalendarEvent, timeSlots: any[], reason?: string, state?: EventState) => void // Nouvelle prop pour gérer les déplacements avec timeSlots
  onConfirmModification?: (event: CalendarEvent, modificationId: string, action: 'confirm' | 'reject') => void // Nouveau
  onApproveTimeSlotChanges?: (event: CalendarEvent) => void // NOUVEAU: approuver les créneaux proposés
  onRejectTimeSlotChanges?: (event: CalendarEvent) => void // NOUVEAU: rejeter les créneaux proposés
  showAsMenu?: boolean // Si true, affiche sous forme de menu déroulant
  anchorEl?: HTMLElement | null // Pour le menu déroulant
  setAnchorEl?: (el: HTMLElement | null) => void // Pour gérer l'ouverture/fermeture du menu
}

const EventActions: React.FC<EventActionsProps> = ({
  event,
  canEdit,
  canValidate,
  isCreator = false,
  isMobile = false,
  isTablet = false,
  onViewDetails,
  onEdit,
  onDelete,
  onStateChange,
  onMoveDate,
  onConfirmModification,
  onApproveTimeSlotChanges,
  onRejectTimeSlotChanges,
  showAsMenu = false,
  anchorEl,
  setAnchorEl
}) => {
  // NOUVEAU: Fonction pour détecter s'il y a des changements en attente
  const hasPendingChanges = (event: CalendarEvent) => {
    if (!event.actuelTimeSlots || !event.timeSlots) return false
    
    // Comparer les créneaux actuels avec les créneaux proposés
    if (event.actuelTimeSlots.length !== event.timeSlots.length) return true
    
    return event.actuelTimeSlots.some((actual, index) => {
      const proposed = event.timeSlots[index]
      if (!proposed) return true
      
      return (
        actual.startDate !== proposed.startDate ||
        actual.endDate !== proposed.endDate ||
        actual.id !== proposed.id
      )
    })
  }

  const [unifiedDialog, setUnifiedDialog] = useState<{
    open: boolean
    action: 'cancel' | 'move' | 'validate' | 'in-progress' | null
    step: 'confirmation' | 'timeSlots'
  }>({ open: false, action: null, step: 'confirmation' })
  const [validationReason, setValidationReason] = useState('')
  const [stateChangeCompleted, setStateChangeCompleted] = useState(false)
  const [formData, setFormData] = useState<{
    timeSlots: TimeSlotFormData[]
    slotStates: { [key: number]: 'initial' | 'replaced' | 'kept' }
  }>({
    timeSlots: [{ 
      id: `TS_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`, 
      date: '', 
      startTime: '', 
      endTime: '', 
      userIDAdding: 'INDISPONIBLE',
      createdBy: '',
      modifiedBy: []
    }],
    slotStates: {}
  })
  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null)

  // Gestion des créneaux horaires avec traçabilité
  const addTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [...formData.timeSlots, { 
        id: `TS_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`, 
        date: '', 
        startTime: '', 
        endTime: '', 
        userIDAdding: 'INDISPONIBLE',
        createdBy: '',
        modifiedBy: [{
          userId: 'INDISPONIBLE',
          date: new Date().toISOString(),
          action: 'created'
        }]
      }]
    })
  }
  const performTimeSwap = (index: number) => {
    setAnimatingSlot(index)
    const updatedSlots = [...formData.timeSlots]
    const slot = updatedSlots[index]
    const temp = slot.startTime
    slot.startTime = slot.endTime
    slot.endTime = temp
    
    // Ajouter une entrée de modification pour le swap
    slot.modifiedBy = [
      ...slot.modifiedBy,
      {
        userId: 'INDISPONIBLE',
        date: new Date().toISOString(),
        action: 'modified' as const
      }
    ]
    
    setFormData({ ...formData, timeSlots: updatedSlots })
    setTimeout(() => setAnimatingSlot(null), 1000)
  }

  const updateTimeSlot = (index: number, field: 'date' | 'startTime' | 'endTime', value: string, checkSwap: boolean = true) => {
    const updatedSlots = [...formData.timeSlots]
    updatedSlots[index][field] = value
    
    // Ajouter une entrée de modification avec traçabilité
    updatedSlots[index].modifiedBy = [
      ...updatedSlots[index].modifiedBy,
      {
        userId: 'INDISPONIBLE',
        date: new Date().toISOString(),
        action: 'modified' as const
      }
    ]
    
    setFormData({ ...formData, timeSlots: updatedSlots })

    if (checkSwap && field !== 'date') {
      const slot = updatedSlots[index]
      if (slot.startTime && slot.endTime) {
        const start = new Date(`2000-01-01T${slot.startTime}`)
        const end = new Date(`2000-01-01T${slot.endTime}`)
        if (end < start) {
          performTimeSwap(index)
        }
      }
    }
  }

  // NOUVEAU: Fonctions pour gérer les créneaux actuels
  const handleReplaceSlot = (index: number) => {
    const updatedStates = { ...formData.slotStates }
    updatedStates[index] = 'replaced'
    
    const updatedSlots = [...formData.timeSlots]
    updatedSlots[index] = {
      id: `TS_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
      date: '',
      startTime: '',
      endTime: '',
      userIDAdding: 'INDISPONIBLE',
      createdBy: '',
      modifiedBy: [{
        userId: 'INDISPONIBLE',
        date: new Date().toISOString(),
        action: 'created'
      }]
    }
    
    setFormData({ timeSlots: updatedSlots, slotStates: updatedStates })
  }

  const handleKeepSlot = (index: number, currentSlot: any) => {
    const updatedStates = { ...formData.slotStates }
    updatedStates[index] = 'kept'
    
    const updatedSlots = [...formData.timeSlots]
    updatedSlots[index] = {
      id: currentSlot.id,
      date: new Date(currentSlot.startDate).toISOString().split('T')[0],
      startTime: new Date(currentSlot.startDate).toTimeString().slice(0, 5),
      endTime: new Date(currentSlot.endDate).toTimeString().slice(0, 5),
      userIDAdding: currentSlot.createdBy || 'INDISPONIBLE',
      createdBy: currentSlot.createdBy || '',
      modifiedBy: currentSlot.modifiedBy || []
    }
    
    setFormData({ timeSlots: updatedSlots, slotStates: updatedStates })
  }

  const handleRemoveSlot = (index: number) => {
    const updatedSlots = formData.timeSlots.filter((_, i) => i !== index)
    const updatedStates = { ...formData.slotStates }
    delete updatedStates[index]
    
    // Réindexer les états
    const newStates: { [key: number]: 'initial' | 'replaced' | 'kept' } = {}
    Object.keys(updatedStates).forEach(key => {
      const numKey = parseInt(key)
      if (numKey > index) {
        newStates[numKey - 1] = updatedStates[numKey]
      } else if (numKey < index) {
        newStates[numKey] = updatedStates[numKey]
      }
    })
    
    setFormData({ timeSlots: updatedSlots, slotStates: newStates })
  }

  // Initialiser les créneaux avec les créneaux actuels de l'événement
  const initializeWithCurrentSlots = () => {
    const currentSlots = event.actuelTimeSlots || event.timeSlots?.filter((slot: any) => slot.status === 'active') || []
    const initialSlots = currentSlots.map((slot: any) => ({
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
      date: '',
      startTime: '',
      endTime: '',
      userIDAdding: 'INDISPONIBLE',
      createdBy: '',
      modifiedBy: []
    }))
    
    const initialStates: { [key: number]: 'initial' | 'replaced' | 'kept' } = {}
    currentSlots.forEach((_: any, index: number) => {
      initialStates[index] = 'initial'
    })
    
    setFormData({ 
      timeSlots: initialSlots.length > 0 ? initialSlots : formData.timeSlots, 
      slotStates: initialStates 
    })
  }



  // Gestion des actions de changement d'état
  const handleStateChange = (newState: EventState, reason?: string) => {
    if (onStateChange) {
      onStateChange(event, newState, reason)
      setStateChangeCompleted(true)
    }
  }

  const openUnifiedDialog = (action: 'cancel' | 'move' | 'validate' | 'in-progress') => {
    setUnifiedDialog({ open: true, action, step: 'confirmation' })
    setStateChangeCompleted(false)
    
    // Initialiser avec les créneaux actuels si on va gérer les créneaux
    if (action === 'move' || action === 'validate') {
      initializeWithCurrentSlots()
    }
  }

  const handleConfirmStateChange = () => {
    if (unifiedDialog.action) {
      let newState: EventState;
      switch (unifiedDialog.action) {
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
          return;
      }
      handleStateChange(newState, validationReason);
    }
  }

  const handleProceedToTimeSlots = () => {
    setUnifiedDialog(prev => ({ ...prev, step: 'timeSlots' }))
  }

  const handleFinishDialog = () => {
    setUnifiedDialog({ open: false, action: null, step: 'confirmation' })
    setValidationReason('')
    setStateChangeCompleted(false)
    setFormData({ 
      timeSlots: [{ 
        id: `TS_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`, 
        date: '', 
        startTime: '', 
        endTime: '', 
        userIDAdding: 'INDISPONIBLE',
        createdBy: '',
        modifiedBy: []
      }],
      slotStates: {}
    })
  }

  const handleConfirmTimeSlots = () => {
    if (onMoveDate && formData.timeSlots.length > 0) {
      // Si c'est le propriétaire qui modifie les dates, changer l'état vers PENDING
      const newState = isCreator ? 'PENDING' : 'MOVED';
      onMoveDate(event, formData.timeSlots, validationReason, newState);
    }
    handleFinishDialog();
  }

  // Fonction pour gérer la confirmation/rejet des modifications
  const handleConfirmModification = (modificationId: string, action: 'confirm' | 'reject') => {
    if (onConfirmModification) {
      onConfirmModification(event, modificationId, action)
    }
  }

  // Boutons d'action sous forme de menu déroulant ou directement affichés
  const menuItems: React.ReactNode[] = []

  if (onViewDetails) {
    menuItems.push(
      <MenuItem 
        key="view-details"
        onClick={() => {
          onViewDetails(event)
          if (setAnchorEl) setAnchorEl(null)
        }}
      >
        <ListItemIcon>
          <Visibility fontSize="small" color="primary" />
        </ListItemIcon>
        <ListItemText>Voir détails</ListItemText>
      </MenuItem>
    )
  }

  if (canEdit && onEdit) {
    menuItems.push(
      <MenuItem 
        key="edit"
        onClick={() => {
          onEdit(event)
          if (setAnchorEl) setAnchorEl(null)
        }}
      >
        <ListItemIcon>
          <Edit fontSize="small" />
        </ListItemIcon>
        <ListItemText>Modifier</ListItemText>
      </MenuItem>
    )
  }
  
  if (canEdit && onDelete) {
    menuItems.push(
      <MenuItem 
        key="delete"
        onClick={() => {
          onDelete(event)
          if (setAnchorEl) setAnchorEl(null)
        }}
      >
        <ListItemIcon>
          <Delete fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText>Supprimer</ListItemText>
      </MenuItem>
    )
  }
  
  if (canValidate) {
    menuItems.push(
      <MenuItem 
        key="validate"
        onClick={() => {
          openUnifiedDialog('validate')
          if (setAnchorEl) setAnchorEl(null)
        }}
        disabled={event.state === 'VALIDATED'}
      >
        <ListItemIcon>
          <CheckCircle fontSize="small" color="success" />
        </ListItemIcon>
        <ListItemText>Valider</ListItemText>
      </MenuItem>,
      
      <MenuItem 
        key="move"
        onClick={() => {
          openUnifiedDialog('move')
          if (setAnchorEl) setAnchorEl(null)
        }}
        disabled={event.state === 'MOVED'}
      >
        <ListItemIcon>
          <SwapHoriz fontSize="small" color="primary" />
        </ListItemIcon>
        <ListItemText>Déplacer</ListItemText>
      </MenuItem>,

      <MenuItem 
        key="in-progress"
        onClick={() => {
          openUnifiedDialog('in-progress')
          if (setAnchorEl) setAnchorEl(null)
        }}
        disabled={event.state === 'IN_PROGRESS'}
      >
        <ListItemIcon>
          <ManageHistory fontSize="small" color="info" />
        </ListItemIcon>
        <ListItemText>En préparation</ListItemText>
      </MenuItem>,

      <MenuItem 
        key="cancel"
        onClick={() => {
          openUnifiedDialog('cancel')
          if (setAnchorEl) setAnchorEl(null)
        }}
        disabled={event.state === 'CANCELLED'}
      >
        <ListItemIcon>
          <Cancel fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText>Annuler</ListItemText>
      </MenuItem>
    )
    
    if (event.state === 'CANCELLED') {
      menuItems.push(
        <MenuItem 
          key="propose-new-date"
          onClick={() => {
            openUnifiedDialog('move')
            if (setAnchorEl) setAnchorEl(null)
          }}
        >
          <ListItemIcon>
            <CalendarToday fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>Proposer une nouvelle date</ListItemText>
        </MenuItem>
      )
    }
  }

  // Si showAsMenu est true, afficher sous forme de menu déroulant
  if (showAsMenu) {
    return (
      <>
        <Tooltip title="Plus d'actions">
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl && setAnchorEl(e.currentTarget)}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl && setAnchorEl(null)}
        >
          {menuItems}
        </Menu>

        {/* Dialogue unifié pour changement d'état et proposition de créneaux */}
        <Dialog 
          fullScreen={isMobile}
          open={unifiedDialog.open} 
          onClose={handleFinishDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {unifiedDialog.action === 'cancel' ? 'Annuler l\'événement' : 
             unifiedDialog.action === 'move' ? 'Déplacer l\'événement' :
             unifiedDialog.action === 'validate' ? 'Valider l\'événement' :
             unifiedDialog.action === 'in-progress' ? 'Marquer en préparation' : 
             'Action sur l\'événement'
            }
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3}>
              <Typography variant="h6" component="div" fontWeight="bold">
                {event.title}
              </Typography>
              
              <Stepper activeStep={unifiedDialog.step === 'confirmation' ? 0 : 1} orientation="vertical">
                <Step>
                  <StepLabel 
                    icon={stateChangeCompleted ? <CheckCircleOutline color="success" /> : <Schedule />}
                  >
                    {unifiedDialog.action === 'cancel' ? 'Confirmer l\'annulation' : 
                     unifiedDialog.action === 'move' ? 'Confirmer le déplacement' :
                     unifiedDialog.action === 'validate' ? 'Confirmer la validation' :
                     unifiedDialog.action === 'in-progress' ? 'Confirmer la mise en préparation' : 
                     'Confirmer l\'action'
                    }
                  </StepLabel>
                  <StepContent>
                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">
                        {unifiedDialog.action === 'cancel' 
                          ? 'Confirmez-vous l\'annulation de cet événement ?'
                          : unifiedDialog.action === 'move' 
                            ? 'Confirmez-vous le déplacement de cet événement ?'
                            : unifiedDialog.action === 'validate'
                              ? 'Confirmez-vous la validation de cet événement ?'
                              : unifiedDialog.action === 'in-progress'
                                ? 'Confirmez-vous la mise en préparation de cet événement ?'
                                : 'Confirmez-vous cette action ?'}
                      </Typography>
                      
                      {!stateChangeCompleted && (
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
                            unifiedDialog.action === 'cancel' 
                              ? 'Indiquez la raison de l\'annulation...'
                              : unifiedDialog.action === 'move' 
                                ? 'Indiquez la raison du déplacement...'
                                : unifiedDialog.action === 'validate'
                                  ? 'Indiquez la raison de la validation...'
                                  : unifiedDialog.action === 'in-progress'
                                    ? 'Indiquez la raison de la mise en préparation...'
                                    : 'Indiquez une raison...'
                          }
                        />
                      )}
                      
                      {!stateChangeCompleted ? (
                        <Box sx={{ mb: 2 }}>
                          <Button
                            variant="contained"
                            onClick={handleConfirmStateChange}
                            sx={{ mt: 1, mr: 1 }}
                            color={
                              unifiedDialog.action === 'cancel' 
                                ? 'error' 
                                : unifiedDialog.action === 'move'
                                  ? 'primary'
                                  : unifiedDialog.action === 'validate'
                                    ? 'success'
                                    : unifiedDialog.action === 'in-progress'
                                      ? 'info'
                                      : 'primary'
                            }
                          >
                            Confirmer l'action
                          </Button>
                          <Button onClick={handleFinishDialog} sx={{ mt: 1, mr: 1 }}>
                            Annuler
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircleOutline fontSize="small" />
                            Action confirmée avec succès
                          </Typography>
                          {(unifiedDialog.action === 'cancel' || unifiedDialog.action === 'move') && (
                            <Button
                              variant="outlined"
                              onClick={handleProceedToTimeSlots}
                              sx={{ mt: 2, mr: 1 }}
                              startIcon={<CalendarToday />}
                            >
                              Proposer de nouveaux créneaux
                            </Button>
                          )}
                          <Button onClick={handleFinishDialog} sx={{ mt: 2, mr: 1 }}>
                            Terminer
                          </Button>
                        </Box>
                      )}
                    </Stack>
                  </StepContent>
                </Step>
                
                {(unifiedDialog.action === 'cancel' || unifiedDialog.action === 'move') && (
                  <Step>
                    <StepLabel icon={<CalendarToday />}>
                      Proposer de nouveaux créneaux (optionnel)
                    </StepLabel>
                    <StepContent>
                      <Stack spacing={2}>
                        <Typography variant="body2" color="text.secondary">
                          Sélectionnez les nouveaux créneaux horaires pour cet événement.
                        </Typography>
                        
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Créneaux horaires
                          </Typography>
                          <Button
                            startIcon={<Add />}
                            onClick={addTimeSlot}
                            variant="outlined"
                            size="small"
                          >
                            Ajouter un créneau
                          </Button>
                        </Box>
                        
                        {formData.timeSlots.map((slot, index) => {
                          const currentSlots = event.actuelTimeSlots || event.timeSlots?.filter((s: any) => s.status === 'active') || []
                          const currentSlot = currentSlots[index]
                          const slotState = formData.slotStates[index] || 'initial'
                          
                          return (
                            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                              {/* Affichage du créneau actuel si disponible */}
                              {currentSlot && slotState === 'initial' && (
                                <Box sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Créneau actuel :
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    {new Date(currentSlot.startDate).toLocaleDateString()} de {' '}
                                    {new Date(currentSlot.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} à {' '}
                                    {new Date(currentSlot.endDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      onClick={() => handleKeepSlot(index, currentSlot)}
                                    >
                                      Conserver
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="warning"
                                      onClick={() => handleReplaceSlot(index)}
                                    >
                                      Remplacer
                                    </Button>
                                  </Box>
                                </Box>
                              )}
                              
                              {/* Affichage du statut du créneau */}
                              {slotState !== 'initial' && (
                                <Box sx={{ mb: 2, p: 1, bgcolor: slotState === 'kept' ? '#e8f5e8' : '#fff3e0', borderRadius: 1 }}>
                                  <Typography variant="caption" color={slotState === 'kept' ? 'success.main' : 'warning.main'}>
                                    {slotState === 'kept' ? '✓ Créneau conservé' : '⚡ Créneau remplacé'}
                                  </Typography>
                                </Box>
                              )}
                              
                              {/* Formulaire de modification/création de créneau */}
                              {(slotState === 'replaced' || !currentSlot) && (
                                <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                                  <DatePicker
                                    label="Date du TP"
                                    value={slot.date ? new Date(slot.date) : null}
                                    onChange={(newValue) => {
                                      if (newValue) {
                                        updateTimeSlot(index, 'date', newValue.toISOString().split('T')[0])
                                      }
                                    }}
                                    slotProps={{
                                      textField: { 
                                        size: "small",
                                        sx: { minWidth: { xs: '100%', sm: 200 } },
                                        onClick: (e: any) => {
                                          if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                                            const button = e.currentTarget.querySelector('button')
                                            if (button) button.click()
                                          }
                                        }
                                      }
                                    }}
                                  />
                                  <Box 
                                    sx={{
                                      display: 'flex', 
                                      gap: 2, 
                                      alignItems: 'center',
                                      flexDirection: isMobile ? 'column' : 'row',
                                    }}
                                  >
                                    <TimePicker
                                      label="Début"
                                      value={slot.startTime ? new Date(`2000-01-01T${slot.startTime}`) : null}
                                      onChange={(newValue) => {
                                        if (newValue) {
                                          const hours = newValue.getHours().toString().padStart(2, '0')
                                          const minutes = newValue.getMinutes().toString().padStart(2, '0')
                                          updateTimeSlot(index, 'startTime', `${hours}:${minutes}`, !isMobile)
                                        }
                                      }}
                                      slotProps={{
                                        textField: { 
                                          size: "small",
                                          sx: { 
                                            minWidth: { xs: '48%', sm: 120 },
                                            transition: 'all 0.3s ease'
                                          },
                                          onClick: (e: any) => {
                                            if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                                              const button = e.currentTarget.querySelector('button')
                                              if (button) button.click()
                                            }
                                          }
                                        }
                                      }}
                                    />

                                    <TimePicker
                                      label="Fin"
                                      value={slot.endTime ? new Date(`2000-01-01T${slot.endTime}`) : null}
                                      onChange={(newValue) => {
                                        if (newValue) {
                                          const hours = newValue.getHours().toString().padStart(2, '0')
                                          const minutes = newValue.getMinutes().toString().padStart(2, '0')
                                          updateTimeSlot(index, 'endTime', `${hours}:${minutes}`, !isMobile)
                                        }
                                      }}
                                      slotProps={{
                                        textField: { 
                                          size: "small",
                                          sx: { 
                                            minWidth: { xs: '48%', sm: 120 },
                                            transition: 'all 0.3s ease'
                                          },
                                          onClick: (e: any) => {
                                            if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                                              const button = e.currentTarget.querySelector('button')
                                              if (button) button.click()
                                            }
                                          }
                                        }
                                      }}
                                    />
                                    {animatingSlot === index && (
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          top: '50%',
                                          left: '50%',
                                          transform: 'translate(-50%, -50%)',
                                          animation: 'swapRotate 1s ease-in-out',
                                          '@keyframes swapRotate': {
                                            '0%': {
                                              transform: 'translate(-50%, -50%) rotate(0deg) scale(1)',
                                              opacity: 0,
                                            },
                                            '20%': {
                                              transform: 'translate(-50%, -50%) rotate(0deg) scale(1.5)',
                                              opacity: 1,
                                            },
                                            '80%': {
                                              transform: 'translate(-50%, -50%) rotate(180deg) scale(1.5)',
                                              opacity: 1,
                                            },
                                            '100%': {
                                              transform: 'translate(-50%, -50%) rotate(180deg) scale(1)',
                                              opacity: 0,
                                            },
                                          },
                                        }}
                                      >
                                        <SwapHoriz sx={{ fontSize: 48, color: 'rgba(255, 193, 7, 0.56)' }} />
                                      </Box>
                                    )}                              
                                  </Box>
                                  
                                  {/* Bouton de suppression pour les créneaux remplacés */}
                                  <Button
                                    onClick={() => handleRemoveSlot(index)}
                                    color="error"
                                    size="small"
                                    startIcon={<Delete />}
                                  >
                                    Supprimer
                                  </Button>
                                </Box>
                              )}
                            </Box>
                          )
                        })}
                        
                        <Box sx={{ mb: 2 }}>
                          <Button
                            variant="contained"
                            onClick={handleConfirmTimeSlots}
                            sx={{ mt: 1, mr: 1 }}
                            color="primary"
                            disabled={formData.timeSlots.length === 0 || formData.timeSlots.some(slot => !slot.date || !slot.startTime || !slot.endTime)}
                          >
                            Confirmer les créneaux
                          </Button>
                          <Button onClick={handleFinishDialog} sx={{ mt: 1, mr: 1 }}>
                            Terminer sans créneaux
                          </Button>
                        </Box>
                      </Stack>
                    </StepContent>
                  </Step>
                )}
              </Stepper>
            </Stack>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Sinon, afficher sous forme de boutons directs (par exemple dans EventDetailsDialog)
  return (
    <>
      {canValidate && (
        <Grid
          container 
          spacing={1}
          sx={{
            maxWidth: isMobile || isTablet ? 200 : 400,
            width: isMobile || isTablet ? 200 : 'auto',
            margin: isMobile ? '0 auto' : '0 0',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              onClick={() => openUnifiedDialog('in-progress')}
              variant="outlined"
              color="primary"
              startIcon={<ManageHistory />}
              fullWidth
              disabled={event.state === 'IN_PROGRESS'}
            >
              En préparation
            </Button>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              onClick={() => openUnifiedDialog('move')}
              variant="outlined"
              startIcon={<SwapHoriz />}
              fullWidth
              disabled={event.state === 'MOVED'}
            >
              Déplacer TP
            </Button>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              onClick={() => openUnifiedDialog('cancel')}
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              fullWidth
              disabled={event.state === 'CANCELLED'}
            >
              Annuler TP
            </Button>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              onClick={() => openUnifiedDialog('validate')}
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              fullWidth
              disabled={event.state === 'VALIDATED'}
            >
              Valider TP
            </Button>
          </Grid>
        </Grid>
      )}

      {event.state === 'CANCELLED' && canValidate && (
        <Button
          onClick={() => openUnifiedDialog('move')}
          variant="contained"
          color="primary"
          startIcon={<CalendarToday />}
        >
          Proposer une nouvelle date
        </Button>
      )}

      <Grid
        container 
        spacing={1}
        sx={{
          maxWidth: 200,
          width: isMobile || isTablet ? 200 : 'auto',
          margin: isMobile ? '0 auto' : '0 0',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'column',
          justifyContent: isMobile || isTablet ? 'center' : 'flex-end',
        }}
      >
        <Grid size={{ xs: 12, sm: 12 }}>
          {canEdit && onEdit && (
            <Button 
              onClick={() => onEdit(event)}
              variant="outlined"
              startIcon={<Edit />}
              fullWidth
            >
              Modifier
            </Button>
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 12 }}>
          {canEdit && onDelete && (
            <Button 
              onClick={() => onDelete(event)}
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              fullWidth
            >
              Supprimer
            </Button>
          )}
        </Grid>
      </Grid>

      </>
    )
  }
export default EventActions