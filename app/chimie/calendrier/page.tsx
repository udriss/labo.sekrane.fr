// app/calendrier/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { Container, Box, Typography, Alert, Paper, Tabs, Tab, Chip, useMediaQuery, useTheme } from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { fr } from "date-fns/locale"
import { isSameDay } from "date-fns"
import { useSession } from "next-auth/react"
import { usePersistedTab } from '@/lib/hooks/usePersistedTab'
import { ViewWeek, ListAlt, CalendarToday } from '@mui/icons-material'
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
import { useCalendarData } from '@/lib//hooks/useCalendarData'
import { useCalendarEvents } from '@/lib//hooks/useCalendarEvents'
import { useReferenceData } from '@/lib//hooks/useReferenceData'
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
  
export default function CalendarPage() {
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

  // Hooks personnalisés
  const { events, loading, error, fetchEvents, setEvents } = useCalendarEvents()
  const { materials, chemicals, userClasses, customClasses, setCustomClasses, saveNewClass } = useReferenceData()
  const { tpPresets } = useCalendarData()

  // Fonction pour déterminer si l'utilisateur est le créateur d'un événement
  const isCreator = (event: CalendarEvent): boolean => {
    return event.createdBy === session?.user?.email || event.createdBy === session?.user?.id
  }

  // Fonction helper pour gérer localStorage de manière sûre
  const getStoredTabValue = (): number => {
    try {
      if (typeof window !== 'undefined') {
        const savedTab = localStorage.getItem('calendarTabValue')
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
        localStorage.setItem('calendarTabValue', value.toString())
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

  // Récupération du rôle utilisateur
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
// Si jamais une logique de correspondance de créneaux est nécessaire ici, utiliser referentActuelTimeID
const handleMoveDate = async (event: CalendarEvent, timeSlots: any[], reason?: string, state?: EventState) => {
  try {
    // Déterminer l'état final : si c'est le créateur, passer à PENDING
    const finalState = isCreator(event) ? 'PENDING' : (state || 'MOVED');

    // Si jamais il faut faire correspondre les créneaux proposés aux créneaux actuels ici, utiliser referentActuelTimeID
    // (Actuellement, la logique de correspondance est gérée côté composants et API)

    const response = await fetch(`/api/calendrier/move-event?id=${event.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: finalState,
        eventId: event.id,
        timeSlots,
        reason: reason || '',
        isOwnerModification: isCreator(event), // Nouveau: indiquer si c'est le propriétaire
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const updatedEventFromServer = data.updatedEvent;

    // Message différent selon si c'est le propriétaire ou non
    if (isCreator(event)) {
      alert('Vos modifications ont été enregistrées. L\'événement est maintenant en attente de validation.');
    } else if (data.isPending) {
      alert('Votre demande de modification a été envoyée au créateur de l\'événement pour validation.');
    } else {
      
    }

    // Mettre à jour l'événement avec les données du serveur
    setEvents((prevEvents: CalendarEvent[]) => 
      prevEvents.map(e => 
        e.id === event.id ? updatedEventFromServer : e
      )
    );

    if (selectedEvent?.id === event.id) {
      setSelectedEvent(updatedEventFromServer);
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
    setEvents((prevEvents: CalendarEvent[]) => 
      prevEvents.map(event => 
        event.id === updatedEvent.id ? { ...event, state: newState } : event
      )
    );

    // Mettre à jour l'événement sélectionné si c'est celui qui a été modifié
    if (selectedEvent?.id === updatedEvent.id) {
      setSelectedEvent({ ...updatedEvent, state: newState });
    }

    // Envoyer la requête à l'API pour enregistrer le changement d'état
    const response = await fetch(`/api/calendrier/state-change?id=${updatedEvent.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: newState,
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
    setEvents((prevEvents: CalendarEvent[]) => 
      prevEvents.map(event => 
        event.id === updatedEvent.id ? updatedEventFromServer : event
      )
    );

    if (selectedEvent?.id === updatedEvent.id) {
      setSelectedEvent(updatedEventFromServer);
    }

  } catch (error) {
    console.error('Erreur lors du changement d\'état:', error);
    // Rétablir l'état précédent en cas d'erreur
    setEvents((prevEvents: CalendarEvent[]) => 
      prevEvents.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
    if (selectedEvent?.id === updatedEvent.id) {
      setSelectedEvent(updatedEvent);
    }
  }
};



// Handler pour gérer la confirmation/rejet des modifications par le créateur
const handleConfirmModification = async (event: CalendarEvent, modificationId: string, action: 'confirm' | 'reject') => {
  try {
    const response = await fetch(`/api/calendrier/confirm-modification?eventId=${event.id}`, {
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

    // Mettre à jour l'événement avec les données du serveur
    setEvents((prevEvents: CalendarEvent[]) => 
      prevEvents.map(e => 
        e.id === event.id ? updatedEventFromServer : e
      )
    );

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
    const response = await fetch('/api/calendrier/approve-timeslots', {
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

    // Mettre à jour l'événement avec les données du serveur
    setEvents((prevEvents: CalendarEvent[]) => 
      prevEvents.map(e => 
        e.id === event.id ? updatedEvent : e
      )
    );

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
    const response = await fetch('/api/calendrier/reject-timeslots', {
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

    // Mettre à jour l'événement avec les données du serveur
    setEvents((prevEvents: CalendarEvent[]) => 
      prevEvents.map(e => 
        e.id === event.id ? updatedEvent : e
      )
    );

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
    // Extraire timeSlots séparément pour éviter la confusion
    const { timeSlots, ...eventDataWithoutSlots } = updatedEvent;
    
    // Utiliser les timeSlots mis à jour s'ils existent, sinon garder les anciens
    const finalTimeSlots = timeSlots || eventToEdit.timeSlots || [];
    
    

    const response = await fetch(`/api/calendrier?id=${eventToEdit.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...eventDataWithoutSlots,
        timeSlots: finalTimeSlots // Envoyer directement tous les timeSlots
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur serveur:', errorData);
      throw new Error('Erreur lors de la modification');
    }

    const result = await response.json();
    


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
      const response = await fetch(`/api/calendrier?id=${event.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      // Rafraîchir la liste des événements
      await fetchEvents()
      
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
          <Typography>Chargement du calendrier...</Typography>
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
          tpPresets={tpPresets}
          eventToCopy={eventToCopy}
          isMobile={isMobile}
        />

        <CreateLaborantinEventDialog
          open={laborantinDialogOpen}
          onClose={() => setLaborantinDialogOpen(false)}
          onSuccess={fetchEvents}
          materials={materials}
          isMobile={isMobile}
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