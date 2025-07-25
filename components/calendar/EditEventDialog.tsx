// components/calendar/EditEventDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, IconButton,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Autocomplete, Chip, Alert, Collapse, Stack
} from '@mui/material'
import { 
  Close, Save, Warning, Science, Schedule, Assignment, EventAvailable 
} from '@mui/icons-material'
import { DatePicker, TimePicker } from '@mui/x-date-pickers'
import { CalendarEvent, EventType } from '@/types/calendar'
import { format } from 'date-fns'

interface EditEventDialogProps {
  open: boolean
  event: CalendarEvent | null
  onClose: () => void
  onSave: (updatedEvent: Partial<CalendarEvent>) => Promise<void>
  materials: any[]
  chemicals: any[]
  classes: string[]
}

const EVENT_TYPES = {
  TP: { label: "TP", icon: <Science /> },
  MAINTENANCE: { label: "Maintenance", icon: <Schedule /> },
  INVENTORY: { label: "Inventaire", icon: <Assignment /> },
  OTHER: { label: "Autre", icon: <EventAvailable /> }
}

export function EditEventDialog({
  open,
  event,
  onClose,
  onSave,
  materials,
  chemicals,
  classes
}: EditEventDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'TP' as EventType,
    startDate: null as Date | null,
    endDate: null as Date | null,
    startTime: '',
    endTime: '',
    class: '',
    room: '',
    materials: [] as any[],
    chemicals: [] as any[],
    location: ''
  })

  // Initialiser le formulaire avec les données de l'événement
  useEffect(() => {
    if (event) {
      const startDate = typeof event.startDate === 'string' 
        ? new Date(event.startDate) 
        : event.startDate
      const endDate = typeof event.endDate === 'string' 
        ? new Date(event.endDate) 
        : event.endDate

      setFormData({
        title: event.title || '',
        description: event.description || '',
        type: event.type || 'TP',
        startDate: startDate,
        endDate: endDate,
        startTime: format(startDate, 'HH:mm'),
        endTime: format(endDate, 'HH:mm'),
        class: event.class || '',
        room: event.room || '',
        materials: event.materials || [],
        chemicals: event.chemicals || [],
        location: event.location || ''
      })
    }
  }, [event])

  // Vérifier si l'événement est en dehors des heures d'ouverture
  const getOutsideBusinessHoursWarnings = () => {
    const warnings: string[] = []
    
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
  }

  const handleSave = async () => {
    if (!formData.title || !formData.startDate || !formData.startTime || !formData.endTime) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)
    try {
      // Construire les dates complètes
      const startDateTime = new Date(formData.startDate)
      startDateTime.setHours(parseInt(formData.startTime.split(':')[0]))
      startDateTime.setMinutes(parseInt(formData.startTime.split(':')[1]))

      let endDateTime: Date
      if (formData.endDate && formData.endDate.getDate() !== formData.startDate.getDate()) {
        // Événement multi-jours
        endDateTime = new Date(formData.endDate)
      } else {
        // Même jour
        endDateTime = new Date(formData.startDate)
      }
      endDateTime.setHours(parseInt(formData.endTime.split(':')[0]))
      endDateTime.setMinutes(parseInt(formData.endTime.split(':')[1]))

      const updatedEvent: Partial<CalendarEvent> = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        startDate: startDateTime,
        endDate: endDateTime,
        class: formData.class,
        room: formData.room,
        materials: formData.materials,
        chemicals: formData.chemicals,
        location: formData.location
      }

      await onSave(updatedEvent)
      onClose()
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde de l\'événement')
    } finally {
      setLoading(false)
    }
  }

  if (!event) return null

  const isMultiDay = formData.startDate && formData.endDate && 
    formData.startDate.getDate() !== formData.endDate.getDate()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Modifier l'événement</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Type d'événement */}
          <FormControl fullWidth>
            <InputLabel>Type d'événement</InputLabel>
            <Select
              value={formData.type}
              label="Type d'événement"
              onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
            >
              {Object.entries(EVENT_TYPES).map(([key, value]) => (
                <MenuItem key={key} value={key}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {value.icon}
                    {value.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Titre et description */}
          <TextField
            fullWidth
            label="Titre"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          {/* Dates et heures */}
          <Box display="flex" gap={2} flexWrap="wrap">
            <DatePicker
              label="Date de début"
              value={formData.startDate}
              onChange={(newValue) => {
                setFormData({ 
                  ...formData, 
                  startDate: newValue,
                  // Si pas multi-jours, mettre à jour la date de fin aussi
                  endDate: isMultiDay ? formData.endDate : newValue
                })
              }}
              slotProps={{
                textField: { 
                  required: true,
                  sx: { flexGrow: 1, minWidth: '200px' }
                }
              }}
            />

            {isMultiDay && (
              <DatePicker
                label="Date de fin"
                value={formData.endDate}
                onChange={(newValue) => setFormData({ ...formData, endDate: newValue })}
                minDate={formData.startDate || undefined}
                slotProps={{
                  textField: { 
                    required: true,
                    sx: { flexGrow: 1, minWidth: '200px' }
                  }
                }}
              />
            )}
          </Box>

          <Box display="flex" gap={2}>
            <TimePicker
              label="Heure de début"
              value={formData.startTime ? new Date(`2000-01-01T${formData.startTime}`) : null}
              onChange={(newValue) => {
                if (newValue) {
                  const hours = newValue.getHours().toString().padStart(2, '0')
                  const minutes = newValue.getMinutes().toString().padStart(2, '0')
                  setFormData({ ...formData, startTime: `${hours}:${minutes}` })
                }
              }}
              slotProps={{
                textField: { 
                  required: true,
                  sx: { flexGrow: 1 }
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
                  setFormData({ ...formData, endTime: `${hours}:${minutes}` })
                }
              }}
              slotProps={{
                textField: { 
                  required: true,
                  sx: { flexGrow: 1 }
                }
              }}
            />
          </Box>

          {/* Avertissement heures hors établissement */}
          <Collapse in={getOutsideBusinessHoursWarnings().length > 0}>
            <Alert 
              severity="warning" 
              icon={<Warning />}
            >
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Attention : L'établissement est fermé !
              </Typography>
              <Typography variant="body2">
                Votre événement est programmé en dehors des heures d'ouverture ({getOutsideBusinessHoursWarnings().join(' et ')}).
                L'établissement est ouvert de 8h00 à 19h00.
              </Typography>
            </Alert>
          </Collapse>

          {/* Classe et salle */}
          {formData.type === 'TP' && (
            <>
              <Autocomplete
                freeSolo
                options={classes}
                value={formData.class}
                onChange={(_, newValue) => setFormData({ ...formData, class: newValue || '' })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Classe"
                    placeholder="Sélectionnez ou saisissez une classe..."
                  />
                )}
              />

              <TextField
                fullWidth
                label="Salle"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              />
            </>
          )}

          {/* Lieu (pour autres types d'événements) */}
          {formData.type !== 'TP' && (
            <TextField
              fullWidth
              label="Lieu"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          )}

          {/* Matériel */}
          {(formData.type === 'TP' || formData.type === 'MAINTENANCE') && (
            <Autocomplete
              multiple
              options={materials}
              getOptionLabel={(option: any) => {
                if (typeof option === 'string') return option
                return `${option.itemName || option.name || 'Matériel'} ${option.volume ? `(${option.volume})` : ''}`
              }}
              value={formData.materials}
              onChange={(_, newValue) => setFormData({ ...formData, materials: newValue || [] })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Matériel"
                  placeholder="Sélectionnez le matériel..."
                />
              )}
              isOptionEqualToValue={(option: any, value: any) => {
                return option.id === value.id
              }}
            />
          )}

          {/* Produits chimiques */}
          {formData.type === 'TP' && (
            <Autocomplete
              multiple
              options={chemicals}
              getOptionLabel={(option: any) => {
                if (typeof option === 'string') return option
                return `${option.name || 'Produit chimique'} - ${option.quantity || 0}${option.unit || ''}`
              }}
              value={formData.chemicals}
              onChange={(_, newValue) => setFormData({ ...formData, chemicals: newValue || [] })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Produits chimiques"
                  placeholder="Sélectionnez les produits chimiques..."
                />
              )}
              isOptionEqualToValue={(option: any, value: any) => {
                return option.id === value.id
              }}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<Save />}
          disabled={loading}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}