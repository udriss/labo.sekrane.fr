"use client"

import React from 'react'
import { 
  Box, Stack, IconButton, Button, Typography, Card, CardContent, Tooltip
} from '@mui/material'
import { 
  format, startOfWeek, endOfWeek, eachDayOfInterval, 
  isSameDay, addDays, subDays, differenceInMinutes
} from "date-fns"
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

interface WeeklyViewProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
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

const WeeklyView: React.FC<WeeklyViewProps> = ({
  currentDate,
  setCurrentDate,
  events,
  onEventClick
}) => {
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

  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
  }

  return (
    <Box>
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

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0, position: 'relative' }}>
        {/* En-tête des jours */}
        <Box />
        {getWeekDays().map((day) => (
          <Box key={day.toISOString()} sx={{ p: 1, textAlign: 'center', maxHeight: '65px', height: '65px', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2">
              {format(day, "EEEE", { locale: fr })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {format(day, "dd/MM", { locale: fr })}
            </Typography>
          </Box>
        ))}

        {/* Lignes horaires avec l'heure sur la ligne */}
        {TIME_SLOTS.map((time, slotIdx) => (
          <React.Fragment key={time}>
            {/* Affichage de l'heure sur la ligne, centré verticalement */}
            <Box sx={{
              borderTop: 1,
              borderColor: 'divider',
              height: '65px',
              display: 'flex',
              alignItems: 'flex-start',
              position: 'relative',
              p: 0
            }}>
              <Typography variant="caption" sx={{ position: 'absolute', top: 0, left: 0, transform: 'translateY(-50%)', bgcolor: 'background.paper', px: 0.5 }}>
                {time}
              </Typography>
            </Box>
            {getWeekDays().map((day) => (
              <Box
                key={day.toISOString() + time}
                sx={{
                  borderTop: 1,
                  borderColor: 'divider',
                  height: '65px',
                  position: 'relative',
                  p: 0.5
                }}
              >
                {/* Events for this day and time slot will be positioned absolutely from a different mapping */}
              </Box>
            ))}
          </React.Fragment>
        ))}

        {/* Absolutely position events over the grid */}
        {getWeekDays().map((day, dayIndex) => {
          const dayEvents = getEventsForDay(day);
          return dayEvents.map(event => {
            const typeInfo = getEventTypeInfo(event.type);
            const startHour = event.startDate.getHours();
            const startMinute = event.startDate.getMinutes();
            const durationInMinutes = differenceInMinutes(event.endDate, event.startDate);

            // Correction : ajouter la hauteur de l'en-tête (65px) + 1 ligne horaire (65px)
            const headerHeight = 65; // Hauteur de l'en-tête des jours
            const slotHeight = 65; // Hauteur de chaque créneau horaire
            const top = headerHeight + (startHour - 8) * slotHeight + (startMinute / 60) * slotHeight;
            const height = (durationInMinutes / 60) * slotHeight; // -4 for padding

            return (
              <Tooltip title={`${event.title} (${format(event.startDate, 'HH:mm')} - ${format(event.endDate, 'HH:mm')})`} key={event.id}>
                <Card
                  sx={{
                    bgcolor: typeInfo.color,
                    color: 'white',
                    cursor: 'pointer',
                    position: 'absolute',
                    top: `${top}px`,
                    left: `calc(${(dayIndex + 1) * (100 / 8)}% + 4px)`,
                    width: `calc(${(100 / 8)}% - 8px)`,
                    height: `${height}px`,
                    zIndex: 1,
                    '&:hover': { opacity: 0.8, zIndex: 2 }
                  }}
                  onClick={() => onEventClick(event)}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: '-webkit-box', WebkitLineClamp: Math.floor(height/20), WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {event.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Tooltip>
            )
          })
        })}
      </Box>
    </Box>
  )
}

export default WeeklyView
