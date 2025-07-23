"use client"

import React from 'react'
import { 
  Typography, List, ListItem, ListItemIcon, ListItemText, 
  Avatar, Box, Chip, Stack
} from '@mui/material'
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Science, Schedule, Assignment, EventAvailable } from '@mui/icons-material'
import { CalendarType as EventType } from "@/types/prisma"

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

interface EventsListProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

const EVENT_TYPES = {
  [EventType.TP]: { label: "Travaux Pratiques", color: "#1976d2", icon: <Science /> },
  [EventType.MAINTENANCE]: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  [EventType.INVENTORY]: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  [EventType.OTHER]: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

const EventsList: React.FC<EventsListProps> = ({ events, onEventClick }) => {
  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
  }

  const formatTime = (date: Date) => {
    return format(date, "HH:mm", { locale: fr })
  }

  const formatDateTime = (date: Date) => {
    return format(date, "dd/MM/yyyy HH:mm", { locale: fr })
  }

  const getUpcomingEvents = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return events
      .filter(event => event.startDate >= today)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 10)
  }

  return (
    <Box>
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
              onClick={() => onEventClick(event)}
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
    </Box>
  )
}

export default EventsList
