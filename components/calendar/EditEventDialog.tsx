// components/calendar/EditEventDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, IconButton,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Autocomplete, Chip, Alert, Collapse, Stack, Divider
} from '@mui/material'
import { 
  Close, Save, Warning, Science, Schedule, Assignment, EventAvailable,
  Add, Delete 
} from '@mui/icons-material'
import { DatePicker, TimePicker } from '@mui/x-date-pickers'
import { CalendarEvent, EventType } from '@/types/calendar'
import { format, isSameDay } from 'date-fns'
import { FileUploadSection } from './FileUploadSection'
import { RichTextEditor } from './RichTextEditor'

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
  const [showMultipleSlots, setShowMultipleSlots] = useState(false)
  const [files, setFiles] = useState<any[]>([])
  const [remarks, setRemarks] = useState('')
  const [timeSlots, setTimeSlots] = useState<Array<{
    date: Date | null;
    startTime: string;
    endTime: string;
  }>>([])
  
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

      // Initialiser les fichiers existants
      if (event.files && Array.isArray(event.files)) {
        setFiles(event.files.map((file, index) => ({
          id: `existing_${index}`,
          file: null,
          existingFile: file
        })))
      } else if (event.fileName) {
        // Rétrocompatibilité
        setFiles([{
          id: 'existing_0',
          file: null,
          existingFile: {
            fileName: event.fileName,
            fileUrl: event.fileUrl
          }
        }])
      }

      // Initialiser les remarques
      setRemarks(event.remarks || '')

      // Initialiser avec un créneau unique basé sur l'événement actuel
      setTimeSlots([{
        date: startDate,
        startTime: format(startDate, 'HH:mm'),
        endTime: format(endDate, 'HH:mm')
      }])
      
      // Réinitialiser le mode multi-créneaux
      setShowMultipleSlots(false)
    }
  }, [event])

  // Gestion des créneaux
  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, {
      date: formData.startDate,
      startTime: formData.startTime,
      endTime: formData.endTime
    }])
  }

  const removeTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
      const newTimeSlots = timeSlots.filter((_, i) => i !== index)
      setTimeSlots(newTimeSlots)
    }
  }

  const updateTimeSlot = (index: number, field: 'date' | 'startTime' | 'endTime', value: any) => {
    const newTimeSlots = [...timeSlots]
    if (field === 'date') {
      newTimeSlots[index].date = value
    } else {
      newTimeSlots[index][field] = value
    }
    setTimeSlots(newTimeSlots)
  }

  // Vérifier si l'événement est en dehors des heures d'ouverture
  const getOutsideBusinessHoursWarnings = () => {
    const warnings: string[] = []
    
    if (showMultipleSlots && formData.type === 'TP') {
      // Vérifier tous les créneaux
      timeSlots.forEach((slot, index) => {
        if (slot.startTime) {
          const [startHour] = slot.startTime.split(':').map(Number)
          if (startHour < 8) {
            warnings.push(`Créneau ${index + 1} : début avant 8h00`)
          }
        }
        
        if (slot.endTime) {
          const [endHour, endMinute] = slot.endTime.split(':').map(Number)
          if (endHour > 19 || (endHour === 19 && endMinute > 0)) {
            warnings.push(`Créneau ${index + 1} : fin après 19h00`)
          }
        }
      })
    } else {
      // Vérifier le créneau unique
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
    }
    
    return warnings
  }

  const handleSave = async () => {
    if (!formData.title) {
      alert('Veuillez remplir le titre')
      return
    }

    // Vérifier les créneaux selon le mode
    if (showMultipleSlots && formData.type === 'TP') {
      for (const slot of timeSlots) {
        if (!slot.date || !slot.startTime || !slot.endTime) {
          alert('Veuillez remplir tous les créneaux horaires')
          return
        }
      }
    } else {
      if (!formData.startDate || !formData.startTime || !formData.endTime) {
        alert('Veuillez remplir tous les champs obligatoires')
        return
      }
    }

    setLoading(true)
    try {
      // Préparer les fichiers
      const filesData = files.map(f => {
        if (f.existingFile) {
          return f.existingFile
        } else if (f.file) {
          return {
            fileName: f.file.name,
            fileSize: f.file.size,
            fileType: f.file.type,
            uploadedAt: new Date().toISOString()
            // Note: L'upload réel du fichier devrait être géré par l'API
          }
        }
      }).filter(Boolean)

      if (showMultipleSlots && formData.type === 'TP' && timeSlots.length > 1) {
        // Mode multi-créneaux : mettre à jour le premier et créer les autres
        const firstSlot = timeSlots[0]
        const additionalSlots = timeSlots.slice(1).map(slot => ({
          date: slot.date ? format(slot.date, 'yyyy-MM-dd') : '',
          startTime: slot.startTime,
          endTime: slot.endTime
        }))
        
        if (firstSlot.date) {
          const startDateTime = new Date(firstSlot.date)
          startDateTime.setHours(parseInt(firstSlot.startTime.split(':')[0]))
          startDateTime.setMinutes(parseInt(firstSlot.startTime.split(':')[1]))

          const endDateTime = new Date(firstSlot.date)
          endDateTime.setHours(parseInt(firstSlot.endTime.split(':')[0]))
          endDateTime.setMinutes(parseInt(firstSlot.endTime.split(':')[1]))

          const updatedEvent: Partial<CalendarEvent> & { additionalTimeSlots?: any[] } = {
            title: formData.title,
            description: formData.description,
            type: formData.type,
            startDate: startDateTime,
            endDate: endDateTime,
            class: formData.class,
            room: formData.room,
            materials: formData.materials,
            chemicals: formData.chemicals,
            location: formData.location,
            files: filesData,
            remarks: remarks,
            additionalTimeSlots: additionalSlots
          }

          await onSave(updatedEvent)
        }
      } else {
        // Mode simple : mise à jour normale
        const startDateTime = new Date(formData.startDate!)
        startDateTime.setHours(parseInt(formData.startTime.split(':')[0]))
        startDateTime.setMinutes(parseInt(formData.startTime.split(':')[1]))

        let endDateTime: Date
        if (formData.endDate && formData.endDate.getDate() !== formData.startDate!.getDate()) {
          endDateTime = new Date(formData.endDate)
        } else {
          endDateTime = new Date(formData.startDate!)
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
          location: formData.location,
          files: filesData,
          remarks: remarks
        }

        await onSave(updatedEvent)
      }
      
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
                            onChange={(e) => {
                const newType = e.target.value as EventType
                setFormData({ ...formData, type: newType })
                // Réinitialiser le mode multi-créneaux si on change de type
                if (newType !== 'TP') {
                  setShowMultipleSlots(false)
                }
              }}
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

          {/* Nouveau champ Remarques avec éditeur riche */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Remarques
            </Typography>
            <RichTextEditor
              value={remarks}
              onChange={setRemarks}
              placeholder="Ajoutez des remarques supplémentaires (mise en forme disponible)..."
            />
          </Box>

          {/* Option multi-créneaux pour les TP */}
          {formData.type === 'TP' && (
            <Alert severity="info">
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">
                  Voulez-vous ajouter des créneaux supplémentaires pour cette séance TP ?
                </Typography>
                <Button
                  size="small"
                  onClick={() => setShowMultipleSlots(!showMultipleSlots)}
                  startIcon={showMultipleSlots ? <Close /> : <Add />}
                >
                  {showMultipleSlots ? 'Mode simple' : 'Gérer les créneaux'}
                </Button>
              </Box>
            </Alert>
          )}

          {/* Dates et heures */}
          {showMultipleSlots && formData.type === 'TP' ? (
            // Mode multi-créneaux
            <Box>
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

              {timeSlots.map((slot, index) => (
                <Box 
                  key={index} 
                  mb={2}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.default'
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Créneau {index + 1}
                    </Typography>
                    {timeSlots.length > 1 && (
                      <IconButton
                        color="error"
                        onClick={() => removeTimeSlot(index)}
                        size="small"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  
                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <DatePicker
                      label="Date"
                      value={slot.date}
                      onChange={(newValue) => updateTimeSlot(index, 'date', newValue)}
                      slotProps={{
                        textField: { 
                          size: "small",
                          sx: { minWidth: { xs: '100%', sm: 200 } },
                          required: true
                        }
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
                        textField: { 
                          size: "small",
                          sx: { minWidth: { xs: '48%', sm: 120 } },
                          required: true
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
                          updateTimeSlot(index, 'endTime', `${hours}:${minutes}`)
                        }
                      }}
                      slotProps={{
                        textField: { 
                          size: "small",
                          sx: { minWidth: { xs: '48%', sm: 120 } },
                          required: true
                        }
                      }}
                    />
                  </Box>
                </Box>
              ))}

              {timeSlots.length > 1 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Attention : La modification créera {timeSlots.length - 1} événements supplémentaires.
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : (
            // Mode simple
            <>
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
            </>
          )}

          {/* Avertissement heures hors établissement */}
          <Collapse in={getOutsideBusinessHoursWarnings().length > 0}>
            <Alert 
              severity="warning" 
              icon={<Warning />}
            >
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Attention : L'établissement est fermé !
              </Typography>
              <Typography variant="body2" component="div">
                Votre événement est programmé en dehors des heures d'ouverture de l'établissement (8h00 - 19h00) :
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  {getOutsideBusinessHoursWarnings().map((warning, index) => (
                    <li key={index}>
                      <Typography variant="body2" component="span">
                        {warning}
                      </Typography>
                    </li>
                  ))}
                </Box>
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
                    {/* Section de gestion des fichiers multiples */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Documents joints
            </Typography>
            <FileUploadSection
              files={files}
              onFilesChange={setFiles}
              maxFiles={5}
              maxSizePerFile={10}
              acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif']}
            />
          </Box>
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