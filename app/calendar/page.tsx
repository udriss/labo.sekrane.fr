"use client"

import { useState, useEffect } from "react"
import { 
  Container, Typography, Box, Card, CardContent, CardActions, Button,
  Grid, Avatar, Chip, Alert, Paper, Stack, IconButton, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tab, Tabs, List, ListItem, ListItemText,
  ListItemIcon, Fab, Tooltip
} from "@mui/material"
import { 
  CalendarMonth, Add, Visibility, Edit, Delete, Schedule,
  School, Science, Assignment, Group, Room, AccessTime,
  EventAvailable, EventBusy, Warning, CheckCircle
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

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar');
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
    setSelectedEvent(null)
    setNewEvent({
      type: EventType.TP,
      startDate: new Date(),
      endDate: addHours(new Date(), 2)
    })
    setOpenDialog(true)
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
