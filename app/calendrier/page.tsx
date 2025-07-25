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


const TAB_INDICES = {
  CALENDAR: 0,
  LIST: 1,
  DAILY: 2
}

export default function CalendarPage() {
  const { data: session, status } = useSession()
  
  // États principaux
  const [userRole, setUserRole] = useState<'TEACHER' | 'LABORANTIN' | 'ADMIN' | 'ADMINLABO'>('TEACHER')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  
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
  const { events, loading, error, fetchEvents } = useCalendarEvents()
  const { materials, chemicals, userClasses, customClasses, setCustomClasses, saveNewClass } = useReferenceData()
  const { tpPresets } = useCalendarData()




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

  const handleViewEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setOpenDialog(true)
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

    // Rafraîchir la liste des événements
    await fetchEvents()
    
    // Fermer le dialogue et réinitialiser
    setEditDialogOpen(false)
    setEventToEdit(null)
    
    // Afficher un message de succès (optionnel)
    console.log('Événement modifié avec succès')
    
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
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <CalendarHeader 
          userRole={userRole}
          onCreateTP={handleCreateTPEvent}
          onCreateLaborantin={handleCreateLaborantinEvent}
        />

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

        <Paper elevation={2}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{ px: 2 }}
              variant="standard"
            >
              <Tab label="Vue hebdomadaire" />
              <Tab label="Liste des événements" />
              <Tab label="Planning du jour" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={TAB_INDICES.CALENDAR}>
          <DailyCalendarView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            events={events}
            onEventClick={handleEventClick}
            onEventEdit={(event) => canEditEvent(event) ? handleEventEdit(event) : undefined}
            onEventDelete={(event) => canEditEvent(event) ? handleEventDelete(event) : undefined}
            canEditEvent={canEditEvent}
          />
          </TabPanel>

          {/* Tab 0: Vue calendrier (jour par jour sur mobile, semaine sur desktop) */}
          <TabPanel value={tabValue} index={0}>
            {isMobile || isTablet ? (
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
              onEventClick={handleEventClick}
              onEventEdit={(event) => canEditEvent(event) ? handleEventEdit(event) : undefined}
              onEventDelete={(event) => canEditEvent(event) ? handleEventDelete(event) : undefined}
              canEditEvent={canEditEvent}
            />
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={TAB_INDICES.LIST}>
            <EventsList events={events} onEventClick={handleViewEvent} />
          </TabPanel>

          <TabPanel value={tabValue} index={TAB_INDICES.DAILY}>
            <DailyPlanning events={events} onEventClick={handleViewEvent} />
          </TabPanel>
        </Paper>

        <EventDetailsDialog
          open={detailsOpen}
          event={selectedEvent}
          onClose={() => setDetailsOpen(false)}
          onEdit={selectedEvent && canEditEvent(selectedEvent) ? handleEventEdit : undefined}
          onDelete={selectedEvent && canEditEvent(selectedEvent) ? handleEventDelete : undefined}
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
        />

        <CreateLaborantinEventDialog
          open={laborantinDialogOpen}
          onClose={() => setLaborantinDialogOpen(false)}
          onSuccess={fetchEvents}
          materials={materials}
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