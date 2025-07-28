// component/calendar/WeeklyView.tsx

"use client"

import React from 'react'
import {
  Box, Stack, IconButton, Chip, Typography, Card, CardContent,
  Tooltip, Paper, useTheme, alpha, Badge, 
} from '@mui/material'
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, addDays, subDays, differenceInMinutes,
  isPast, isFuture, startOfDay, endOfDay,
  setHours, setMinutes
} from "date-fns"
import { fr } from "date-fns/locale"
import {
  ChevronLeft, ChevronRight, Today,
  Science, Schedule, Assignment, EventAvailable,
  Circle, Edit, Delete, CheckCircle, 
  Cancel, SwapHoriz, HourglassEmpty, ManageHistory
} from '@mui/icons-material'
import { CalendarEvent, EventType } from '@/types/calendar'

interface WeeklyViewProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onEventEdit?: (event: CalendarEvent) => void
  onEventDelete?: (event: CalendarEvent) => void
  canEditEvent?: (event: CalendarEvent) => boolean
}
const EVENT_TYPES = {
  TP: { label: "TP", color: "#1976d2", icon: <Science /> },
  MAINTENANCE: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  INVENTORY: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  OTHER: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
]

// Type pour un événement avec ses informations de positionnement
interface PositionedEvent extends CalendarEvent {
  column: number
  totalColumns: number
  visualStartDate: Date
  visualEndDate: Date
  startsBeforeDay: boolean
  endsAfterDay: boolean
  startsBeforeSchedule: boolean
  endsAfterSchedule: boolean
}

const WeeklyView: React.FC<WeeklyViewProps> = ({
  currentDate,
  setCurrentDate,
  events,
  onEventClick,
  onEventEdit,  
  onEventDelete,
  canEditEvent
}) => {
  const theme = useTheme()

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  // Fonction pour détecter les chevauchements entre événements
  const doEventsOverlap = (event1: CalendarEvent, event2: CalendarEvent) => {
    const start1 = typeof event1.startDate === 'string' ? new Date(event1.startDate) : event1.startDate
    const end1 = typeof event1.endDate === 'string' ? new Date(event1.endDate) : event1.endDate
    const start2 = typeof event2.startDate === 'string' ? new Date(event2.startDate) : event2.startDate
    const end2 = typeof event2.endDate === 'string' ? new Date(event2.endDate) : event2.endDate

    return start1 < end2 && start2 < end1
  }

  // Fonction pour obtenir les événements d'un jour avec gestion des colonnes
  const getPositionedEventsForDay = (date: Date): PositionedEvent[] => {
    const dayStart = setHours(setMinutes(startOfDay(date), 0), 8) // 8h00
    const dayEnd = setHours(setMinutes(startOfDay(date), 0), 19) // 19h00
    const nextDayStart = setHours(setMinutes(addDays(date, 1), 0), 8)

    // Filtrer les événements qui touchent ce jour
    const dayEvents = events.filter(event => {
      const eventStart = typeof event.startDate === 'string' ? new Date(event.startDate) : event.startDate
      const eventEnd = typeof event.endDate === 'string' ? new Date(event.endDate) : event.endDate
      
      // L'événement touche ce jour s'il commence avant la fin du jour ET se termine après le début
      return eventStart < endOfDay(date) && eventEnd > startOfDay(date)
    })

    // Trier par heure de début
    dayEvents.sort((a, b) => {
      const startA = typeof a.startDate === 'string' ? new Date(a.startDate) : a.startDate
      const startB = typeof b.startDate === 'string' ? new Date(b.startDate) : b.startDate
      return startA.getTime() - startB.getTime()
    })

    // Calculer les colonnes pour éviter les chevauchements
    const positionedEvents: PositionedEvent[] = []
    const columns: PositionedEvent[][] = []

    dayEvents.forEach(event => {
      const eventStart = typeof event.startDate === 'string' ? new Date(event.startDate) : event.startDate
      const eventEnd = typeof event.endDate === 'string' ? new Date(event.endDate) : event.endDate

      // Déterminer les dates visuelles (clippées aux heures de la journée)
      const visualStartDate = eventStart < dayStart ? dayStart : eventStart
      const visualEndDate = eventEnd > dayEnd ? dayEnd : eventEnd

      // Déterminer si l'événement déborde
      const startsBeforeDay = eventStart < startOfDay(date)
      const endsAfterDay = eventEnd > endOfDay(date)
      const startsBeforeSchedule = eventStart < dayStart && isSameDay(eventStart, date)
      const endsAfterSchedule = eventEnd > dayEnd && isSameDay(eventEnd, date)

      // Trouver la première colonne disponible
      let columnIndex = 0
      for (let i = 0; i < columns.length; i++) {
        const columnEvents = columns[i]
        const hasOverlap = columnEvents.some(colEvent => doEventsOverlap(event, colEvent))
        if (!hasOverlap) {
          columnIndex = i
          break
        }
        if (i === columns.length - 1) {
          columnIndex = columns.length
        }
      }

      // Ajouter l'événement à la colonne
      if (!columns[columnIndex]) {
        columns[columnIndex] = []
      }
      
      const positioned: PositionedEvent = {
        ...event,
        column: columnIndex,
        totalColumns: 1, // Sera mis à jour après
        visualStartDate,
        visualEndDate,
        startsBeforeDay,
        endsAfterDay,
        startsBeforeSchedule,
        endsAfterSchedule
      }
      
      columns[columnIndex].push(positioned)
      positionedEvents.push(positioned)
    })

    // Mettre à jour le nombre total de colonnes pour chaque événement
    positionedEvents.forEach(event => {
      // Trouver tous les événements qui chevauchent avec celui-ci
      const overlappingEvents = positionedEvents.filter(other => 
        doEventsOverlap(event, other)
      )
      const maxColumn = Math.max(...overlappingEvents.map(e => e.column))
      event.totalColumns = maxColumn + 1
    })

    return positionedEvents
  }

  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
  }

  const handlePreviousWeek = () => {
    setCurrentDate(subDays(currentDate, 7))
  }

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }
  
    // Fonction pour obtenir l'icône d'état
    const getStateIcon = (state: string | undefined, size: 'small' | 'medium' | 'large' = 'small') => {
      const iconSize = size === 'small' ? 25 : size === 'medium' ? 50 : 75

      switch (state) {
        case 'PENDING':
          return <HourglassEmpty sx={{ fontSize: iconSize, color: 'warning.dark' }} />
        case 'VALIDATED':
          return <CheckCircle sx={{ fontSize: iconSize, color: 'success.main' }} />
        case 'CANCELLED':
          return <Cancel sx={{ fontSize: iconSize, color: 'error.main' }} />
        case 'MOVED':
          return <SwapHoriz sx={{ fontSize: iconSize, color: 'info.light' }} />
        case 'IN_PROGRESS':
          return <ManageHistory sx={{ fontSize: iconSize, color: 'primary' }} />
        default:
          return null
      }
    }

  return (
    <Box>
      {/* Navigation améliorée */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          bgcolor: 'background.default',
          borderRadius: 2
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={handlePreviousWeek}
              sx={{
                border: 1,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              onClick={handleNextWeek}
              sx={{
                border: 1,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ChevronRight />
            </IconButton>
          </Stack>

          <Box textAlign="center">
            <Typography variant="h5" fontWeight="bold">
              {format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMMM", { locale: fr })} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: fr })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Semaine {format(currentDate, "w", { locale: fr })}
            </Typography>
          </Box>

          <Chip
            icon={<Today />}
            label="Aujourd'hui"
            onClick={handleToday}
            color="primary"
            variant={isSameDay(currentDate, new Date()) ? "filled" : "outlined"}
          />
        </Stack>
      </Paper>

      {/* Grille améliorée */}
      <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2 }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(7, 1fr)',
          position: 'relative',
          bgcolor: 'background.paper'
        }}>
          {/* En-tête des jours */}
          <Box sx={{
            p: 2,
            bgcolor: 'background.default',
            borderRight: 1,
            borderColor: 'divider',
            maxHeight: '90px',
            minHeight: '90px',
          }} />
          {getWeekDays().map((day) => {
            const isCurrentDay = isToday(day)
            const dayEvents = getPositionedEventsForDay(day)

            return (
              <Box
                key={day.toISOString()}
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRight: 1,
                  borderBottom: 2,
                  borderColor: 'divider',
                  bgcolor: isCurrentDay ? alpha(theme.palette.primary.main, 0.08) : 'background.default',
                  position: 'relative'
                }}
              >
                <Typography
                  variant="subtitle2"
                  color={isCurrentDay ? 'primary' : 'text.secondary'}
                  fontWeight={isCurrentDay ? 'bold' : 'normal'}
                >
                  {format(day, "EEE", { locale: fr })}
                </Typography>
                <Typography
                  variant="h6"
                  color={isCurrentDay ? 'primary' : 'text.primary'}
                  fontWeight={isCurrentDay ? 'bold' : 'normal'}
                >
                  {format(day, "d", { locale: fr })}
                </Typography>
                {dayEvents.length > 0 && (
                  <Badge
                    badgeContent={dayEvents.length}
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: 20,
                      left: 20,
                      '& .MuiBadge-badge': {
                        fontSize: '0.7rem',
                        height: 18,
                        minWidth: 18
                      }
                    }}
                  />
                )}
              </Box>
            )
          })}

          {/* Lignes horaires */}
          {TIME_SLOTS.map((time) => (
            <React.Fragment key={time}>
              {/* Colonne des heures */}
              <Box sx={{
                borderTop: 1,
                borderRight: 1,
                borderColor: 'divider',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default'
              }}>
                <Typography variant="caption" color="text.secondary">
                  {time}
                </Typography>
              </Box>

              {/* Cellules pour chaque jour */}
              {getWeekDays().map((day) => {
                const isCurrentDay = isToday(day)
                const currentHour = new Date().getHours()
                const currentTimeSlot = parseInt(time.split(':')[0])
                const isCurrentHour = isCurrentDay && currentHour === currentTimeSlot

                return (
                  <Box
                    key={day.toISOString() + time}
                    sx={{
                      borderTop: 1,
                      borderRight: 1,
                      borderColor: 'divider',
                      height: '80px',
                      position: 'relative',
                      bgcolor: isCurrentDay ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.action.hover, 0.04)
                      }
                    }}
                  >
                    {isCurrentHour && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: 0,
                          right: 0,
                          height: 2,
                                                    bgcolor: 'error.main',
                          zIndex: 10,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: -4,
                            top: -3,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'error.main'
                          }
                        }}
                      />
                    )}
                  </Box>
                )
              })}
            </React.Fragment>
          ))}

          {/* Événements positionnés absolument */}
          {getWeekDays().map((day, dayIndex) => {
            const positionedEvents = getPositionedEventsForDay(day)
            
            return positionedEvents.map((event, eventIndex) => {
              const typeInfo = getEventTypeInfo(event.type)
              const showActions = canEditEvent && canEditEvent(event)
              
              const startHour = event.visualStartDate.getHours()
              const startMinute = event.visualStartDate.getMinutes()
              const endHour = event.visualEndDate.getHours()
              const endMinute = event.visualEndDate.getMinutes()
              
              const durationInMinutes = differenceInMinutes(event.visualEndDate, event.visualStartDate)
              
              const headerHeight = 90
              const slotHeight = 80
              const top = headerHeight + (startHour - 8) * slotHeight + (startMinute / 60) * slotHeight + 2
              const height = Math.max((durationInMinutes / 60) * slotHeight - 4, 30)
              const isPastEvent = isPast(event.endDate)

              // Calculer la largeur et la position en fonction des colonnes
              const columnWidth = `calc((100% - 60px) / 7 / ${event.totalColumns})`
              const leftOffset = `calc(60px + ${dayIndex} * ((100% - 60px) / 7) + ${event.column} * ((100% - 60px) / 7 / ${event.totalColumns}) + 2px)`
              
              // Opacité basée sur le nombre de colonnes (plus il y a de chevauchements, plus c'est transparent)
              const baseOpacity = event.totalColumns > 1 ? 0.85 : 1
              const stateOpacity = event.state === 'CANCELLED' ? 0.5 : 1
              const opacity = isPastEvent ? baseOpacity * 0.6 * stateOpacity : baseOpacity * stateOpacity

              // Déterminer les radius en fonction des débordements
              const borderRadius = {
                topLeft: event.startsBeforeSchedule ? '8px' : '4px',
                topRight: event.startsBeforeSchedule ? '8px' : '4px',
                bottomLeft: event.endsAfterSchedule || event.endsAfterDay ? '8px' : '4px',
                bottomRight: event.endsAfterSchedule || event.endsAfterDay ? '8px' : '4px',
              }

              return (
                <Tooltip 
                  key={`${event.id}-${dayIndex}`}
                  title={
                    <Box>
                      <Typography variant="subtitle2">{event.title}</Typography>
                      <Typography variant="caption">
                        {format(event.startDate, 'HH:mm')} - {format(event.endDate, 'HH:mm')}
                      </Typography>
                      {event.class && (
                        <Typography variant="caption" display="block">
                          Classe: {event.class}
                        </Typography>
                      )}
                      {event.state && (
                        <Typography variant="caption" display="block">
                          État: {
                            event.state === 'PENDING' ? 'À valider' :
                            event.state === 'VALIDATED' ? 'Validé' :
                            event.state === 'CANCELLED' ? 'Annulé' :
                            event.state === 'IN_PROGRESS' ? 'En préparation' :
                            event.state === 'MOVED' ? 'Déplacé' : event.state
                          }
                        </Typography>
                      )}
                      {event.startsBeforeDay && (
                        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                          Commence le {format(event.startDate, 'dd/MM')}
                        </Typography>
                      )}
                      {event.endsAfterDay && (
                        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                          Se termine le {format(event.endDate, 'dd/MM')}
                        </Typography>
                      )}
                    </Box>
                  }
                  placement="right"
                >
                <Card
                  sx={{
                    bgcolor: alpha(
                      event.state === 'CANCELLED' ? theme.palette.grey[500] : typeInfo.color, 
                      opacity
                    ),
                    color: 'white',
                    cursor: 'pointer',
                    position: 'absolute',
                    top: `${top}px`,
                    left: leftOffset,
                    width: `calc(${columnWidth} - 4px)`,
                    height: `${height}px`,
                    zIndex: 2 + event.column,
                    transition: 'all 0.2s',
                    overflow: 'hidden',
                    borderTopLeftRadius: borderRadius.topLeft,
                    borderTopRightRadius: borderRadius.topRight,
                    borderBottomLeftRadius: borderRadius.bottomLeft,
                    borderBottomRightRadius: borderRadius.bottomRight,
                    textDecoration: event.state === 'CANCELLED' ? 'line-through' : 'none',
                    '&::before': event.startsBeforeSchedule ? {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderBottom: `6px solid ${alpha(theme.palette.common.white, 0.5)}`,
                    } : {},
                    '&::after': (event.endsAfterSchedule || event.endsAfterDay) ? {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: `6px solid ${alpha(theme.palette.common.white, 0.5)}`,
                    } : {},
                    '&:hover': { 
                      transform: 'scale(1.02)',
                      boxShadow: theme.shadows[8],
                      zIndex: 10 + event.column,
                      opacity: 1,
                      '& .event-actions': {
                        opacity: 1
                      }
                    }
                  }}
                  onClick={(e) => {
                    // Empêcher le clic sur les boutons de déclencher l'ouverture du détail
                    if ((e.target as HTMLElement).closest('.MuiIconButton-root')) {
                      return
                    }
                    onEventClick(event)
                  }}
                >
                  {/* Icône d'état positionnée en plein milieu */}
                  {event.state && height > 30 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        margin: 'auto',
                        width: '50%',
                        aspectRatio: '1 / 1',
                        maxWidth: '50%',
                        maxHeight: '50%',
                        zIndex: 4,
                        bgcolor: 'rgba(87, 87, 87, 0.46)',
                        borderRadius: '50%',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 0 4px rgba(0, 0, 0, 0.2)',
                        border: `1px solid rgba(0, 0, 0, 0.2)`
                      }}
                    >
                      {getStateIcon(event.state, height > 50 ? 'medium' : 'large')}
                    </Box>
                  )}



                  <CardContent sx={{ 
                      p: 1, 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:last-child': { pb: 1 } 
                    }}>
                      <Stack spacing={0.5}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: height > 60 ? '0.75rem' : '0.7rem',
                            lineHeight: 1.2,
                            display: '-webkit-box',
                            WebkitLineClamp: event.totalColumns > 2 ? 1 : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {event.title}
                        </Typography>
                        {height > 40 && event.totalColumns <= 2 && (
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                            {format(event.visualStartDate, 'HH:mm')}
                            {event.startsBeforeSchedule && ' ↑'}
                            {event.endsAfterSchedule && ' ↓'}
                          </Typography>
                        )}
                        {height > 60 && event.class && event.totalColumns === 1 && (
                          <Chip 
                            label={event.class} 
                            size="small" 
                            sx={{ 
                              height: 16,
                              fontSize: '0.65rem',
                              bgcolor: 'rgba(255,255,255,0.2)',
                              color: 'white'
                            }}
                          />
                        )}
                      </Stack>
                    </CardContent>
                  
                  
                    {/* Boutons d'action - n'afficher que si l'utilisateur a les permissions */}
                    {showActions && (
                      <Box
                        className="event-actions"
                        sx={{
                          position: 'absolute',
                          bottom: 10,
                          right: 5,
                          gap: 0.5,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          zIndex: 5,
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {onEventEdit && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventEdit(event)
                            }}
                            sx={{
                              p: 0.5,
                              bgcolor: 'rgba(255,255,255,0.2)',
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.3)'
                              }
                            }}
                          >
                            <Edit sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        {onEventDelete && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventDelete(event)
                            }}
                            sx={{
                              p: 0.5,
                              bgcolor: 'rgba(255,255,255,0.2)',
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'rgba(255,0,0,0.3)'
                              }
                            }}
                          >
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Box>
                    )}

                  <CardContent sx={{ 
                    p: 1, 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:last-child': { pb: 1 } 
                  }}>
                    {/* Contenu existant */}
                  <Stack spacing={0.5}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: 'bold',
                        fontSize: height > 60 ? '0.75rem' : '0.7rem',
                        lineHeight: 1.2,
                        display: '-webkit-box',
                        WebkitLineClamp: event.totalColumns > 2 ? 1 : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {event.title}
                    </Typography>
                    {height > 40 && event.totalColumns <= 2 && (
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                        {format(event.visualStartDate, 'HH:mm')}
                        {event.startsBeforeSchedule && ' ↑'}
                        {event.endsAfterSchedule && ' ↓'}
                      </Typography>
                    )}
                    {height > 60 && event.class && event.totalColumns === 1 && (
                      <Chip 
                        label={event.class} 
                        size="small" 
                        sx={{ 
                          height: 16,
                          fontSize: '0.65rem',
                          bgcolor: 'rgba(255,255,255,0.2)',
                          color: 'white'
                        }}
                      />
                    )}
                  </Stack>
                  </CardContent>
                </Card>
                </Tooltip>
              )
            })
          })}
        </Box>
      </Paper>

{/* Légende améliorée avec états */}
      <Stack direction="column" spacing={2} sx={{ mt: 3 }}>
        <Stack 
          direction="row" 
          spacing={2} 
          sx={{ justifyContent: 'center' }}
          flexWrap="wrap"
        >
          {Object.entries(EVENT_TYPES).map(([key, value]) => (
            <Chip
              key={key}
              icon={<Circle sx={{ fontSize: 12 }} />}
              label={value.label}
              size="small"
              sx={{ 
                '& .MuiChip-icon': { 
                  color: value.color 
                }
              }}
            />
          ))}
        </Stack>

        {/* Légende des états */}
        <Stack 
          direction="row" 
          spacing={2} 
          sx={{ justifyContent: 'center' }}
          flexWrap="wrap"
        >
          <Chip
            icon={<HourglassEmpty sx={{ fontSize: 16 }} />}
            label="À valider"
            size="small"
            sx={{ 
              '& .MuiChip-icon': { 
                color: 'warning.main' 
              }
            }}
          />
          <Chip
            icon={<CheckCircle sx={{ fontSize: 16 }} />}
            label="Validé"
            size="small"
            sx={{ 
              '& .MuiChip-icon': { 
                color: 'success.main' 
              }
            }}
          />
          <Chip
            icon={<Cancel sx={{ fontSize: 16 }} />}
            label="Annulé"
            size="small"
            sx={{ 
              '& .MuiChip-icon': { 
                color: 'error.main' 
              }
            }}
          />
          <Chip
            icon={<SwapHoriz sx={{ fontSize: 16 }} />}
            label="Déplacé"
            size="small"
            sx={{ 
              '& .MuiChip-icon': { 
                color: 'info.main' 
              }
            }}
          />
        </Stack>
        
        {/* Indicateurs de débordement */}
        <Stack 
          direction="row" 
          spacing={2} 
          sx={{ justifyContent: 'center', mt: 1 }}
          flexWrap="wrap"
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ fontSize: '1rem' }}>↑</Box> Commence avant 8h
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ fontSize: '1rem' }}>↓</Box> Termine après 19h
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )
}

export default WeeklyView