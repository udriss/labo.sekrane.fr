"use client"

import React from 'react'
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Grid, Typography, Chip
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

interface EventDetailsDialogProps {
  open: boolean
  event: CalendarEvent | null
  onClose: () => void
}

const EVENT_TYPES = {
  [EventType.TP]: { label: "Travaux Pratiques", color: "#1976d2", icon: <Science /> },
  [EventType.MAINTENANCE]: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  [EventType.INVENTORY]: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  [EventType.OTHER]: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({ 
  open, 
  event, 
  onClose 
}) => {
  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
  }

  const formatTime = (date: Date) => {
    return format(date, "HH:mm", { locale: fr })
  }

  const formatDateTime = (date: Date) => {
    return format(date, "dd/MM/yyyy HH:mm", { locale: fr })
  }

  if (!event) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Détails - {event.title}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom>
              {event.title}
            </Typography>
            <Chip 
              label={getEventTypeInfo(event.type).label} 
              color="primary" 
              sx={{ mb: 2 }}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2">Date et heure</Typography>
            <Typography variant="body1">
              {formatDateTime(event.startDate)} - {formatTime(event.endDate)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2">Durée</Typography>
            <Typography variant="body1">
              {Math.round((event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60))}h
            </Typography>
          </Grid>
          {event.class && (
            <Grid size={{ xs: 6 }}>
              <Typography variant="subtitle2">Classe</Typography>
              <Typography variant="body1">{event.class}</Typography>
            </Grid>
          )}
          {event.room && (
            <Grid size={{ xs: 6 }}>
              <Typography variant="subtitle2">Salle</Typography>
              <Typography variant="body1">{event.room}</Typography>
            </Grid>
          )}
          {event.instructor && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2">Enseignant</Typography>
              <Typography variant="body1">{event.instructor}</Typography>
            </Grid>
          )}
          {event.description && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2">Description</Typography>
              <Typography variant="body1">{event.description}</Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button variant="outlined">Modifier</Button>
        <Button variant="contained" color="error">Supprimer</Button>
      </DialogActions>
    </Dialog>
  )
}

export default EventDetailsDialog
