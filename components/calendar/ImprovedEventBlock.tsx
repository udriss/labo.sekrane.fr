// components/calendar/ImprovedEventBlock.tsx
// Composant amélioré pour afficher un événement comme un bloc unique avec créneaux multiples

"use client"

import React, { useState, useEffect } from 'react'
import {
  Card, CardContent, Typography, Stack, Chip, Box, Collapse, IconButton,
  Divider, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material'
import {
  ExpandMore, ExpandLess, Person, LocationOn, Schedule, CalendarToday,
  CheckCircle, Cancel, SwapHoriz, Gavel, Edit, Handyman, ContentCopy,
  Visibility, AttachFile, Room, Science, Group, Build, School
} from '@mui/icons-material'
import { CalendarEvent, EventState, TimeSlot } from '@/types/calendar'
import { TimeslotData } from '@/types/timeslots'
import { useTimeslots } from '@/hooks/useTimeslots'
import { normalizeClassField, getClassNameFromClassData } from '@/lib/class-data-utils'
import { getRoomDisplayName } from '@/lib/calendar-utils-client-room'
import { useSession } from 'next-auth/react'
import ImprovedTimeSlotActions from './ImprovedTimeSlotActions'
import ValidationSlotActions from './ValidationSlotActions'
import { is } from 'date-fns/locale'

interface ImprovedEventBlockProps {
  event: CalendarEvent
  canOperate: boolean
  isMobile?: boolean
  onEventUpdate?: (updatedEvent: CalendarEvent) => void
  onEventClick?: (event: CalendarEvent) => void // NOUVEAU: pour ouvrir les détails
  discipline?: 'chimie' | 'physique'
  onEdit?: (event: CalendarEvent) => void
  onEventCopy?: (event: CalendarEvent) => void
  onEventDelete?: (event: CalendarEvent) => void
}

const ImprovedEventBlock: React.FC<ImprovedEventBlockProps> = ({
  event,
  canOperate,
  isMobile = false,
  onEventUpdate,
  onEventClick, // NOUVEAU: fonction pour ouvrir les détails
  discipline = 'chimie',
  onEdit,
  onEventCopy,
  onEventDelete
}) => {
  const { data: session } = useSession()
  const [expanded, setExpanded] = useState(false)
  const [timeSlotActionsOpen, setTimeSlotActionsOpen] = useState(false)
  const [validationActionsOpen, setValidationActionsOpen] = useState(false)

  // 🎯 NOUVEAU: Utiliser l'API des créneaux au lieu de event.timeSlots
  const { 
    timeslots: apiTimeslots, 
    loading: timelsotsLoading, 
    error: timelsotsError,
    getTimeslots 
  } = useTimeslots()

  // Charger les créneaux depuis l'API
  useEffect(() => {
    if (event?.id && discipline) {
      getTimeslots(event.id, discipline, 'active') // ✅ Signature correcte
    }
  }, [event?.id, discipline, getTimeslots])

  // Convertir les données API vers le format TimeSlot legacy pour compatibilité
  const convertApiTimeslotsToTimeSlots = (apiData: TimeslotData[]): TimeSlot[] => {
    return apiData.map(timeslot => ({
      id: timeslot.id,
      startDate: timeslot.start_date,
      endDate: timeslot.end_date,
      status: timeslot.state === 'approved' ? 'active' : 
              timeslot.state === 'deleted' ? 'deleted' : 'active',
      createdBy: timeslot.user_id,
      modifiedBy: [], // À remplir si nécessaire depuis l'historique
      notes: timeslot.notes || undefined
    }))
  }

  // Utiliser uniquement les créneaux de l'API
  const displaySlots = apiTimeslots.length > 0 
    ? convertApiTimeslotsToTimeSlots(apiTimeslots)
    : [] // Plus de fallback vers l'ancien système
  
  // Normaliser les données de classe pour l'affichage
  const normalizedClassData = normalizeClassField(event.class_data)
  const className = getClassNameFromClassData(normalizedClassData)
  
  // Déterminer le rôle de l'utilisateur par rapport à cet événement
  const isOwner = session?.user && (
    event.createdBy === session.user.id || 
    event.createdBy === session.user.email
  )
  
  // Un opérateur peut agir sur l'événement mais n'en est pas le propriétaire
  const isOperator = canOperate && !isOwner

  // Détermine le type d'interface à afficher
  const showValidationInterface = isOwner && event.state === 'PENDING' && event.validationState === 'ownerPending'
  const showOperatorValidationInterface = canOperate && event.state === 'PENDING' && event.validationState === 'operatorPending'
  const showOperatorInterface = isOperator && event.state !== 'PENDING'
  const showOwnerInterface = isOwner

  console.log({
    event: event,
    isOwner: isOwner,
    isOperator: isOperator,
    session: session
  })

  const getEventStateColor = (state: EventState) => {
    switch (state) {
      case 'PENDING':
        return 'warning'
      case 'VALIDATED':
        return 'success'
      case 'CANCELLED':
        return 'error'
      case 'MOVED':
        return 'info'
      case 'IN_PROGRESS':
        return 'primary'
      default:
        return 'default'
    }
  }

  const getEventStateLabel = (state: EventState) => {
    switch (state) {
      case 'PENDING':
        return 'En attente'
      case 'VALIDATED':
        return 'Validé'
      case 'CANCELLED':
        return 'Annulé'
      case 'MOVED':
        return 'Déplacé'
      case 'IN_PROGRESS':
        return 'En cours'
      default:
        return state
    }
  }

  const formatTimeSlot = (slot: TimeSlot) => {
    const start = new Date(slot.startDate)
    const end = new Date(slot.endDate)
    
    const date = start.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    })
    const startTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const endTime = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    
    return { date, time: `${startTime} - ${endTime}`, fullDate: start }
  }

  const groupSlotsByDate = (slots: TimeSlot[]) => {
    const grouped = new Map<string, TimeSlot[]>()
    
    slots.forEach(slot => {
      const date = new Date(slot.startDate).toDateString()
      if (!grouped.has(date)) {
        grouped.set(date, [])
      }
      grouped.get(date)!.push(slot)
    })
    
    return Array.from(grouped.entries()).map(([dateString, slots]) => ({
      date: dateString,
      slots: slots.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    }))
  }

  const groupedSlots = groupSlotsByDate(displaySlots)

  const handleGlobalAction = async (action: 'VALIDATE' | 'CANCEL', reason?: string): Promise<void> => {
    try {
      const response = await fetch(`/api/calendrier/${discipline}/simple-operator-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          action,
          reason
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'action')
      }

      const data = await response.json()
      
      if (onEventUpdate && data.event) {
        onEventUpdate(data.event)
      }

      alert(data.message || 'Action effectuée avec succès')

    } catch (error) {
      console.error('Erreur lors de l\'action:', error)
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      throw error // Re-throw pour permettre la gestion dans handleCancel
    }
  }

  const handleValidate = () => {
    handleGlobalAction('VALIDATE', 'Événement validé globalement')
  }

  const handleCancel = () => {
    if (confirm('Êtes-vous sûr de vouloir annuler cet événement ?')) {
      handleGlobalAction('CANCEL', 'Événement annulé par l\'opérateur')
        .then(() => {
          // Ne pas fermer ou masquer l'événement, il doit rester visible avec l'état CANCELLED
          console.log('Événement annulé, mais reste visible dans l\'interface')
        })
    }
  }

  const handleMove = () => {
    setTimeSlotActionsOpen(true)
  }

  const handleValidationActions = () => {
    setValidationActionsOpen(true)
  }

  const handleOwnerModify = () => {
    // Pour les owners, utiliser le EditEventDialog de la page principale
    if (onEdit) {
      onEdit(event)
    } else {
      // Fallback vers l'interface de modification qui créera un état PENDING
      setTimeSlotActionsOpen(true)
    }
  }

  const handleOwnerCopy = () => {
    if (onEventCopy) {
      onEventCopy(event)
    }
  }

  const handleOwnerDelete = () => {
    if (onEventDelete && confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      onEventDelete(event)
    }
  }


  


  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            {/* En-tête de l'événement */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" component="div">
                  {event.title}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Chip
                    label={getEventStateLabel(event.state || 'PENDING')}
                    color={getEventStateColor(event.state || 'PENDING')}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {displaySlots.length} créneau{displaySlots.length > 1 ? 'x' : ''}
                  </Typography>
                </Stack>
              </Box>
              
              <Stack direction="row" spacing={0.5}>
                {/* Bouton pour voir les détails */}
                {onEventClick && (
                  <Tooltip title="Voir les détails">
                    <IconButton
                      onClick={() => onEventClick(event)}
                      size="small"
                      color="primary"
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                
                <IconButton
                  onClick={() => setExpanded(!expanded)}
                  size="small"
                >
                  {expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Stack>
            </Box>

            {/* Section moderne avec informations importantes */}
            <Box 
              sx={{ 
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 2
              }}
            >
              {/* Fond avec effet blur et transparence */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.08) 0%, rgba(156, 39, 176, 0.08) 100%)',
                  backdropFilter: 'blur(10px)',
                  zIndex: 0
                }}
              />
              
              {/* Contenu */}
              <Box sx={{ position: 'relative', zIndex: 1, p: 2 }}>
                <Stack spacing={1.5}>
                  {/* Classe et Salle */}
                  <Stack direction={isMobile ? 'column' : 'row'} spacing={1.5}>
                    {normalizedClassData && (
                      <Paper
                        elevation={0}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          background: 'rgba(25, 118, 210, 0.1)',
                          backdropFilter: 'blur(5px)',
                          border: '1px solid rgba(25, 118, 210, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          flex: 1
                        }}
                      >
                        <Group fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight="medium">
                          {className}
                        </Typography>
                      </Paper>
                    )}
                    
                    {(getRoomDisplayName(event.room) || event.location) && (
                      <Paper
                        elevation={0}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          background: 'rgba(156, 39, 176, 0.1)',
                          backdropFilter: 'blur(5px)',
                          border: '1px solid rgba(156, 39, 176, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          flex: 1
                        }}
                      >
                        <Room fontSize="small" color="secondary" />
                        <Typography variant="body2" fontWeight="medium">
                          {getRoomDisplayName(event.room) || event.location}
                        </Typography>
                      </Paper>
                    )}
                  </Stack>

                  {/* Matériels et Réactifs/Consommables */}
                  <Stack direction={isMobile ? 'column' : 'row'} spacing={1.5}>
                    {event.materials && event.materials.length > 0 && (
                      <Paper
                        elevation={0}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          background: 'rgba(255, 152, 0, 0.1)',
                          backdropFilter: 'blur(5px)',
                          border: '1px solid rgba(255, 152, 0, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          flex: 1
                        }}
                      >
                        <Build fontSize="small" sx={{ color: 'orange' }} />
                        <Typography variant="body2" fontWeight="medium">
                          {event.materials.length} matériel{event.materials.length > 1 ? 's' : ''}
                        </Typography>
                      </Paper>
                    )}
                    
                    {discipline === 'chimie' && event.chemicals && event.chemicals.length > 0 && (
                      <Paper
                        elevation={0}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          background: 'rgba(76, 175, 80, 0.1)',
                          backdropFilter: 'blur(5px)',
                          border: '1px solid rgba(76, 175, 80, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          flex: 1
                        }}
                      >
                        <Science fontSize="small" color="success" />
                        <Typography variant="body2" fontWeight="medium">
                          {event.chemicals.length} réactif{event.chemicals.length > 1 ? 's' : ''}
                        </Typography>
                      </Paper>
                    )}
                    {discipline === 'physique' && event.consommables && event.consommables.length > 0 && (
                      <Paper
                        elevation={0}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          background: 'rgba(76, 175, 80, 0.1)',
                          backdropFilter: 'blur(5px)',
                          border: '1px solid rgba(76, 175, 80, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          flex: 1
                        }}
                      >
                        <Science fontSize="small" color="success" />
                        <Typography variant="body2" fontWeight="medium">
                          {event.consommables.length} consommable{event.consommables.length > 1 ? 's' : ''}
                        </Typography>
                      </Paper>
                    )}
                  </Stack>


                  {/* Table combinée pour Matériel et Réactifs chimiques */}
                  <TableContainer 
                    sx={{ mt: 2,
                      maxWidth: 600,
                      margin: '0 auto',
                    }}>
                    <Table size="small" sx={{ minWidth: 300 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell 
                            sx={{ 
                              fontWeight: 'bold',
                              borderBottom: '2px solid',
                              borderColor: 'primary.main',
                              color: 'primary.main'
                            }}
                          >
                            Type / Nom
                          </TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              fontWeight: 'bold',
                              borderBottom: '2px solid',
                              borderColor: 'primary.main',
                              color: 'primary.main'
                            }}
                          >
                            Quantité
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {/* Section Matériel */}
                        {event.materials && event.materials.length > 0 && (
                          <>
                            <TableRow>
                              <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                                Matériel
                              </TableCell>
                            </TableRow>
                            {event.materials.map((material, index) => (
                              <TableRow key={`material-${index}`}>
                                <TableCell>
                                  {typeof material === 'object' ? material.name || material.itemName : material}
                                </TableCell>
                                <TableCell align="right">
                                  {typeof material === 'object' && material.quantity ? `${material.quantity} ${material.unit || ''}`.trim() : 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}

                        {/* Section Réactifs chimiques */}
                        {event.chemicals && event.chemicals.length > 0 && (
                          <>
                            <TableRow>
                              <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                                Réactifs Chimiques
                              </TableCell>
                            </TableRow>
                            {event.chemicals.map((chemical, index) => (
                              <TableRow key={`chemical-${index}`}>
                                <TableCell>
                                  <Typography variant="body2">{chemical.name}</Typography>
                                  {chemical.formula && (
                                    <Typography variant="caption" color="text.secondary">
                                      {chemical.formula}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {chemical.requestedQuantity || chemical.quantity} {chemical.unit}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Documents */}
                  {event.files && event.files.length > 0 && (
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                        background: 'rgba(103, 58, 183, 0.1)',
                        backdropFilter: 'blur(5px)',
                        border: '1px solid rgba(103, 58, 183, 0.2)'
                      }}
                    >
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                        <AttachFile fontSize="small" color="secondary" />
                        <Typography variant="body2" fontWeight="medium">
                          {event.files.length} document{event.files.length > 1 ? 's' : ''}
                        </Typography>
                      </Stack>
                      
                      <Stack spacing={0.3}>
                        {event.files.map((file, index) => {
                          // Construire l'URL de manière sûre
                          const fileUrl = file?.fileUrl
                          const apiEndpoint = discipline === 'physique' ? '/api/calendrier/physique' : '/api/calendrier/chimie'
                          const href = fileUrl 
                            ? (fileUrl.startsWith('/uploads/') 
                                ? `${apiEndpoint}/files?path=${encodeURIComponent(fileUrl)}`
                                : fileUrl)
                            : '#'
                          
                          return (
                            <Typography
                              key={index}
                              component="a"
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="caption"
                              sx={{
                                color: fileUrl ? 'primary.main' : 'text.disabled',
                                textDecoration: 'none',
                                '&:hover': {
                                  textDecoration: fileUrl ? 'underline' : 'none'
                                },
                                cursor: fileUrl ? 'pointer' : 'default',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%'
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!fileUrl) {
                                  e.preventDefault()
                                }
                              }}
                            >
                              • {file?.fileName || 'Document sans nom'}
                            </Typography>
                          )
                        })}
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              </Box>
            </Box>

            {/* Résumé des créneaux (toujours visible) */}
            <Box>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                <Schedule fontSize="small" />
                <Typography variant="body2" fontWeight="medium">
                  Créneaux :
                </Typography>
              </Stack>
              
              {groupedSlots.map((group, index) => {
                const firstSlot = group.slots[0]
                const { date } = formatTimeSlot(firstSlot)
                const times = group.slots.map(slot => formatTimeSlot(slot).time).join(', ')
                
                return (
                  <Typography key={index} variant="body2" color="text.secondary">
                    • {date} : {times}
                  </Typography>
                )
              })}
            </Box>

            {/* Actions selon le rôle */}
            {showValidationInterface && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Gavel fontSize="small" />
                  <Typography variant="body2" fontWeight="medium" color="warning.main">
                    Cet événement nécessite votre validation
                  </Typography>
                </Stack>
                <Button
                  onClick={handleValidationActions}
                  variant="contained"
                  color="warning"
                  startIcon={<Gavel />}
                  size="small"
                  fullWidth={isMobile}
                >
                  Gérer la validation
                </Button>
              </Box>
            )}

            {showOperatorValidationInterface && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Gavel fontSize="small" />
                  <Typography variant="body2" fontWeight="medium" color="primary.main">
                    En attente de validation opérateur
                  </Typography>
                </Stack>
                <Button
                  onClick={handleValidationActions}
                  variant="contained"
                  color="primary"
                  startIcon={<Gavel />}
                  size="small"
                  fullWidth={isMobile}
                >
                  Valider les modifications
                </Button>
              </Box>
            )}

            {showOperatorInterface && (
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Actions opérateur :
                </Typography>
                <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
                  <Button
                    onClick={handleValidate}
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    size="small"
                    disabled={event.state === 'VALIDATED'}
                  >
                    Valider l'événement
                  </Button>
                  
                  <Button
                    onClick={handleMove}
                    variant="outlined"
                    color="primary"
                    endIcon={<Handyman color='warning' />}
                    startIcon={<SwapHoriz />}
                    size="small"
                    disabled
                  >
                    Déplacer/Modifier
                  </Button>
                  
                  <Button
                    onClick={handleCancel}
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    size="small"
                    disabled={event.state === 'CANCELLED'}
                  >
                    Annuler l'événement
                  </Button>
                </Stack>
              </Box>
            )}

            {showOwnerInterface && (
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Actions propriétaire :
                </Typography>
                <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
                  <Button
                    onClick={handleOwnerModify}
                    variant="outlined"
                    color="primary"
                    startIcon={<Edit />}
                    size="small"
                  >
                    Modifier l'événement
                  </Button>
                  {onEventCopy && (
                    <Button
                      onClick={handleOwnerCopy}
                      variant="outlined"
                      color="secondary"
                      startIcon={<ContentCopy />}
                      size="small"
                    >
                      Copier l'événement
                    </Button>
                  )}
                  {onEventDelete && (
                    <Button
                      onClick={handleOwnerDelete}
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      size="small"
                    >
                      Supprimer
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Vos modifications nécessiteront une validation
                </Typography>
              </Box>
            )}

            {/* Détails étendus */}
            <Collapse in={expanded}>
              <Divider sx={{ my: 2 }} />
              
              {event.description && (
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {event.description}
                </Typography>
              )}
              
              <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
                {event.createdBy && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Person fontSize="small" />
                    <Typography variant="body2">
                      Par {event.createdBy}
                    </Typography>
                  </Stack>
                )}
                
                {(getRoomDisplayName(event.room) || event.location) ? (
                  <></>
                ) : (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <LocationOn fontSize="small" color="error" />
                    <Typography variant='caption' color="error"
                    sx = {{ fontVariant: 'upercase', fontWeight: 'bold' }}
                    >
                      AUCUNE SALLE
                    </Typography>
                  </Stack>
                )}
                
                {normalizedClassData ? (
                  <></>
                ) : (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <School fontSize="small" color="error" />
                    <Typography variant='caption' color="error"
                    sx = {{ textTransform: 'uppercase', fontWeight: 'bold' }}
                    >
                      AUCUNE CLASSE
                    </Typography>
                  </Stack>
                )}
              </Stack>

              {/* Table combinée pour Matériel et Réactifs chimiques */}
              {((event.materials && event.materials.length > 0) || 
                (discipline === 'chimie' && event.chemicals && event.chemicals.length > 0)) && (
                <TableContainer 
                  sx={{ mt: 2,
                    maxWidth: 600,
                    margin: '16px auto 0 auto',
                  }}>
                  <Table size="small" sx={{ minWidth: 300 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold',
                            borderBottom: '2px solid',
                            borderColor: 'primary.main',
                            color: 'primary.main'
                          }}
                        >
                          Type / Nom
                        </TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            fontWeight: 'bold',
                            borderBottom: '2px solid',
                            borderColor: 'primary.main',
                            color: 'primary.main'
                          }}
                        >
                          Quantité
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Section Matériel */}
                      {event.materials && event.materials.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                              Matériel
                            </TableCell>
                          </TableRow>
                          {event.materials.map((material, index) => (
                            <TableRow key={`material-${index}`}>
                              <TableCell>
                                {typeof material === 'object' ? material.name || material.itemName : material}
                              </TableCell>
                              <TableCell align="right">
                                {typeof material === 'object' && material.quantity ? `${material.quantity} ${material.unit || ''}`.trim() : 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}

                      {/* Section Réactifs chimiques */}
                      {discipline === 'chimie' && event.chemicals && event.chemicals.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                              Réactifs Chimiques
                            </TableCell>
                          </TableRow>
                          {event.chemicals.map((chemical, index) => (
                            <TableRow key={`chemical-${index}`}>
                              <TableCell>
                                <Typography variant="body2">{chemical.name}</Typography>
                                {chemical.formula && (
                                  <Typography variant="caption" color="text.secondary">
                                    {chemical.formula}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {chemical.requestedQuantity || chemical.quantity} {chemical.unit}
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                      {discipline === 'physique' && event.consommables && event.consommables.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                              Consommables
                            </TableCell>
                          </TableRow>
                          {event.consommables.map((consommable, index) => (
                            <TableRow key={`chemical-${index}`}>
                              <TableCell>
                                <Typography variant="body2">{consommable.name}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                {(consommable.requestedQuantity ?? 1)} {consommable.unit ? consommable.unit : ((consommable.requestedQuantity ?? 0) > 1 ? 'pièces' : 'pièce')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Collapse>
          </Stack>
        </CardContent>
      </Card>

      {/* Dialog pour les actions sur créneaux individuels */}
      <Dialog 
        open={timeSlotActionsOpen} 
        onClose={() => setTimeSlotActionsOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {isOwner ? 'Modifier l\'événement' : 'Gestion des créneaux'} - {event.title}
        </DialogTitle>
        
        <DialogContent>
          <ImprovedTimeSlotActions
            event={event}
            canOperate={canOperate}
            isMobile={isMobile}
            onEventUpdate={onEventUpdate}
            discipline={discipline}
            onClose={() => setTimeSlotActionsOpen(false)}
            userRole={isOwner ? 'owner' : 'operator'}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setTimeSlotActionsOpen(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour la validation des modifications */}
      <Dialog 
        open={validationActionsOpen} 
        onClose={() => setValidationActionsOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Validation de l'événement - {event.title}
        </DialogTitle>
        
        <DialogContent>
          <ValidationSlotActions
            event={event}
            canValidate={canOperate}
            isMobile={isMobile}
            onEventUpdate={onEventUpdate}
            discipline={discipline}
            onClose={() => setValidationActionsOpen(false)}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setValidationActionsOpen(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ImprovedEventBlock
