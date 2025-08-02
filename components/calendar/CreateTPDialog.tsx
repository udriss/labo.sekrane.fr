// components/calendar/CreateTPDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, IconButton,
  Stepper, Step, StepLabel, StepContent, Button, TextField,
  Card, Chip, Autocomplete, useMediaQuery, useTheme,
  Alert, Collapse, Stack, InputAdornment, Tooltip, ClickAwayListener,
  Snackbar, Alert as MuiAlert, Slide,
  Grid
} from '@mui/material'
import { 
  Add, Close, Upload, Class, Assignment, Save, Delete, Science, SwapHoriz,
  Warning, CloudUpload, School, Clear, InfoOutlined, HourglassTop
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { fr } from 'date-fns/locale'
import { FileUploadSection } from './FileUploadSection'
import { RichTextEditor } from './RichTextEditor'
import { FileWithMetadata } from '@/types/global'
import { CalendarEvent } from '@/types/calendar'
import { useSession } from "next-auth/react"



interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface CreateTPDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  materials: any[]
  chemicals: any[]
  userClasses: string[]
  customClasses: string[]
  setCustomClasses: React.Dispatch<React.SetStateAction<string[]>> 
  saveNewClass: (className: string, type?: 'predefined' | 'custom' | 'auto') => Promise<{ success: boolean; error?: string; data?: any }>
  tpPresets: any[]
  eventToCopy?: CalendarEvent | null // NOUVEAU: événement à copier
  isMobile?: boolean
  discipline?: 'chimie' | 'physique' // NOUVEAU: discipline pour déterminer l'API à utiliser
}
  interface Stats {
    expired: string;
    inStock: string;
    lowStock: string;
    outOfStock: string;
    total: number;
  }

  interface PhysicsConsumable {
    id: string;
    name: string;
    physics_consumable_type_id: string;
    physics_consumable_item_id: string;
    barcode: string | null;
    batchNumber: string | null;
    brand: string | null;
    createdAt: string;
    expirationDate: string | null;
    item_description: string;
    item_name: string;
    location: string;
    minQuantity: string;
    model: string | null;
    notes: string | null;
    orderReference: string | null;
    purchaseDate: string | null;
    quantity: string;
    room: string;
    specifications: string | null;
    status: string;
    storage: string | null;
    supplierId: string | null;
    supplier_name: string | null;
    type_color: string;
    type_name: string;
    categoryName: string; 
    unit: string;
    updatedAt: string;
  }

export function CreateTPDialog({
  open,
  onClose,
  onSuccess,
  materials,
  chemicals,
  userClasses,
  customClasses,
  setCustomClasses,
  saveNewClass,
  tpPresets,
  eventToCopy,
  isMobile = false,
  discipline = 'chimie' // Par défaut chimie pour la compatibilité
}: CreateTPDialogProps) {
  const theme = useTheme()

  
  const [activeStep, setActiveStep] = useState(0)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'manual' | 'preset' | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [remarks, setRemarks] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [materialInputValue, setMaterialInputValue] = useState('');
  const [chemicalInputValue, setChemicalInputValue] = useState('');
  const [consommableInputValue, setConsommableInputValue] = useState('');
  const [swapMessage, setSwapMessage] = useState<string | null>(null)
  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null)
  const [tooltipStates, setTooltipStates] = useState<{[key: string]: {actual: boolean, prevision: boolean, after: boolean}}>({})
  const [pendingSwap, setPendingSwap] = useState<{index: number, field: keyof TimeSlot, value: string} | null>(null)
  const [classInputValue, setClassInputValue] = useState<string>('');

  // États pour les données spécifiques à chaque discipline
  const [disciplineMaterials, setDisciplineMaterials] = useState<any[]>([]);
  const [disciplineChemicals, setDisciplineChemicals] = useState<any[]>([]);
  const [physicsInventoryData, setPhysicsInventoryData] = useState<{
    consumables: PhysicsConsumable[];
    stats: Stats;
  } | null>(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingChemicals, setLoadingChemicals] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    timeSlots: [{ date: '', startTime: '', endTime: '' }] as { date: string; startTime: string; endTime: string }[],
    classes: [] as string[],
    materials: [] as any[],
    chemicals: [] as any[],
    consommables: [] as any[]
  })

  // Pre-fill form data when copying an event
  useEffect(() => {
    if (eventToCopy && open) {
      setFormData({
        title: `Copie - ${eventToCopy.title}`,
        description: eventToCopy.description || '',
        date: '',
        timeSlots: eventToCopy.timeSlots?.map(slot => {
          // Extract time from ISO date strings
          const startTime = slot.startDate ? new Date(slot.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
          const endTime = slot.endDate ? new Date(slot.endDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
          return {
            date: '',
            startTime,
            endTime
          };
        }) || [{ date: '', startTime: '', endTime: '' }],
        classes: eventToCopy.class ? [eventToCopy.class] : [],
        materials: eventToCopy.materials || [],
        chemicals: eventToCopy.chemicals || [],
        consommables: discipline === 'physique' ? (eventToCopy.chemicals || []) : []
      })
    } else if (!eventToCopy && open) {
      // Reset form when not copying
      setFormData({
        title: '',
        description: '',
        date: '',
        timeSlots: [{ date: '', startTime: '', endTime: '' }],
        classes: [],
        materials: [],
        chemicals: [],
        consommables: []
      })
    }
  }, [eventToCopy, open])

  // Charger les données spécifiques à la discipline
  useEffect(() => {
    if (open && discipline) {
      loadDisciplineData();
    }
  }, [open, discipline]);

  const loadDisciplineData = async () => {
    try {
      // Charger les matériaux/équipements
      setLoadingMaterials(true);
      let materialsEndpoint = discipline === 'physique' ? '/api/physique/equipement' : '/api/chimie/equipement';
      let materialsData = [];
      
      // Essayer d'abord l'API spécifique physique, sinon fallback vers l'API générale
      try {
        const response = await fetch(materialsEndpoint);
        if (response.ok) {
          materialsData = await response.json();
        }
      } catch (error) {
        console.warn(`API ${materialsEndpoint} indisponible`);
      }

      
      setDisciplineMaterials(materialsData || []);
      setLoadingMaterials(false);

      // Charger les produits chimiques/composants
      setLoadingChemicals(true);
      let consommablesData = [];
      
      if (discipline === 'physique') {
        // Pour la physique, essayer l'API spécifique ou utiliser des données vides
        try {
          const physiqueChemResponse = await fetch('/api/physique/consommables');
          if (physiqueChemResponse.ok) {
            consommablesData = await physiqueChemResponse.json();
          } else {
            // Pour la physique, on peut avoir une liste vide ou des composants génériques
            consommablesData = [];
          }
        } catch (error) {
          console.warn('API composants physique non disponible');
          consommablesData = [];
        }
        setPhysicsInventoryData(consommablesData);
      } else {
        // Pour la chimie, utiliser l'API standard
        const chemicalsResponse = await fetch('/api/chimie/chemicals');
        if (chemicalsResponse.ok) {
          const chemicalsData = await chemicalsResponse.json();
          consommablesData = chemicalsData.chemicals || []; // Extraire la propriété chemicals
        }
        setDisciplineChemicals(consommablesData || []);
      }
      console.log(`Données de la discipline chargées [[[${discipline}]]]:`, { consommablesData });
      
      setLoadingChemicals(false);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setDisciplineMaterials([]);
      setDisciplineChemicals([]);
      setPhysicsInventoryData(null);
      setLoadingMaterials(false);
      setLoadingChemicals(false);
    }
  };

  const tmp = discipline === 'physique' ? physicsInventoryData : disciplineChemicals;
  console.log(`Données [[[[[[[[${discipline}]]]]]]]]:`, tmp);

  // Correction du style pour RichTextEditor
  const richTextEditorStyles = {
    '& p.is-editor-empty:first-of-type::before': {
      color: 'text.secondary',
      content: 'attr(data-placeholder)',
      float: 'left',
      height: 0,
      pointerEvents: 'none',
    }
  }

  const { data: session } = useSession();

  const getOutsideBusinessHoursWarnings = () => {
    const warnings: string[] = []
    
    formData.timeSlots.forEach((slot, index) => {
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
    
    return warnings
  }

  const handleStepNext = () => setActiveStep((prevStep) => prevStep + 1)
  const handleStepBack = () => setActiveStep((prevStep) => prevStep - 1)
  
  // Permettre la navigation libre entre les steps
  const handleStepClick = (stepIndex: number) => {
    setActiveStep(stepIndex)
  }

  const handleFormDataChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setActiveStep(0)
    setUploadMethod(null)
    setSelectedPreset(null)
    setFiles([])
    setRemarks('')
    setDragOver(false)
    setFormData({
      title: '',
      description: '',
      date: '',
      timeSlots: [{ date: '', startTime: '', endTime: '' }],
      classes: [],
      materials: [],
      chemicals: [],
      consommables: []
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handlePresetSelect = (preset: any) => {
    setSelectedPreset(preset)
    setUploadMethod('preset')
    handleFormDataChange('title', preset.nom)
    handleFormDataChange('description', preset.description || '')
    handleFormDataChange('materials', preset.materials.map((m: any) => m.material))
    handleFormDataChange('chemicals', preset.chemicals.map((c: any) => c.chemical))
  }

  // Gestion des créneaux horaires
  const addTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [...formData.timeSlots, { date: '', startTime: '', endTime: '' }]
    })
  }

  const removeTimeSlot = (index: number) => {
    if (formData.timeSlots.length > 1) {
      const newTimeSlots = formData.timeSlots.filter((_, i) => i !== index)
      setFormData({
        ...formData,
        timeSlots: newTimeSlots
      })
    }
  }

// Modifiez la fonction updateTimeSlot pour séparer la mise à jour de la vérification d'inversion
const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string, shouldCheckSwap: boolean = true) => {
  const newTimeSlots = [...formData.timeSlots]
  const currentSlot = { ...newTimeSlots[index] }
  
  // Toujours mettre à jour la valeur immédiatement
  currentSlot[field] = value
  newTimeSlots[index] = currentSlot
  setFormData({ ...formData, timeSlots: newTimeSlots })
  
  // Vérifier l'inversion seulement si demandé
  if (shouldCheckSwap && currentSlot.startTime && currentSlot.endTime) {
    const start = new Date(`2000-01-01T${currentSlot.startTime}`)
    const end = new Date(`2000-01-01T${currentSlot.endTime}`)
    
    if (end < start) {
      // Effectuer l'inversion
      performTimeSwap(index)
    }
  }
}

const performTimeSwap = (index: number) => {
  // Démarrer l'animation
  setAnimatingSlot(index)
  
  // Effectuer le swap après un petit délai pour que l'animation commence
  setTimeout(() => {
    const updatedSlots = [...formData.timeSlots]
    const slot = updatedSlots[index]
    
    // Swap des valeurs et s'assurer qu'elles ne sont pas null/undefined
    const tempStartTime = slot.startTime
    const tempEndTime = slot.endTime
    
    // Effectuer l'échange complet des valeurs
    slot.startTime = tempEndTime || ''
    slot.endTime = tempStartTime || ''
    
    // Forcer la mise à jour du state avec les nouvelles valeurs
    setFormData(prev => ({ ...prev, timeSlots: updatedSlots }))
    
    // Déclencher une re-render pour s'assurer que les TimePickers sont mis à jour
    setTimeout(() => {
      setFormData(prev => ({ ...prev, timeSlots: [...updatedSlots] }))
    }, 50)
  }, 300) // Délai pour laisser l'animation démarrer
  
  // Arrêter l'animation
  setTimeout(() => setAnimatingSlot(null), 600)
}

  // Fonction pour appliquer l'échange en attente
  const applyPendingSwap = () => {
    if (pendingSwap) {
      updateTimeSlot(pendingSwap.index, pendingSwap.field, pendingSwap.value, true)
      setPendingSwap(null)
    }
  }

const handleCreateCalendarEvent = async () => {
  try {
    setLoading(true)

    for (const slot of formData.timeSlots) {
      if (!slot.date || !slot.startTime || !slot.endTime) {
        throw new Error("Date, heure de début ou heure de fin manquante pour un créneau.")
      }
    }

    // Filtrer les réactifs non-custom pour la vérification des quantités
    const nonCustomChemicals = formData.chemicals.filter(c => !c.isCustom)
    const nonCustomConsommables = formData.consommables?.filter(c => !c.isCustom) || []
    
    // Vérifier les quantités de réactifs chimiques (uniquement pour les non-custom et chimie)
    if (discipline !== 'physique') {
      const insufficientChemicals = nonCustomChemicals.filter(c => 
        c.requestedQuantity > (c.quantity || 0)
      )
      if (insufficientChemicals.length > 0) {
        throw new Error("Certains réactifs chimiques ont des quantités insuffisantes en stock.")
      }
    } else {
      // Pour la physique, on permet de dépasser le stock des consommables
      // Pas de vérification restrictive sur les quantités
    }

    // Préparer les données des fichiers avec le contenu uploadé
    const filesData = files
      .filter(f => f.uploadStatus === 'completed' && f.file)
      .map(f => ({
        fileName: f.file!.name,
        fileSize: f.file!.size,
        fileType: f.file!.type,
        fileUrl: f.fileContent,
        uploadedAt: new Date().toISOString()
      }))

    // Vérifier si tous les fichiers sont uploadés
    const uploadingFiles = files.filter(f => f.uploadStatus === 'uploading')
    if (uploadingFiles.length > 0) {
      throw new Error("Veuillez attendre la fin du téléchargement de tous les fichiers.")
    }

    // Vérifier s'il y a des erreurs d'upload
    const errorFiles = files.filter(f => f.uploadStatus === 'error')
    if (errorFiles.length > 0) {
      throw new Error(`Erreur lors du téléchargement de ${errorFiles.length} fichier(s). Veuillez les supprimer ou réessayer.`)
    }

    
    const eventData = {
      title: session?.user?.name || formData.title || 'Séance TP',
      description: formData.description,
      type: 'TP',
      classes: formData.classes,
      // Envoyer l'objet complet pour les matériels
      materials: formData.materials.map((m) => ({
        id: m.id,
        name: m.itemName || m.name || '',
        quantity: m.quantity || 1,
        isCustom: m.isCustom || false,
        volume: m.volume || null
      })),
      // Pour la physique, utiliser "consommables", pour la chimie utiliser "chemicals"
      ...(discipline === 'physique' ? {
        consommables: formData.consommables?.map((c) => ({
          id: c.id,
          name: c.name || '',
          requestedQuantity: c.requestedQuantity || 1,
          unit: c.unit || '',
          quantity: c.quantity || 0,  // Stock disponible
          isCustom: c.isCustom || false  // Ajouter le flag isCustom
        })) || []
      } : {
        chemicals: formData.chemicals.map((c) => ({
          id: c.id,
          name: c.name || '',
          requestedQuantity: c.requestedQuantity || 1,
          unit: c.unit || '',
          quantity: c.quantity || 0,  // Stock disponible
          isCustom: c.isCustom || false  // Ajouter le flag isCustom
        }))
      }),
      files: filesData,
      remarks: remarks,
      date: formData.timeSlots[0].date,
      timeSlots: formData.timeSlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime
      }))
    }

    // Créer l'événement
    const apiEndpoint = discipline === 'physique' ? '/api/calendrier/physique' : '/api/calendrier/chimie'
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Erreur lors de la création des événements')
    }

    // Mettre à jour les quantités prévisionnelles uniquement pour les réactifs non-custom
    if (discipline === 'physique' && nonCustomConsommables.length > 0) {
      // Pour la physique, on pourrait avoir une API dédiée ou gérer différemment
      // Pour l'instant, on peut ignorer la mise à jour des prévisions car on permet de dépasser le stock
    } else if (discipline !== 'physique' && nonCustomChemicals.length > 0) {
      const updateResponse = await fetch('/api/chimie/chemicals/update-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chemicals: nonCustomChemicals.map(c => ({
            id: c.id,
            requestedQuantity: c.requestedQuantity || 1
          }))
        })
      })

      if (!updateResponse.ok) {
        console.error('Erreur lors de la mise à jour des quantités prévisionnelles')
        // Ne pas bloquer la création de l'événement si la mise à jour échoue
      }
    }
    
    handleClose()
    onSuccess()
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error)
    alert(error instanceof Error ? error.message : 'Erreur lors de la création')
  } finally {
    setLoading(false)
  }
}
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
    <>
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
            <Typography variant="h6">
              {eventToCopy ? 'Copier la séance TP' : 'Ajouter une nouvelle séance TP'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper 
          activeStep={activeStep} 
          orientation="vertical"
          nonLinear
        >
          {/* Étape 1: Méthode de création */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(0)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Méthode d'ajout</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choisissez comment vous souhaitez créer votre séance TP
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" gap={2} flexWrap="wrap">
                  {/* Carte pour l'import de fichier */}
                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: uploadMethod === 'file' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'file' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 8px)' },
                      minWidth: { xs: 'auto', sm: '250px' }
                    }}
                    onClick={() => setUploadMethod('file')}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <CloudUpload color={uploadMethod === 'file' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                      <Typography variant="h6">Importer des fichiers TP</Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        {files.length > 0 ? `${files.length} fichier${files.length > 1 ? 's' : ''} sélectionné${files.length > 1 ? 's' : ''}` : 
                         "Cliquez pour sélectionner"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" textAlign="center">
                        PDF, Word, Images acceptés • Max 5 fichiers
                      </Typography>
                    </Box>
                  </Card>

                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: uploadMethod === 'manual' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'manual' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 8px)' },
                      minWidth: { xs: 'auto', sm: '250px' }
                    }}
                    onClick={() => setUploadMethod('manual')}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <Assignment color={uploadMethod === 'manual' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                      <Typography variant="h6">Création manuelle</Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Saisissez manuellement les informations du TP
                      </Typography>
                    </Box>
                  </Card>

                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: uploadMethod === 'preset' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'preset' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 8px)' },
                      minWidth: { xs: 'auto', sm: '250px' }
                    }}
                    onClick={() => setUploadMethod('preset')}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                            <Class color={uploadMethod === 'preset' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                      <Typography variant="h6">TP Preset</Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Utiliser un modèle de TP prédéfini
                      </Typography>
                    </Box>
                  </Card>
                </Box>
              </Box>

              {/* Utilisation de FileUploadSection pour l'upload de fichiers */}
              {uploadMethod === 'file' && (
                <Box sx={{ mt: 3 }}>
                  <FileUploadSection
                    files={files}
                    onFilesChange={setFiles}
                    maxFiles={5}
                    maxSizePerFile={10}
                    acceptedTypes={['.pdf', '.doc', '.docx', '.odt', '.jpg',
                       '.jpeg', '.png', '.gif', '.txt', '.svg', ]}
                  />
                </Box>
              )}

              {uploadMethod === 'preset' && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Choisir un TP Preset</Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(300px, 1fr))' }, 
                    gap: 2, 
                    maxHeight: '400px', 
                    overflowY: 'auto' 
                  }}>
                    {tpPresets.map((preset) => (
                      <Card 
                        key={preset.id}
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          border: selectedPreset?.id === preset.id ? '2px solid' : '1px solid',
                          borderColor: selectedPreset?.id === preset.id ? 'primary.main' : 'divider',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <Typography variant="h6" gutterBottom>{preset.nom}</Typography>
                        {preset.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {preset.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                          <Chip label={preset.niveau} size="small" color="primary" />
                          <Chip label={preset.matiere} size="small" color="secondary" />
                        </Box>
                        {preset.dureeEstimee && (
                          <Typography variant="caption" color="text.secondary">
                            <HourglassTop sx={{ fontSize: 16, color: 'text.secondary' }} />
                            Durée : {preset.dureeEstimee} min
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {preset.chemicals.length} réactifs
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {preset.materials.length} matériels
                          </Typography>
                        </Box>
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    // Pour manual, passer directement à l'étape 2
                    if (uploadMethod === 'manual') {
                      setActiveStep(1)
                    } else {
                      handleStepNext()
                    }
                  }}
                  disabled={!uploadMethod || 
                           (uploadMethod === 'preset' && !selectedPreset) ||
                           (uploadMethod === 'file' && files.length === 0)}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 2: Description et Remarques */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(1)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Description et remarques</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ajoutez une description et des remarques pour cette séance
              </Typography>
              
              {/* Champ description pour le mode manuel */}
              {uploadMethod === 'manual' && (
                <TextField
                  fullWidth
                  label="Description du TP"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleFormDataChange('description', e.target.value)}
                  sx={{ mb: 3 }}
                  placeholder="Décrivez brièvement le contenu et les objectifs du TP..."
                />
              )}
              
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Remarques supplémentaires
              </Typography>
              
              <Box sx={richTextEditorStyles}>
                <RichTextEditor
                  value={remarks}
                  onChange={setRemarks}
                  placeholder="Ajoutez des remarques, instructions spéciales, notes de sécurité..."
                />
              </Box>

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStepNext}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 3: Date et heure */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(2)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Date et heure</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Définissez quand aura lieu cette séance TP
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={3}>
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

                  {formData.timeSlots.map((slot, index) => (
                    <Box 
                      key={index} 
                      mb={2}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.default',
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        ...(animatingSlot === index && {
                          animation: 'shake 0.5s',
                          '@keyframes shake': {
                            '0%, 100%': { transform: 'translateX(0)' },
                            '25%': { transform: 'translateX(-5px)' },
                            '75%': { transform: 'translateX(5px)' }
                          }
                        })
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          Créneau {index + 1}
                        </Typography>
                        {formData.timeSlots.length > 1 && (
                          <IconButton
                            color="error"
                            onClick={() => removeTimeSlot(index)}
                            size="small"
                            sx={{ ml: 'auto' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      

                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <DatePicker
                          label="Date du TP"
                          value={slot.date ? new Date(slot.date) : null}
                          onChange={(newValue) => {
                            if (newValue) {
                              // Correction du problème de timezone
                              const correctedDate = new Date(newValue.getFullYear(), newValue.getMonth(), newValue.getDate(), 12, 0, 0)
                              updateTimeSlot(index, 'date', correctedDate.toISOString().split('T')[0])
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
                      </Grid>
                      
                      <Grid 
                        size={{ xs: 12, sm: 9 }}
                        sx={{
                          p: 2,
                          border: 1,
                          borderRadius: 2,
                          position: 'relative',
                          display: 'flex',
                          gap: 2,
                          alignItems: 'center',
                          flexDirection: isMobile ? 'column' : 'row',
                          overflow: 'hidden', // Important pour contenir l'animation
                          transition: 'all 0.3s ease',
                          transform: animatingSlot === index ? 'scale(1.02)' : 'scale(1)',
                          backgroundColor: animatingSlot === index ? 'rgba(255, 193, 7, 0.05)' : 'transparent',
                          '&::before': animatingSlot === index ? {
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
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
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
                            onAccept={(newValue) => {
                              if (newValue && isMobile) {
                                // Attendre un peu pour que l'état se mette à jour
                                setTimeout(() => {
                                  const currentSlot = formData.timeSlots[index]
                                  if (currentSlot && currentSlot.startTime && currentSlot.endTime) {
                                    const start = new Date(`2000-01-01T${currentSlot.startTime}`)
                                    const end = new Date(`2000-01-01T${currentSlot.endTime}`)
                                    if (end < start) {
                                      performTimeSwap(index)
                                    }
                                  }
                                }, 100)
                              }
                            }}
                            slotProps={{
                              textField: { 
                                size: "small",
                                sx: { 
                                  minWidth: { xs: '100%', sm: 120 },
                                  flex: 1,
                                  transition: animatingSlot === index ? 'transform 0.6s ease-in-out' : 'none',
                                  transform: animatingSlot === index 
                                    ? (isMobile ? 'translateY(40px)' : 'translateX(80px)') 
                                    : 'translate(0, 0)',
                                  zIndex: animatingSlot === index ? 2 : 1,
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
                            onAccept={(newValue) => {
                              if (newValue && isMobile) {
                                // Attendre un peu pour que l'état se mette à jour
                                setTimeout(() => {
                                  const currentSlot = formData.timeSlots[index]
                                  if (currentSlot && currentSlot.startTime && currentSlot.endTime) {
                                    const start = new Date(`2000-01-01T${currentSlot.startTime}`)
                                    const end = new Date(`2000-01-01T${currentSlot.endTime}`)
                                    if (end < start) {
                                      performTimeSwap(index)
                                    }
                                  }
                                }, 100)
                              }
                            }}
                            slotProps={{
                              textField: { 
                                size: "small",
                                sx: { 
                                  minWidth: { xs: '100%', sm: 120 },
                                  flex: 1,
                                  transition: animatingSlot === index ? 'transform 0.6s ease-in-out' : 'none',
                                  transform: animatingSlot === index 
                                    ? (isMobile ? 'translateY(-40px)' : 'translateX(-80px)') 
                                    : 'translate(0, 0)',
                                  zIndex: animatingSlot === index ? 1 : 2,
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
                        </Box>

                        {/* Icône de swap animée */}
                        {animatingSlot === index && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              zIndex: 10,
                              animation: 'swapRotate 0.6s ease-in-out',
                              '@keyframes swapRotate': {
                                '0%': {
                                  transform: 'translate(-50%, -50%) rotate(0deg) scale(0)',
                                  opacity: 0,
                                },
                                '25%': {
                                  transform: 'translate(-50%, -50%) rotate(90deg) scale(1.2)',
                                  opacity: 1,
                                },
                                '75%': {
                                  transform: 'translate(-50%, -50%) rotate(270deg) scale(1.2)',
                                  opacity: 1,
                                },
                                '100%': {
                                  transform: 'translate(-50%, -50%) rotate(360deg) scale(0)',
                                  opacity: 0,
                                },
                              },
                            }}
                          >
                            <SwapHoriz sx={{ fontSize: 40, color: 'warning.main' }} />
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                    </Box>
                  ))}

                  {formData.timeSlots.length > 1 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        {formData.timeSlots.length} créneaux seront créés pour cette séance TP.
                      </Typography>
                    </Alert>
                  )}
                </Box>

                <Collapse in={getOutsideBusinessHoursWarnings().length > 0}>
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
                      Attention : notre établissement est fermé !
                    </Typography>
                    <Typography variant="body2" component="div">
                      Votre séance TP est programmée en dehors des heures d'ouverture de notre établissement (08:00 - 19:00) :
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
              </Box>

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStepNext}
                  disabled={formData.timeSlots.some(slot => 
                    !slot.startTime || 
                    !slot.endTime || 
                    !slot.date
                  )}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
            {/* Snackbar pour les messages d'inversion */}
          <Snackbar
            open={!!swapMessage}
            autoHideDuration={3000}
            onClose={() => setSwapMessage(null)}
            slots={{ transition: Slide }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <MuiAlert 
              onClose={() => setSwapMessage(null)} 
              severity="info" 
              sx={{ 
                width: '100%',
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem'
                }
              }}
              variant="filled"
            >
              {swapMessage}
            </MuiAlert>
          </Snackbar>
          </Step>

{/* Étape 4: Classes concernées */}
<Step>
  <StepLabel
    onClick={() => handleStepClick(3)}
    sx={{ cursor: 'pointer' }}
  >
    <Typography variant="h6">Classes concernées</Typography>
  </StepLabel>
  <StepContent>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      Sélectionnez les classes qui participeront à cette séance
    </Typography>

    <Autocomplete
      multiple
      freeSolo
      options={[
        // D'abord les classes personnalisées
        ...customClasses.sort(),
        // Puis les classes prédéfinies
        ...userClasses.filter(c => !customClasses.includes(c)).sort()
      ].filter((value, index, self) => self.indexOf(value) === index)}
      value={formData.classes}
      onChange={async (_, newValue) => {
        // newValue est un tableau car c'est un Autocomplete multiple
        const uniqueClasses = [...new Set(newValue)]
        
        // Mettre à jour le formulaire
        handleFormDataChange('classes', uniqueClasses)
        
        // Identifier les nouvelles classes personnalisées
        const newCustom = uniqueClasses.filter(c => 
          !userClasses.includes(c) && !customClasses.includes(c)
        )
        
        if (newCustom.length > 0) {
          const successfulClasses: string[] = []
          const failedClasses: { name: string; error: string }[] = []
          
          // Traiter chaque nouvelle classe
          for (const newClass of newCustom) {
            try {
              // Sauvegarder la nouvelle classe
              const result = await saveNewClass(newClass, 'custom')
              
              if (result.success) {
                successfulClasses.push(newClass)
                
              } else {
                failedClasses.push({ 
                  name: newClass, 
                  error: result.error || 'Erreur inconnue' 
                })
                console.error(`Erreur lors de l'ajout de la classe "${newClass}":`, result.error)
              }
            } catch (error) {
              failedClasses.push({ 
                name: newClass, 
                error: 'Erreur réseau' 
              })
              console.error(`Erreur inattendue pour la classe "${newClass}":`, error)
            }
          }
          
          // Ajouter les classes créées avec succès aux classes personnalisées locales
          if (successfulClasses.length > 0) {
            setCustomClasses(prev => {
              const updated = [...prev]
              successfulClasses.forEach(className => {
                if (!updated.includes(className)) {
                  updated.push(className)
                }
              })
              return updated
            })
            
            // Notification de succès
            setSnackbar({
              open: true,
              message: successfulClasses.length === 1 
                ? `Classe "${successfulClasses[0]}" créée avec succès`
                : `${successfulClasses.length} classes créées avec succès`,
              severity: 'success'
            })
          }
          
          // Si des classes ont échoué, notifier l'utilisateur
          if (failedClasses.length > 0) {
            const errorMessage = failedClasses.length === 1
              ? `Erreur pour "${failedClasses[0].name}": ${failedClasses[0].error}`
              : `Erreur lors de la création de ${failedClasses.length} classe(s)`
            
            setSnackbar({
              open: true,
              message: errorMessage,
              severity: 'error'
            })
            
            // Optionnel : retirer les classes qui ont échoué de la sélection
            const finalClasses = uniqueClasses.filter(c => 
              !failedClasses.some(f => f.name === c)
            )
            handleFormDataChange('classes', finalClasses)
          }
        }
        
        // Réinitialiser l'input après la sélection
        setClassInputValue('')
      }}
      inputValue={classInputValue || ''}
      onInputChange={(event, newInputValue) => {
        setClassInputValue(newInputValue)
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Classes"
          placeholder="Choisir les classes ou en ajouter une nouvelle..."
          helperText={
            customClasses.filter(c => formData.classes.includes(c)).length > 0
              ? `${customClasses.filter(c => formData.classes.includes(c)).length} classe(s) personnalisée(s) sélectionnée(s)`
              : "Vous pouvez taper pour ajouter une nouvelle classe"
          }
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {params.InputProps.endAdornment}
                  {classInputValue && classInputValue.trim() && 
                   !userClasses.includes(classInputValue.trim()) && 
                   !customClasses.includes(classInputValue.trim()) && 
                   !formData.classes.includes(classInputValue.trim()) && (
                    <InputAdornment position="end" sx={{ mr: 3 }}>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          const trimmedValue = classInputValue.trim()
                          
                          try {
                            // Sauvegarder la nouvelle classe
                            const result = await saveNewClass(trimmedValue, 'custom')
                            
                            if (result.success) {
                              // Ajouter la classe aux classes sélectionnées
                              handleFormDataChange('classes', [
                                ...formData.classes,
                                trimmedValue
                              ]);
                              
                              // Ajouter aux classes personnalisées
                              setCustomClasses(prev => {
                                if (!prev.includes(trimmedValue)) {
                                  return [...prev, trimmedValue]
                                }
                                return prev
                              });
                              
                              // Réinitialiser l'input
                              setClassInputValue('');

                              
                              // Retirer le focus
                              (document.activeElement as HTMLElement)?.blur();
                              
                              
                              
                              setSnackbar({
                                open: true,
                                message: `Classe "${trimmedValue}" créée et ajoutée`,
                                severity: 'success'
                              });
                            } else {
                              console.error('Erreur:', result.error)
                              setSnackbar({
                                open: true,
                                message: result.error || `Erreur lors de la création de la classe`,
                                severity: 'error'
                              })
                            }
                          } catch (error) {
                            console.error('Erreur inattendue:', error)
                            setSnackbar({
                              open: true,
                              message: 'Erreur réseau lors de la création de la classe',
                              severity: 'error'
                            })
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
                          Créer "{classInputValue}"
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
        const { key, ...other } = props
        const isCustom = customClasses.includes(option)
        
        return (
          <li key={key} {...other}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <School fontSize="small" color={isCustom ? "secondary" : "action"} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2">
                  {option}
                </Typography>
                {isCustom && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    ID: USER_CLASS_{option.replace(/\s+/g, '_').toUpperCase()}
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
        )
      }}
      renderTags={(value: string[], getTagProps) =>
        value.map((option: string, index: number) => (
          <Chip
            {...getTagProps({ index })}
            key={option}
            variant="outlined"
            label={option}
            size="small"
            color={customClasses.includes(option) ? "secondary" : "primary"}
            icon={<School fontSize="small" />}
            sx={{ m: 0.5 }}
          />
        ))
      }
      filterOptions={(options, state) => {
        const selectedClasses = formData.classes || []
        const filtered = options.filter(option => 
          !selectedClasses.includes(option) &&
          option.toLowerCase().includes(state.inputValue.toLowerCase())
        )
        
        return filtered
      }}
      isOptionEqualToValue={(option, value) => 
        option.toLowerCase() === value.toLowerCase()
      }
      noOptionsText={classInputValue ? "Aucune classe trouvée" : "Tapez pour rechercher"}
      groupBy={(option) => customClasses.includes(option) ? "Mes classes personnalisées" : "Classes prédéfinies"}
    />

    {/* Afficher les classes sélectionnées si besoin */}
    {formData.classes.length > 0 && (
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {formData.classes.length} classe{formData.classes.length > 1 ? 's' : ''} sélectionnée{formData.classes.length > 1 ? 's' : ''}
        </Typography>
      </Box>
    )}

    <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
      <Button onClick={handleStepBack}>
        Retour
      </Button>
      <Button
        variant="contained"
        onClick={handleStepNext}
        disabled={formData.classes.length === 0}
      >
        Continuer
      </Button>
    </Box>
  </StepContent>
</Step>

          {/* Étape 5: Matériel nécessaire */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(4)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">
                {discipline === 'physique' ? 'Équipement de physique' : 'Matériel nécessaire'}
              </Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {discipline === 'physique' 
                  ? 'Sélectionnez l\'équipement de physique qui sera utilisé pendant cette séance'
                  : 'Sélectionnez le matériel qui sera utilisé pendant cette séance'
                }
              </Typography>

              {/* Autocomplete pour sélectionner le matériel */}
              <Autocomplete
                freeSolo // Permet d'entrer du texte libre
                options={discipline === 'physique' ? 
                  Array.isArray(disciplineMaterials) ? disciplineMaterials : []
                : Array.isArray(disciplineChemicals) ? disciplineChemicals : []}
                loading={loadingMaterials}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  if (discipline === 'physique') {
                    return `${option.name || 'Équipement'} ${option.type ? `(${option.type})` : ''}`;
                  } else {
                    return `${option.itemName || option.name || 'Matériel'} ${option.volume ? `(${option.volume})` : ''}`;
                  }
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
                    handleFormDataChange('materials', [
                      ...formData.materials,
                      { ...newValue, quantity: 1 }
                    ]);
                    setMaterialInputValue('');
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={discipline === 'physique' ? 'Ajouter un équipement' : 'Ajouter du matériel'}
                    placeholder={discipline === 'physique' ? 'Rechercher des équipements physiques...' : 'Rechercher ou demander un nouveau matériel...'}
                    helperText={loadingMaterials ? 'Chargement...' : undefined}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && materialInputValue && materialInputValue.trim()) {
                        e.preventDefault();
                        const trimmedValue = materialInputValue.trim();
                        if (!formData.materials.some(m => (m.itemName || m.name) === trimmedValue)) {
                          const customMaterial = {
                            id: `custom_${Date.now()}`,
                            itemName: trimmedValue,
                            name: trimmedValue,
                            isCustom: true,
                            quantity: 1
                          };
                          
                          handleFormDataChange('materials', [
                            ...formData.materials,
                            customMaterial
                          ]);
                          setMaterialInputValue('');
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
                              const trimmedValue = materialInputValue.trim();
                              if (!formData.materials.some(m => 
                                (m.itemName || m.name) === trimmedValue
                              )) {
                                const customMaterial = {
                                  id: `custom_${Date.now()}`,
                                  itemName: trimmedValue,
                                  name: trimmedValue,
                                  isCustom: true,
                                  quantity: 1
                                };
                                
                                handleFormDataChange('materials', [
                                  ...formData.materials,
                                  customMaterial
                                ]);
                                setMaterialInputValue('');
                                
                                // Retirer le focus du TextField
                                (document.activeElement as HTMLElement)?.blur();
                              }
                            }}
                            edge="end"
                            sx={{ mr: -1,
                              "&:hover": {
                              color: 'success.main',
                              borderColor: 'primary.main',
                              borderRadius: '0%',
                              } 
                            }}
                            >
                            <Add />
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
                  console.log('GroupBy pour matériel:', { 
                    option: option,
                    name: option.itemName || option.name, 
                    categoryName: option.categoryName, 
                    typeName: option.typeName,
                    category 
                  });
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
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Matériel sélectionné :
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {formData.materials.map((material, index) => (
                      <Box
                        key={`${material.itemName || material.name}-${index}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          backgroundColor: 'background.paper'
                        }}
                      >
                        {/* Nom du matériel */}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" component="div">
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

                        {/* Input pour la quantité */}
                        <TextField
                          label="Quantité"
                          type="number"
                          value={material.quantity || 1}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            const updatedMaterials = [...formData.materials];
                            updatedMaterials[index] = { ...material, quantity: newQuantity };
                            handleFormDataChange('materials', updatedMaterials);
                          }}
                          inputProps={{ min: 1 }}
                          sx={{ width: 120 }}
                          size="small"
                        />

                        {/* Bouton supprimer */}
                        <IconButton
                          onClick={() => {
                            const updatedMaterials = formData.materials.filter((_, i) => i !== index);
                            handleFormDataChange('materials', updatedMaterials);
                          }}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStepNext}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 6: Réactifs chimiques / composant en physique */}
        <Step>
          <StepLabel
            onClick={() => handleStepClick(5)}
            sx={{ cursor: 'pointer' }}
          >
            <Typography variant="h6">
              {discipline === 'physique' ? 'Composants et accessoires' : 'Réactifs chimiques'}
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {discipline === 'physique' 
                ? 'Sélectionnez les composants et accessoires qui seront utilisés'
                : 'Sélectionnez les réactifs chimiques qui seront utilisés'
              }
            </Typography>

            {/* Autocomplete pour sélectionner les réactifs chimiques ou composants physique */}
            <Autocomplete
              options={discipline === 'physique' 
                ? (Array.isArray(physicsInventoryData?.consumables) ? physicsInventoryData?.consumables : [])
                : (Array.isArray(disciplineChemicals) ? disciplineChemicals : [])
              }
              loading={loadingChemicals}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                if (discipline === 'physique') {
                  // Pour la physique, affichage simple du nom
                  return option.name || 'Composant physique';
                } else {
                  // Pour la chimie, affichage avec stock
                  const forecast = option.forecastQuantity !== undefined ? option.forecastQuantity : option.quantity;
                  return `${option.name || 'Réactif chimique'} - Stock: ${option.quantity || 0}${option.unit || ''} (Prévu: ${forecast}${option.unit || ''})`;
                }
              }}
              value={null}
              inputValue={discipline === 'physique' ? consommableInputValue || '' : chemicalInputValue || ''}
              onInputChange={(event, newInputValue) => {
                if (discipline === 'physique') {
                  setConsommableInputValue(newInputValue);
                } else {
                  setChemicalInputValue(newInputValue);
                }
              }}
              onChange={(_, newValue) => {
                if (discipline === 'physique') {
                  if (newValue && !formData.consommables.some((c) => c.id === newValue.id)) {
                    handleFormDataChange('consommables', [
                      ...formData.consommables,
                      { ...newValue, requestedQuantity: 1 }
                    ]);
                    setConsommableInputValue('');
                  }
                } else {
                  if (newValue && !formData.chemicals.some((c) => c.id === newValue.id)) {
                    handleFormDataChange('chemicals', [
                      ...formData.chemicals,
                      { ...newValue, requestedQuantity: 1 }
                    ]);
                    setChemicalInputValue('');
                  }
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={discipline === 'physique' ? 'Ajouter un composant' : 'Ajouter un réactif chimique'}
                  placeholder={discipline === 'physique' ? 'Rechercher des composants physiques...' : 'Rechercher et sélectionner...'}
                  helperText={loadingChemicals ? 'Chargement...' : undefined}
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {params.InputProps.endAdornment}
                          {((discipline === 'physique' && consommableInputValue) || (discipline !== 'physique' && chemicalInputValue)) &&
                          ((discipline === 'physique' && consommableInputValue.trim()) || (discipline !== 'physique' && chemicalInputValue.trim())) && 
                          !(discipline === 'physique' 
                            ? physicsInventoryData?.consumables.some(c => c.name?.toLowerCase() === consommableInputValue.trim().toLowerCase())
                            : disciplineChemicals.some(c => c.name?.toLowerCase() === chemicalInputValue.trim().toLowerCase())
                          ) && (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const trimmedValue = discipline === 'physique' 
                                    ? consommableInputValue.trim() 
                                    : chemicalInputValue.trim();
                                  
                                  // Créer un réactif/composant personnalisé
                                  const customItem = {
                                    id: `${discipline === 'physique' ? 'COMP' : 'CHEM'}_${Date.now()}_CUSTOM`,
                                    name: trimmedValue,
                                    quantity: discipline === 'physique' ? 1 : 0,
                                    unit: discipline === 'physique' ? 'unité' : 'g', // Unité par défaut
                                    requestedQuantity: 1,
                                    isCustom: true,
                                  };
                                  
                                  // Ajouter l'élément personnalisé à la liste appropriée
                                  if (discipline === 'physique') {
                                    if (!formData.consommables.some(c => c.name === trimmedValue)) {
                                      handleFormDataChange('consommables', [
                                        ...formData.consommables,
                                        customItem
                                      ]);
                                      setConsommableInputValue('');
                                    }
                                  } else {
                                    if (!formData.chemicals.some(c => c.name === trimmedValue)) {
                                      handleFormDataChange('chemicals', [
                                        ...formData.chemicals,
                                        customItem
                                      ]);
                                      setChemicalInputValue('');
                                    }
                                  }
                                    
                                    // Retirer le focus
                                    (document.activeElement as HTMLElement)?.blur();
                                    
                                    // Afficher une notification si showSnackbar existe
                                    setSnackbar({
                                      open: true,
                                      message: `${discipline === 'physique' ? 'Composant' : 'Réactif'} personnalisé "${trimmedValue}" ajouté`,
                                      severity: 'info'
                                    });
                                  }
                                }
                                
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
                                  Ajouter "{discipline === 'physique' ? consommableInputValue : chemicalInputValue}"
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
                      paddingLeft: discipline === 'physique' ? '16px' : '8px'
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
                        {discipline !== 'physique' && option.forecastQuantity !== undefined && (
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
                const selectedIds = discipline === 'physique' 
                  ? formData.consommables?.map(c => c.id) || []
                  : formData.chemicals.map(c => c.id);
                  
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
                
                // Trier par catégorie puis par nom (seulement pour physique)
                if (discipline === 'physique') {
                  uniqueOptions.sort((a, b) => {
                    const categoryA = a.categoryName || a.typeName || 'Sans catégorie';
                    const categoryB = b.categoryName || b.typeName || 'Sans catégorie';
                    
                    // D'abord par catégorie
                    if (categoryA !== categoryB) {
                      return categoryA.localeCompare(categoryB);
                    }
                    
                    // Puis par nom dans la même catégorie
                    const nameA = a.name || '';
                    const nameB = b.name || '';
                    return nameA.localeCompare(nameB);
                  });
                }
                
                return uniqueOptions;
              }}
              // Grouper par catégorie seulement pour la physique
              groupBy={discipline === 'physique' 
                ? ((option) => {
                    const category = option.categoryName || option.typeName || 'Sans catégorie';
                    console.log('GroupBy pour composants physique:', { 
                      name: option.name, 
                      categoryName: option.categoryName, 
                      typeName: option.typeName,
                      category 
                    });
                    return category;
                  })
                : undefined
              }
              renderGroup={discipline === 'physique' 
                ? ((params) => (
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
                  ))
                : undefined
              }
              noOptionsText={chemicalInputValue ? 
                (discipline === 'physique' ? "Aucun composant trouvé" : "Aucun réactif trouvé") : 
                "Tapez pour rechercher"
              }
            />

            {/* Liste des réactifs chimiques/composants sélectionnés avec quantités */}
            {((discipline === 'physique' && formData.consommables?.length > 0) || 
              (discipline !== 'physique' && formData.chemicals.length > 0)) && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  {discipline === 'physique' ? 'Composants sélectionnés :' : 'Réactifs chimiques sélectionnés :'}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(discipline === 'physique' ? formData.consommables : formData.chemicals).map((chemical, index) => {
                    // Utiliser quantityPrevision si disponible, sinon quantity
                    const availableStock = chemical.quantityPrevision !== undefined 
                      ? chemical.quantityPrevision 
                      : (chemical.quantity || 0)
                    
                    const tooltipKey = `${chemical.id || index}`
                    const tooltipOpen = tooltipStates[tooltipKey] || { actual: false, prevision: false, after: false }
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
                          flexDirection: isMobile ? 'column' : 'row',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          backgroundColor: 'background.paper'
                        }}
                      >
                        {/* Nom du réactif chimique */}
                        <Box sx={{ display: 'flex', 
                          flexDirection: 'column', 
                          width: isMobile ? '100%' : 'auto',}}>
                          <Typography variant="body1">
                            {chemical.name || 'Réactif chimique'}
                          </Typography>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: .1, flexWrap: 'wrap' }}>
                            
                            {/* Stock actuel ou message pour custom */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">
                                {(chemical.isCustom || chemical.id?.endsWith('_CUSTOM')) 
                                  ? "Réactif non référencé dans l'inventaire" 
                                  : `Stock actuel : ${chemical.quantity || 0}${chemical.unit || ''}`}
                              </Typography>
                              {!(chemical.isCustom || chemical.id?.endsWith('_CUSTOM')) && (
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
                                        <InfoOutlined sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </div>
                                </ClickAwayListener>
                              )}
                            </Box>
                            
                            {/* Stock prévisionnel */}
                            {/* Stock prévisionnel - uniquement pour les réactifs de l'inventaire */}
                            {!(chemical.isCustom || chemical.id?.endsWith('_CUSTOM')) && 
                            chemical.quantityPrevision !== undefined && 
                            chemical.quantityPrevision !== chemical.quantity && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="body2" color="warning.main">
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
                                        <InfoOutlined sx={{ fontSize: 16, color: 'warning.main' }} />
                                      </IconButton>
                                    </Tooltip>
                                  </div>
                                </ClickAwayListener>
                              </Box>
                            )}
                            
                            {/* Stock après commande - uniquement pour les réactifs de l'inventaire */}
                            {!(chemical.isCustom || chemical.id?.endsWith('_CUSTOM')) && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography 
                                variant="body2" 
                                color={
                                  stockAfterRequest < 0 ? 'error' : 
                                  stockAfterRequest < (chemical.minQuantity || 0) ? 'warning.main' : 
                                  'success.main'
                                }
                              >
                                Après ce TP : {stockAfterRequest.toFixed(1)}{chemical.unit || ''}
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
                                          fontSize: 16,
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
                            )}
                          </Box>

                        </Box>
                        {/* Input pour la quantité demandée */}
                        <TextField
                          label={`Quantité (${chemical.unit || 'unité'})`}
                          type="number"
                          value={chemical.requestedQuantity || 1}
                          onChange={(e) => {
                            const newQuantity = discipline === 'physique' 
                              ? parseInt(e.target.value) || 1  // Entiers uniquement pour la physique
                              : parseFloat(e.target.value) || 1;
                            
                            if (discipline === 'physique') {
                              const updatedConsommables = [...formData.consommables];
                              updatedConsommables[index] = { ...chemical, requestedQuantity: newQuantity };
                              handleFormDataChange('consommables', updatedConsommables);
                            } else {
                              const updatedChemicals = [...formData.chemicals];
                              updatedChemicals[index] = { ...chemical, requestedQuantity: newQuantity };
                              handleFormDataChange('chemicals', updatedChemicals);
                            }
                          }}
                          slotProps={{
                            htmlInput: {
                              min: discipline === 'physique' ? 1 : 0.1,
                              step: discipline === 'physique' ? 1 : 0.1,
                              // Pas de max pour les réactifs custom ou pour la physique (on permet de dépasser le stock)
                              ...(!(chemical.isCustom || chemical.id?.endsWith('_CUSTOM')) && 
                                  discipline !== 'physique' && { max: availableStock })
                            }
                          }}
                          sx={{ width: 150 }}
                          size="small"
                          error={!(chemical.isCustom || chemical.id?.endsWith('_CUSTOM')) && 
                                 discipline !== 'physique' && 
                                 chemical.requestedQuantity > availableStock}
                          helperText={
                            (chemical.isCustom || chemical.id?.endsWith('_CUSTOM'))
                              ? '' // Pas de message d'erreur pour les custom
                              : discipline === 'physique'
                                ? '' // Pas de limitation de stock pour la physique
                                : chemical.requestedQuantity > availableStock 
                                  ? 'Quantité insuffisante' 
                                  : stockAfterRequest < (chemical.minQuantity || 0)
                                  ? 'Stock faible'
                                  : ''
                          }
                        />
                        <IconButton
                          onClick={() => {
                            if (discipline === 'physique') {
                              const updatedConsommables = formData.consommables.filter((_, i) => i !== index);
                              handleFormDataChange('consommables', updatedConsommables);
                            } else {
                              const updatedChemicals = formData.chemicals.filter((_, i) => i !== index);
                              handleFormDataChange('chemicals', updatedChemicals);
                            }
                          }}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            )}

            {/* Ajouter un avertissement global si des réactifs seront en stock faible - seulement pour la chimie */}
            {discipline !== 'physique' && formData.chemicals.some(c => {
              // Ignorer les réactifs personnalisés
              if (c.isCustom || c.id?.endsWith('_CUSTOM')) {
                return false;
              }
              
              const availableStock = c.quantityPrevision !== undefined 
                ? c.quantityPrevision 
                : (c.quantity || 0)
              const stockAfterRequest = availableStock - (c.requestedQuantity || 0)
              return stockAfterRequest < (c.minQuantity || 0) && stockAfterRequest >= 0
            }) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Attention : stock faible
                </Typography>
                <Typography variant="body2">
                  Certains réactifs chimiques seront en dessous de leur stock minimum après ce TP.
                </Typography>
              </Alert>
            )}

            {/* Erreur si des réactifs ont un stock insuffisant (sauf custom) - seulement pour la chimie */}
            {discipline !== 'physique' && formData.chemicals.some(c => {
              if (c.isCustom || c.id?.endsWith('_CUSTOM')) return false;
              const availableStock = c.quantityPrevision !== undefined 
                ? c.quantityPrevision 
                : (c.quantity || 0)
              return (c.requestedQuantity || 0) > availableStock
            }) && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Erreur : Stock insuffisant
                </Typography>
                <Typography variant="body2">
                  Certains réactifs chimiques n'ont pas assez de stock disponible.
                </Typography>
              </Alert>
            )}
            {/* Avertissement pour les réactifs personnalisés */}
            {((discipline === 'physique' && formData.consommables?.some(c => c.isCustom || c.id?.endsWith('_CUSTOM'))) ||
              (discipline !== 'physique' && formData.chemicals.some(c => c.isCustom || c.id?.endsWith('_CUSTOM')))) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Information : réactifs non référencés
                </Typography>
                <Typography variant="body2">
                  Certains réactifs ne sont pas enregistrés dans l'inventaire et leur disponibilité devra être vérifiée manuellement.
                </Typography>
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button onClick={handleStepBack}>
                Retour
              </Button>
              <Button
                variant="contained"
                onClick={handleStepNext}
                disabled={formData.chemicals.some(c => 
                  !(c.isCustom || c.id?.endsWith('_CUSTOM')) && 
                  c.requestedQuantity > (c.quantity || 0)
                )}
              >
                Continuer
              </Button>
            </Box>
          </StepContent>
        </Step>

          {/* Étape 7: Documents joints */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(6)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Documents joints</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ajoutez les documents relatifs à cette séance TP (protocoles, fiches de sécurité, etc.)
              </Typography>

              <FileUploadSection
                files={files}
                onFilesChange={setFiles}
                maxFiles={5}
                maxSizePerFile={10}
                acceptedTypes={['.pdf', '.doc', '.docx', '.odt', '.jpg',
                       '.jpeg', '.png', '.gif', '.txt', '.svg', ]}
              />

              {getOutsideBusinessHoursWarnings().length > 0 && (
                <Alert 
                  severity="warning" 
                  icon={<Warning />}
                  sx={{ 
                    mt: 2,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body2">
                    Rappel : Cette séance TP est programmée en dehors des heures d'ouverture de l'établissement (8h00 - 19h00).
                  </Typography>
                </Alert>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCreateCalendarEvent}
                  startIcon={<Save />}
                  disabled={loading}
                >
                  {loading ? 'Création...' : 'Créer la séance'}
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>
    </Dialog>
    {/* Snackbar pour les notifications */}
    <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
    </LocalizationProvider>
  )

}