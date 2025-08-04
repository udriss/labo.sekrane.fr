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
  Alert,
  Grid,
  CircularProgress,
  Paper,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'
import {
  Room as RoomIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  ViewWeek as WeekIcon,
  ViewList as ListIcon
} from '@mui/icons-material'
import RoomWeeklyView from './RoomWeeklyView'
import type { Room, RoomOccupancy } from '@/types/rooms'

const RoomPlanningView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [roomOccupancies, setRoomOccupancies] = useState<RoomOccupancy[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'week'>('week')

  // Charger toutes les salles et les occupations au montage du composant
  useEffect(() => {
    fetchRoomPlanningData()
  }, [])

  // Recharger les données quand la date change
  useEffect(() => {
    if (viewMode === 'week') {
      fetchRoomPlanningData()
    }
  }, [currentDate, viewMode])

  const fetchRoomPlanningData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculer les dates de début et fin de semaine pour la vue hebdomadaire
      const startDate = new Date(currentDate)
      startDate.setDate(startDate.getDate() - startDate.getDay() + 1) // Lundi
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6) // Dimanche

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr
      })

      if (selectedRoom) {
        params.append('roomId', selectedRoom.id)
      }

      const response = await fetch(`/api/rooms/planning?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données de planning')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du chargement des données')
      }

      setRoomOccupancies(data.data || [])
      setRooms(data.rooms || [])
      
      // Sélectionner la première salle par défaut si aucune n'est sélectionnée
      if (!selectedRoom && data.rooms && data.rooms.length > 0) {
        setSelectedRoom(data.rooms[0])
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = (eventData: any) => {
    console.log('Événement cliqué:', eventData)
    // Ici vous pouvez ajouter la logique pour afficher les détails de l'événement
  }

  const handleRoomChange = (newRoom: Room | null) => {
    setSelectedRoom(newRoom)
    // Recharger les données pour la nouvelle salle
    fetchRoomPlanningData()
  }

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

      {/* Contrôles */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ flexGrow: 1, minWidth: '250px' }}>
            <FormControl fullWidth>
              <InputLabel>Salle</InputLabel>
              <Select
                value={selectedRoom?.id || ''}
                label="Salle"
                onChange={(e) => {
                  const room = rooms.find(r => r.id === e.target.value)
                  handleRoomChange(room || null)
                }}
              >
                <MenuItem value="">
                  <em>Toutes les salles</em>
                </MenuItem>
                {rooms.map((room) => (
                  <MenuItem key={room.id} value={room.id}>
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
          </Box>

          <Box sx={{ minWidth: '200px' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newViewMode) => {
                if (newViewMode !== null) {
                  setViewMode(newViewMode)
                }
              }}
              aria-label="mode d'affichage"
            >
              <ToggleButton value="week" aria-label="vue hebdomadaire">
                <WeekIcon sx={{ mr: 1 }} />
                Semaine
              </ToggleButton>
              <ToggleButton value="list" aria-label="vue liste">
                <ListIcon sx={{ mr: 1 }} />
                Liste
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {viewMode === 'list' && (
            <Box sx={{ flexGrow: 1, minWidth: '200px' }}>
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
            </Box>
          )}
        </Box>

        {/* Informations sur la salle sélectionnée */}
        {selectedRoom && (
          <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              Informations de la salle: {selectedRoom.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedRoom.description || 'Aucune description'}
            </Typography>
            {selectedRoom.capacity && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Capacité : {selectedRoom.capacity} personnes
              </Typography>
            )}
            {selectedRoom.locations && selectedRoom.locations.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Localisations :
                </Typography>
                {selectedRoom.locations.map((location) => (
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
      </Paper>

      {/* Affichage selon le mode */}
      {viewMode === 'week' ? (
        <RoomWeeklyView
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          roomOccupancies={roomOccupancies}
          onEventClick={handleEventClick}
          selectedRoom={selectedRoom}
        />
      ) : (
        /* Vue liste existante */
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon />
              Événements du {new Date(selectedDate).toLocaleDateString('fr-FR')}
              {loading && <CircularProgress size={20} />}
            </Typography>

            {roomOccupancies.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Aucun événement prévu pour les salles sélectionnées à cette période
              </Typography>
            ) : (
              <Box>
                {roomOccupancies.map((occupancy) => (
                  <Box key={occupancy.room.id} sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RoomIcon />
                      {occupancy.room.name}
                      <Chip label={`${occupancy.events.length} événements`} size="small" />
                    </Typography>
                    {occupancy.events.length === 0 ? (
                      <Typography color="text.secondary" sx={{ pl: 2 }}>
                        Aucun événement prévu
                      </Typography>
                    ) : (
                      occupancy.events.map((event) => (
                        <Card key={`${event.type}-${event.id}`} variant="outlined" sx={{ mb: 1 }}>
                          <CardContent sx={{ py: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EventIcon fontSize="small" />
                              <Typography variant="subtitle2">
                                {event.title}
                              </Typography>
                              <Chip
                                label={event.type === 'chemistry' ? 'Chimie' : 'Physique'}
                                color={event.type === 'chemistry' ? 'primary' : 'secondary'}
                                size="small"
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {event.start_time} - {event.end_time}
                            </Typography>
                            {event.creator_name && (
                              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon fontSize="small" />
                                {event.creator_name}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default RoomPlanningView
