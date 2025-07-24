// components/calendar/DailyPlanning.tsx

"use client"

import React from 'react'
import { 
  Typography, Alert, Grid, Card, CardContent, CardActions, 
  Box, Avatar, Stack, Button
} from '@mui/material'
import { format, isSameDay } from "date-fns"
import { fr } from "date-fns/locale"
import { Science, Schedule, Assignment, EventAvailable } from '@mui/icons-material'
import { CalendarEvent, EventType } from '@/types/calendar'

interface DailyPlanningProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

// Définition corrigée de EVENT_TYPES
const EVENT_TYPES = {
  TP: { label: "Travaux Pratiques", color: "#1976d2", icon: <Science /> },
  MAINTENANCE: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  INVENTORY: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  OTHER: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

const DailyPlanning: React.FC<DailyPlanningProps> = ({ events, onEventClick }) => {
  const getTodayEvents = () => {
    return events.filter(event => {
      const eventDate = typeof event.startDate === 'string' 
        ? new Date(event.startDate) 
        : event.startDate
      return isSameDay(eventDate, new Date())
    })
  }

  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
  }

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, "HH:mm", { locale: fr })
  }

  const todayEvents = getTodayEvents()

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Planning d'aujourd'hui - {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
      </Typography>
      {todayEvents.length === 0 ? (
        <Alert severity="info">
          Aucune séance programmée aujourd'hui
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {todayEvents.map((event) => {
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
                          {event.description && (
                            <Typography variant="body2" color="text.secondary">
                              {event.description}
                            </Typography>
                          )}
                          {event.materials && event.materials.length > 0 && (
                            <Typography variant="body2">
                              🧪 {event.materials.length} matériel(s)
                            </Typography>
                          )}
                          {event.chemicals && event.chemicals.length > 0 && (
                            <Typography variant="body2">
                              ⚗️ {event.chemicals.length} produit(s) chimique(s)
                            </Typography>
                          )}
                          {event.fileName && (
                            <Typography variant="body2">
                              📎 Document joint: {event.fileName}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => onEventClick(event)}>
                      Voir détails
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Box>
  )
}

export default DailyPlanning