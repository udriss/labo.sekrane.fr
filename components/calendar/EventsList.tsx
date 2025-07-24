// components/calendar/EventsList.tsx
"use client"

import React from 'react'
import { 
  Typography, List, ListItem, ListItemIcon, ListItemText, 
  Avatar, Box, Chip, Stack
} from '@mui/material'
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Science, Schedule, Assignment, EventAvailable } from '@mui/icons-material'

// Importer les types depuis le fichier partagé
import { CalendarEvent, EventType } from '@/types/calendar'

interface EventsListProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

const EVENT_TYPES = {
  TP: { label: "Travaux Pratiques", color: "#1976d2", icon: <Science /> },
  MAINTENANCE: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  INVENTORY: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  OTHER: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

const EventsList: React.FC<EventsListProps> = ({ events, onEventClick }) => {
  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
  }

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, "HH:mm", { locale: fr })
  }

  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, "dd/MM/yyyy HH:mm", { locale: fr })
  }

  const getUpcomingEvents = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return events
      .filter(event => {
        const eventDate = typeof event.startDate === 'string' 
          ? new Date(event.startDate) 
          : event.startDate
        return eventDate >= today
      })
      .sort((a, b) => {
        const dateA = typeof a.startDate === 'string' ? new Date(a.startDate) : a.startDate
        const dateB = typeof b.startDate === 'string' ? new Date(b.startDate) : b.startDate
        return dateA.getTime() - dateB.getTime()
      })
      .slice(0, 10)
  }

  // Option pour afficher TOUS les événements (pas seulement les futurs)
  const getAllEvents = () => {
    return events
      .sort((a, b) => {
        const dateA = typeof a.startDate === 'string' ? new Date(a.startDate) : a.startDate
        const dateB = typeof b.startDate === 'string' ? new Date(b.startDate) : b.startDate
        return dateB.getTime() - dateA.getTime() // Plus récent en premier
      })
      .slice(0, 20) // Afficher les 20 derniers événements
  }

  const upcomingEvents = getUpcomingEvents()
  const allEvents = upcomingEvents.length === 0 ? getAllEvents() : upcomingEvents

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {upcomingEvents.length > 0 ? 'Prochains événements' : 'Événements récents'}
      </Typography>
      
      {events.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">
            Aucun événement programmé
          </Typography>
        </Box>
      ) : (
        <>
          {upcomingEvents.length === 0 && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2">
                Aucun événement futur. Affichage des événements passés.
              </Typography>
            </Box>
          )}
          
          <List>
            {allEvents.map((event) => {
              const typeInfo = getEventTypeInfo(event.type)
              const isPast = new Date(event.startDate) < new Date()
              
              return (
                <ListItem 
                  key={event.id}
                  sx={{ 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    mb: 1,
                    cursor: 'pointer',
                    opacity: isPast ? 0.7 : 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => onEventClick(event)}
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: typeInfo.color, width: 40, height: 40 }}>
                      {typeInfo.icon}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="subtitle1">{event.title}</Typography>
                        <Chip label={typeInfo.label} size="small" />
                        {event.class && (
                          <Chip label={event.class} size="small" variant="outlined" />
                        )}
                        {isPast && (
                          <Chip label="Passé" size="small" color="default" />
                        )}
                      </Box>
                    }
                    slotProps={{ secondary: { component: 'div' } }}
                    secondary={
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          📅 {formatDateTime(event.startDate)} - {formatTime(event.endDate)}
                        </Typography>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                          {event.room && (
                            <Typography variant="body2" color="text.secondary">
                              📍 {event.room}
                            </Typography>
                          )}
                          {event.materials && event.materials.length > 0 && (
                            <Typography variant="body2" color="text.secondary">
                              🧪 {event.materials.length} matériel(s)
                            </Typography>
                          )}
                          {event.chemicals && event.chemicals.length > 0 && (
                            <Typography variant="body2" color="text.secondary">
                              ⚗️ {event.chemicals.length} produit(s)
                            </Typography>
                          )}
                          {event.fileName && (
                            <Typography variant="body2" color="text.secondary">
                              📎 Document joint
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    }
                  />
                </ListItem>
              )
            })}
          </List>
          
          {events.length > allEvents.length && (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
              Affichage de {allEvents.length} événement(s) sur {events.length} au total
            </Typography>
          )}
        </>
      )}
    </Box>
  )
}

export default EventsList