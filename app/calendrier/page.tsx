// app/calendrier/page.tsx

"use client"

import React, { useState, useEffect } from "react"
import { 
  Container, Typography, Box, Card, CardContent, Button,
  Grid, Chip, Alert, Paper, IconButton,
  Dialog, DialogTitle, DialogContent, TextField,
  Tab, Tabs, Fab, Stepper, Step, StepLabel, StepContent,
  Autocomplete, Divider, useMediaQuery, useTheme,
  FormControl, InputLabel, Select, MenuItem,
  SpeedDial, SpeedDialAction, SpeedDialIcon, Menu, ListItemIcon, ListItemText
} from "@mui/material"

import { 
  Add, Upload, Delete, Save, Class, Assignment,
  Build, Inventory, EventNote, Close
} from "@mui/icons-material"
import { DatePicker, TimePicker } from "@mui/x-date-pickers"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { fr } from "date-fns/locale"
import { 
  isSameDay,
  addHours
} from "date-fns"

// Import des composants refactorisés
import {
  CalendarStats,
  WeeklyView,
  EventsList,
  DailyPlanning,
  EventDetailsDialog,
  DailyCalendarView 
} from '@/components/calendar'


import { CalendarEvent, EventType } from '@/types/calendar'
import { useSession } from "next-auth/react"

// Ajout de l'interface UserRole
interface UserRole {
  role: 'TEACHER' | 'LABORANTIN' | 'ADMIN' | 'ADMINLABO' 
}

// Type pour les événements laborantin
type LaborantinEventType = 'MAINTENANCE' | 'INVENTAIRE' | 'AUTRE'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

// Au début du composant
const TAB_INDICES = {
  CALENDAR: 0,  // Vue hebdomadaire (desktop) ou jour (mobile)
  LIST: 1,      // Liste des événements
  DAILY: 2      // Planning du jour
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

export default function CalendarPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  
  // État pour le rôle de l'utilisateur - À remplacer par votre système d'authentification
  const [userRole, setUserRole] = useState<UserRole['role']>('TEACHER') // Par défaut TEACHER
  
  // Utiliser useSession pour obtenir les informations de session
  const { data: session, status } = useSession()

  // Un seul état pour gérer les tabs
  const [tabValue, setTabValue] = useState(0)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // États pour le formulaire de création d'événement TP
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'manual' | 'preset' | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<any>(null)
  const [tpPresets, setTpPresets] = useState<any[]>([])

  // États pour le formulaire d'événement laborantin
  const [laborantinDialogOpen, setLaborantinDialogOpen] = useState(false)
  const [laborantinEventType, setLaborantinEventType] = useState<LaborantinEventType | null>(null)
  const [laborantinActiveStep, setLaborantinActiveStep] = useState(0)
  
  // États pour le menu flottant
  const [fabMenuAnchor, setFabMenuAnchor] = useState<null | HTMLElement>(null)
  const fabMenuOpen = Boolean(fabMenuAnchor)
  // Dans le composant, ajouter cet état
  const [speedDialOpen, setSpeedDialOpen] = useState(false)


  // États pour les données du formulaire TP
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null as File | null,
    date: '',
    timeSlots: [{ date: '', startTime: '', endTime: '' }] as { date: string; startTime: string; endTime: string }[],
    classes: [] as string[],
    materials: [] as any[],
    chemicals: [] as any[]
  })

  // États pour les données du formulaire laborantin
  const [laborantinFormData, setLaborantinFormData] = useState({
    type: '' as LaborantinEventType | '',
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    equipment: [] as any[],
    notes: ''
  })
  
  // États pour les données de référence
  const [userClasses, setUserClasses] = useState<string[]>([])
  const [customClasses, setCustomClasses] = useState<string[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [chemicals, setChemicals] = useState<any[]>([])
  const [dragOver, setDragOver] = useState(false)

  // Fonction pour récupérer le rôle de l'utilisateur
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // Attendre que la session soit chargée
        if (status === 'loading') return
        
        // Si pas de session, utiliser le rôle par défaut
        if (!session?.user?.id) {
          console.log('Pas de session utilisateur trouvée')
          return
        }

        // Récupérer les informations de l'utilisateur depuis l'API
        const response = await fetch(`/api/user/${session.user.id}`)
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`)
        }
        
        const userData = await response.json()
        
        // Définir le rôle depuis les données utilisateur
        if (userData.role && ['TEACHER', 'LABORANTIN', 'ADMIN', 'ADMINLABO'].includes(userData.role)) {
          setUserRole(userData.role as UserRole['role'])
          
          // Optionnel : sauvegarder dans localStorage pour un accès plus rapide
          localStorage.setItem('userRole', userData.role)
        } else {
          console.warn('Rôle invalide ou manquant:', userData.role)
        }
        
      } catch (error) {
        console.error('Erreur lors de la récupération du rôle:', error)
        
        // Fallback : essayer de récupérer depuis localStorage
        const storedRole = localStorage.getItem('userRole') as UserRole['role'] | null
        if (storedRole && ['TEACHER', 'LABORANTIN', 'ADMIN', 'ADMINLABO'].includes(storedRole)) {
          setUserRole(storedRole)
        }
      }
    }
    
    fetchUserRole()
  }, [session, status]) // Re-exécuter si la session change

  console.log('User role:', userRole)

  // Fonctions pour gérer le menu FAB
  const handleFabClick = (event: React.MouseEvent<HTMLElement>) => {
    if (userRole === 'ADMIN' || userRole === 'ADMINLABO') {
      setFabMenuAnchor(event.currentTarget)
    } else if (userRole === 'LABORANTIN') {
      handleCreateLaborantinEventClick()
    } else if (userRole === 'TEACHER') {
      handleCreateTPEvent()
    }
  }

  const handleFabMenuClose = () => {
    setFabMenuAnchor(null)
  }
  // Fonction pour gérer l'upload de fichier
  const handleFileUpload = (file: File) => {
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

  // Fonctions pour le formulaire laborantin
  const handleLaborantinStepNext = () => {
    setLaborantinActiveStep((prevStep) => prevStep + 1)
  }

  const handleLaborantinStepBack = () => {
    setLaborantinActiveStep((prevStep) => prevStep - 1)
  }

  const handleFormDataChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLaborantinFormDataChange = (field: string, value: any) => {
    setLaborantinFormData(prev => ({
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

  const resetLaborantinForm = () => {
    setLaborantinActiveStep(0)
    setLaborantinEventType(null)
    setLaborantinFormData({
      type: '',
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      equipment: [],
      notes: ''
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
      materials: preset.materials.map((m: any) => m.material),
      chemicals: preset.chemicals.map((c: any) => c.chemical)
    }))
  }

  // Chargement des données de référence
  const loadReferenceData = async () => {
    try {
      const [materialsRes, chemicalsRes, classesRes] = await Promise.all([
        fetch('/api/equipement'),
        fetch('/api/chemicals'),
        fetch('/api/classes')
      ])

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        // Nouvelle structure API: { materiel: [], total, available, maintenance }
        setMaterials(materialsData.materiel || [])
      }

      if (chemicalsRes.ok) {
        const chemicalsData = await chemicalsRes.json()
        // Nouvelle structure API: { chemicals: [], stats: {...} }
        setChemicals(chemicalsData.chemicals || [])
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json()
        // Nouvelle structure API: { predefinedClasses: ClassData[], customClasses: ClassData[] }
        const allClasses = [
          ...(classesData.predefinedClasses || []),
          ...(classesData.customClasses || [])
        ]
        // Extraire uniquement les noms des classes
        setUserClasses(allClasses.map((classItem: any) => classItem.name))
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
        setUserClasses(prev => [...prev, className])
        return true
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la nouvelle classe:', error)
    }
    return false
  }

  // Fonction pour créer un événement laborantin
  const handleCreateLaborantinEvent = async () => {
    try {
      setLoading(true)

      // Vérifier que tous les champs requis sont remplis
      if (!laborantinFormData.type || !laborantinFormData.title || 
          !laborantinFormData.date || !laborantinFormData.startTime || !laborantinFormData.endTime) {
        throw new Error("Veuillez remplir tous les champs obligatoires.");
      }

      // Construire les dates de début et de fin complètes
      const startDate = new Date(`${laborantinFormData.date}T${laborantinFormData.startTime}:00`);
      const endDate = new Date(`${laborantinFormData.date}T${laborantinFormData.endTime}:00`);

      // Préparer les données pour l'API avec le bon format
      const eventData = {
        title: laborantinFormData.title,
        description: laborantinFormData.description,
        type: laborantinFormData.type, // MAINTENANCE, INVENTAIRE ou AUTRE
        // Utiliser startDate et endDate au lieu de date/startTime/endTime
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: laborantinFormData.location,
        equipment: laborantinFormData.equipment.map((eq: any) => eq.id),
        notes: laborantinFormData.notes
      }

      const response = await fetch('/api/calendrier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de l\'événement');
      }
      
      setLaborantinDialogOpen(false)
      resetLaborantinForm()
      await fetchEvents()
      console.log('Événement laborantin créé avec succès!')

    } catch (error) {
      console.error('Erreur lors de la création de l\'événement laborantin:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors de la création de l\'événement')
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour créer l'événement TP
  const handleCreateCalendarEvent = async () => {
    try {
      setLoading(true)

      // Vérifier que tous les créneaux sont valides
      for (const slot of formData.timeSlots) {
        if (!slot.date || !slot.startTime || !slot.endTime) {
          throw new Error("Date, heure de début ou heure de fin manquante pour un créneau.");
        }
      }

      // Préparer les données selon le format attendu par l'API
      const eventData = {
        title: formData.title,
        description: formData.description,
        type: 'TP',
        classes: formData.classes,
        materials: formData.materials.map((m: any) => m.id),
        chemicals: formData.chemicals.map((c: any) => c.id),
        ...(formData.file && { fileName: formData.file.name }),
        // Utiliser le premier créneau pour la compatibilité
        date: formData.timeSlots[0].date,
        timeSlots: formData.timeSlots.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime
        }))
      }

      const response = await fetch('/api/calendrier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création des événements');
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
      console.log('Fetching events from /api/calendrier...');
      
      const response = await fetch('/api/calendrier');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du calendrier');
      }
      
      const eventsData = await response.json();
      console.log('Events data from API:', eventsData);
      
      // Convertir les dates ISO strings en objets Date
      const eventsWithDates = eventsData.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }));
      
      console.log('Events with dates converted:', eventsWithDates);
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

  // Gérer la création d'événement en fonction du rôle
  const handleCreateEvent = () => {
    if (userRole === 'LABORANTIN') {
      resetLaborantinForm();
      setLaborantinDialogOpen(true);
    } else {
      resetForm();
      setCreateDialogOpen(true);
    }
  }

  // Fonction spécifique pour ouvrir le dialogue de création d'événement TP pour les admins
  const handleCreateTPEvent = () => {
    resetForm();
    setCreateDialogOpen(true);
  }

  // Fonction spécifique pour ouvrir le dialogue de création d'événement laborantin pour les admins
  const handleCreateLaborantinEventClick = () => {
    resetLaborantinForm();
    setLaborantinDialogOpen(true);
  }

  const handleViewEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setOpenDialog(true)
  }

  // Fonction pour choisir le type d'événement laborantin
  const handleSelectLaborantinEventType = (type: LaborantinEventType) => {
    setLaborantinEventType(type);
    handleLaborantinFormDataChange('type', type);
    
    // Préremplir le titre en fonction du type
    let title = '';
    switch(type) {
      case 'MAINTENANCE':
        title = 'Maintenance de matériel';
        break;
      case 'INVENTAIRE':
        title = 'Inventaire laboratoire';
        break;
      case 'AUTRE':
        title = 'Événement laboratoire';
        break;
    }
    handleLaborantinFormDataChange('title', title);
    
    handleLaborantinStepNext();
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

  // Fonction pour déterminer les boutons d'action selon le rôle
  const renderActionButtons = () => {
    switch(userRole) {
      case 'TEACHER':
        return (
          <Button
            variant="contained"
            startIcon={<Add />}
            size={isMobile ? 'medium' : 'large'}
            onClick={handleCreateEvent}
            fullWidth={isMobile}
          >
            Nouvelle séance
          </Button>
        );
      case 'LABORANTIN':
        return (
          <Button
            variant="contained"
            startIcon={<Add />}
            size={isMobile ? 'medium' : 'large'}
            onClick={handleCreateEvent}
            fullWidth={isMobile}
          >
            Nouvel événement
          </Button>
        );
      case 'ADMIN':
      case 'ADMINLABO':
        return (
          <Box display="flex" gap={2} flexDirection={isMobile ? "column" : "row"}>
            <Button
              variant="contained"
              startIcon={<Add />}
              size={isMobile ? 'medium' : 'large'}
              onClick={handleCreateTPEvent}
              fullWidth={isMobile}
            >
              Nouvelle séance
            </Button>
            <Button
              variant="outlined"
              startIcon={<EventNote />}
              size={isMobile ? 'medium' : 'large'}
              onClick={handleCreateLaborantinEventClick}
              fullWidth={isMobile}
            >
              Nouvel événement
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={2}
          mb={4}
        >
          <Box>
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom
              sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}
            >
              Planification des TP
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Calendrier et gestion des séances de laboratoire
            </Typography>
          </Box>
          
          {/* Boutons d'action en fonction du rôle */}
          {renderActionButtons()}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Pour le développement - changement de rôle */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label="TEACHER" 
            color={userRole === 'TEACHER' ? 'primary' : 'default'} 
            onClick={() => {
              setUserRole('TEACHER');
              localStorage.setItem('userRole', 'TEACHER');
            }} 
          />
          <Chip 
            label="LABORANTIN" 
            color={userRole === 'LABORANTIN' ? 'primary' : 'default'} 
            onClick={() => {
              setUserRole('LABORANTIN');
              localStorage.setItem('userRole', 'LABORANTIN');
            }} 
          />
          <Chip 
            label="ADMIN" 
            color={userRole === 'ADMIN' ? 'primary' : 'default'} 
            onClick={() => {
              setUserRole('ADMIN');
              localStorage.setItem('userRole', 'ADMIN');
            }} 
          />
          <Chip 
            label="ADMINLABO" 
            color={userRole === 'ADMINLABO' ? 'primary' : 'default'} 
            onClick={() => {
              setUserRole('ADMINLABO');
              localStorage.setItem('userRole', 'ADMINLABO');
            }} 
          />
        </Box>

        {/* Statistiques du jour */}
        <CalendarStats events={events} getTodayEvents={getTodayEvents} />

        {/* Tabs */}
        <Paper elevation={2}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{ px: 2 }}
              variant={isMobile ? "fullWidth" : "standard"}
            >
              <Tab label={isMobile ? "Calendrier jour" : "Vue hebdomadaire"} />
              <Tab label="Liste des événements" />
              <Tab label="Planning du jour" />
            </Tabs>
          </Box>

          {/* Tab 0: Vue calendrier (jour par jour sur mobile, semaine sur desktop) */}
          <TabPanel value={tabValue} index={0}>
            {isMobile ? (
              // Vue jour par jour pour mobile
              <DailyCalendarView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                events={events}
                onEventClick={handleViewEvent}
              />
            ) : (
              // Vue hebdomadaire pour desktop
              <WeeklyView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                events={events}
                onEventClick={handleViewEvent}
              />
            )}
          </TabPanel>

          {/* Tab Liste des événements */}
          <TabPanel value={tabValue} index={TAB_INDICES.LIST}>
            <EventsList events={events} onEventClick={handleViewEvent} />
          </TabPanel>

          {/* Tab 2: Planning du jour */}
          <TabPanel value={tabValue} index={TAB_INDICES.DAILY}>
            <DailyPlanning events={events} onEventClick={handleViewEvent} />
          </TabPanel>
        </Paper>

        {/* Dialog événement */}
        <EventDetailsDialog
          open={openDialog}
          event={selectedEvent}
          onClose={() => setOpenDialog(false)}
        />

        {/* Dialogue de création d'événement TP multi-étapes */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: { minHeight: isMobile ? '100%' : '500px' }
          }}
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1}>
                <Add color="primary" />
                <Typography variant="h6">Ajouter une nouvelle séance TP</Typography>
              </Box>
              <IconButton onClick={() => setCreateDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Stepper activeStep={activeStep} orientation={isMobile ? "vertical" : "vertical"}>
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
                          flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 8px)' },
                          minWidth: { xs: 'auto', sm: '250px' },
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
                    </Box>
                  </Box>

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
                                  sx: { minWidth: { xs: '100%', sm: 140 } },
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
                                  updateTimeSlot(index, 'endTime', `${hours}:${minutes}`)
                                }
                              }}
                              slotProps={{
                                textField: { 
                                  size: "small",
                                  sx: { minWidth: { xs: '48%', sm: 120 } },
                                  onClick: (e: any) => {
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
                        !slot.date
                      )}
                    >
                      Continuer
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* Étapes 3, 4, et 5 restent identiques à votre code original */}
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
                      const uniqueClasses = [...new Set(newValue)]
                      handleFormDataChange('classes', uniqueClasses)
                      
                      const newCustom = uniqueClasses.filter(c => 
                        !userClasses.includes(c) && !customClasses.includes(c)
                      )
                      if (newCustom.length > 0) {
                        setCustomClasses(prev => [...prev, ...newCustom])
                        
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
                    options={materials}
                    getOptionLabel={(option: any) => {
                      if (typeof option === 'string') return option;
                      return `${option.itemName || option.name || 'Matériel'} ${option.volume ? `(${option.volume})` : ''}`;
                    }}
                    value={formData.materials}
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
                          label={`${option.itemName || option.name || 'Matériel'} ${option.volume ? `(${option.volume})` : ''}`}
                          {...getTagProps({ index })}
                          key={index}
                        />
                      ))
                    }
                    isOptionEqualToValue={(option: any, value: any) => {
                      return option.id === value.id;
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
                    options={chemicals}
                    getOptionLabel={(option: any) => {
                      if (typeof option === 'string') return option;
                      return `${option.name || 'Produit chimique'} - ${option.quantity || 0}${option.unit || ''}`;
                    }}
                    value={formData.chemicals}
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
                          label={`${option.name || 'Produit chimique'} - ${option.quantity || 0}${option.unit || ''}`}
                          {...getTagProps({ index })}
                          key={index}
                        />
                      ))
                    }
                    isOptionEqualToValue={(option: any, value: any) => {
                      return option.id === value.id;
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

        {/* Dialogue de création d'événement laborantin */}
        <Dialog
          open={laborantinDialogOpen}
          onClose={() => setLaborantinDialogOpen(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: { minHeight: isMobile ? '100%' : '500px' }
          }}
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1}>
                <Add color="primary" />
                <Typography variant="h6">Nouvel événement laboratoire</Typography>
              </Box>
              <IconButton onClick={() => setLaborantinDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Stepper activeStep={laborantinActiveStep} orientation="vertical">
              {/* Étape 1: Type d'événement laborantin */}
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
                        onClick={() => handleSelectLaborantinEventType('MAINTENANCE')}
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
                        onClick={() => handleSelectLaborantinEventType('INVENTAIRE')}
                      >
                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                          <Inventory color={laborantinEventType === 'INVENTAIRE' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                          <Typography variant="h6">Inventaire</Typography>
                          <Typography variant="body2" color="text.secondary" textAlign="center">
                            Inventaire du matériel ou des produits chimiques
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
                        onClick={() => handleSelectLaborantinEventType('AUTRE')}
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

              {/* Étape 2: Détails de l'événement */}
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
                      value={laborantinFormData.title}
                      onChange={(e) => handleLaborantinFormDataChange('title', e.target.value)}
                      required
                    />
                    
                    <TextField
                      fullWidth
                      label="Description"
                      multiline
                      rows={3}
                      value={laborantinFormData.description}
                      onChange={(e) => handleLaborantinFormDataChange('description', e.target.value)}
                    />
                    
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <DatePicker
                        label="Date"
                        value={laborantinFormData.date ? new Date(laborantinFormData.date) : null}
                        onChange={(newValue) => {
                          if (newValue) {
                            handleLaborantinFormDataChange('date', newValue.toISOString().split('T')[0])
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
                    </Box>
                    
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <TimePicker
                        label="Heure de début"
                        value={laborantinFormData.startTime ? new Date(`2000-01-01T${laborantinFormData.startTime}`) : null}
                        onChange={(newValue) => {
                          if (newValue) {
                            const hours = newValue.getHours().toString().padStart(2, '0')
                            const minutes = newValue.getMinutes().toString().padStart(2, '0')
                            handleLaborantinFormDataChange('startTime', `${hours}:${minutes}`)
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
                        value={laborantinFormData.endTime ? new Date(`2000-01-01T${laborantinFormData.endTime}`) : null}
                        onChange={(newValue) => {
                          if (newValue) {
                            const hours = newValue.getHours().toString().padStart(2, '0')
                            const minutes = newValue.getMinutes().toString().padStart(2, '0')
                            handleLaborantinFormDataChange('endTime', `${hours}:${minutes}`)
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
                    
                    <TextField
                      fullWidth
                      label="Lieu"
                      value={laborantinFormData.location}
                      onChange={(e) => handleLaborantinFormDataChange('location', e.target.value)}
                    />
                  </Box>

                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button onClick={handleLaborantinStepBack}>
                      Retour
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleLaborantinStepNext}
                      disabled={!laborantinFormData.title || !laborantinFormData.date || 
                                !laborantinFormData.startTime || !laborantinFormData.endTime}
                    >
                      Continuer
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* Étape 3: Équipement et détails spécifiques */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">Détails supplémentaires</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {laborantinFormData.type === 'MAINTENANCE' ? 
                      "Spécifiez l'équipement concerné par la maintenance" :
                      laborantinFormData.type === 'INVENTAIRE' ?
                      "Spécifiez les détails de l'inventaire" :
                      "Ajoutez des informations complémentaires si nécessaire"}
                  </Typography>
                  
                  {laborantinFormData.type === 'MAINTENANCE' && (
                    <Autocomplete
                      multiple
                      options={materials}
                      getOptionLabel={(option: any) => {
                        if (typeof option === 'string') return option;
                        return `${option.itemName || option.name || 'Matériel'} ${option.volume ? `(${option.volume})` : ''}`;
                      }}
                      value={laborantinFormData.equipment}
                      onChange={(_, newValue) => handleLaborantinFormDataChange('equipment', newValue || [])}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Équipement concerné"
                          placeholder="Sélectionnez l'équipement..."
                          required={laborantinFormData.type === 'MAINTENANCE'}
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
                    value={laborantinFormData.notes}
                    onChange={(e) => handleLaborantinFormDataChange('notes', e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button onClick={handleLaborantinStepBack}>
                      Retour
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleCreateLaborantinEvent}
                      startIcon={<Save />}
                      disabled={loading }
                    >
                      {loading ? 'Ajout...' : 'Ajouter l\'événement'}
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>
          </DialogContent>
        </Dialog>

    {(userRole === 'ADMIN' || userRole === 'ADMINLABO') ? (
      <SpeedDial
        ariaLabel="Actions rapides"
        sx={{ 
          position: 'fixed', 
          bottom: { xs: 72, sm: 16 },
          right: 16 
        }}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onOpen={() => setSpeedDialOpen(true)}
        onClose={() => setSpeedDialOpen(false)}
      >
        <SpeedDialAction
          icon={<Class />}
          onClick={() => {
            setSpeedDialOpen(false)
            handleCreateTPEvent()
          }}
          slotProps={{ 
            tooltip: { 
              open: speedDialOpen, 
              title: "Nouvelle séance",
              slotProps: {
                tooltip: {
                  sx: {
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    maxWidth: 'none',
                    width: 'auto'
                  }
                }
              }
            } 
          }}
        />
        <SpeedDialAction
          icon={<EventNote />}
          onClick={() => {
            setSpeedDialOpen(false)
            handleCreateLaborantinEventClick()
          }}
          slotProps={{ 
            tooltip: { 
              open: speedDialOpen, 
              title: "Nouvel événement",
              slotProps: {
                tooltip: {
                  sx: {
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    maxWidth: 'none',
                    width: 'auto'
                  }
                }
              }
            } 
          }}
        />
      </SpeedDial>
    ) : (
      <Fab
        color="primary"
        aria-label="add"
        sx={{ 
          position: 'fixed', 
          bottom: { xs: 72, sm: 16 },
          right: 16 
        }}
        onClick={
          userRole === 'LABORANTIN' ? handleCreateLaborantinEventClick : 
          userRole === 'TEACHER' ? handleCreateTPEvent : 
          handleCreateEvent
        }
      >
        <Add />
      </Fab>
    )}
      </Container>
    </LocalizationProvider>
  )
}