// components/calendar/EventDetailsDialog.tsx

"use client"

import React from 'react'
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Grid, Typography, Chip, Stack, Divider
} from '@mui/material'
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Science, Schedule, Assignment, EventAvailable } from '@mui/icons-material'
import { CalendarEvent, EventType } from '@/types/calendar'

interface EventDetailsDialogProps {
  open: boolean
  event: CalendarEvent | null
  onClose: () => void
}

// Définition corrigée de EVENT_TYPES
const EVENT_TYPES = {
  TP: { label: "Travaux Pratiques", color: "#1976d2", icon: <Science /> },
  MAINTENANCE: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  INVENTORY: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  OTHER: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({ 
  open, 
  event, 
  onClose 
}) => {
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

  const calculateDuration = () => {
    if (!event) return 0
    const start = typeof event.startDate === 'string' ? new Date(event.startDate) : event.startDate
    const end = typeof event.endDate === 'string' ? new Date(event.endDate) : event.endDate
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    return hours
  }

  if (!event) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Détails de la séance</Typography>
          <Chip 
            label={getEventTypeInfo(event.type).label} 
            color="primary" 
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Titre et informations principales */}
          <Box>
            <Typography variant="h5" gutterBottom>
              {event.title}
            </Typography>
            {event.description && (
              <Typography variant="body1" color="text.secondary">
                {event.description}
              </Typography>
            )}
          </Box>

          <Divider />

          {/* Informations temporelles */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Date et heure
              </Typography>
              <Typography variant="body1">
                📅 {formatDateTime(event.startDate)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                jusqu'à {formatTime(event.endDate)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Durée
              </Typography>
              <Typography variant="body1">
                ⏱️ {calculateDuration()} heure{calculateDuration() > 1 ? 's' : ''}
              </Typography>
            </Grid>
          </Grid>

          {/* Informations de localisation */}
          {(event.class || event.room) && (
            <>
              <Divider />
              <Grid container spacing={2}>
                {event.class && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Classe
                    </Typography>
                    <Typography variant="body1">
                      🎓 {event.class}
                    </Typography>
                  </Grid>
                )}
                {event.room && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Salle
                    </Typography>
                    <Typography variant="body1">
                      📍 {event.room}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </>
          )}

          {/* Matériel et produits */}
          {((event.materials && event.materials.length > 0) || 
            (event.chemicals && event.chemicals.length > 0)) && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Ressources nécessaires
                </Typography>
                <Grid container spacing={2}>
                  {event.materials && event.materials.length > 0 && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Matériel ({event.materials.length})
                      </Typography>
                      <Stack spacing={0.5}>
                        {event.materials.map((material, index) => (
                          <Typography key={index} variant="body2">
                            • {typeof material === 'string' 
                                ? material 
                                : (material.name || material.itemName || 'Matériel')}
                            {typeof material === 'object' && material.volume && ` (${material.volume})`}
                            {typeof material === 'object' && material.quantity && ` - Quantité: ${material.quantity}`}
                          </Typography>
                        ))}
                      </Stack>
                    </Grid>
                  )}
                  {event.chemicals && event.chemicals.length > 0 && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Produits chimiques ({event.chemicals.length})
                      </Typography>
                      <Stack spacing={0.5}>
                        {event.chemicals.map((chemical, index) => (
                          <Typography key={index} variant="body2">
                            • {typeof chemical === 'string' 
                                ? chemical 
                                : (chemical.name || 'Produit')}
                            {typeof chemical === 'object' && chemical.formula && ` (${chemical.formula})`}
                            {typeof chemical === 'object' && chemical.quantity && ` - ${chemical.quantity}${chemical.unit || ''}`}
                          </Typography>
                        ))}
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </>
          )}

          {/* Document joint */}
          {event.fileName && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Document joint
                </Typography>
                <Typography variant="body1">
                  📎 {event.fileName}
                </Typography>
              </Box>
            </>
          )}

          {/* Métadonnées */}
          {(event.createdAt || event.updatedAt) && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {event.createdAt && `Créé le ${formatDateTime(event.createdAt)}`}
                  {event.createdAt && event.updatedAt && ' • '}
                  {event.updatedAt && `Modifié le ${formatDateTime(event.updatedAt)}`}
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  )
}

export default EventDetailsDialog