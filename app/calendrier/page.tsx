"use client"

import React, { useState, useEffect } from "react"
import { 
  Container, Typography, Box, Card, CardContent, CardActions, Button,
  Grid, Avatar, Chip, Alert, Paper, Stack, IconButton, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tab, Tabs, List, ListItem, ListItemText,
  ListItemIcon, Fab, Tooltip, Stepper, Step, StepLabel, StepContent,
  Autocomplete, Checkbox, FormControlLabel, Divider
} from "@mui/material"
import { 
  CalendarMonth, Add, Visibility, Edit, Delete, Schedule,
  School, Science, Assignment, Group, Room, AccessTime,
  EventAvailable, EventBusy, Warning, CheckCircle, Upload,
  Inventory, Save, AttachFile, Class
} from "@mui/icons-material"
import { DatePicker, TimePicker } from "@mui/x-date-pickers"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { fr } from "date-fns/locale"
import { 
  format,
  addHours,
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  addDays,
  subDays,
  startOfDay,
  set,
  addMinutes,
  differenceInMinutes
} from "date-fns"

// Import des composants refactorisés
import {
  CalendarStats,
  WeeklyView,
  EventsList,
  DailyPlanning,
  EventDetailsDialog
} from '@/components/calendar'

import { Calendar as CalendarType, CalendarType as EventType } from "@/types/prisma"

interface CalendarEvent {
  id: string
  title: string
  description?: string | null
  startDate: Date
  endDate: Date
  type: EventType
  class?: string | null
  room?: string | null
  notebookId?: string | null
  instructor?: string
  students?: string[]
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`calendar-tabpanel-${index}`}
      aria-labelledby={`calendar-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const EVENT_TYPES = {
  [EventType.TP]: { label: "Travaux Pratiques", color: "#1976d2", icon: <Science /> },
  [EventType.MAINTENANCE]: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  [EventType.INVENTORY]: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  [EventType.OTHER]: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

export default function CalendarPage() {
  const [tabValue, setTabValue] = useState(0)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: EventType.TP,
    startDate: new Date(),
    endDate: addHours(new Date(), 2)
  })

  // États pour le formulaire de création d'événement
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'manual' | 'preset' | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<any>(null)
  const [tpPresets, setTpPresets] = useState<any[]>([])
  
  // États pour les données du formulaire
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null as File | null,
    date: '', // Date par défaut pour tous les créneaux
    timeSlots: [{ date: '', startTime: '', endTime: '' }] as { date: string; startTime: string; endTime: string }[],
    classes: [] as string[],
    materials: [] as string[],
    chemicals: [] as string[]
  })
  
  // États pour les données de référence
  const [userClasses, setUserClasses] = useState<string[]>([])
  const [customClasses, setCustomClasses] = useState<string[]>([])
  const [materials, setMaterials] = useState([])
  const [chemicals, setChemicals] = useState([])
  const [dragOver, setDragOver] = useState(false)

  // Fonction pour gérer l'upload de fichier
  const handleFileUpload = (file: File) => {
    // Vérifier le type de fichier
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
    
    if (allowedTypes.includes(file.type) || file.name.match(/\.(pdf|doc|docx|odt|odp|txt|jpg|jpeg|png|gif|webp)$/i)) {
      handleFormDataChange('file', file)
      handleFormDataChange('title', file.name.replace(/\.[^/.]+$/, ""))
      setUploadMethod('file')
    } else {
      alert('Type de fichier non supporté. Veuillez choisir un PDF, document Word, image ou fichier texte.')
    }
  }

  // Gestion du drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  // Ouvrir l'explorateur de fichiers
  const openFileExplorer = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.odt,.odp,.txt,.jpg,.jpeg,.png,.gif,.webp'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleFileUpload(file)
      }
    }
    input.click()
  }

  // Fonctions pour le formulaire de création d'événement
  const handleStepNext = () => {
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleStepBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleFormDataChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetForm = () => {
    setActiveStep(0)
    setUploadMethod(null)
    setSelectedPreset(null)
    setFormData({
      title: '',
      description: '',
      file: null,
      date: '',
      timeSlots: [{ date: '', startTime: '', endTime: '' }],
      classes: [],
      materials: [],
      chemicals: []
    })
  }

  // Chargement des TP presets
  const loadTpPresets = async () => {
    try {
      const response = await fetch('/api/tp-presets')
      if (!response.ok) throw new Error('Erreur lors du chargement des presets TP')
      const data = await response.json()
      setTpPresets(data.presets || [])
    } catch (error) {
      console.error('Erreur lors du chargement des presets TP:', error)
    }
  }

  const handlePresetSelect = (preset: any) => {
    setSelectedPreset(preset)
    setUploadMethod('preset')
    setFormData(prev => ({
      ...prev,
      title: preset.nom,
      description: preset.description || '',
      materials: preset.materials.map((m: any) => m.material.id),
      chemicals: preset.chemicals.map((c: any) => c.chemical.id)
    }))
  }

  // Chargement des données de référence
  const loadReferenceData = async () => {
    try {
      const [materialsRes, chemicalsRes, classesRes] = await Promise.all([
        fetch('/api/equipement'),
        fetch('/api/chemicals'),
        fetch('/api/configurable-lists?type=classes')
      ])

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setMaterials(materialsData || [])
      }

      if (chemicalsRes.ok) {
        const chemicalsData = await chemicalsRes.json()
        setChemicals(chemicalsData || [])
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json()
        setUserClasses(classesData.items?.map((item: any) => item.value) || [])
      } else {
        // Fallback vers les classes par défaut si l'API ne répond pas
        setUserClasses([
          '201', '202', '203', '204', '205', '206', 
          '1ère ES', '1ère STI2D', 'Tle STI2D', 'Tle ES'
        ])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de référence:', error)
      // Fallback vers les classes par défaut en cas d'erreur
      setUserClasses([
        '201', '202', '203', '204', '205', '206', 
        '1ère ES', '1ère STI2D', 'Tle STI2D', 'Tle ES'
      ])
    }
  }

  // Fonction pour sauvegarder une nouvelle classe dans l'API
  const saveNewClass = async (className: string) => {
    try {
      const response = await fetch('/api/configurable-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'classes',
          value: className,
          sortOrder: userClasses.length + customClasses.length + 1
        })
      })

      if (response.ok) {
        // Mettre à jour la liste des classes utilisateur
        setUserClasses(prev => [...prev, className])
        return true
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la nouvelle classe:', error)
    }
    return false
  }

  // Fonction pour créer l'événement
  const handleCreateCalendarEvent = async () => {
    try {
      setLoading(true)

      const eventsToCreate = formData.timeSlots.map(slot => {
        if (!slot.date || !slot.startTime || !slot.endTime) {
          throw new Error("Date, heure de début ou heure de fin manquante pour un créneau.");
        }
        const startDateTime = new Date(`${slot.date}T${slot.startTime}`)
        const endDateTime = new Date(`${slot.date}T${slot.endTime}`)

        return {
          title: formData.title,
          description: formData.description,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          type: 'TP',
          classes: formData.classes,
          materials: formData.materials.map((m: any) => m.id),
          chemicals: formData.chemicals.map((c: any) => c.id),
          ...(formData.file && { fileName: formData.file.name })
        }
      })

      const response = await fetch('/api/calendrier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToCreate })
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création des événements');
      }
      
      setCreateDialogOpen(false)
      resetForm()
      await fetchEvents()
      console.log('Événements créés avec succès!')

    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors de la création de l\'événement')
    } finally {
      setLoading(false)
    }
  }

  // Fonctions pour gérer les créneaux
  const addTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [...formData.timeSlots, { date: '', startTime: '', endTime: '' }] // Chaque créneau a sa propre date
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

  const updateTimeSlot = (index: number, field: 'date' | 'startTime' | 'endTime', value: string) => {
    const newTimeSlots = [...formData.timeSlots]
    newTimeSlots[index][field] = value
    setFormData({
      ...formData,
      timeSlots: newTimeSlots
    })
  }

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendrier');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du calendrier');
      }
      const eventsData = await response.json();
      
      // Convertir les dates ISO strings en objets Date
      const eventsWithDates = eventsData.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }));
      
      setEvents(eventsWithDates);
    } catch (error) {
      console.error('Erreur lors du chargement du calendrier:', error);
      setError(error instanceof Error ? error.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    loadReferenceData();
    loadTpPresets();
  }, []);

  const getTodayEvents = () => {
    return events.filter(event => 
      isSameDay(event.startDate, new Date())
    )
  }

  const handleCreateEvent = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  const handleViewEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setOpenDialog(true)
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography>Chargement du calendrier...</Typography>
        </Box>
      </Container>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Planification des TP
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Calendrier et gestion des séances de laboratoire
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            size="large"
            onClick={handleCreateEvent}
          >
            Nouvelle séance
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Statistiques du jour */}
        <CalendarStats events={events} getTodayEvents={getTodayEvents} />

        {/* Tabs */}
        <Paper elevation={2}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{ px: 2 }}
            >
              <Tab label="Vue hebdomadaire" />
              <Tab label="Liste des événements" />
              <Tab label="Planning du jour" />
            </Tabs>
          </Box>

          {/* Tab 0: Vue hebdomadaire */}
          <TabPanel value={tabValue} index={0}>
            <WeeklyView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              events={events}
              onEventClick={handleViewEvent}
            />
          </TabPanel>

          {/* Tab 1: Liste des événements */}
          <TabPanel value={tabValue} index={1}>
            <EventsList events={events} onEventClick={handleViewEvent} />
          </TabPanel>

          {/* Tab 2: Planning du jour */}
          <TabPanel value={tabValue} index={2}>
            <DailyPlanning events={events} onEventClick={handleViewEvent} />
          </TabPanel>
        </Paper>

        {/* Dialog événement */}
        <EventDetailsDialog
          open={openDialog}
          event={selectedEvent}
          onClose={() => setOpenDialog(false)}
        />

        {/* Dialogue de création d'événement multi-étapes */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { minHeight: '500px' }
          }}
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <Add color="primary" />
              <Typography variant="h6">Créer une nouvelle séance TP</Typography>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Stepper activeStep={activeStep} orientation="vertical">
              {/* Étape 1: Méthode de création */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">Méthode d'ajout</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Choisissez comment vous souhaitez créer votre séance TP
                  </Typography>
                  
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <Card 
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          border: uploadMethod === 'file' ? '2px solid' : dragOver ? '2px dashed' : '1px solid',
                          borderColor: uploadMethod === 'file' ? 'primary.main' : dragOver ? 'primary.light' : 'divider',
                          '&:hover': { borderColor: 'primary.main' },
                          flexBasis: 'calc(33.333% - 8px)',
                          minWidth: '250px',
                          backgroundColor: dragOver ? 'primary.light' : 'inherit',
                          opacity: dragOver ? 0.8 : 1,
                          transition: 'all 0.2s ease'
                        }}
                        onClick={openFileExplorer}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                          <Upload color={uploadMethod === 'file' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                          <Typography variant="h6">Importer un fichier TP</Typography>
                          <Typography variant="body2" color="text.secondary" textAlign="center">
                            {formData.file ? formData.file.name : 
                             dragOver ? "Déposez votre fichier ici" :
                             "Cliquez ou glissez-déposez votre fichier"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" textAlign="center">
                            PDF, Word, Images, OpenDocument acceptés
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
                          flexBasis: 'calc(33.333% - 8px)',
                          minWidth: '250px'
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
                      
                      <Card 
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          border: uploadMethod === 'manual' ? '2px solid' : '1px solid',
                          borderColor: uploadMethod === 'manual' ? 'primary.main' : 'divider',
                          '&:hover': { borderColor: 'primary.main' },
                          flexBasis: 'calc(33.333% - 8px)',
                          minWidth: '250px'
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
                    </Box>
                  </Box>

                  {uploadMethod === 'preset' && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>Choisir un TP Preset</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2, maxHeight: '400px', overflowY: 'auto' }}>
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
                            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                              <Chip label={preset.niveau} size="small" color="primary" />
                              <Chip label={preset.matiere} size="small" color="secondary" />
                            </Stack>
                            {preset.dureeEstimee && (
                              <Typography variant="caption" color="text.secondary">
                                Durée: {preset.dureeEstimee} min
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {preset.chemicals.length} produits
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {preset.materials.length} matériels
                              </Typography>
                            </Box>
                          </Card>
                        ))}
                      </Box>
                      {selectedPreset && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="subtitle1" color="primary" gutterBottom>
                            Preset sélectionné: {selectedPreset.nom}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedPreset.description}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  {uploadMethod === 'manual' && (
                    <Box sx={{ mt: 3 }}>
                      <TextField
                        fullWidth
                        label="Titre du TP"
                        value={formData.title}
                        onChange={(e) => handleFormDataChange('title', e.target.value)}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Description"
                        multiline
                        rows={4}
                        value={formData.description}
                        onChange={(e) => handleFormDataChange('description', e.target.value)}
                      />
                    </Box>
                  )}

                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={handleStepNext}
                      disabled={!uploadMethod || 
                               (uploadMethod === 'file' && !formData.file) || 
                               (uploadMethod === 'manual' && !formData.title) || 
                               (uploadMethod === 'preset' && !selectedPreset)}
                    >
                      Continuer
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* Étape 2: Date et heure */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">Date et heure</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Définissez quand aura lieu cette séance TP
                  </Typography>
                  
                  <Box display="flex" flexDirection="column" gap={3}>
                    {/* Sélection de la date */}
                    <DatePicker
                      label="Date de la séance"
                      value={formData.date ? new Date(formData.date) : null}
                      onChange={(newValue) => {
                        if (newValue) {
                          handleFormDataChange('date', newValue.toISOString().split('T')[0])
                        }
                      }}
                      slotProps={{
                        textField: { 
                          fullWidth: true,
                          onClick: (e: any) => {
                            // Ouvrir automatiquement le calendrier au clic
                            if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                              const button = e.currentTarget.querySelector('button')
                              if (button) button.click()
                            }
                          }
                        }
                      }}
                    />

                    {/* Créneaux horaires */}
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
                        <Box key={index} mb={2}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Créneau {index + 1}
                          </Typography>
                          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                            <DatePicker
                              label="Date"
                              value={slot.date ? new Date(slot.date) : null}
                              onChange={(newValue) => {
                                if (newValue) {
                                  updateTimeSlot(index, 'date', newValue.toISOString().split('T')[0])
                                }
                              }}
                              slotProps={{
                                textField: { 
                                  size: "small",
                                  sx: { minWidth: 140 },
                                  onClick: (e: any) => {
                                    // Ouvrir automatiquement le calendrier au clic
                                    if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                                      const button = e.currentTarget.querySelector('button')
                                      if (button) button.click()
                                    }
                                  }
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
                                  sx: { minWidth: 120 },
                                  onClick: (e: any) => {
                                    // Ouvrir automatiquement l'horloge au clic
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
                                  updateTimeSlot(index, 'endTime', `${hours}:${minutes}`)
                                }
                              }}
                              slotProps={{
                                textField: { 
                                  size: "small",
                                  sx: { minWidth: 120 },
                                  onClick: (e: any) => {
                                    // Ouvrir automatiquement l'horloge au clic
                                    if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                                      const button = e.currentTarget.querySelector('button')
                                      if (button) button.click()
                                    }
                                  }
                                }
                              }}
                            />
                            {formData.timeSlots.length > 1 && (
                              <IconButton
                                color="error"
                                onClick={() => removeTimeSlot(index)}
                                size="small"
                              >
                                <Delete />
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
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
                        !slot.date // Chaque slot doit avoir sa propre date
                      )}
                    >
                      Continuer
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* Étape 3: Classes concernées */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">Classes concernées</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Sélectionnez les classes qui participeront à cette séance
                  </Typography>

                  <Autocomplete
                    multiple
                    freeSolo
                    options={[...userClasses, ...customClasses]}
                    value={formData.classes}
                    onChange={async (_, newValue) => {
                      // Gérer l'ajout de nouvelles classes
                      const uniqueClasses = [...new Set(newValue)]
                      handleFormDataChange('classes', uniqueClasses)
                      
                      // Ajouter les nouvelles classes aux classes personnalisées
                      const newCustom = uniqueClasses.filter(c => 
                        !userClasses.includes(c) && !customClasses.includes(c)
                      )
                      if (newCustom.length > 0) {
                        setCustomClasses(prev => [...prev, ...newCustom])
                        
                        // Sauvegarder chaque nouvelle classe dans l'API
                        for (const newClass of newCustom) {
                          await saveNewClass(newClass)
                        }
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Classes"
                        placeholder="Choisir les classes ou en ajouter une nouvelle..."
                        helperText="Vous pouvez taper pour ajouter une nouvelle classe"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option}
                          {...getTagProps({ index })}
                          key={index}
                          color={userClasses.includes(option) ? "primary" : "secondary"}
                        />
                      ))
                    }
                  />

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

              {/* Étape 4: Matériel nécessaire */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">Matériel nécessaire</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Sélectionnez le matériel qui sera utilisé pendant cette séance
                  </Typography>

                  <Autocomplete
                    multiple
                    options={Array.isArray(materials) ? materials : []}
                    getOptionLabel={(option: any) => {
                      if (typeof option === 'string') return option;
                      return `${option.name || 'Matériel'} ${option.volume ? `(${option.volume}mL)` : ''}`;
                    }}
                    value={Array.isArray(formData.materials) ? formData.materials : []}
                    onChange={(_, newValue) => handleFormDataChange('materials', Array.isArray(newValue) ? newValue : [])}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Matériel"
                        placeholder="Choisir le matériel..."
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option: any, index) => (
                        <Chip
                          variant="outlined"
                          label={typeof option === 'string' ? option : `${option.name || 'Matériel'} ${option.volume ? `(${option.volume}mL)` : ''}`}
                          {...getTagProps({ index })}
                          key={index}
                        />
                      ))
                    }
                    isOptionEqualToValue={(option: any, value: any) => {
                      return option.id === value.id || option === value;
                    }}
                  />

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

              {/* Étape 5: Produits chimiques */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">Produits chimiques</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Sélectionnez les produits chimiques qui seront utilisés
                  </Typography>

                  <Autocomplete
                    multiple
                    options={Array.isArray(chemicals) ? chemicals : []}
                    getOptionLabel={(option: any) => {
                      if (typeof option === 'string') return option;
                      return `${option.name || 'Produit chimique'} - ${option.quantity || 0}${option.unit || ''}`;
                    }}
                    value={Array.isArray(formData.chemicals) ? formData.chemicals : []}
                    onChange={(_, newValue) => handleFormDataChange('chemicals', Array.isArray(newValue) ? newValue : [])}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Produits chimiques"
                        placeholder="Choisir les produits chimiques..."
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option: any, index) => (
                        <Chip
                          variant="outlined"
                          label={typeof option === 'string' ? option : `${option.name || 'Produit chimique'} - ${option.quantity || 0}${option.unit || ''}`}
                          {...getTagProps({ index })}
                          key={index}
                        />
                      ))
                    }
                    isOptionEqualToValue={(option: any, value: any) => {
                      return option.id === value.id || option === value;
                    }}
                  />

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

        {/* FAB pour ajout rapide */}
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleCreateEvent}
        >
          <Add />
        </Fab>
      </Container>
    </LocalizationProvider>
  )
}
