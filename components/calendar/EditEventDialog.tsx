// components/calendar/EditEventDialog.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, IconButton,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Autocomplete, Chip, Alert, Collapse, Stack, Divider, InputAdornment,
  ClickAwayListener, Tooltip, CircularProgress
} from '@mui/material'
import { 
  Close, Save, Warning, Science, Schedule, Assignment, EventAvailable,
  Add, Delete, InfoOutlined
} from '@mui/icons-material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
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
  isMobile?: boolean
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
  classes,
  isMobile = false
}: EditEventDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showMultipleSlots, setShowMultipleSlots] = useState(false)
  const [files, setFiles] = useState<any[]>([])
  const [remarks, setRemarks] = useState('')
  const [materialInputValue, setMaterialInputValue] = useState('')
  const [chemicalInputValue, setChemicalInputValue] = useState('')
  const [chemicalsWithForecast, setChemicalsWithForecast] = useState<any[]>([])
  const [tooltipStates, setTooltipStates] = useState<{[key: string]: {actual: boolean, prevision: boolean, after: boolean}}>({})

  // Ajouter un état pour suivre les uploads
  const [hasUploadingFiles, setHasUploadingFiles] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])

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



  // Surveiller l'état des uploads
  useEffect(() => {
    const uploading = files.some(f => f.uploadStatus === 'uploading')
    setHasUploadingFiles(uploading)
  }, [files])


  // Initialiser le formulaire avec les données de l'événement
  useEffect(() => {
    if (event) {
      const startDate = typeof event.startDate === 'string' 
        ? new Date(event.startDate) 
        : event.startDate
      const endDate = typeof event.endDate === 'string' 
        ? new Date(event.endDate) 
        : event.endDate

      // Préparer les matériels avec quantités
      const materialsWithQuantities = event.materials?.map((mat: any) => {
        // Si c'est déjà un objet avec quantité
        if (typeof mat === 'object' && mat.quantity) {
          return mat
        }
        // Si c'est un ID, chercher dans la liste des matériels
        const foundMaterial = materials.find(m => m.id === mat)
        if (foundMaterial) {
          return { ...foundMaterial, quantity: 1 }
        }
        // Si c'est un objet matériel sans quantité
        return { ...mat, quantity: 1 }
      }) || []

      // Préparer les réactifs chimiques avec quantités
      const chemicalsWithQuantities = event.chemicals?.map((chem: any) => {
        // Si c'est déjà un objet avec quantité demandée
        if (typeof chem === 'object' && chem.requestedQuantity) {
          return chem
        }
        // Si c'est un ID, chercher dans la liste des réactifs chimiques
        const foundChemical = chemicals.find(c => c.id === chem)
        if (foundChemical) {
          return { ...foundChemical, requestedQuantity: 1 }
        }
        // Si c'est un objet chimique sans quantité demandée
        return { ...chem, requestedQuantity: 1 }
      }) || []

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
        materials: materialsWithQuantities,
        chemicals: chemicalsWithQuantities,
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
  }, [event, materials, chemicals])



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

   // Callback pour gérer l'upload réussi d'un fichier
const handleFileUploaded = useCallback(async (fileId: string, uploadedFile: {
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
}) => {
  console.log('handleFileUploaded appelé avec event:', event)
  console.log('handleFileUploaded - event.id:', event?.id)

    if (!event?.id) {
      console.warn('Pas d\'ID d\'événement pour persister le fichier')
      return
    }

    
    try {
      // Persister immédiatement le fichier dans l'événement
      const response = await fetch(`/api/calendrier/add-file?id=${event.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: {
            ...uploadedFile,
            uploadedAt: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la persistance du fichier')
      }

      const result = await response.json()
      console.log('Fichier persisté:', result)

      // Mettre à jour l'état local pour marquer le fichier comme uploadé et persisté
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === fileId 
            ? { 
                ...f, 
                uploadedUrl: uploadedFile.fileUrl,
                uploadStatus: 'completed' as const,
                isPersisted: true 
              }
            : f
        )
      )
    } catch (error) {
      console.error('Erreur lors de la persistance du fichier:', error)
      setUploadErrors(prev => [...prev, `Erreur lors de la sauvegarde de ${uploadedFile.fileName}`])
      
      // Marquer le fichier comme uploadé mais non persisté
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === fileId 
            ? { 
                ...f, 
                uploadedUrl: uploadedFile.fileUrl,
                uploadStatus: 'completed' as const,
                isPersisted: false 
              }
            : f
        )
      )
    }
  }, [event?.id])

const handleSave = async () => {
  if (!formData.title) {
    alert('Veuillez remplir le titre')
    return
  }

  if (hasUploadingFiles) {
    alert('Des fichiers sont encore en cours d\'upload. Veuillez patienter.')
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

  // Vérifier les quantités de réactifs chimiques
  const insufficientChemicals = formData.chemicals.filter(c => 
    c.requestedQuantity > (c.quantity || 0)
  )
  if (insufficientChemicals.length > 0) {
    alert('Certains réactifs chimiques ont des quantités insuffisantes en stock.')
    return
  }

  setLoading(true)
  try {
    // Préparer TOUS les fichiers (existants + nouveaux)
    const allFilesData = files
      .filter(f => f.existingFile || f.uploadedUrl || f.path) // Garder tous les fichiers valides
      .map(f => {
        // Si c'est un fichier existant
        if (f.existingFile) {
          return {
            fileName: f.existingFile.fileName,
            fileUrl: f.existingFile.fileUrl,
            filePath: f.existingFile.filePath || f.existingFile.fileUrl,
            fileSize: f.existingFile.fileSize || 0,
            fileType: f.existingFile.fileType || '',
            uploadedAt: f.existingFile.uploadedAt || ''
          }
        }
        // Si c'est un nouveau fichier uploadé
        else if (f.uploadedUrl || f.path) {
          return {
            fileName: f.file?.name || f.fileName || '',
            fileUrl: f.uploadedUrl || f.path || '',
            filePath: f.uploadedUrl || f.path || '',
            fileSize: f.file?.size || f.fileSize || 0,
            fileType: f.file?.type || f.fileType || '',
            uploadedAt: new Date().toISOString()
          }
        }
        return null
      })
      .filter((file): file is NonNullable<typeof file> => file !== null)

    // Préparer les matériels avec quantités
    const materialsData = formData.materials.map((m) => ({
      id: m.id,
      name: m.itemName || m.name || '',
      quantity: m.quantity || 1,
      isCustom: m.isCustom || false,
      volume: m.volume || null
    }))

    // Préparer les réactifs chimiques avec quantités
    const chemicalsData = formData.chemicals.map((c) => ({
      id: c.id,
      name: c.name || '',
      requestedQuantity: c.requestedQuantity || 1,
      unit: c.unit || '',
      quantity: c.quantity || 0
    }))

    if (showMultipleSlots && formData.type === 'TP' && timeSlots.length > 1) {
      // Mode multi-créneaux
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
          materials: materialsData,
          chemicals: chemicalsData,
          location: formData.location,
          remarks: remarks,
          files: allFilesData, // Toujours envoyer tous les fichiers
          additionalTimeSlots: additionalSlots
        }

        await onSave(updatedEvent)
      }
    } else {
      // Mode simple
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
        materials: materialsData,
        chemicals: chemicalsData,
        location: formData.location,
        remarks: remarks,
        files: allFilesData // Toujours envoyer tous les fichiers
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
      fullScreen={isMobile}
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: { minHeight: '400px' }
        }
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

          {/* Matériel avec gestion des quantités */}
          {(formData.type === 'TP' || formData.type === 'MAINTENANCE') && (
            <>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Matériel nécessaire
                </Typography>
                
                {/* Autocomplete pour ajouter du matériel */}
                <Autocomplete
                  freeSolo
                  options={materials}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option
                    return `${option.itemName || option.name || 'Matériel'} ${option.volume ? `(${option.volume})` : ''}`
                  }}
                  value={null}
                  inputValue={materialInputValue || ''}
                  onInputChange={(event, newInputValue) => {
                    setMaterialInputValue(newInputValue)
                  }}
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'string') return
                    
                    if (newValue && !formData.materials.some((m) => 
                      (m.itemName || m.name) === (newValue.itemName || newValue.name)
                    )) {
                      setFormData({ 
                        ...formData, 
                        materials: [
                          ...formData.materials,
                          { ...newValue, quantity: 1 }
                        ]
                      })
                      setMaterialInputValue('')
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Ajouter du matériel"
                      placeholder="Rechercher ou créer..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && materialInputValue && materialInputValue.trim()) {
                          e.preventDefault()
                          const trimmedValue = materialInputValue.trim()
                          if (!formData.materials.some(m => (m.itemName || m.name) === trimmedValue)) {
                            const customMaterial = {
                              id: `custom_${Date.now()}`,
                              itemName: trimmedValue,
                              name: trimmedValue,
                              isCustom: true,
                              quantity: 1
                            }
                            
                            setFormData({ 
                              ...formData, 
                              materials: [
                                ...formData.materials,
                                customMaterial
                              ]
                            })
                            setMaterialInputValue('')
                          }
                        }
                      }}
                      InputProps={{
                        ...params.
                                                InputProps,
                        endAdornment: (
                          <>
                            {params.InputProps.endAdornment}
                            {materialInputValue && materialInputValue.trim() && (
                              <InputAdornment position="end">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const trimmedValue = materialInputValue.trim()
                                    if (!formData.materials.some(m => 
                                      (m.itemName || m.name) === trimmedValue
                                    )) {
                                      const customMaterial = {
                                        id: `custom_${Date.now()}`,
                                        itemName: trimmedValue,
                                        name: trimmedValue,
                                        isCustom: true,
                                        quantity: 1
                                      }
                                      
                                      setFormData({ 
                                        ...formData, 
                                        materials: [
                                          ...formData.materials,
                                          customMaterial
                                        ]
                                      })
                                      setMaterialInputValue('')
                                      ;(document.activeElement as HTMLElement)?.blur()
                                    }
                                  }}
                                  edge="end"
                                  sx={{ mr: -1 }}
                                >
                                  <AddIcon />
                                </IconButton>
                              </InputAdornment>
                            )}
                          </>
                        ),
                      }}
                    />
                  )}
                  isOptionEqualToValue={(option, value) => 
                    (option.itemName || option.name) === (value.itemName || value.name)
                  }
                  filterOptions={(options, state) => {
                    const selectedNames = formData.materials.map(m => m.itemName || m.name)
                    const availableOptions = options.filter(option => {
                      const optionName = option.itemName || option.name
                      return !selectedNames.includes(optionName)
                    })
                    
                    const uniqueByName = new Map()
                    availableOptions.forEach(option => {
                      const optionName = option.itemName || option.name
                      if (!uniqueByName.has(optionName)) {
                        uniqueByName.set(optionName, option)
                      }
                    })
                    
                    const uniqueOptions = Array.from(uniqueByName.values())
                    
                    if (state.inputValue) {
                      return uniqueOptions.filter(option => {
                        const label = `${option.itemName || option.name || ''} ${option.volume || ''}`.toLowerCase()
                        return label.includes(state.inputValue.toLowerCase())
                      })
                    }
                    
                    return uniqueOptions
                  }}
                />

                {/* Liste du matériel sélectionné avec quantités */}
                {formData.materials.length > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {formData.materials.map((material, index) => (
                      <Box
                        key={`${material.itemName || material.name}-${index}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          backgroundColor: 'background.paper'
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" component="div">
                            {material.itemName || material.name || 'Matériel'}
                            {material.volume && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                {' '}({material.volume})
                              </Typography>
                            )}
                            {material.isCustom && (
                              <Chip 
                                label="Personnalisé" 
                                size="small" 
                                color="primary" 
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Typography>
                        </Box>

                        <TextField
                          label="Quantité"
                          type="number"
                          value={material.quantity || 1}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1
                            const updatedMaterials = [...formData.materials]
                            updatedMaterials[index] = { ...material, quantity: newQuantity }
                            setFormData({ ...formData, materials: updatedMaterials })
                          }}
                          inputProps={{ min: 1 }}
                          sx={{ width: 100 }}
                          size="small"
                        />

                        <IconButton
                          onClick={() => {
                            const updatedMaterials = formData.materials.filter((_, i) => i !== index)
                            setFormData({ ...formData, materials: updatedMaterials })
                          }}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </>
          )}

          {/* Réactifs chimiques avec gestion des quantités */}
          {formData.type === 'TP' && (
            <>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Réactifs chimiques
                </Typography>
                
                {/* Autocomplete pour ajouter des réactifs chimiques */}
                <Autocomplete
                  options={chemicalsWithForecast}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option
                    const forecast = option.forecastQuantity !== undefined ? option.forecastQuantity : option.quantity
                    return `${option.name || 'Réactif chimique'} - Stock: ${option.quantity || 0}${option.unit || ''} (Prévu: ${forecast}${option.unit || ''})`
                  }}
                  value={null}
                  inputValue={chemicalInputValue || ''}
                  onInputChange={(event, newInputValue) => {
                    setChemicalInputValue(newInputValue)
                  }}
                  onChange={(_, newValue) => {
                    if (newValue && !formData.chemicals.some((c) => c.name === newValue.name)) {
                      setFormData({ 
                        ...formData, 
                        chemicals: [
                          ...formData.chemicals,
                          { ...newValue, requestedQuantity: 1 }
                        ]
                      })
                      setChemicalInputValue('')
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Ajouter un réactif chimique"
                      placeholder="Rechercher et sélectionner..."
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="body2">
                          {option.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Stock actuel : {option.quantity}{option.unit}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color={option.forecastQuantity < option.minQuantity ? 'error' : 'text.secondary'}
                          >
                            Stock prévu : {option.forecastQuantity?.toFixed(1)}{option.unit}
                            {option.totalRequested > 0 && ` (-${option.totalRequested}${option.unit})`}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  )}
                  isOptionEqualToValue={(option, value) => option.name === value.name}
                  filterOptions={(options, state) => {
                    const selectedNames = formData.chemicals.map(c => c.name)
                    const availableOptions = options.filter(option => 
                      !selectedNames.includes(option.name)
                    )
                    
                    const uniqueByName = new Map()
                    availableOptions.forEach(option => {
                      if (!uniqueByName.has(option.name)) {
                        uniqueByName.set(option.name, option)
                      }
                    })
                    
                    const uniqueOptions = Array.from(uniqueByName.values())
                    
                    if (state.inputValue) {
                      return uniqueOptions.filter(option => {
                        const label = `${option.name || ''} ${option.quantity || ''} ${option.unit || ''}`.toLowerCase()
                        return label.includes(state.inputValue.toLowerCase())
                      })
                    }
                    
                    return uniqueOptions
                  }}
                />

                {/* Liste des réactifs chimiques sélectionnés avec quantités */}
                {formData.chemicals.length > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {formData.chemicals.map((chemical, index) => {
                      // Créer une clé unique pour ce chemical
                      const tooltipKey = `formChemical-${chemical.id || index}`
                      const tooltipOpen = tooltipStates[tooltipKey] || { actual: false, prevision: false, after: false }
                      
                      // Utiliser quantityPrevision si disponible, sinon quantity
                      const availableStock = chemical.quantityPrevision !== undefined 
                        ? chemical.quantityPrevision 
                        : (chemical.quantity || 0)
                      
                      const stockAfterRequest = availableStock - (chemical.requestedQuantity || 0)
                      
                      const handleTooltipToggle = (type: 'actual' | 'prevision' | 'after') => {
                        setTooltipStates(prev => ({
                          ...prev,
                          [tooltipKey]: {
                            ...tooltipOpen,
                            [type]: !tooltipOpen[type]
                          }
                        }))
                      }
                      
                      return (
                        <Box
                          key={chemical.id || index}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            backgroundColor: 'background.paper'
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2">
                              {chemical.name || 'Réactif chimique'}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: .1, flexWrap: 'wrap' }}>
                              {/* Stock actuel */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Stock actuel : {chemical.quantity || 0}{chemical.unit || ''}
                                </Typography>
                                <ClickAwayListener onClickAway={() => {
                                  if (tooltipOpen.actual) handleTooltipToggle('actual')
                                }}>
                                  <div>
                                    <Tooltip 
                                      title="Quantité physique actuellement disponible dans l'inventaire"
                                      arrow
                                      open={tooltipOpen.actual}
                                      onClose={() => {
                                        if (tooltipOpen.actual) handleTooltipToggle('actual')
                                      }}
                                      disableHoverListener
                                      disableFocusListener
                                      disableTouchListener
                                    >
                                      <IconButton 
                                        size="small" 
                                        onClick={() => handleTooltipToggle('actual')}
                                        sx={{ p: 0.25 }}
                                      >
                                        <InfoOutlined sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </div>
                                </ClickAwayListener>
                              </Box>

                              {/* Stock prévisionnel */}
                              {chemical.quantityPrevision !== undefined && chemical.quantityPrevision !== chemical.quantity && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" color="warning.main">
                                    Stock prévisionnel : {chemical.quantityPrevision.toFixed(1)}{chemical.unit || ''}
                                  </Typography>
                                  <ClickAwayListener onClickAway={() => {
                                    if (tooltipOpen.prevision) handleTooltipToggle('prevision')
                                  }}>
                                    <div>
                                      <Tooltip 
                                        title="Quantité disponible après déduction de toutes les demandes en cours (événements futurs)"
                                        arrow
                                        open={tooltipOpen.prevision}
                                        onClose={() => {
                                          if (tooltipOpen.prevision) handleTooltipToggle('prevision')
                                        }}
                                        disableHoverListener
                                        disableFocusListener
                                        disableTouchListener
                                      >
                                        <IconButton 
                                          size="small" 
                                          onClick={() => handleTooltipToggle('prevision')}
                                          sx={{ p: 0.25 }}
                                        >
                                          <InfoOutlined sx={{ fontSize: 14, color: 'warning.main' }} />
                                        </IconButton>
                                      </Tooltip>
                                    </div>
                                  </ClickAwayListener>
                                </Box>
                              )}

                              {/* Stock après ce TP */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography 
                                  variant="caption" 
                                  color={stockAfterRequest < 0 ? 'error' : stockAfterRequest < (chemical.minQuantity || 0) ? 'warning.main' : 'success.main'}
                                >
                                  Après ce TP EDIT : {stockAfterRequest.toFixed(1)}{chemical.unit || ''}
                                </Typography>
                                <ClickAwayListener onClickAway={() => {
                                  if (tooltipOpen.after) handleTooltipToggle('after')
                                }}>
                                  <div>
                                    <Tooltip 
                                      title={
                                        stockAfterRequest < 0 
                                          ? "Stock insuffisant ! La quantité demandée dépasse le stock disponible"
                                          : stockAfterRequest < (chemical.minQuantity || 0)
                                          ? "Attention : le stock passera sous le seuil minimum recommandé"
                                          : "Stock restant après validation de ce TP"
                                      }
                                      arrow
                                      open={tooltipOpen.after}
                                      onClose={() => {
                                        if (tooltipOpen.after) handleTooltipToggle('after')
                                      }}
                                      disableHoverListener
                                      disableFocusListener
                                      disableTouchListener
                                    >
                                      <IconButton 
                                        size="small" 
                                        onClick={() => handleTooltipToggle('after')}
                                        sx={{ p: 0.25 }}
                                      >
                                        <InfoOutlined 
                                          sx={{ 
                                            fontSize: 14,
                                            color: stockAfterRequest < 0 ? 'error.main' : 
                                                  stockAfterRequest < (chemical.minQuantity || 0) ? 'warning.main' : 
                                                  'success.main'
                                          }} 
                                        />
                                      </IconButton>
                                    </Tooltip>
                                  </div>
                                </ClickAwayListener>
                              </Box>
                            </Box>
                          </Box>

                          <TextField
                            label={`Quantité (${chemical.unit || 'unité'})`}
                            type="number"
                            value={chemical.requestedQuantity || 1}
                            onChange={(e) => {
                              const newQuantity = parseFloat(e.target.value) || 1
                              const updatedChemicals = [...formData.chemicals]
                              updatedChemicals[index] = { ...chemical, requestedQuantity: newQuantity }
                              setFormData({ ...formData, chemicals: updatedChemicals })
                            }}
                            slotProps={{
                              htmlInput: {
                              min: 0.1,
                              step: 0.1,
                              max: availableStock
                              }
                            }}
                            sx={{ width: 130 }}
                            size="small"
                            error={chemical.requestedQuantity > availableStock}
                            helperText={
                              chemical.requestedQuantity > availableStock
                              ? 'Stock insuffisant' 
                              : ''
                            }
                            />

                          <IconButton
                            onClick={() => {
                              const updatedChemicals = formData.chemicals.filter((_, i) => i !== index)
                              setFormData({ ...formData, chemicals: updatedChemicals })
                            }}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )
                    })}
                  </Box>
                )}
              </Box>
              {/* INDICATEUR VISUEL ICI - Avertissement stock faible */}
              {formData.chemicals.some(c => {
                const availableStock = c.quantityPrevision !== undefined 
                  ? c.quantityPrevision 
                  : (c.quantity || 0)
                const stockAfterRequest = availableStock - (c.requestedQuantity || 0)
                return stockAfterRequest < (c.minQuantity || 0)
              }) && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Attention : Stock faible
                  </Typography>
                  <Typography variant="body2">
                    Certains réactifs chimiques seront en dessous de leur stock minimum après ce TP.
                  </Typography>
                  {/* Optionnel : Afficher les détails des réactifs concernés */}
                  <Box sx={{ mt: 1 }}>
                    {formData.chemicals
                      .filter(c => {
                        const availableStock = c.quantityPrevision !== undefined 
                          ? c.quantityPrevision 
                          : (c.quantity || 0)
                        const stockAfterRequest = availableStock - (c.requestedQuantity || 0)
                        return stockAfterRequest < (c.minQuantity || 0)
                      })
                      .map((c, index) => {
                        const availableStock = c.quantityPrevision !== undefined 
                          ? c.quantityPrevision 
                          : (c.quantity || 0)
                        const stockAfterRequest = availableStock - (c.requestedQuantity || 0)
                        return (
                          <Typography key={index} variant="caption" color="warning.dark" component="div">
                            • {c.name}: {stockAfterRequest.toFixed(1)}{c.unit} restants (minimum: {c.minQuantity || 0}{c.unit})
                          </Typography>
                        )
                      })
                    }
                  </Box>
                </Alert>
              )}
            </>
          )}

          {/* Afficher les erreurs d'upload s'il y en a */}
          {uploadErrors.length > 0 && (
            <Alert severity="error" onClose={() => setUploadErrors([])}>
              <Typography variant="body2" fontWeight="bold">
                Erreurs lors de l'upload :
              </Typography>
              {uploadErrors.map((error, index) => (
                <Typography key={index} variant="caption" display="block">
                  • {error}
                </Typography>
              ))}
            </Alert>
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
              onFileUploaded={handleFileUploaded}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || hasUploadingFiles}
          startIcon={hasUploadingFiles ? <CircularProgress size={20} /> : <Save />}
        >
          {hasUploadingFiles 
            ? `Upload en cours (${files.filter(f => f.uploadStatus === 'uploading').length} fichier(s))...` 
            : loading 
            ? 'Enregistrement...' 
            : 'Enregistrer'
          }
        </Button>
      </DialogActions>
    </Dialog>
  )
}