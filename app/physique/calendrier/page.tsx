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
  CalendarStats,
  WeeklyView,
  EventsList,
  DailyPlanning,
  EventDetailsDialog,
  DailyCalendarView 
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

import { CalendarEvent } from '@/types/calendar'
import { usePhysicsCalendarData } from '@/lib/hooks/usePhysicsCalendarData'
import { usePhysicsCalendarEvents } from '@/lib/hooks/usePhysicsCalendarEvents'
import { useReferenceDataByDiscipline } from '@/lib/hooks/useReferenceDataByDiscipline'
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
  const [currentDate, setCurrentDate] = useState(new Date())
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

  // Hooks personnalisés pour la physique
  const { events, loading, error, loadEvents, addEvent, updateEvent, removeEvent, setError } = usePhysicsCalendarData()
  const calendarEvents = usePhysicsCalendarEvents({ addEvent, updateEvent, removeEvent, setError })

  const { materials, chemicals, userClasses, customClasses, setCustomClasses, saveNewClass } = useReferenceDataByDiscipline({ discipline: 'physique' })
  
  // Fonction de chargement des événements
  const fetchEvents = useCallback(async () => {
    try {
      await loadEvents()
    } catch (error) {
      console.error('Erreur lors du rechargement des événements physique:', error)
    }
  }, [loadEvents])

  // Fonction spécialisée pour récupérer les événements physique depuis l'API
  const fetchPhysicsEvents = async () => {
    try {
      const response = await fetch('/api/calendrier/physique/')
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }
      const physicsEvents = await response.json()
      return physicsEvents
    } catch (error) {
      console.error('Erreur lors de la récupération des événements physique:', error)
      return []
    }
  }

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
      fetchEvents()
    }
  }, [session, userRole])

  // Handler pour ouvrir les détails d'un événement
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setDetailsOpen(true)
  }

  const getTodayEvents = () => {
    return events.filter(event => {
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
    // Déterminer l'état final : si c'est le créateur, passer à PENDING
    const finalState = isCreator(event) ? 'PENDING' : (state || 'MOVED');

    const updatedEvent = await calendarEvents.moveEvent(event.id, timeSlots[0]?.startDate, timeSlots[0]?.endDate);

    // Message différent selon si c'est le propriétaire ou non
    if (isCreator(event)) {
      alert('Vos modifications ont été enregistrées. L\'événement est maintenant en attente de validation.');
    } else {
      alert('Votre demande de modification a été envoyée au créateur de l\'événement pour validation.');
    }

    if (selectedEvent?.id === event.id) {
      setSelectedEvent(updatedEvent);
    }

  } catch (error) {
    console.error('Erreur lors de la proposition de nouveaux créneaux:', error);
    alert('Erreur lors de la modification de l\'événement');
  }
};

// Handler pour gérer les changements d'état (validation, annulation, déplacement)
const handleStateChange = async (updatedEvent: CalendarEvent, newState: EventState, reason?: string, timeSlots?: any[]) => {
  try {
    // Si c'est un déplacement avec timeSlots, utiliser l'API move-event
    if (newState === 'MOVED' && timeSlots && timeSlots.length > 0) {
      return handleMoveDate(updatedEvent, timeSlots, reason, newState);
    }

    // Mettre à jour l'état localement en attendant la confirmation de l'API
    updateEvent({ ...updatedEvent, state: newState });

    // Mettre à jour l'événement sélectionné si c'est celui qui a été modifié
    if (selectedEvent?.id === updatedEvent.id) {
      setSelectedEvent({ ...updatedEvent, state: newState });
    }

    // Envoyer la requête à l'API pour enregistrer le changement d'état
    const response = await fetch(`/api/calendrier/physique/state-change?id=${updatedEvent.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: newState, // Utiliser 'state' comme dans la page chimie
        reason: reason || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const updatedEventFromServer = data.updatedEvent;

    // Si la modification est en attente, afficher un message à l'utilisateur
    if (data.isPending) {
      // ajouter un toast ou un message ici
    }

    // Mettre à jour l'événement avec les données du serveur
    updateEvent(updatedEventFromServer);

    if (selectedEvent?.id === updatedEvent.id) {
      setSelectedEvent(updatedEventFromServer);
    }

  } catch (error) {
    console.error('Erreur lors du changement d\'état:', error);
    // Rétablir l'état précédent en cas d'erreur
    updateEvent(updatedEvent);
    if (selectedEvent?.id === updatedEvent.id) {
      setSelectedEvent(updatedEvent);
    }
  }
};

// Handler pour gérer la confirmation/rejet des modifications par le créateur
const handleConfirmModification = async (event: CalendarEvent, modificationId: string, action: 'confirm' | 'reject') => {
  try {
    // Pour l'instant, on utilise l'API générique
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

    // Recharger les événements
    await fetchEvents();

    if (selectedEvent?.id === event.id) {
      setSelectedEvent(updatedEventFromServer);
    }

  } catch (error) {
    console.error('Erreur lors de la confirmation/rejet de modification:', error);
  }
};

// Handler pour approuver les changements de créneaux
const handleApproveTimeSlotChanges = async (event: CalendarEvent) => {
  try {
    const response = await fetch('/api/calendrier/physique/approve-timeslots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const updatedEvent = data.event;

    // Recharger les événements
    await fetchEvents();

    if (selectedEvent?.id === event.id) {
      setSelectedEvent(updatedEvent);
    }

  } catch (error) {
    console.error('Erreur lors de l\'approbation des créneaux:', error);
  }
};

// Handler pour rejeter les changements de créneaux
const handleRejectTimeSlotChanges = async (event: CalendarEvent) => {
  try {
    const response = await fetch('/api/calendrier/physique/reject-timeslots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const updatedEvent = data.event;

    // Recharger les événements
    await fetchEvents();

    if (selectedEvent?.id === event.id) {
      setSelectedEvent(updatedEvent);
    }

  } catch (error) {
    console.error('Erreur lors du rejet des créneaux:', error);
  }
};
  
  // Handler pour sauvegarder les modifications
const handleSaveEdit = async (updatedEvent: Partial<CalendarEvent>) => {
  if (!eventToEdit) return;
  
  try {
    await calendarEvents.updateEvent(eventToEdit.id, updatedEvent);
    
    // Rafraîchir la liste des événements
    await fetchEvents();
    
    // Fermer le dialogue et réinitialiser
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
      return
    }

    try {
      await calendarEvents.deleteEvent(event.id);
      
      // Fermer le dialogue de détails si ouvert
      setDetailsOpen(false)
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur lors de la suppression de l\'événement')
    }
  }

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

        <CalendarStats events={events} getTodayEvents={getTodayEvents} />

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
  <DailyPlanning 
    events={events} 
    onEventClick={handleEventClick}  
    onEventEdit={handleEventEdit}
    onEventDelete={handleEventDelete}
    canEditEvent={canEditEvent}
    canValidateEvent={canValidateEvent()}
    onStateChange={handleStateChange}
    onMoveDate={handleMoveDate}
    onConfirmModification={handleConfirmModification}
    onApproveTimeSlotChanges={handleApproveTimeSlotChanges}
    onRejectTimeSlotChanges={handleRejectTimeSlotChanges}
    isCreator={isCreator}
    currentUserId={session?.user?.id || session?.user?.email}
    isMobile={isMobile}
    discipline="physique" 
  />
</TabPanel>

        </Paper>

        <EventDetailsDialog
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

        <EditEventDialog
          open={editDialogOpen}
          event={eventToEdit}
          onClose={() => {
            setEditDialogOpen(false)
            setEventToEdit(null)
          }}
          onSave={handleSaveEdit}
          materials={materials}
          chemicals={chemicals}
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
          onSuccess={fetchEvents}
          materials={materials}
          chemicals={chemicals}
          userClasses={userClasses}
          customClasses={customClasses}
          setCustomClasses={setCustomClasses}
          saveNewClass={saveNewClass}
          tpPresets={[]} // Les presets TP physique seront ajoutés plus tard
          eventToCopy={eventToCopy}
          isMobile={isMobile}
          discipline="physique" // Nouveau prop pour spécifier la discipline
        />

        <CreateLaborantinEventDialog
          open={laborantinDialogOpen}
          onClose={() => setLaborantinDialogOpen(false)}
          onSuccess={fetchEvents}
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
