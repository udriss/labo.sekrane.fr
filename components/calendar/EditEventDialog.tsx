// components/calendar/EditEventDialog.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, IconButton,
  TextField, Button, FormControl, InputLabel, Select, MenuItem, Snackbar,
  Autocomplete, Chip, Alert, Collapse, Stack, Divider, InputAdornment,
  ClickAwayListener, Tooltip, CircularProgress, alpha, useTheme
} from '@mui/material'
import { 
  Close, Save, Warning, Science, Schedule, Assignment, EventAvailable,
  Add, Delete, InfoOutlined, School, SwapHoriz, CalendarToday, Edit
} from '@mui/icons-material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { fr } from 'date-fns/locale'
import { CalendarEvent, EventType } from '@/types/calendar'
import { TimeslotData, TimeslotProposal } from '@/types/timeslots'
import { useTimeslots } from '@/hooks/useTimeslots'
import { format, isSameDay } from 'date-fns'
import { normalizeClassField } from '@/lib/class-data-utils'
import { FileUploadSection } from './FileUploadSection'
import { RichTextEditor } from './RichTextEditor'
import { useSession } from 'next-auth/react'
import { useEventMove } from '@/lib/hooks/useEventMove'
import { normalizeRoomData, getRoomDisplayName, compareRoomData, serializeRoomData, type RoomData } from '@/lib/calendar-utils-client-room'
import { 
  createNewTimeSlot,
  updateTimeSlotWithTracking,
  checkAndSwapTimes,
  isEventOwner,
  convertApiTimeslotsToLocalSlots,
  convertLocalSlotsToProposals,
  processEventEdition,
  type LocalTimeSlot
} from '@/lib/timeslots-utils'
interface EditEventDialogProps {
  open: boolean
  event: CalendarEvent | null
  onClose: () => void
  onSave: (updatedEvent: Partial<CalendarEvent>) => Promise<void>
  materials: any[]
  chemicals: any[]
  classes: string[]
  isMobile?: boolean
  userClasses: { id: string, name: string }[]
  customClasses: { id: string, name: string }[]
  setCustomClasses: React.Dispatch<React.SetStateAction<{ id: string, name: string }[]>> 
  saveNewClass: (className: string, type?: 'predefined' | 'custom' | 'auto') => Promise<{ success: boolean; error?: string; data?: any }>
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
  userClasses,
  customClasses,
  saveNewClass,
  setCustomClasses,
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
  const [classInputValue, setClassInputValue] = useState<string>('');
  // Ajouter un état pour suivre les uploads
  const [hasUploadingFiles, setHasUploadingFiles] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [showCustomChemicalInfo, setShowCustomChemicalInfo] = useState(false)
  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null)

  // États pour les données spécifiques à la chimie
  const [disciplineMaterials, setDisciplineMaterials] = useState<any[]>([]);
  const [disciplineChemicals, setDisciplineChemicals] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingChemicals, setLoadingChemicals] = useState(false);
  
  // Room management state
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  
  const { data: session } = useSession();
  const theme = useTheme()
  
  // 🎯 NOUVEAU: Hook pour gérer les créneaux via l'API
  const { 
    timeslots: apiTimeslots, 
    loading: timelsotsLoading, 
    error: timelsotsError,
    getTimeslots,
    proposeTimeslots 
  } = useTimeslots()
  
  // Type des timeSlots locaux avec le nouveau type centralisé
  const [timeSlots, setTimeSlots] = useState<LocalTimeSlot[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'TP' as EventType,
    state: 'PENDING' as 'PENDING' | 'VALIDATED' | 'CANCELLED' | 'MOVED' | 'IN_PROGRESS',
    startDate: null as Date | null,
    endDate: null as Date | null,
    startTime: '',
    endTime: '',
    class_data: [] as { id: string, name: string, type: 'predefined' | 'custom' | 'auto' }[],
    room: null as RoomData | null, // Changé pour supporter les objets room
    materials: [] as any[],
    chemicals: [] as any[],
    location: ''
  })

  // Hook pour gérer les déplacements d'événements
  const { moveEvent, loading: moveLoading, error: moveError } = useEventMove()

  // useEffect pour détecter la présence de réactifs custom
  useEffect(() => {
    const hasCustomChemicals = formData.chemicals.some(c => c.isCustom)
    if (hasCustomChemicals) {
      setShowCustomChemicalInfo(true)
    }
  }, [formData.chemicals])

  // Surveiller l'état des uploads
  useEffect(() => {
    const uploading = files.some(f => f.uploadStatus === 'uploading')
    setHasUploadingFiles(uploading)
  }, [files])


  // Initialiser le formulaire avec les données de l'événement (sans legacy timeSlots)
  useEffect(() => {
    if (event) {
      console.log('🔍 Initialisation EditEventDialog avec event:', event)
      console.log('🔍 Event type:', event.type, 'typeof:', typeof event.type)
      console.log('🔍 Event class_data:', event.class_data, 'typeof:', typeof event.class_data)
      console.log('🔍 Event materials:', event.materials)
      console.log('🔍 Event chemicals:', event.chemicals)
      
      // Vérifier que l'événement a des créneaux horaires
      if (!event.timeSlots || event.timeSlots.length === 0) {
        throw new Error('Aucun créneau horaire trouvé pour cet événement')
      }

      // Utiliser le premier timeSlot pour initialiser les dates
      const firstSlot = event.timeSlots[0]
      const startDate = new Date(firstSlot.startDate)
      const endDate = new Date(firstSlot.endDate)

      // Préparer les matériels avec quantités (reste inchangé)
      const materialsWithQuantities = event.materials?.map((mat: any) => {
        if (typeof mat === 'object' && mat.quantity) {
          return mat
        }
        const foundMaterial = materials.find(m => m.id === mat)
        if (foundMaterial) {
          return { ...foundMaterial, quantity: 1 }
        }
        return { ...mat, quantity: 1 }
      }) || []

      // Préparer les réactifs chimiques avec quantités (reste inchangé)
      const chemicalsWithQuantities = event.chemicals?.map((chem: any) => {
        if (typeof chem === 'object' && chem.requestedQuantity) {
          return chem
        }
        const foundChemical = chemicals.find(c => c.id === chem)
        if (foundChemical) {
          return { ...foundChemical, requestedQuantity: 1 }
        }
        return { ...chem, requestedQuantity: 1 }
      }) || []

      // Normaliser les données de classe
      const normalizedClassData = normalizeClassField(event.class_data)
      const classDataArray = normalizedClassData ? [normalizedClassData] : []

      console.log('🔍 Matériaux traités:', materialsWithQuantities)
      console.log('🔍 Réactifs traités:', chemicalsWithQuantities)
      console.log('🔍 Classe normalisée:', classDataArray)

      // Initialiser avec les données de base de l'événement
      setFormData({
        title: event.title || '',
        state: event.state || 'PENDING',
        description: event.description || '',
        type: event.type || 'TP',
        startDate: startDate,
        endDate: endDate,
        startTime: format(startDate, 'HH:mm'),
        endTime: format(endDate, 'HH:mm'),
        class_data: classDataArray,
        room: normalizeRoomData(event.room),
        materials: materialsWithQuantities,
        chemicals: chemicalsWithQuantities,
        location: event.location || ''
      })

      // Initialiser les fichiers existants (reste inchangé)
      if (event.files && Array.isArray(event.files)) {
        setFiles(event.files.map((file, index) => ({
          id: `existing_${index}`,
          file: null,
          existingFile: file
        })))
      }

      // Initialiser les remarques
      setRemarks(event.remarks || '')

      // Les créneaux seront chargés séparément via l'API useTimeslots
      // Plus besoin d'initialiser timeSlots ici
    }
  }, [event, materials, chemicals])


  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Charger les données spécifiques à la chimie
  useEffect(() => {
    if (open) {
      loadChemistryData();
    }
  }, [open]);

  // 🎯 NOUVEAU: Charger les créneaux depuis l'API au lieu d'utiliser event.timeSlots
  useEffect(() => {
    if (open && event?.id) {
      console.log('🔍 [EditEventDialog] Tentative de chargement des créneaux pour event.id:', event.id)
      
      // Charger les créneaux depuis l'API
      getTimeslots(event.id, 'chimie', 'active')
        .then(apiTimeslots => {
          console.log('🔍 [EditEventDialog] Créneaux API reçus:', {
            count: apiTimeslots?.length || 0,
            timeslots: apiTimeslots,
            eventId: event.id
          })
          
          if (apiTimeslots && apiTimeslots.length > 0) {
            // Convertir les créneaux API vers le format local avec la fonction centralisée
            const formattedTimeSlots = convertApiTimeslotsToLocalSlots(apiTimeslots)

            setTimeSlots(formattedTimeSlots)
            setShowMultipleSlots(formattedTimeSlots.length > 1)
            
            console.log('✅ [EditEventDialog] Créneaux chargés depuis l\'API:', formattedTimeSlots.length)
          } else {
            console.warn('⚠️ [EditEventDialog] Aucun créneau trouvé via API')
            setTimeSlots([])
            setShowMultipleSlots(false)
          }
        })
        .catch(error => {
          console.error('❌ [EditEventDialog] Erreur lors du chargement des créneaux depuis l\'API:', error)
          setTimeSlots([])
          setShowMultipleSlots(false)
        })
    }
  }, [open, event?.id, getTimeslots, session?.user?.id])

  const loadChemistryData = async () => {
    try {
      // Charger les salles
      setLoadingRooms(true);
      try {
        const roomsResponse = await fetch('/api/rooms?useDatabase=true');
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          setRooms(roomsData.rooms || []);
        }
      } catch (error) {
        console.warn('Erreur lors du chargement des salles:', error);
        setRooms([]);
      }
      setLoadingRooms(false);

      // Charger les matériaux de chimie
      setLoadingMaterials(true);
      let materialsData = [];
      
      try {
        const response = await fetch('/api/chimie/equipement');
        if (response.ok) {
          materialsData = await response.json();
        }
      } catch (error) {
        console.warn('API équipements chimie indisponible');
      }

      
      setDisciplineMaterials(materialsData || []);
      setLoadingMaterials(false);

      // Charger les produits chimiques
      setLoadingChemicals(true);
      try {
        const chemicalsResponse = await fetch('/api/chimie/chemicals');
        if (chemicalsResponse.ok) {
          const chemicalsData = await chemicalsResponse.json();
          setDisciplineChemicals(chemicalsData.chemicals || []);
        }
      } catch (error) {
        console.warn('API produits chimiques indisponible');
        setDisciplineChemicals([]);
      }
      setLoadingChemicals(false);

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setDisciplineMaterials([]);
      setDisciplineChemicals([]);
      setLoadingMaterials(false);
      setLoadingChemicals(false);
    }
  };

  // Ajouter cette fonction après les autres fonctions helper
  const performTimeSwap = (index: number) => {
    setAnimatingSlot(index)
    const updatedSlots = [...timeSlots]
    const slot = updatedSlots[index]
    const temp = slot.startTime
    slot.startTime = slot.endTime
    slot.endTime = temp
    
    // Plus d'ajout automatique d'entrée modifiedBy - c'est l'API qui s'en charge maintenant
    
    setTimeSlots(updatedSlots)
    
    // Afficher un message pour informer l'utilisateur
    setSnackbar({
      open: true,
      message: 'Les heures ont été inversées (l\'heure de fin était avant l\'heure de début)',
      severity: 'info'
    })
    
    setTimeout(() => setAnimatingSlot(null), 1000)
  }

  // Gestion des créneaux - Ajout avec fonctions centralisées
  const addTimeSlot = () => {
    const newSlot = createNewTimeSlot(
      session?.user?.id || 'INDISPONIBLE',
      formData.startDate || undefined,
      formData.startTime || '08:00',
      formData.endTime || '10:00'
    )
    setTimeSlots([...timeSlots, newSlot])
  }

  const removeTimeSlot = (index: number) => {
    const activeSlots = timeSlots.filter(slot => slot.status !== 'deleted');
    if (activeSlots.length > 1) {
      const newTimeSlots = [...timeSlots]
      const slotToRemove = newTimeSlots[index]
      
      // Si c'est un slot existant (pas créé dans cette session), le marquer comme supprimé
      if (slotToRemove.isExisting) {
        slotToRemove.status = 'deleted'
        // Ne pas supprimer du tableau, juste marquer comme supprimé
        setTimeSlots(newTimeSlots)
      } else {
        // Si c'est un nouveau slot créé dans cette session, on peut le supprimer complètement
        const filteredSlots = timeSlots.filter((_, i) => i !== index)
        setTimeSlots(filteredSlots)
      }
    }
  }

  const updateTimeSlot = (index: number, field: 'date' | 'startTime' | 'endTime', value: any, checkSwap: boolean = true) => {
    const newTimeSlots = [...timeSlots]
    const updatedSlot = updateTimeSlotWithTracking(
      newTimeSlots[index],
      field,
      value,
      session?.user?.id || 'INDISPONIBLE'
    )
    
    newTimeSlots[index] = updatedSlot
    setTimeSlots(newTimeSlots)

    // Vérifier si on doit échanger les heures (seulement pour les champs de temps)
    if (checkSwap && field !== 'date') {
      const { needsSwap, swappedSlot } = checkAndSwapTimes(updatedSlot, (slot: LocalTimeSlot) => {
        // Callback appelé quand un échange est nécessaire
        setSnackbar({
          open: true,
          message: 'Les heures ont été inversées (l\'heure de fin était avant l\'heure de début)',
          severity: 'info'
        })
        
        // Mettre à jour avec le slot échangé
        const swappedTimeSlots = [...newTimeSlots]
        swappedTimeSlots[index] = slot
        setTimeSlots(swappedTimeSlots)
        
        // Déclencher l'animation
        setAnimatingSlot(index)
        setTimeout(() => setAnimatingSlot(null), 1000)
      })
    }
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

  const getSlotModificationSummary = (slot: any): string => {
    if (!slot.modifiedBy || slot.modifiedBy.length === 0) return '';
    
    const lastModification = slot.modifiedBy[slot.modifiedBy.length - 1];
    const modCount = slot.modifiedBy.filter((m: any) => m.action === 'modified').length;
    
    if (modCount > 0) {
      return `Modifié ${modCount} fois`;
    }
    return '';
  };


   // Callback pour gérer l'upload réussi d'un fichier
const handleFileUploaded = useCallback(async (fileId: string, uploadedFile: {
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
}) => {
  
  

    if (!event?.id) {
      console.warn('Pas d\'ID d\'événement pour persister le fichier')
      return
    }

    
    try {
      // Persister immédiatement le fichier dans l'événement (chimie)
      const response = await fetch(`/api/calendrier/chimie/add-file?id=${event.id}`, {
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

    const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setSnackbar({
        open: true,
        message: 'Le titre est requis',
        severity: 'error'
      })
      return
    }

    // Vérifier qu'il y a des uploads en cours
    if (hasUploadingFiles) {
      setSnackbar({
        open: true,
        message: 'Veuillez attendre la fin des uploads en cours',
        severity: 'warning'
      })
      return
    }

    setLoading(true)
    
    try {
      // 🎯 NOUVEAU: Traiter les créneaux via l'API avant la sauvegarde principale
      const hasTimeslotChanges = timeSlots.some(slot => 
        slot.wasModified || !slot.isExisting || slot.status === 'deleted'
      )

      if (hasTimeslotChanges && event?.id) {
        // Utiliser la fonction centralisée pour convertir les créneaux
        const timeslotProposals = convertLocalSlotsToProposals(
          timeSlots,
          event.id,
          'chimie',
          session?.user?.id || 'INDISPONIBLE'
        )

        if (timeslotProposals.length > 0) {
          try {
            await proposeTimeslots(event.id, 'chimie', timeslotProposals)

            console.log('✅ Créneaux proposés via API:', timeslotProposals.length)
            
            // Optionnel: Informer l'utilisateur
            setSnackbar({
              open: true,
              message: `${timeslotProposals.length} créneau(x) proposé(s) avec succès`,
              severity: 'success'
            })
          } catch (error) {
            console.warn('⚠️ Erreur lors de la proposition de créneaux via API:', error)
            setSnackbar({
              open: true,
              message: 'Erreur lors de la proposition de créneaux',
              severity: 'error'
            })
            return
          }
        }
      }

      // Utiliser notre nouvelle fonction centralisée pour traiter toutes les données
      const result = processEventEdition({
        formData,
        timeSlots,
        originalEvent: event,
        userId: session?.user?.id || 'INDISPONIBLE',
        files,
        remarks
      })

      // Vérifier la validation
      if (!result.validation.isValid) {
        setSnackbar({
          open: true,
          message: result.validation.errors.join(', '),
          severity: 'error'
        })
        return
      }

      // Afficher les avertissements s'il y en a
      if (result.validation.warnings.length > 0) {
        console.warn('Avertissements TimeSlots:', result.validation.warnings)
        // Optionnel : afficher les avertissements à l'utilisateur
        if (result.validation.warnings.some((w: string) => w.includes('avant 8h00') || w.includes('après 19h00'))) {
          setSnackbar({
            open: true,
            message: `Attention: ${result.validation.warnings.join(', ')}`,
            severity: 'warning'
          })
          // Continuer malgré les avertissements
        }
      }

      // Vérifier si l'utilisateur est propriétaire
      const isOwner = event ? isEventOwner(event, session?.user?.id, session?.user?.email) : false

      // Si seuls les créneaux ont changé et que l'utilisateur n'est pas propriétaire
      if (result.hasTimeslotChanges && !result.hasOtherChanges && !isOwner && event) {
        // Pour l'instant, continuer avec la sauvegarde normale
        // La logique de déplacement pourrait être implémentée ici si nécessaire
        console.log('Modification de créneaux uniquement par non-propriétaire - traitement normal')
      }

      // Utiliser l'API de mise à jour standard
      await onSave(result.dataToSave)
      handleClose()

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      setSnackbar({
        open: true,
        message: 'Erreur lors de la sauvegarde de l\'événement',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Réinitialiser le formulaire
    setFormData({
      title: '',
      description: '',
      state: 'PENDING',
      type: 'TP',
      startDate: null,
      endDate: null,
      startTime: '',
      endTime: '',
      class_data: [] as { id: string, name: string, type: 'predefined' | 'custom' | 'auto' }[],
      room: null, // Réinitialiser à null
      materials: [],
      chemicals: [],
      location: ''
    })
    setTimeSlots([])
    setShowMultipleSlots(false)
    setFiles([])
    setRemarks('')
    setChemicalsWithForecast([])
    setUploadErrors([])
    setSnackbar({ open: false, message: '', severity: 'info' })
    onClose()
  }

  if (!event) return null

  const isMultiDay = formData.startDate && formData.endDate && 
    formData.startDate.getDate() !== formData.endDate.getDate()


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
    <Dialog
      fullScreen={isMobile}
      open={open}
      onClose={handleClose}
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
          <Typography variant="h6">
            Modifier l'événement TEST
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
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
      
            <Box>
              <Box display="flex" alignItems="center" justifyContent="start" mb={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Créneaux horaires
                </Typography>
              </Box>

              {/* Message d'erreur si aucun créneau n'est trouvé */}
              {timeSlots.length === 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Aucun créneau trouvé pour cet événement
                  </Typography>
                  <Typography variant="body2">
                    Les créneaux de cet événement n'ont pas pu être récupérés depuis la base de données. 
                    Veuillez contacter l'administrateur ou essayer de recharger la page.
                  </Typography>
                </Alert>
              )}

              {/* Interface normale si des créneaux existent */}
              {timeSlots.length > 0 && (
                <>
                  <Alert severity="info"
                    icon={<InfoOutlined />}
                    lang='Ajouter des créneaux'
                    action={
                      <Button
                        startIcon={<Add />}
                        onClick={addTimeSlot}
                        color='success'
                        variant="outlined"
                        size="small"
                      >
                        Ajouter un créneau
                      </Button>
                    }
                    sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2">
                        Voulez-vous ajouter des créneaux supplémentaires pour cette séance TP ?
                      </Typography>
                    </Box>
                  </Alert>
                </>
              )}

              {timeSlots.map((slot, index) => {
                // Ne pas afficher les slots supprimés
                if (slot.status === 'deleted') return null;
                
                return (
                <Box 
                  key={index} 
                  mb={2}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: slot.isExisting ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    bgcolor: slot.isExisting ? alpha(theme.palette.primary.main, 0.05) : 'background.default',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    transform: animatingSlot === index ? 'scale(1.02)' : 'scale(1)',
                    '&::after': animatingSlot === index ? {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: 'warning.main',
                      animation: 'pulse 1s ease-out',
                      pointerEvents: 'none',
                      '@keyframes pulse': {
                        '0%': {
                          opacity: 1,
                          transform: 'scale(1)',
                        },
                        '100%': {
                          opacity: 0,
                          transform: 'scale(1.05)',
                        },
                      },
                    } : {}
                  }}
                >
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary" component="span">
                      Créneau {index + 1}
                    </Typography>
                    {slot.isExisting && (
                      <Chip label="Existant" size="small" color="primary" />
                    )}
                    {slot.wasModified && (
                      <Chip label="Modifié" size="small" color="secondary" />
                    )}
                  </Box>
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
                      onChange={(newValue) => {
                        // Correction du problème de timezone - s'assurer que la date est correcte
                        if (newValue) {
                          const correctedDate = new Date(newValue.getFullYear(), newValue.getMonth(), newValue.getDate(), 12, 0, 0)
                          updateTimeSlot(index, 'date', correctedDate)
                        } else {
                          updateTimeSlot(index, 'date', newValue)
                        }
                      }}
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
                          updateTimeSlot(index, 'startTime', `${hours}:${minutes}`, true) // true pour vérifier le swap
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
                          updateTimeSlot(index, 'endTime', `${hours}:${minutes}`, true) // true pour vérifier le swap
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
                        <SwapHoriz sx={{ fontSize: 48, color: 'rgba(255, 193, 7, 0.66)' }} />
                      </Box>
                    )}
                  </Box>
                </Box>
                );
              }).filter(Boolean)}

              {timeSlots.filter(slot => slot.status !== 'deleted').length > 1 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Attention : La modification créera {timeSlots.filter(slot => slot.status !== 'deleted').length - 1} événements supplémentaires.
                  </Typography>
                </Alert>
              )}
            </Box>

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
  options={[
    // D'abord les classes personnalisées
    ...customClasses,
    // Puis les classes prédéfinies
    ...userClasses.filter(c => !customClasses.some(cc => cc.id === c.id))
  ].filter((value, index, self) => self.findIndex(v => v.id === value.id) === index)}
  getOptionLabel={option => typeof option === 'string' ? option : option.name}
  value={
    typeof formData.class_data === 'string'
      ? null
      : userClasses.find(c => c.id === formData.class_data[0]?.id) ||
        customClasses.find(c => c.id === formData.class_data[0]?.id) ||
        null
  }
  onChange={async (_, newValue) => {
    if (!newValue) {
      setFormData({ ...formData, class_data: [] });
      return;
    }

    const selectedClass =
      typeof newValue === 'string'
        ? { id: `custom_${Date.now()}`, name: newValue }
        : newValue;

    setFormData({ ...formData, class_data: [{ ...selectedClass, type: 'custom' }] });

    // Vérifier si c'est une nouvelle classe personnalisée
    if (
      typeof newValue === 'string' ||
      (!userClasses.some(c => c.id === selectedClass.id) &&
        !customClasses.some(c => c.id === selectedClass.id))
    ) {
      try {
        const result = await saveNewClass(selectedClass.name, 'custom');
        if (result.success) {
          setCustomClasses(prev => [
            ...prev,
            { id: result.data.id, name: selectedClass.name }
          ]);
          setSnackbar({
            open: true,
            message: `Classe "${selectedClass.name}" ajoutée avec succès`,
            severity: 'success'
          });
        } else {
          setSnackbar({
            open: true,
            message: result.error || 'Erreur lors de l\'ajout de la classe',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Erreur inattendue:', error);
      }
    }
  }}
  inputValue={classInputValue || ''}
  onInputChange={(event, newInputValue) => {
    setClassInputValue(newInputValue);
  }}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Classe"
      placeholder="Sélectionnez ou saisissez une classe..."
      helperText={
        formData.class_data &&
        !userClasses.some(c => c.id === formData.class_data[0]?.id) &&
        customClasses.some(c => c.id === formData.class_data[0]?.id)
          ? "Classe personnalisée"
          : null
      }
    />
  )}
  renderOption={(props, option) => {
    const { key, ...otherProps } = props;
    const isCustom = customClasses.some(c => c.id === option.id);
    return (
      <li key={key} {...otherProps}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <School fontSize="small" color={isCustom ? "secondary" : "action"} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2">
              {option.name}
            </Typography>
            {isCustom && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                ID: {option.id}
              </Typography>
            )}
          </Box>
          {isCustom && (
            <Chip 
              label="Personnalisée" 
              size="small" 
              color="secondary" 
              sx={{ height: 20 }}
            />
          )}
        </Box>
      </li>
    );
  }}
  filterOptions={(options, state) => {
    const input = state.inputValue.toLowerCase();
    return options.filter(option => {
      const name = option.name.toLowerCase();
      return name.includes(input);
    });
  }}
  isOptionEqualToValue={(option, value) => option.id === value?.id}
/>

              <Autocomplete
                freeSolo
                options={rooms} // Utiliser directement les objets room
                loading={loadingRooms}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                value={formData.room}
                onChange={(event, newValue) => {
                  if (typeof newValue === 'string') {
                    // Si c'est une chaîne (texte libre), créer un objet room
                    setFormData({ 
                      ...formData, 
                      room: newValue ? { id: newValue, name: newValue } : null 
                    });
                  } else {
                    // Si c'est un objet room ou null
                    setFormData({ ...formData, room: newValue });
                  }
                }}
                onInputChange={(event, newInputValue) => {
                  // Pour freeSolo, permettre la saisie libre
                  if (newInputValue) {
                    setFormData({ 
                      ...formData, 
                      room: { id: newInputValue, name: newInputValue } 
                    });
                  } else {
                    setFormData({ ...formData, room: null });
                  }
                }}
                renderInput={(params) => (
                  <TextField
                  {...params}
                  fullWidth
                  label="Salle"
                  slotProps={{
                    input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                      {loadingRooms ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                      </>
                    ),
                    }
                  }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  const roomData = typeof option === 'string' 
                    ? rooms.find(room => room.name === option)
                    : option;
                  
                  return (
                    <li key={key} {...otherProps}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2">
                            {typeof option === 'string' ? option : option.name}
                          </Typography>
                          {roomData?.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              {roomData.description}
                            </Typography>
                          )}
                          {roomData?.capacity && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', ml: 1 }}>
                              Capacité: {roomData.capacity} personnes
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </li>
                  );
                }}
                isOptionEqualToValue={(option, value) => {
                  if (typeof option === 'string' && typeof value === 'string') {
                    return option === value;
                  }
                  if (typeof option === 'object' && typeof value === 'object' && option && value) {
                    return option.id === value.id;
                  }
                  return false;
                }}
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
                  options={Array.isArray(disciplineMaterials) ? disciplineMaterials : []}
                  loading={loadingMaterials}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') {
                      return option;
                    }
                    // Pour la chimie, l'objet a `itemName` et `volume`
                    return `${option.itemName || option.name || ''} ${option.volume ? `(${option.volume})` : ''}`.trim();
                  }}
                  value={null}
                  inputValue={materialInputValue || ''}
                  onInputChange={(event, newInputValue, reason) => {
                    if (reason !== 'reset') {
                      setMaterialInputValue(newInputValue);
                    }
                  }}
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'string') {
                      // Si c'est une string (texte libre), ne rien faire ici
                      return;
                    }
                    
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
                      helperText={loadingMaterials ? 'Chargement...' : undefined}
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
                      slotProps={{
                        input: {
                        ...params.InputProps,
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
                              sx={{ 
                              mr: -1,
                              "&:hover": {
                                color: 'success.main',
                                borderColor: 'primary.main',
                                borderRadius: '0%',
                              } 
                              }}
                            >
                              <AddIcon />
                              <Typography variant="body2" color="text.secondary">
                              Ajouter "{materialInputValue}"
                              </Typography>
                            </IconButton>
                            </InputAdornment>
                          )}
                          </>
                        ),
                        }
                      }}
                      />
                    )}
                    isOptionEqualToValue={(option, value) => 
                      (option.itemName || option.name) === (value.itemName || value.name)
                    }
                  // Grouper par catégorie et filtrer
                  filterOptions={(options, state) => {
                    // Obtenir les noms déjà sélectionnés
                    const selectedNames = formData.materials.map(m => m.itemName || m.name);
                    
                    // Filtrer les options non sélectionnées
                    const availableOptions = options.filter(option => {
                      const optionName = option.itemName || option.name;
                      return !selectedNames.includes(optionName);
                    });
                    
                    // Créer un Map pour garder uniquement la première occurrence de chaque nom
                    const uniqueByName = new Map();
                    availableOptions.forEach(option => {
                      const optionName = option.itemName || option.name;
                      if (!uniqueByName.has(optionName)) {
                        uniqueByName.set(optionName, option);
                      }
                    });
                    
                    // Convertir le Map en array
                    let uniqueOptions = Array.from(uniqueByName.values());
                    
                    // Appliquer le filtre de recherche
                    if (state.inputValue) {
                      uniqueOptions = uniqueOptions.filter(option => {
                        const label = `${option.itemName || option.name || ''} ${option.volume || ''}`.toLowerCase();
                        return label.includes(state.inputValue.toLowerCase());
                      });
                    }
                    
                    // Trier par catégorie puis par nom
                    uniqueOptions.sort((a, b) => {
                      const categoryA = a.categoryName || a.typeName || 'Sans catégorie';
                      const categoryB = b.categoryName || b.typeName || 'Sans catégorie';
                      
                      // D'abord par catégorie
                      if (categoryA !== categoryB) {
                        return categoryA.localeCompare(categoryB);
                      }
                      
                      // Puis par nom dans la même catégorie
                      const nameA = a.itemName || a.name || '';
                      const nameB = b.itemName || b.name || '';
                      return nameA.localeCompare(nameB);
                    });
                    
                    return uniqueOptions;
                  }}
                  groupBy={(option) => {
                    const category = option.categoryName || option.typeName || 'Sans catégorie';
                    return category;
                  }}
                  renderGroup={(params) => (
                    <li key={params.key}>
                      <Typography
                        component="div"
                        variant="caption"
                        sx={{
                          bgcolor: 'rgba(76, 175, 80, 0.1)', // Vert clair
                          color: 'success.main',
                          fontWeight: 'bold',
                          px: 2,
                          py: 1,
                          borderRadius: 1,
                          m: 1,
                          mb: 0
                        }}
                      >
                        {params.group}
                      </Typography>
                      <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
                    </li>
                  )}
                  renderOption={({ key, ...otherProps }, option) => (
                    <li key={key} {...otherProps} style={{ paddingLeft: '16px' }}>
                      {option.itemName || option.name || 'Matériel'}
                      {option.volume && ` (${option.volume})`}
                    </li>
                  )}
                  noOptionsText={
                    materialInputValue && materialInputValue.trim() 
                      ? "Aucun matériel trouvé. Cliquez sur + pour créer"
                      : "Aucun matériel disponible"
                  }
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
                            {typeof material === 'string' 
                              ? material 
                              : (material.itemName || material.name || 'Matériel')}
                            {typeof material === 'object' && material.volume && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                {' '}({material.volume})
                              </Typography>
                            )}
                            {typeof material === 'object' && material.isCustom && (
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
                            slotProps={{
                            htmlInput: {
                              min: 1
                            }
                            }}
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
                  options={Array.isArray(disciplineChemicals) ? disciplineChemicals : []}
                  loading={loadingChemicals}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    // Pour la chimie, affichage avec stock
                    const forecast = option.forecastQuantity !== undefined ? option.forecastQuantity : option.quantity;
                    return `${option.name || 'Réactif chimique'} - Stock: ${option.quantity || 0}${option.unit || ''} (Prévu: ${forecast}${option.unit || ''})`;
                  }}
                  
                  value={null}
                  inputValue={chemicalInputValue || ''}
                  onInputChange={(event, newInputValue) => {
                    setChemicalInputValue(newInputValue);
                  }}
                  onChange={(_, newValue) => {
                    if (newValue && !formData.chemicals.some((c) => c.id === newValue.id)) {
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
                      helperText={loadingChemicals ? 'Chargement...' : undefined}
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {params.InputProps.endAdornment}
                              {chemicalInputValue && chemicalInputValue.trim() && 
                              !disciplineChemicals.some(c => c.name?.toLowerCase() === chemicalInputValue.trim().toLowerCase()) && (
                                <InputAdornment position="end">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const trimmedValue = chemicalInputValue.trim();
                                      
                                      // Créer un réactif personnalisé
                                      const customItem = {
                                        id: `CHEM_${Date.now()}_CUSTOM`,
                                        name: trimmedValue,
                                        quantity: 0,
                                        unit: 'g', // Unité par défaut
                                        requestedQuantity: 1,
                                        isCustom: true,
                                      };
                                      
                                      // Ajouter l'élément personnalisé à la liste
                                      if (!formData.chemicals.some(c => c.name === trimmedValue)) {
                                        setFormData({ 
                                          ...formData, 
                                          chemicals: [
                                            ...formData.chemicals,
                                            customItem
                                          ]
                                        });
                                        
                                        // Réinitialiser l'input
                                        setChemicalInputValue('');
                                        
                                        // Retirer le focus
                                        (document.activeElement as HTMLElement)?.blur();
                                        
                                        // Afficher une notification
                                        setSnackbar({
                                          open: true,
                                          message: `Réactif personnalisé "${trimmedValue}" ajouté`,
                                          severity: 'info'
                                        });
                                      }
                                    }}
                                    edge="end"
                                    sx={{ 
                                      mr: -1,
                                      bgcolor: 'action.hover',
                                      borderRadius: 1,
                                      px: 1,
                                      "&:hover": {
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        '& .MuiTypography-root': {
                                          color: 'white',
                                        }
                                      } 
                                    }}
                                  >
                                    <Add fontSize="small" />
                                    <Typography 
                                      variant="caption" 
                                      color="text.secondary"
                                      sx={{ ml: 0.5, mr: 0.5 }}
                                    >
                                      Ajouter "{chemicalInputValue}"
                                    </Typography>
                                  </IconButton>
                                </InputAdornment>
                              )}
                            </>
                          ),
                        }
                      }}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...other } = props;
                    return (
                      <li 
                        key={key} 
                        {...other} 
                        style={{ 
                          paddingLeft: 16
                        }}
                      >
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Science fontSize="small" color="action" />
                            <Typography variant="body2">
                              {option.name}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Stock actuel : {option.quantity || 0}{option.unit || ''}
                            </Typography>
                            {option.forecastQuantity !== undefined && (
                              <Typography 
                                variant="caption" 
                                color={option.forecastQuantity < (option.minQuantity || 0) ? 'error' : 'text.secondary'}
                              >
                                Stock prévu : {option.forecastQuantity?.toFixed(1)}{option.unit || ''}
                                {option.totalRequested > 0 && ` (-${option.totalRequested}${option.unit || ''})`}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </li>
                    );
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  filterOptions={(options, state) => {
                    const selectedIds = formData.chemicals.map(c => c.id);
                      
                    const availableOptions = options.filter(option => 
                      !selectedIds.includes(option.id)
                    );
                    
                    // Supprimer les doublons basés sur l'ID
                    const uniqueByName = new Map();
                    availableOptions.forEach(option => {
                      if (!uniqueByName.has(option.name)) {
                        uniqueByName.set(option.name, option);
                      }
                    });
                    
                    let uniqueOptions = Array.from(uniqueByName.values());
                    
                    // Appliquer le filtre de recherche
                    if (state.inputValue) {
                      uniqueOptions = uniqueOptions.filter(option => {
                        const label = `${option.name || ''} ${option.quantity || ''} ${option.unit || ''}`.toLowerCase();
                        return label.includes(state.inputValue.toLowerCase());
                      });
                    }
                    
                    // Trier par nom
                    uniqueOptions.sort((a, b) => {
                      const nameA = a.name || '';
                      const nameB = b.name || '';
                      return nameA.localeCompare(nameB);
                    });
                    
                    return uniqueOptions;
                  }}
                  // Pas de groupement pour la chimie
                  groupBy={undefined}
                  renderGroup={undefined}
                  noOptionsText={chemicalInputValue ? 
                    "Aucun réactif trouvé" : 
                    "Tapez pour rechercher"
                  }
                />


{/* Liste des réactifs chimiques sélectionnés avec quantités */}
{formData.chemicals.length > 0 && (
  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
    {formData.chemicals.map((chemical, index) => {
      // Créer une clé unique pour ce chemical
      const tooltipKey = `formChemical-${chemical.id || index}`
      const tooltipOpen = tooltipStates[tooltipKey] || { actual: false, prevision: false, after: false }
      
      // Vérifier si c'est un réactif personnalisé
      const isCustomChemical = chemical.isCustom || chemical.id?.endsWith('_CUSTOM')
      
      // Utiliser quantityPrevision si disponible, sinon quantity
      const availableStock = isCustomChemical ? Infinity : (chemical.quantityPrevision !== undefined 
        ? chemical.quantityPrevision 
        : (chemical.quantity || 0))
      
      const stockAfterRequest = isCustomChemical ? null : (availableStock - (chemical.requestedQuantity || 0))
      
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
            borderColor: isCustomChemical ? 'secondary.main' : 'divider',
            borderRadius: 1,
            backgroundColor: isCustomChemical ? alpha(theme.palette.secondary.main, 0.05) : 'background.paper'
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2">
                {chemical.name || 'Réactif chimique'}
              </Typography>
              {isCustomChemical && (
                <Chip 
                  label="Personnalisé" 
                  size="small" 
                  color="secondary" 
                  icon={<Science fontSize="small" />}
                  sx={{ height: 22 }}
                />
              )}
            </Box>
            
            {/* Affichage différent pour les réactifs personnalisés */}
            {isCustomChemical ? (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Réactif non référencé dans l'inventaire
              </Typography>
            ) : (
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
                      slotProps={{
                        popper: {
                        disablePortal: true,
                        },
                      }}
                      >
                      <Box component="span" sx={{ display: 'inline-block' }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleTooltipToggle('actual')}
                          sx={{ p: 0.25 }}
                          disableRipple={false}
                        >
                          <InfoOutlined sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    </Tooltip>
                  </div>
                  </ClickAwayListener>
                </Box>

                {/* Stock prévisionnel */}
                {chemical.quantityPrevision !== undefined && chemical.quantityPrevision !== chemical.quantity && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="warning.main">
                      Stock prévisionnel : {typeof chemical.quantityPrevision === 'number' ? chemical.quantityPrevision.toFixed(1) : chemical.quantityPrevision}{chemical.unit || ''}
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
                        slotProps={{
                        popper: {
                        disablePortal: true,
                        },
                      }}
                      >
                        <Box component="span" sx={{ display: 'inline-flex' }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleTooltipToggle('prevision')}
                            sx={{ p: 0.25 }}
                          >
                            <InfoOutlined sx={{ fontSize: 14, color: 'warning.main' }} />
                          </IconButton>
                        </Box>
                      </Tooltip>
                    </div>
                    </ClickAwayListener>
                  </Box>
                )}

                {/* Stock après ce TP */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography 
                    variant="caption" 
                    color={stockAfterRequest !== null && stockAfterRequest < 0 ? 'error' : stockAfterRequest !== null && stockAfterRequest < (chemical.minQuantity || 0) ? 'warning.main' : 'success.main'}
                  >
                    Après ce TP : {stockAfterRequest !== null && typeof stockAfterRequest === 'number' ? stockAfterRequest.toFixed(1) : 'N/A'}{chemical.unit || ''}
                  </Typography>
                  <ClickAwayListener onClickAway={() => {
                    if (tooltipOpen.after) handleTooltipToggle('after')
                  }}>
                    <div>
                      <Tooltip 
                        title={
                          stockAfterRequest !== null && stockAfterRequest < 0 
                            ? "Stock insuffisant ! La quantité demandée dépasse le stock disponible"
                            : stockAfterRequest !== null && stockAfterRequest < (chemical.minQuantity || 0)
                            ? "Attention : le stock passera sous le seuil minimum recommandé"
                            : "Stock restant après validation de ce TP"
                        }
                        arrow
                        slotProps={{
                        popper: {
                        disablePortal: true,
                        },
                      }}
                        open={tooltipOpen.after}
                        onClose={() => {
                          if (tooltipOpen.after) handleTooltipToggle('after')
                        }}
                        disableHoverListener
                        disableFocusListener
                        disableTouchListener
                      >
                        <Box component="span" sx={{ display: 'inline-flex' }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleTooltipToggle('after')}
                          sx={{ p: 0.25 }}
                        >
                          <InfoOutlined 
                            sx={{ 
                              fontSize: 14,
                              color: stockAfterRequest !== null && stockAfterRequest < 0 ? 'error.main' : 
                                    stockAfterRequest !== null && stockAfterRequest < (chemical.minQuantity || 0) ? 'warning.main' : 
                                    'success.main'
                            }} 
                          />
                        </IconButton>
                        </Box>
                      </Tooltip>
                    </div>
                  </ClickAwayListener>
                </Box>
              </Box>
            )}
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
                // Pas de limite max pour les réactifs personnalisés
                ...(isCustomChemical ? {} : {})
              }
            }}
            sx={{ width: 130 }}
            size="small"
            error={!isCustomChemical && chemical.requestedQuantity > availableStock}
            helperText={
              !isCustomChemical && chemical.requestedQuantity > availableStock
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
{formData.chemicals
  .filter(c => !(c.isCustom || c.id?.endsWith('_CUSTOM')))// Exclure les réactifs custom
  .some(c => {
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
    {/* Détails des réactifs concernés */}
    <Box sx={{ mt: 1 }}>
      {formData.chemicals
        .filter(c => !(c.isCustom || c.id?.endsWith('_CUSTOM')))// Exclure les réactifs custom
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
              • {c.name}: {typeof stockAfterRequest === 'number' ? stockAfterRequest.toFixed(1) : stockAfterRequest}{c.unit} restants (minimum: {c.minQuantity || 0}{c.unit})
            </Typography>
          )
        })
      }
    </Box>
  </Alert>
)}

{/* Snackbar pour informer de la présence de réactifs custom */}
<Snackbar
  open={showCustomChemicalInfo}
  autoHideDuration={6000}
  onClose={() => setShowCustomChemicalInfo(false)}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
>
  <Alert 
    onClose={() => setShowCustomChemicalInfo(false)} 
    severity="info" 
    sx={{ width: '100%',  }}
  >
    <Typography variant="body2" fontWeight="bold">
      Demande personnalisée détectée
    </Typography>
    <Typography variant="body2">
      {(() => {
        const customChemicals = formData.chemicals.filter(c => c.isCustom)
        const count = customChemicals.length
        if (count === 1) {
          return `Le réactif "${customChemicals[0].name}" est une demande personnalisée qui sera traitée manuellement.`
        } else {
          return `${count} réactifs sont des demandes personnalisées qui seront traitées manuellement.`
        }
      })()}
    </Typography>
  </Alert>
</Snackbar>
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
        <Button onClick={handleClose}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || hasUploadingFiles}
          startIcon={loading ? <CircularProgress size={20} /> : <Save />}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
    </LocalizationProvider>
  )
}