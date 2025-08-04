// app/physique/calendrier/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Container, Box, Typography, Alert, Paper, Tabs, Tab, Chip, useMediaQuery, useTheme } from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { fr } from "date-fns/locale"
import { isSameDay } from "date-fns"
import { useSession } from "next-auth/react"
import { usePersistedTab } from '@/lib/hooks/usePersistedTab'
import { ViewWeek, ListAlt, CalendarToday, Science } from '@mui/icons-material'
// Import des composants existants
import {
  WeeklyView,
  EventsList,
  EditEventDialogPhysics,
  DailyCalendarView ,
  EventDetailsDialogPhysics,
} from '@/components/calendar'
import { EventState, EventType, TimeSlot } from '@/types/calendar'

// Import des nouveaux composants refactorisés
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { RoleSelector } from '@/components/calendar/RoleSelector'
import { TabPanel } from '@/components/calendar/TabPanel'
import { CreateTPDialog } from '@/components/calendar/CreateTPDialog'
import { CreateLaborantinEventDialog } from '@/components/calendar/CreateLaborantinEventDialog'
import { FloatingActionButtons } from '@/components/calendar/FloatingActionButtons'
import { EditEventDialog } from '@/components/calendar/EditEventDialog'

// Import du nouveau système simplifié
import ImprovedDailyPlanning from '@/components/calendar/ImprovedDailyPlanning'

import { CalendarEvent } from '@/types/calendar'
// NOUVEAU: Import du hook centralisé TimeSlots pour physique (client-only)
import { useCalendarTimeSlots } from '@/lib/hooks/useCalendarTimeSlots'
import { useReferenceData } from '@/lib/hooks/useReferenceData'
import { UserRole } from "@/types/global";
import { getActiveTimeSlots } from '@/lib/calendar-utils-client'

const TAB_INDICES = {
  DAILY: 0,
  CALENDAR: 1,
  LIST: 2,
}

interface TimeSlotUpdate {
  action: 'add' | 'update' | 'delete';
  timeSlot: Partial<TimeSlot> & { id?: string };
}
  
export default function PhysiqueCalendrierPage() {
  const { data: session, status } = useSession()
  
  // États principaux
  const [userRole, setUserRole] = useState<UserRole>('TEACHER')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  // Initialise à la date du jour (sans l'heure)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  })
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  
  // États pour gérer l'affichage des détails
  const [detailsOpen, setDetailsOpen] = useState(false)
  // États pour la modification
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null)

  // États des dialogues
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [laborantinDialogOpen, setLaborantinDialogOpen] = useState(false)
  const [eventToCopy, setEventToCopy] = useState<CalendarEvent | null>(null) // NOUVEAU: événement à copier
  
  // Détection de la taille de l'écran
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'))
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Hooks personnalisés - Hook unifié pour tous les événements physique
  // Hooks personnalisés - MIGRATION vers le nouveau système TimeSlots
  const {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    moveEvent,
    changeEventState,
    handleTimeSlotChanges,
    setEvents,
    setError
  } = useCalendarTimeSlots('physique')
  
  const { materials, consommables, userClasses, customClasses, setCustomClasses, saveNewClass } = useReferenceData({ discipline: 'physique' })
  
  // Note: tpPresets sera intégré dans le nouveau système plus tard
  const [tpPresets, setTpPresets] = useState([])

  // Charger les presets TP (temporaire jusqu'à migration complète)
  useEffect(() => {
    const loadTpPresets = async () => {
      try {
        const response = await fetch('/api/tp-presets')
        if (response.ok) {
          const data = await response.json()
          setTpPresets(data)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des presets TP:', error)
      }
    }
    loadTpPresets()
  }, [])

  // Fonction pour déterminer si l'utilisateur est le créateur d'un événement
  const isCreator = (event: CalendarEvent): boolean => {
    return event.createdBy === session?.user?.email || event.createdBy === session?.user?.id
  }

  // Fonction helper pour gérer localStorage de manière sûre
  const getStoredTabValue = (): number => {
    try {
      if (typeof window !== 'undefined') {
        const savedTab = localStorage.getItem('physicsCalendarTabValue')
        if (savedTab !== null) {
          const parsedValue = parseInt(savedTab, 10)
          if (!isNaN(parsedValue) && Object.values(TAB_INDICES).includes(parsedValue)) {
            return parsedValue
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la lecture du localStorage:', error)
    }
    return TAB_INDICES.DAILY // Valeur par défaut
  }
  const [tabValue, setTabValue] = useState(getStoredTabValue)
  const saveTabValue = (value: number): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('physicsCalendarTabValue', value.toString())
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde dans localStorage:', error)
    }
  }
  // Handler pour changer de tab
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    saveTabValue(newValue)
  }

  // Récupération du rôle utilisateur et chargement initial des événements
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (status === 'loading') return
        if (!session?.user?.id) return

        const response = await fetch(`/api/user/${session.user.id}`)
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`)
        
        const userData = await response.json()
        if (userData.role && ['TEACHER', 'LABORANTIN', 'ADMIN', 'ADMINLABO'].includes(userData.role)) {
          setUserRole(userData.role)
          setUserEmail(userData.email)
          setUserId(userData.id)
          localStorage.setItem('userRole', userData.role)
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du rôle:', error)
        const storedRole = localStorage.getItem('userRole') as typeof userRole | null
        if (storedRole && ['TEACHER', 'LABORANTIN', 'ADMIN', 'ADMINLABO'].includes(storedRole)) {
          setUserRole(storedRole)
        }
      }
    }
    
    fetchUserRole()
  }, [session, status])

  // Chargement initial des événements physique
  useEffect(() => {
    if (session && userRole) {
      loadEvents()
    }
  }, [session, userRole, loadEvents])

  // Handler pour ouvrir les détails d'un événement
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setDetailsOpen(true)
  }

  const getTodayEvents = () => {
    return events.filter((event: CalendarEvent) => {
      const activeSlots = getActiveTimeSlots(event)
      // Vérifier si au moins un créneau actif est aujourd'hui
      return activeSlots.some(slot => isSameDay(new Date(slot.startDate), new Date()))
    })
  }
  const handleCreateTPEvent = () => {
    setCreateDialogOpen(true)
  }

  const handleCreateLaborantinEvent = () => {
    setLaborantinDialogOpen(true)
  }

  // Handler pour modifier un événement
  const handleEventEdit = (event: CalendarEvent) => {
    setDetailsOpen(false) // Fermer le dialogue de détails
    setEventToEdit(event)
    setEditDialogOpen(true)
  }

  // NOUVEAU: Handler pour copier un événement
  const handleEventCopy = (event: CalendarEvent) => {
    setEventToCopy(event)
    setCreateDialogOpen(true)
  }

  // Handler pour fermer le dialogue de création et remettre à zéro l'événement à copier
  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false)
    setEventToCopy(null)
  }

  // Handler pour gérer la proposition de nouveaux créneaux
  const handleMoveDate = async (event: CalendarEvent, timeSlots: any[], reason?: string, state?: EventState) => {
    try {
      const updatedEvent = await moveEvent(event.id, timeSlots, reason);
      if (isCreator(event)) {
        alert('Vos modifications ont été enregistrées. L\'événement est maintenant en attente de validation.');
      } else {
        alert('Votre demande de modification a été envoyée au créateur de l\'événement pour validation.');
      }
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(updatedEvent);
      }
      // Rechargement optimisé : seulement si l'événement n'est pas mis à jour correctement
      const currentEvents = events.find(e => e.id === event.id);
      if (!currentEvents || currentEvents.timeSlots?.length === (event.timeSlots?.length || 0)) {
        // Si l'événement n'a pas été mis à jour localement, on recharge
        await loadEvents();
      }
    } catch (error) {
      console.error('Erreur lors de la proposition de nouveaux créneaux:', error);
      alert('Erreur lors de la modification de l\'événement');
    }
  };

  // Handler pour gérer les changements d'état (validation, annulation, déplacement)
  const handleStateChange = async (updatedEvent: CalendarEvent, newState: EventState, reason?: string, timeSlots?: any[]) => {
    try {
      if (newState === 'MOVED' && timeSlots && timeSlots.length > 0) {
        return handleMoveDate(updatedEvent, timeSlots, reason, newState);
      }
      const updatedEventFromServer = await changeEventState(updatedEvent.id, newState, reason);
      if (selectedEvent?.id === updatedEvent.id) {
        setSelectedEvent(updatedEventFromServer);
      }
      await loadEvents();
    } catch (error) {
      console.error('Erreur lors du changement d\'état:', error);
      if (selectedEvent?.id === updatedEvent.id) {
        setSelectedEvent(updatedEvent);
      }
    }
  };

  // Handler pour gérer la confirmation/rejet des modifications par le créateur
  const handleConfirmModification = async (event: CalendarEvent, modificationId: string, action: 'confirm' | 'reject') => {
    try {
      // Utilisation directe de l'API car cette fonctionnalité n'est pas encore dans le hook
      const response = await fetch(`/api/calendrier/physique/confirm-modification?eventId=${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modificationId,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const updatedEventFromServer = data.updatedEvent;

      if (selectedEvent?.id === event.id) {
        setSelectedEvent(updatedEventFromServer);
      }
      await loadEvents();
    } catch (error) {
      console.error('Erreur lors de la confirmation/rejet de modification:', error);
    }
  };

  // Handler pour approuver les changements de créneaux - MIGRATION vers nouveau système TimeSlots
  const handleApproveTimeSlotChanges = async (event: CalendarEvent) => {
    try {
      const updatedEvent = await handleTimeSlotChanges(event.id, 'approve')

      if (selectedEvent?.id === event.id) {
        setSelectedEvent(updatedEvent);
      }
      
      alert('Créneaux approuvés avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'approbation des créneaux:', error);
      alert('Erreur lors de l\'approbation des créneaux');
    }
  };

  // Handler pour rejeter les changements de créneaux - MIGRATION vers nouveau système TimeSlots
  const handleRejectTimeSlotChanges = async (event: CalendarEvent) => {
    try {
      const updatedEvent = await handleTimeSlotChanges(event.id, 'reject')

      if (selectedEvent?.id === event.id) {
        setSelectedEvent(updatedEvent);
      }
      
      alert('Créneaux rejetés avec succès');
    } catch (error) {
      console.error('Erreur lors du rejet des créneaux:', error);
      alert('Erreur lors du rejet des créneaux');
    }
  };

  // Nouvelle fonction pour gérer les mises à jour d'événements depuis le nouveau système simplifié
  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    // Mettre à jour la liste des événements
    console.log('Mise à jour de l\'événement:', updatedEvent);
    setEvents((prevEvents: CalendarEvent[]) => 
      prevEvents.map(e => 
        e.id === updatedEvent.id ? updatedEvent : e
      )
    );

    // Mettre à jour l'événement sélectionné si c'est le même
    if (selectedEvent?.id === updatedEvent.id) {
      setSelectedEvent(updatedEvent);
    }
  };
  
  // Handler pour sauvegarder les modifications
  const handleSaveEdit = async (updatedEventData: Partial<CalendarEvent>) => {
    if (!eventToEdit) return;
    try {
      await updateEvent(eventToEdit.id, updatedEventData);
      await loadEvents();
      setEditDialogOpen(false);
      setEventToEdit(null);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      alert('Erreur lors de la modification de l\'événement');
    }
  };

  // Handler pour supprimer un événement
  const handleEventDelete = async (event: CalendarEvent) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      return;
    }
    try {
      await deleteEvent(event.id);
      await loadEvents();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'événement');
    }
  };

  // Ajout de la fonction canEditEvent
  const canEditEvent = (event: CalendarEvent): boolean => {
    if (!session) return false

    return userRole === 'ADMIN' || 
          userRole === 'ADMINLABO' || 
          event.createdBy === userEmail || 
          event.createdBy === userId
  }

  // Fonction pour vérifier si l'utilisateur peut valider les événements
  const canValidateEvent = (): boolean => {
    return userRole === 'LABORANTIN' || userRole === 'ADMINLABO'
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography>Chargement du calendrier physique...</Typography>
        </Box>
      </Container>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} 
    adapterLocale={fr}>
      <Container maxWidth="lg" 
          sx={{ 
            py: { xs: 2, md: 4 },
            px: { xs: 2, sm: 2, md: 3 },
            width: '100%',
            maxWidth: 'lg !important',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
          >
        <Box sx={{ width: '100%', maxWidth: '100%', mb: 3 }}>
          {/* En-tête spécialisé pour la physique */}
          <Box display="flex" alignItems="center" gap={2} mb={4}>
            <Science sx={{ fontSize: 40, color: 'secondary.main' }} />
            <Box>
              <Typography variant="h3" component="h1" fontWeight="bold">
                Calendrier Physique
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Gestion des événements et TP de physique
              </Typography>
            </Box>
          </Box>
          
          <CalendarHeader 
            userRole={userRole}
            onCreateTP={handleCreateTPEvent}
            onCreateLaborantin={handleCreateLaborantinEvent}
          />
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Pour le développement - changement de rôle */}
        <RoleSelector 
          currentRole={userRole} 
          onRoleChange={setUserRole} 
        />

          <Paper 
            elevation={2}
            sx={{
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}
          >
          <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              width: '100%',
              overflow: 'hidden'
            }}>
            <Tabs 
              value={tabValue} 
              variant="scrollable"
              scrollButtons={isMobile ? "auto" : false}
              allowScrollButtonsMobile
              onChange={handleTabChange}
              sx={{ 
                  width: '100%',
                  '& .MuiTabs-scrollButtons': {
                    '&.Mui-disabled': {
                      opacity: 0.3
                    }
                  },
                  '& .MuiTab-root': {
                    minWidth: { xs: 'auto', sm: 'auto' },
                    px: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }
                }}
            >
              <Tab 
                label="Planning du jour" 
                icon={
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarToday fontSize="small" sx={{ color: 'primary.main' }} />
                  </span>
                }
                iconPosition="start"
              />
              <Tab 
                label="Vue hebdomadaire" 
                icon={
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <ViewWeek fontSize="small" sx={{ color: 'primary.main' }} />
                  </span>
                }
                iconPosition="start"
              />
              <Tab 
                label="Liste des événements" 
                icon={
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <ListAlt fontSize="small" sx={{ color: 'primary.main' }} />
                  </span>
                }
                iconPosition="start"
              />
            </Tabs>
          </Box>

<TabPanel value={tabValue} index={TAB_INDICES.CALENDAR}>
  {isMobile || isTablet ? (
    <DailyCalendarView
      currentDate={currentDate}
      setCurrentDate={setCurrentDate}
      events={events}
      onEventClick={handleEventClick}  // Utilisez handleEventClick
      onEventEdit={(event) => canEditEvent(event) ? handleEventEdit(event) : undefined}
      onEventDelete={(event) => canEditEvent(event) ? handleEventDelete(event) : undefined}
      canEditEvent={canEditEvent}
    />
  ) : (
    <WeeklyView
      currentDate={currentDate}
      setCurrentDate={setCurrentDate}
      events={events}
      onEventClick={handleEventClick} 
      onEventEdit={(event) => canEditEvent(event) ? handleEventEdit(event) : undefined}
      onEventDelete={(event) => canEditEvent(event) ? handleEventDelete(event) : undefined}
      canEditEvent={canEditEvent}
    />
  )}
</TabPanel>

<TabPanel value={tabValue} index={TAB_INDICES.LIST}>
  <EventsList 
    events={events} 
    onEventClick={handleEventClick}  
    onEventEdit={handleEventEdit}
    onEventDelete={handleEventDelete}
    onEventCopy={handleEventCopy}
    canEditEvent={canEditEvent}
    canValidateEvent={canValidateEvent()}
    isMobile={isMobile}
    isTablet={isTablet}
    discipline="physique"
  />
</TabPanel>

<TabPanel value={tabValue} index={TAB_INDICES.DAILY}>
  <ImprovedDailyPlanning 
    events={events} 
    selectedDate={currentDate}
    canOperate={canValidateEvent()}
    onEventUpdate={handleEventUpdate}
    onEventClick={handleEventClick} // NOUVEAU: pour ouvrir les détails
    discipline="physique"
    onEdit={handleEventEdit}
    onEventCopy={handleEventCopy}
    onEventDelete={handleEventDelete}
  />
</TabPanel>

        </Paper>


        <EventDetailsDialogPhysics
          open={detailsOpen}
          event={selectedEvent}
          onClose={() => setDetailsOpen(false)}
          onEdit={selectedEvent && canEditEvent(selectedEvent) ? handleEventEdit : undefined}
          onDelete={selectedEvent && canEditEvent(selectedEvent) ? handleEventDelete : undefined}
          onStateChange={handleStateChange}
          onMoveDate={handleMoveDate}
          onConfirmModification={handleConfirmModification}
          onApproveTimeSlotChanges={handleApproveTimeSlotChanges}
          onRejectTimeSlotChanges={handleRejectTimeSlotChanges}
          userRole={userRole}
          currentUserId={session?.user?.id || session?.user?.email}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        <EditEventDialogPhysics
          open={editDialogOpen}
          event={eventToEdit}
          onClose={() => {
            setEditDialogOpen(false)
            setEventToEdit(null)
          }}
          onSave={handleSaveEdit}
          materials={materials}
          consommables={consommables}
          classes={[...userClasses, ...customClasses]}
          isMobile={isMobile}
          userClasses={userClasses}
          customClasses={customClasses}
          setCustomClasses={setCustomClasses}
          saveNewClass={saveNewClass}
        />

        <CreateTPDialog
          open={createDialogOpen}
          onClose={handleCreateDialogClose}
          onSuccess={loadEvents}
          materials={materials}
          chemicals={consommables}
          userClasses={userClasses}
          customClasses={customClasses}
          setCustomClasses={setCustomClasses}
          saveNewClass={saveNewClass}
          tpPresets={tpPresets}
          eventToCopy={eventToCopy}
          isMobile={isMobile}
          discipline="physique" // Nouveau prop pour spécifier la discipline
        />

        <CreateLaborantinEventDialog
          open={laborantinDialogOpen}
          onClose={() => setLaborantinDialogOpen(false)}
          onSuccess={loadEvents}
          materials={materials}
          isMobile={isMobile}
          discipline="physique" // Nouveau prop pour spécifier la discipline
        />

        <FloatingActionButtons
          userRole={userRole}
          onCreateTP={handleCreateTPEvent}
          onCreateLaborantin={handleCreateLaborantinEvent}
        />
      </Container>
    </LocalizationProvider>
  )
}
