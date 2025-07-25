// components/calendar/EventDetailsDialog.tsx

"use client"

import React, { useState, useEffect } from 'react'
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Grid, Typography, Chip, Stack, Divider,
  IconButton, Skeleton,
  Avatar,
} from '@mui/material'
import {
  Timeline, TimelineItem, TimelineSeparator,
  TimelineDot, TimelineConnector, TimelineContent,
  TimelineOppositeContent
} from '@mui/lab'


import { Science, Schedule, Assignment, EventAvailable, Edit, Delete, History, Person } from '@mui/icons-material'
import { CalendarEvent, EventType } from '@/types/calendar'

interface EventDetailsDialogProps {
  open: boolean
  event: CalendarEvent | null
  onClose: () => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
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
  onClose,
  onEdit,
  onDelete 
}) => {

  const [usersInfo, setUsersInfo] = useState<Record<string, {id: string, name: string, email: string}>>({})
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [creatorInfo, setCreatorInfo] = useState<{id: string, name: string, email: string} | null>(null)
  const [timelineData, setTimelineData] = useState<Array<{
    userId: string,
    userName: string,
    date: string,
    isConsecutive: boolean
  }>>([])
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

useEffect(() => {
  const fetchUsersAndPrepareTimeline = async () => {
    if (!event) return

    // Réinitialiser la timeline si pas de modifications
    if (!event.modifiedBy || event.modifiedBy.length === 0) {
      setTimelineData([])
      return
    }

    setLoadingUsers(true)
    try {
      // Collecter tous les userIds (modificateurs + créateur)
      const userIds: string[] = []
      
      // Ajouter les IDs des modificateurs
      if (event.modifiedBy && event.modifiedBy.length > 0) {
        event.modifiedBy.forEach(entry => userIds.push(entry[0]))
      }
      
      // Ajouter l'ID du créateur s'il existe
      if (event.createdBy) {
        userIds.push(event.createdBy)
      }
      
      // Récupérer les infos de tous les utilisateurs
      if (userIds.length > 0) {
        const response = await fetch('/api/utilisateurs/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: [...new Set(userIds)] }) // Enlever les doublons
        })

        if (response.ok) {
          const users = await response.json()
          setUsersInfo(users)
          
          // Stocker les infos du créateur
          if (event.createdBy && users[event.createdBy]) {
            setCreatorInfo(users[event.createdBy])
          }
          
          // Préparer les données pour la timeline
          if (event.modifiedBy && event.modifiedBy.length > 0) {
            const allModifications: Array<{
              userId: string, 
              userName: string,
              date: string,
              isConsecutive: boolean
            }> = []
            
            // Créer une entrée pour chaque modification
            event.modifiedBy.forEach(([userId, ...dates]) => {
              const userName = users[userId]?.name || 
                              users[userId]?.email || 
                              `Utilisateur ${userId}`
              
              dates.forEach(date => {
                // Vérifier si la date est valide
                try {
                  const d = new Date(date)
                  if (!isNaN(d.getTime())) {
                    allModifications.push({ userId, userName, date, isConsecutive: false })
                  }
                } catch {
                  // Ignorer les dates invalides
                }
              })
            })
            
            // Trier par date
            allModifications.sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            
            // Marquer les modifications consécutives du même utilisateur
            for (let i = 1; i < allModifications.length; i++) {
              if (allModifications[i].userId === allModifications[i - 1].userId) {
                allModifications[i].isConsecutive = true
              }
            }
            
            setTimelineData(allModifications)
          } else {
            setTimelineData([])
          }
        }
      } else {
        setTimelineData([])
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error)
      setTimelineData([])
    } finally {
      setLoadingUsers(false)
    }
  }

  if (open && event) {
    fetchUsersAndPrepareTimeline()
  }
}, [event, open])

  // Ajoutez une fonction helper pour formater les dates en toute sécurité
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Date invalide'
      }
      return format(date, 'dd MMM yyyy HH:mm', { locale: fr })
    } catch (error) {
      return 'Date invalide'
    }
  }

  if (!event) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">Détails de la séance</Typography>
            <Chip 
              label={getEventTypeInfo(event.type).label} 
              color="primary" 
              size="small"
            />
          </Box>
          <Box display="flex" gap={1}>
            {onEdit && (
              <IconButton
                onClick={() => {
                  onEdit(event)
                  onClose()
                }}
                size="small"
                color="primary"
              >
                <Edit />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                onClick={() => {
                  onDelete(event)
                  onClose()
                }}
                size="small"
                color="error"
              >
                <Delete />
              </IconButton>
            )}
          </Box>
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
        </Stack>
          {/* Métadonnées */}
          <Divider sx = {{ my: 2 }} />
          {/* Historique des modifications */}
          {timelineData.length > 0 && (
            <>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <History /> Historique des modifications
                </Typography>
                
            {loadingUsers ? (
              <Stack spacing={2}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="50%" />
              </Stack>
            ) : (
            <Timeline position="alternate" sx={{ mt: 0, pt: 0 }}>
            {timelineData.map((item, index) => (
              <TimelineItem 
                key={index}
                sx={{
                  // Réduire l'espacement vertical si l'item est consécutif
                  minHeight: item.isConsecutive ? 40 : 60,
                  '&::before': {
                    flex: 0,
                    padding: 0,
                  }
                }}
              >
                <TimelineOppositeContent
                  sx={{ 
                    m: 'auto 0',
                    py: item.isConsecutive ? 0.1 : 0.5
                  }}
                  align={index % 2 === 0 ? "right" : "left"}
                  variant="body2"
                  color="text.secondary"
                >
                  {formatDate(item.date)}
                </TimelineOppositeContent>
                
                <TimelineSeparator>
                  {index > 0 && <TimelineConnector sx={{ 
                    bgcolor: item.isConsecutive ? 'grey.300' : 'grey.400',
                    // Réduire la hauteur du connecteur pour les items consécutifs
                    height: item.isConsecutive ? '10px' : '20px'
                  }} />}

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!item.isConsecutive && (
                      <Avatar
                        sx={{ 
                          bgcolor: 'primary.main', 
                          width: 24, 
                          height: 24, 
                          fontSize: '0.75rem' 
                        }}
                      >
                        <Person sx={{ fontSize: 16, color: 'white' }} />
                      </Avatar>
                    )}
                    {item.isConsecutive && (
                      <TimelineDot 
                        color={index === timelineData.length - 1 ? "primary" : "grey"}
                        variant="outlined"
                        sx={{ 
                          width: 10,
                          height: 10,
                          margin: 0,  // Enlever les marges par défaut
                          transition: 'all 0.3s'
                        }}
                      />
                    )}
                  </Box>
                  
                  {index < timelineData.length - 1 && 
                  <TimelineConnector sx={{ 
                    bgcolor: timelineData[index + 1]?.isConsecutive ? 'grey.300' : 'grey.400',
                    // Réduire la hauteur si le prochain item est consécutif
                    height: timelineData[index + 1]?.isConsecutive ? '5px' : '20px'
                  }} />}
                </TimelineSeparator>
                
                <TimelineContent sx={{ 
                  py: item.isConsecutive ? 0.1 : 0.5,
                  px: 2 
                }}>
                  {!item.isConsecutive ? (
                    <Typography variant="body2" component="span" fontWeight="medium">
                      {item.userName}
                    </Typography>
                  ) : (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ fontStyle: 'italic' }}
                    >
                      Modification supplémentaire
                    </Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
            </Timeline>
            )}
              </Box>
            </>
          )}

          {/* Métadonnées de création */}
          {event.createdBy && (
            <>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Ajouté par {creatorInfo ? (creatorInfo.name || creatorInfo.email) : event.createdBy}
                  {event.createdAt && ` le ${formatDateTime(event.createdAt)}`}
                </Typography>
              </Box>
            </>
          )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        {onEdit && (
          <Button 
            onClick={() => {
              onEdit(event)
              onClose()
            }}
            variant="outlined"
            startIcon={<Edit />}
          >
            Modifier
          </Button>
        )}
        {onDelete && (
          <Button 
            onClick={() => {
              onDelete(event)
              onClose()
            }}
            variant="outlined"
            color="error"
            startIcon={<Delete />}
          >
            Supprimer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default EventDetailsDialog