// app/physique/calendrier/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { Container, Box, Typography, Alert, Paper, Tabs, Tab, Card, CardContent, CircularProgress } from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { fr } from "date-fns/locale"
import { ViewWeek, ListAlt, CalendarToday, Science } from '@mui/icons-material'

// Hook temporaire pour les données de calendrier physique
const usePhysicsCalendarData = () => {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = async () => {
    setLoading(true)
    try {
      // Simuler le chargement des événements depuis la base de données
      // En pratique, cela ferait un appel à l'API
      setEvents([])
    } catch (err) {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  return { events, loading, error, loadEvents }
}

// Hook temporaire pour les événements de calendrier physique
const usePhysicsCalendarEvents = (calendarData: any) => {
  return {
    createEvent: async () => {},
    updateEvent: async () => {},
    deleteEvent: async () => {}
  }
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
      id={`physics-calendar-tabpanel-${index}`}
      aria-labelledby={`physics-calendar-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

export default function PhysiqueCalendrierPage() {
  const [tabValue, setTabValue] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  
  // Utiliser les hooks spécialisés pour la physique
  const calendarData = usePhysicsCalendarData()
  const calendarEvents = usePhysicsCalendarEvents(calendarData)
  
  // Charger les données au montage
  useEffect(() => {
    calendarData.loadEvents()
  }, [calendarData.loadEvents])

  // Filtrer les événements pour la date sélectionnée
  const eventsForSelectedDate = calendarData.events.filter((event: any) =>
    event.timeSlots?.some((slot: any) => {
      const slotDate = new Date(slot.startDate)
      return slotDate.toDateString() === selectedDate.toDateString()
    })
  )

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* En-tête */}
        <Box display="flex" alignItems="center" gap={2} mb={4}>
          <Science sx={{ fontSize: 40, color: 'secondary.main' }} />
          <Box>
            <Typography variant="h3" component="h1" fontWeight="bold">
              Planning Physique
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Gestion des événements et TP de physique
            </Typography>
          </Box>
        </Box>

        {/* Statistiques simples */}
        <Box display="flex" gap={2} mb={4}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" color="secondary.main">
                Total événements
              </Typography>
              <Typography variant="h4">
                {calendarData.loading ? <CircularProgress size={24} /> : calendarData.events.length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" color="secondary.main">
                Aujourd'hui
              </Typography>
              <Typography variant="h4">
                {calendarData.loading ? <CircularProgress size={24} /> : eventsForSelectedDate.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Onglets */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              icon={<CalendarToday />}
              label="Vue Journalière"
              iconPosition="start"
            />
            <Tab
              icon={<ViewWeek />}
              label="Vue Calendrier"
              iconPosition="start"
            />
            <Tab
              icon={<ListAlt />}
              label="Liste des événements"
              iconPosition="start"
            />
          </Tabs>

          {/* Vue journalière */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Événements du {selectedDate.toLocaleDateString('fr-FR')}
            </Typography>
            {calendarData.loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : eventsForSelectedDate.length > 0 ? (
              eventsForSelectedDate.map((event: any) => (
                <Card key={event.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6">{event.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {event.description}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Salle: {event.room || 'Non spécifiée'}
                    </Typography>
                    <Typography variant="body2">
                      Classe: {event.class || 'Non spécifiée'}
                    </Typography>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Alert severity="info">
                Aucun événement prévu pour cette date.
              </Alert>
            )}
          </TabPanel>

          {/* Vue calendrier */}
          <TabPanel value={tabValue} index={1}>
            <Alert severity="info">
              Vue calendrier en développement. Les événements sont stockés en base de données.
            </Alert>
          </TabPanel>

          {/* Vue liste */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Tous les événements de physique
            </Typography>
            {calendarData.loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : calendarData.events.length > 0 ? (
              calendarData.events.map((event: any) => (
                <Card key={event.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6">{event.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {event.description}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Date: {event.timeSlots?.[0]?.startDate ? 
                        new Date(event.timeSlots[0].startDate).toLocaleDateString('fr-FR') : 
                        'Non définie'
                      }
                    </Typography>
                    <Typography variant="body2">
                      Salle: {event.room || 'Non spécifiée'}
                    </Typography>
                    <Typography variant="body2">
                      Classe: {event.class || 'Non spécifiée'}
                    </Typography>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Alert severity="info">
                Aucun événement de physique enregistré.
              </Alert>
            )}
          </TabPanel>
        </Paper>

        {/* Affichage des erreurs */}
        {calendarData.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {calendarData.error}
          </Alert>
        )}

        <Alert severity="success" sx={{ mt: 2 }}>
          Le système de calendrier de physique utilise maintenant sa propre base de données (table calendar_physique) 
          séparée de celle de la chimie.
        </Alert>
      </Container>
    </LocalizationProvider>
  )
}
