"use client"

import { useState, useEffect } from "react"
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
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  addDays,
  subDays,
  startOfDay,
  addHours
} from "date-fns"
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

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
]

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
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
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
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
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

      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)

      const eventData = {
        title: formData.title,
        description: formData.description,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        type: 'TP',
        classes: formData.classes,
        materials: formData.materials,
        chemicals: formData.chemicals,
        ...(formData.file && { fileName: formData.file.name })
      }

      const response = await fetch('/api/calendrier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la création de l\'événement')
      }

      // Recharger les événements
      await fetchEvents()
      
      // Fermer le dialogue et réinitialiser le formulaire
      setCreateDialogOpen(false)
      resetForm()

      // Message de succès (optionnel, on pourrait ajouter un snackbar)
      console.log('Événement créé avec succès!')

    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error)
      setError('Erreur lors de la création de l\'événement')
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendrier');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du calendrier');
      }
      const eventsData = await response.json();
      setEvents(eventsData);
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

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(event => 
      isSameDay(event.startDate, date)
    )
  }

  const getTodayEvents = () => {
    return events.filter(event => 
      isSameDay(event.startDate, new Date())
    )
  }

  const getUpcomingEvents = () => {
    const today = startOfDay(new Date())
    return events
      .filter(event => event.startDate >= today)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 10)
  }

  const handleCreateEvent = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  const handleViewEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setOpenDialog(true)
  }

  const formatTime = (date: Date) => {
    return format(date, "HH:mm", { locale: fr })
  }

  const formatDateTime = (date: Date) => {
    return format(date, "dd/MM/yyyy HH:mm", { locale: fr })
  }

  const getEventTypeInfo = (type: string) => {
    return EVENT_TYPES[type as keyof typeof EVENT_TYPES] || EVENT_TYPES.OTHER
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
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <CalendarMonth />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" color="primary">
                      {getTodayEvents().length}
                    </Typography>
                    <Typography variant="body2">Séances aujourd'hui</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <Science />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {events.filter(e => e.type === 'TP').length}
                    </Typography>
                    <Typography variant="body2">TP programmés</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <Schedule />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {events.filter(e => e.type === 'MAINTENANCE').length}
                    </Typography>
                    <Typography variant="body2">Maintenances</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <Room />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {Array.from(new Set(events.map(e => e.room))).length}
                    </Typography>
                    <Typography variant="body2">Salles utilisées</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

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
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <IconButton onClick={() => setCurrentDate(subDays(currentDate, 7))}>
                  ←
                </IconButton>
                <Typography variant="h6">
                  Semaine du {format(startOfWeek(currentDate, { weekStartsOn: 1 }), "dd/MM/yyyy", { locale: fr })}
                </Typography>
                <IconButton onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                  →
                </IconButton>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Aujourd'hui
                </Button>
              </Stack>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1 }}>
              {/* En-tête des heures */}
              <Box sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">Heure</Typography>
              </Box>
              {getWeekDays().map((day) => (
                <Box key={day.toISOString()} sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="subtitle2">
                    {format(day, "EEEE", { locale: fr })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(day, "dd/MM", { locale: fr })}
                  </Typography>
                </Box>
              ))}

              {/* Grille horaire */}
              {TIME_SLOTS.map((time) => (
                <Box key={time} sx={{ display: 'contents' }}>
                  <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption">{time}</Typography>
                  </Box>
                  {getWeekDays().map((day) => {
                    const dayEvents = getEventsForDay(day).filter(event => 
                      formatTime(event.startDate) === time
                    )
                    return (
                      <Box 
                        key={`${day.toISOString()}-${time}`}
                        sx={{ 
                          p: 0.5, 
                          borderTop: 1, 
                          borderColor: 'divider',
                          minHeight: 60,
                          position: 'relative'
                        }}
                      >
                        {dayEvents.map((event) => {
                          const typeInfo = getEventTypeInfo(event.type)
                          return (
                            <Card 
                              key={event.id}
                              sx={{ 
                                bgcolor: typeInfo.color,
                                color: 'white',
                                cursor: 'pointer',
                                mb: 0.5,
                                '&:hover': { opacity: 0.8 }
                              }}
                              onClick={() => handleViewEvent(event)}
                            >
                              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  {event.title}
                                </Typography>
                                {event.class && (
                                  <Typography variant="caption" display="block">
                                    {event.class}
                                  </Typography>
                                )}
                                {event.room && (
                                  <Typography variant="caption" display="block">
                                    {event.room}
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </Box>
                    )
                  })}
                </Box>
              ))}
            </Box>
          </TabPanel>

          {/* Tab 1: Liste des événements */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Tous les événements programmés
            </Typography>
            <List>
              {getUpcomingEvents().map((event) => {
                const typeInfo = getEventTypeInfo(event.type)
                return (
                  <ListItem 
                    key={event.id}
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1, 
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => handleViewEvent(event)}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: typeInfo.color, width: 40, height: 40 }}>
                        {typeInfo.icon}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">{event.title}</Typography>
                          <Chip label={typeInfo.label} size="small" />
                          {event.class && (
                            <Chip label={event.class} size="small" variant="outlined" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            📅 {formatDateTime(event.startDate)} - {formatTime(event.endDate)}
                          </Typography>
                          {event.room && (
                            <Typography variant="body2" color="text.secondary">
                              📍 {event.room}
                            </Typography>
                          )}
                          {event.instructor && (
                            <Typography variant="body2" color="text.secondary">
                              👨‍🏫 {event.instructor}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                )
              })}
            </List>
          </TabPanel>

          {/* Tab 2: Planning du jour */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Planning d'aujourd'hui - {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
            </Typography>
            {getTodayEvents().length === 0 ? (
              <Alert severity="info">
                Aucune séance programmée aujourd'hui
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {getTodayEvents().map((event) => {
                  const typeInfo = getEventTypeInfo(event.type)
                  return (
                    <Grid size={{ xs: 12, md: 6 }} key={event.id}>
                      <Card sx={{ border: 2, borderColor: typeInfo.color }}>
                        <CardContent>
                          <Box display="flex" alignItems="start" gap={2}>
                            <Avatar sx={{ bgcolor: typeInfo.color }}>
                              {typeInfo.icon}
                            </Avatar>
                            <Box flex={1}>
                              <Typography variant="h6" gutterBottom>
                                {event.title}
                              </Typography>
                              <Stack spacing={1}>
                                <Typography variant="body2">
                                  🕒 {formatTime(event.startDate)} - {formatTime(event.endDate)}
                                </Typography>
                                {event.class && (
                                  <Typography variant="body2">
                                    🎓 {event.class}
                                  </Typography>
                                )}
                                {event.room && (
                                  <Typography variant="body2">
                                    📍 {event.room}
                                  </Typography>
                                )}
                                {event.instructor && (
                                  <Typography variant="body2">
                                    👨‍🏫 {event.instructor}
                                  </Typography>
                                )}
                                {event.description && (
                                  <Typography variant="body2" color="text.secondary">
                                    {event.description}
                                  </Typography>
                                )}
                              </Stack>
                            </Box>
                          </Box>
                        </CardContent>
                        <CardActions>
                          <Button size="small" onClick={() => handleViewEvent(event)}>
                            Voir détails
                          </Button>
                          <Button size="small" color="primary">
                            Modifier
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            )}
          </TabPanel>
        </Paper>

        {/* Dialog événement */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedEvent ? `Détails - ${selectedEvent.title}` : "Nouvelle séance"}
          </DialogTitle>
          <DialogContent>
            {selectedEvent ? (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" gutterBottom>
                      {selectedEvent.title}
                    </Typography>
                    <Chip 
                      label={getEventTypeInfo(selectedEvent.type).label} 
                      color="primary" 
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2">Date et heure</Typography>
                    <Typography variant="body1">
                      {formatDateTime(selectedEvent.startDate)} - {formatTime(selectedEvent.endDate)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2">Durée</Typography>
                    <Typography variant="body1">
                      {Math.round((selectedEvent.endDate.getTime() - selectedEvent.startDate.getTime()) / (1000 * 60 * 60))}h
                    </Typography>
                  </Grid>
                  {selectedEvent.class && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="subtitle2">Classe</Typography>
                      <Typography variant="body1">{selectedEvent.class}</Typography>
                    </Grid>
                  )}
                  {selectedEvent.room && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="subtitle2">Salle</Typography>
                      <Typography variant="body1">{selectedEvent.room}</Typography>
                    </Grid>
                  )}
                  {selectedEvent.instructor && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2">Enseignant</Typography>
                      <Typography variant="body1">{selectedEvent.instructor}</Typography>
                    </Grid>
                  )}
                  {selectedEvent.description && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2">Description</Typography>
                      <Typography variant="body1">{selectedEvent.description}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            ) : (
              <Box>
                <Typography>Formulaire de création d'événement</Typography>
                {/* Formulaire à implémenter */}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Fermer</Button>
            {selectedEvent && (
              <>
                <Button variant="outlined">Modifier</Button>
                <Button variant="contained" color="error">Supprimer</Button>
              </>
            )}
          </DialogActions>
        </Dialog>

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
                    <Box display="flex" gap={2}>
                      <DatePicker
                        label="Date de début"
                        value={formData.startDate ? new Date(formData.startDate) : null}
                        onChange={(newValue) => {
                          if (newValue) {
                            handleFormDataChange('startDate', newValue.toISOString().split('T')[0])
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
                            fullWidth: true,
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
                    </Box>
                    <Box display="flex" gap={2}>
                      <DatePicker
                        label="Date de fin"
                        value={formData.endDate ? new Date(formData.endDate) : null}
                        onChange={(newValue) => {
                          if (newValue) {
                            handleFormDataChange('endDate', newValue.toISOString().split('T')[0])
                          }
                        }}
                        slotProps={{
                          textField: { fullWidth: true }
                        }}
                        minDate={formData.startDate ? new Date(formData.startDate) : undefined}
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
                          textField: { fullWidth: true }
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button onClick={handleStepBack}>
                      Retour
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleStepNext}
                      disabled={!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime}
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
                    getOptionLabel={(option: any) => `${option.name || option} ${option.volume ? `(${option.volume}mL)` : ''}`}
                    value={Array.isArray(formData.materials) ? formData.materials : []}
                    onChange={(_, newValue) => handleFormDataChange('materials', newValue || [])}
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
                          label={`${option.name || option} ${option.volume ? `(${option.volume}mL)` : ''}`}
                          {...getTagProps({ index })}
                          key={index}
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
                    getOptionLabel={(option: any) => `${option.name || option} - ${option.quantity || 0}${option.unit || ''}`}
                    value={Array.isArray(formData.chemicals) ? formData.chemicals : []}
                    onChange={(_, newValue) => handleFormDataChange('chemicals', newValue || [])}
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
                          label={`${option.name || option} - ${option.quantity || 0}${option.unit || ''}`}
                          {...getTagProps({ index })}
                          key={index}
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
