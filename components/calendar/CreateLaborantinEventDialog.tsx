// components/calendar/CreateLaborantinEventDialog.tsx
import React, { useState, useMemo } from 'react'
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, IconButton,
  Stepper, Step, StepLabel, StepContent, Button, TextField,
  Card, Autocomplete, useMediaQuery, useTheme, Switch,
  FormControlLabel, Alert, Collapse
} from '@mui/material'
import { 
  Add, Close, Build, Inventory, EventNote, Save, Warning 
} from '@mui/icons-material'
import { DatePicker, TimePicker } from '@mui/x-date-pickers'
import { isBefore, isAfter, startOfDay, endOfDay } from 'date-fns'
import { createSimpleEvent } from '@/lib/event-creation-utils'
import type { EventType } from '@/types/calendar'

type LaborantinEventType = 'MAINTENANCE' | 'INVENTAIRE' | 'AUTRE'

interface CreateLaborantinEventDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  materials: any[]
  isMobile?: boolean
  discipline?: 'chimie' | 'physique' // NOUVEAU: discipline pour déterminer l'API à utiliser
}

export function CreateLaborantinEventDialog({
  open,
  onClose,
  onSuccess,
  materials,
  isMobile,
  discipline = 'chimie' // Par défaut chimie pour la compatibilité
}: CreateLaborantinEventDialogProps) {
  const theme = useTheme()

  
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [laborantinEventType, setLaborantinEventType] = useState<LaborantinEventType | null>(null)
  const [isMultiDay, setIsMultiDay] = useState(false)
  
  const [formData, setFormData] = useState({
    type: '' as LaborantinEventType | '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    location: '',
    equipment: [] as any[],
    notes: ''
  })

  // Vérifier si l'événement est en dehors des heures d'ouverture
const isOutsideBusinessHours = useMemo(() => {
  const warnings: string[] = []
  
  if (!formData.startTime && !formData.endTime) return warnings
  
  if (formData.startTime) {
    const [startHour] = formData.startTime.split(':').map(Number)
    if (startHour < 8) {
      warnings.push('début avant 8h00')
    }
  }
  
  if (formData.endTime) {
    const [endHour, endMinute] = formData.endTime.split(':').map(Number)
    if (endHour > 19 || (endHour === 19 && endMinute > 0)) {
      warnings.push('fin après 19h00')
    }
  }
  
  return warnings
}, [formData.startTime, formData.endTime])

  const handleStepNext = () => setActiveStep((prevStep) => prevStep + 1)
  const handleStepBack = () => setActiveStep((prevStep) => prevStep - 1)

  const handleFormDataChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setActiveStep(0)
    setLaborantinEventType(null)
    setIsMultiDay(false)
    setFormData({
      type: '',
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      location: '',
      equipment: [],
      notes: ''
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSelectEventType = (type: LaborantinEventType) => {
    setLaborantinEventType(type)
    handleFormDataChange('type', type)
    
    let title = ''
    switch(type) {
      case 'MAINTENANCE':
        title = 'Maintenance de matériel'
        break
      case 'INVENTAIRE':
        title = 'Inventaire laboratoire'
        break
      case 'AUTRE':
        title = 'Événement laboratoire'
        break
    }
    handleFormDataChange('title', title)
    
    handleStepNext()
  }

  const handleMultiDayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsMultiDay(event.target.checked)
    if (!event.target.checked) {
      // Si on désactive le mode multi-jours, on efface la date de fin
      handleFormDataChange('endDate', '')
    } else if (formData.startDate) {
      // Si on active le mode multi-jours et qu'on a déjà une date de début,
      // on initialise la date de fin avec la même date
      handleFormDataChange('endDate', formData.startDate)
    }
  }

  const handleCreateEvent = async () => {
    try {
      setLoading(true)
      if (!formData.type || !formData.title || 
          !formData.startDate || !formData.startTime || !formData.endTime) {
        throw new Error("Veuillez remplir tous les champs obligatoires.")
      }

      // Gestion des dates pour événements multi-jours
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`)
      let endDateTime: Date
      
      if (isMultiDay && formData.endDate) {
        endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`)
        
        // Vérifier que la date de fin est après la date de début
        if (isBefore(endDateTime, startDateTime)) {
          throw new Error("La date de fin doit être après la date de début.")
        }
      } else {
        endDateTime = new Date(`${formData.startDate}T${formData.endTime}:00`)
      }

      // Mapper les types laborantin vers les types d'événements
      const mapType = (laborantinType: LaborantinEventType): EventType => {
        switch (laborantinType) {
          case 'MAINTENANCE': return 'MAINTENANCE'
          case 'INVENTAIRE': return 'INVENTORY'
          case 'AUTRE': return 'OTHER'
          default: return 'OTHER'
        }
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        type: mapType(formData.type),
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        location: formData.location,
        equipment: formData.equipment.map((eq: any) => eq.id),
        notes: formData.notes
      }

      // Utiliser la nouvelle approche hybride pour la création d'événements
      await createSimpleEvent(eventData, discipline, {
        allowPastDates: true // Permettre les dates passées pour les événements laborantin
      })
      
      handleClose()
      onSuccess()
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement laborantin:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: { minHeight: isMobile ? '100%' : '500px' }
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Add color="primary" />
            <Typography variant="h6">Nouvel événement laboratoire</Typography>
          </Box>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Étape 1: Type d'événement */}
          <Step>
            <StepLabel>
              <Typography variant="h6">Type d'événement</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choisissez le type d'événement que vous souhaitez créer
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: laborantinEventType === 'MAINTENANCE' ? '2px solid' : '1px solid',
                      borderColor: laborantinEventType === 'MAINTENANCE' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 8px)' },
                      minWidth: { xs: 'auto', sm: '250px' }
                    }}
                    onClick={() => handleSelectEventType('MAINTENANCE')}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <Build color={laborantinEventType === 'MAINTENANCE' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                      <Typography variant="h6">Maintenance</Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Entretien, réparation ou calibration d'équipement
                      </Typography>
                    </Box>
                  </Card>
                  
                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: laborantinEventType === 'INVENTAIRE' ? '2px solid' : '1px solid',
                      borderColor: laborantinEventType === 'INVENTAIRE' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 8px)' },
                      minWidth: { xs: 'auto', sm: '250px' }
                    }}
                    onClick={() => handleSelectEventType('INVENTAIRE')}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <Inventory color={laborantinEventType === 'INVENTAIRE' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                      <Typography variant="h6">Inventaire</Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Inventaire du matériel ou des réactifs chimiques
                      </Typography>
                    </Box>
                  </Card>
                  
                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: laborantinEventType === 'AUTRE' ? '2px solid' : '1px solid',
                      borderColor: laborantinEventType === 'AUTRE' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 8px)' },
                      minWidth: { xs: 'auto', sm: '250px' }
                    }}
                    onClick={() => handleSelectEventType('AUTRE')}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <EventNote color={laborantinEventType === 'AUTRE' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                      <Typography variant="h6">Autre événement</Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Réunion, visite ou autre événement laboratoire
                      </Typography>
                    </Box>
                  </Card>
                </Box>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 2: Informations générales */}
          <Step>
            <StepLabel>
              <Typography variant="h6">Informations générales</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Renseignez les informations principales de l'événement
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  fullWidth
                  label="Titre"
                  value={formData.title}
                  onChange={(e) => handleFormDataChange('title', e.target.value)}
                  required
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleFormDataChange('description', e.target.value)}
                />

                {/* Switch pour événement sur plusieurs jours */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={isMultiDay}
                      onChange={handleMultiDayChange}
                      color="primary"
                    />
                  }
                  label="Événement sur plusieurs jours"
                />
                
                <Box display="flex" gap={2} flexWrap="wrap">
                  <DatePicker
                    label={isMultiDay ? "Date de début" : "Date"}
                    value={formData.startDate ? new Date(formData.startDate) : null}
                    onChange={(newValue) => {
                      if (newValue) {
                        // Correction du problème de timezone
                        const correctedDate = new Date(newValue.getFullYear(), newValue.getMonth(), newValue.getDate(), 12, 0, 0)
                        const dateStr = correctedDate.toISOString().split('T')[0]
                        handleFormDataChange('startDate', dateStr)
                        // Si on n'est pas en mode multi-jours ou si endDate est vide, on met à jour endDate aussi
                        if (!isMultiDay || !formData.endDate) {
                          handleFormDataChange('endDate', dateStr)
                        }
                      }
                    }}
                    slotProps={{
                      textField: { 
                        fullWidth: true,
                        required: true,
                        sx: { flexGrow: 1, minWidth: { xs: '100%', sm: '200px' } },
                        onClick: (e: any) => {
                          if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                            const button = e.currentTarget.querySelector('button')
                            if (button) button.click()
                          }
                        }
                      }
                    }}
                  />

                  {/* Date de fin (visible seulement si multi-jours) */}
                  <Collapse in={isMultiDay} sx={{ flex: '1 1 auto' }}>
                    <DatePicker
                      label="Date de fin"
                      value={formData.endDate ? new Date(formData.endDate) : null}
                      onChange={(newValue) => {
                        if (newValue) {
                          // Correction du problème de timezone
                          const correctedDate = new Date(newValue.getFullYear(), newValue.getMonth(), newValue.getDate(), 12, 0, 0)
                          handleFormDataChange('endDate', correctedDate.toISOString().split('T')[0])
                        }
                      }}
                      minDate={formData.startDate ? new Date(formData.startDate) : undefined}
                    slotProps={{
                      textField: { 
                        fullWidth: true,
                        required: true,
                        sx: { flexGrow: 1, minWidth: { xs: '100%', sm: '200px' } },
                        onClick: (e: any) => {
                          if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                            const button = e.currentTarget.querySelector('button')
                            if (button) button.click()
                          }
                        }
                      }
                    }}
                    />
                  </Collapse>
                </Box>
                
                <Box display="flex" gap={2} flexWrap="wrap">
                  <TimePicker
                    label="Heure de début"
                    value={formData.startTime ? new Date(`2000-01-01T${formData.startTime}`) : null}
                    onChange={(newValue) => {
                      if (newValue) {
                        const hours = newValue.getHours().toString().padStart(2, '0')
                        const minutes = newValue.getMinutes().toString().padStart(2, '0')
                        handleFormDataChange('startTime', `${hours}:${minutes}`)
                      }
                    }}
                    slotProps={{
                      textField: { 
                        required: true,
                        sx: { flexGrow: 1, minWidth: { xs: '48%', sm: '200px' } },
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
                    label="Heure de fin"
                    value={formData.endTime ? new Date(`2000-01-01T${formData.endTime}`) : null}
                    onChange={(newValue) => {
                      if (newValue) {
                        const hours = newValue.getHours().toString().padStart(2, '0')
                        const minutes = newValue.getMinutes().toString().padStart(2, '0')
                        handleFormDataChange('endTime', `${hours}:${minutes}`)
                      }
                    }}
                    slotProps={{
                      textField: { 
                        required: true,
                        sx: { flexGrow: 1, minWidth: { xs: '48%', sm: '200px' } },
                        onClick: (e: any) => {
                          if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                            const button = e.currentTarget.querySelector('button')
                            if (button) button.click()
                          }
                        }
                      }
                    }}
                  />
                </Box>

                {/* Avertissement heures hors établissement */}
                <Collapse in={isOutsideBusinessHours.length > 0}>
                  <Alert 
                    severity="warning" 
                    icon={<Warning />}
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiAlert-icon': {
                        fontSize: '1.5rem'
                      }
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      Attention : L'établissement est fermé !
                    </Typography>
                    <Typography variant="body2">
                      Votre événement est programmé en dehors des heures d'ouverture ({isOutsideBusinessHours.join(' et ')}).
                      L'établissement est ouvert de 8h00 à 19h00.
                    </Typography>
                  </Alert>
                </Collapse>
                
                <TextField
                  fullWidth
                  label="Lieu"
                  value={formData.location}
                  onChange={(e) => handleFormDataChange('location', e.target.value)}
                />
              </Box>

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStepNext}
                  disabled={!formData.title || !formData.startDate || 
                            !formData.startTime || !formData.endTime ||
                            (isMultiDay && !formData.endDate)}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 3: Détails supplémentaires */}
          <Step>
            <StepLabel>
              <Typography variant="h6">Détails supplémentaires</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {formData.type === 'MAINTENANCE' ? 
                  "Spécifiez l'équipement concerné par la maintenance" :
                  formData.type === 'INVENTAIRE' ?
                  "Spécifiez les détails de l'inventaire" :
                  "Ajoutez des informations complémentaires si nécessaire"}
              </Typography>
              
              {formData.type === 'MAINTENANCE' && (
                <Autocomplete
                  multiple
                  options={materials}
                  getOptionLabel={(option: any) => {
                    if (typeof option === 'string') return option;
                    return `${option.itemName || option.name || 'Matériel'} ${option.volume ? `(${option.volume})` : ''}`;
                  }}
                  value={formData.equipment}
                  onChange={(_, newValue) => handleFormDataChange('equipment', newValue || [])}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Équipement concerné"
                      placeholder="Sélectionnez l'équipement..."
                      required={formData.type === 'MAINTENANCE'}
                      sx={{ mb: 2 }}
                    />
                  )}
                  isOptionEqualToValue={(option: any, value: any) => {
                    return option.id === value.id;
                  }}
                />
              )}
              
              <TextField
                fullWidth
                label="Notes complémentaires"
                multiline
                rows={4}
                value={formData.notes}
                onChange={(e) => handleFormDataChange('notes', e.target.value)}
                sx={{ mb: 2 }}
              />

              {/* Rappel de l'avertissement si applicable */}
              {isOutsideBusinessHours.length > 0 && (
                <Alert 
                  severity="warning" 
                  icon={<Warning />}
                  sx={{ 
                    mb: 2,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body2">
                    Rappel : Cet événement est programmé en dehors des heures d'ouverture de l'établissement (8h00 - 19h00).
                  </Typography>
                </Alert>
              )}

              {/* Résumé de l'événement multi-jours */}
              {isMultiDay && formData.startDate && formData.endDate && (
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 2,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body2">
                    Cet événement s'étendra du {new Date(formData.startDate).toLocaleDateString('fr-FR')} au {new Date(formData.endDate).toLocaleDateString('fr-FR')}
                  </Typography>
                </Alert>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCreateEvent}
                  startIcon={<Save />}
                  disabled={loading || (formData.type === 'MAINTENANCE' && formData.equipment.length === 0)}
                >
                  {loading ? 'Ajout...' : 'Ajouter l\'événement'}
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>
    </Dialog>
  )
}