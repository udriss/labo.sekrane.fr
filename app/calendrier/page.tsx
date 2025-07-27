// app/calendrier/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { Container, Box, Typography, Alert, Paper, Tabs, Tab, Chip, useMediaQuery, useTheme } from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { fr } from "date-fns/locale"
import { isSameDay } from "date-fns"
import { useSession } from "next-auth/react"

// Import des composants existants
import {
  CalendarStats,
  WeeklyView,
  EventsList,
  DailyPlanning,
  EventDetailsDialog,
  DailyCalendarView 
} from '@/components/calendar'

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

const TAB_INDICES = {
  CALENDAR: 0,
  LIST: 1,
  DAILY: 2
}

export default function CalendarPage() {
  const { data: session, status } = useSession()
  
  // États principaux
  const [userRole, setUserRole] = useState<UserRole>('TEACHER')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
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
  
  // Détection de la taille de l'écran
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'))
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Hooks personnalisés
  const { events, loading, error, fetchEvents, setEvents } = useCalendarEvents()
  const { materials, chemicals, userClasses, customClasses, setCustomClasses, saveNewClass } = useReferenceData()
  const { tpPresets } = useCalendarData()

  useEffect(() => {
  // Observer les changements dans le DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        const vw = window.innerWidth;
        document.querySelectorAll('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > vw) {
            console.warn('Element causing overflow after load:', {
              element: el,
              class: el.className,
              right: rect.right,
              width: rect.width
            });
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  return () => observer.disconnect();
}, []);

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
    return events.filter(event => isSameDay(event.startDate, new Date()))
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

  // Handler pour gérer les changements d'état (validation, annulation, déplacement)
  const handleStateChange = async (updatedEvent: CalendarEvent) => {
    try {
      // Mettre à jour localement l'état des événements
      setEvents((prevEvents: CalendarEvent[]) => 
        prevEvents.map(event => 
          event.id === updatedEvent.id ? updatedEvent : event
        )
      )
      
      // Mettre à jour l'événement sélectionné si c'est celui qui a été modifié
      if (selectedEvent?.id === updatedEvent.id) {
        setSelectedEvent(updatedEvent)
      }

      // Afficher un message de succès selon l'état
      const stateMessages: Record<string, string> = {
        'VALIDATED': 'Événement validé avec succès',
        'CANCELLED': 'Événement annulé',
        'MOVED': 'Événement marqué comme déplacé',
        'PENDING': 'Événement remis en attente'
      }
      
      const message = stateMessages[updatedEvent.state || ''] || 'État de l\'événement modifié'
      console.log(message)
      
      // Optionnel : afficher une notification ou un snackbar
      // showNotification({ message, type: 'success' })
      
    } catch (error) {
      console.error('Erreur lors du changement d\'état:', error)
      // Recharger les événements en cas d'erreur
      await fetchEvents()
    }
  }
  
  // Handler pour sauvegarder les modifications
  const handleSaveEdit = async (updatedEvent: Partial<CalendarEvent>) => {
    if (!eventToEdit) return

    try {
      const response = await fetch(`/api/calendrier?id=${eventToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...eventToEdit,
          ...updatedEvent
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la modification')
      }

      const result = await response.json()
      
      // Afficher un message de succès avec le nombre de créneaux créés
      if (result.createdEvents && result.createdEvents.length > 0) {
        console.log(`Événement modifié et ${result.createdEvents.length} créneaux supplémentaires créés`)
      } else {
        console.log('Événement modifié avec succès')
      }

      // Rafraîchir la liste des événements
      await fetchEvents()
      
      // Fermer le dialogue et réinitialiser
      setEditDialogOpen(false)
      setEventToEdit(null)
      
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
      alert('Erreur lors de la modification de l\'événement')
    }
  }

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
      
      // Afficher un message de succès
      console.log('Événement supprimé avec succès')
      
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
      <Container maxWidth="xl" 
          sx={{ 
            py: { xs: 2, md: 4 },
            px: { xs: 2, sm: 2, md: 3 },
            width: '100%',
            maxWidth: '100%',
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
              scrollButtons={isMobile ? "auto" : false} // Boutons uniquement sur mobile
              allowScrollButtonsMobile
              onChange={(e, newValue) => setTabValue(newValue)}
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
              <Tab label="Vue hebdomadaire" />
              <Tab label="Planning du jour" />
              <Tab label="Liste des événements" />
            </Tabs>
          </Box>

<TabPanel value={tabValue} index={TAB_INDICES.CALENDAR}>
  <DailyCalendarView
    currentDate={currentDate}
    setCurrentDate={setCurrentDate}
    events={events}
    onEventClick={handleEventClick}  // Utilisez handleEventClick
    onEventEdit={(event) => canEditEvent(event) ? handleEventEdit(event) : undefined}
    onEventDelete={(event) => canEditEvent(event) ? handleEventDelete(event) : undefined}
    canEditEvent={canEditEvent}
  />
</TabPanel>

<TabPanel value={tabValue} index={0}>
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
    canEditEvent={canEditEvent}
    canValidateEvent={canValidateEvent()}
    isMobile={isMobile}
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
          onStateChange={canValidateEvent() ? handleStateChange : undefined}
          userRole={userRole}
          isMobile={isMobile}
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
        />

        <CreateTPDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSuccess={fetchEvents}
          materials={materials}
          chemicals={chemicals}
          userClasses={userClasses}
          customClasses={customClasses}
          setCustomClasses={setCustomClasses}
          saveNewClass={saveNewClass}
          tpPresets={tpPresets}
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