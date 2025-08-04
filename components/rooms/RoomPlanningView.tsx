'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Alert,
  Grid,
  CircularProgress,
  Paper
} from '@mui/material'
import {
  Room as RoomIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material'

// Types pour les salles et événements
interface RoomLocation {
  id: string
  room_id: string
  name: string
  description?: string
  is_active: boolean
}

interface Room {
  id: string
  name: string
  description?: string
  capacity?: number
  is_active: boolean
  locations: RoomLocation[]
}

interface CalendarEvent {
  id: number
  title: string
  start_time: string
  end_time: string
  creator_name?: string
  creator_email?: string
  class_data?: {
    id: string
    name: string
    type: string
  }
  room?: string
  type: 'chemistry' | 'physics'
}

const RoomPlanningView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger toutes les salles au montage du composant
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/rooms?useDatabase=true')
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des salles')
        }
        const data = await response.json()
        const roomsData = data.rooms || []
        setRooms(roomsData)
        
        // Sélectionner la première salle par défaut
        if (roomsData.length > 0) {
          setSelectedRoom(roomsData[0].name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [])

  // Charger les événements quand la salle ou la date change
  useEffect(() => {
    if (selectedRoom) {
      fetchEventsForRoom()
    }
  }, [selectedRoom, selectedDate])

  const fetchEventsForRoom = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/rooms/events?room=${encodeURIComponent(selectedRoom)}&date=${selectedDate}`
      )
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des événements')
      }
      const eventsData = await response.json()
      setEvents(eventsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'chemistry':
        return 'primary'
      case 'physics':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const selectedRoomData = rooms.find(room => room.name === selectedRoom)

  if (loading && rooms.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <RoomIcon />
        Planification des Salles
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Panneau de contrôle */}
        <Grid size = {{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sélection
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Salle</InputLabel>
                <Select
                  value={selectedRoom}
                  label="Salle"
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  {rooms.map((room) => (
                    <MenuItem key={room.id} value={room.name}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RoomIcon fontSize="small" />
                        {room.name}
                        {room.capacity && (
                          <Chip 
                            label={`${room.capacity} places`} 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    padding: '16px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '16px',
                    width: '100%'
                  }}
                />
              </FormControl>

              {/* Informations sur la salle sélectionnée */}
              {selectedRoomData && (
                <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Informations de la salle
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedRoomData.description || 'Aucune description'}
                  </Typography>
                  {selectedRoomData.capacity && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Capacité : {selectedRoomData.capacity} personnes
                    </Typography>
                  )}
                  {selectedRoomData.locations.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Localisations :
                      </Typography>
                      {selectedRoomData.locations.map((location) => (
                        <Chip
                          key={location.id}
                          label={location.name}
                          size="small"
                          icon={<LocationIcon />}
                          sx={{ ml: 0.5, mt: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Liste des événements */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon />
                Événements du {new Date(selectedDate).toLocaleDateString('fr-FR')}
                {loading && <CircularProgress size={20} />}
              </Typography>

              {events.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  Aucun événement prévu pour cette salle à cette date
                </Typography>
              ) : (
                <List>
                  {events
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((event) => (
                    <ListItem key={`${event.type}-${event.id}`} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <EventIcon fontSize="small" />
                            <Typography variant="subtitle1">
                              {event.title}
                            </Typography>
                            <Chip
                              label={event.type === 'chemistry' ? 'Chimie' : 'Physique'}
                              color={getEventTypeColor(event.type)}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {formatTime(event.start_time)} - {formatTime(event.end_time)}
                            </Typography>
                            {event.creator_name && (
                              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <PersonIcon fontSize="small" />
                                {event.creator_name}
                              </Typography>
                            )}
                            {event.class_data && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Classe : {event.class_data.name} ({event.class_data.type})
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default RoomPlanningView
