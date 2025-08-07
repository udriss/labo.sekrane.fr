// components/rooms/RoomWeeklyView.tsx
// Vue hebdomadaire des salles basée sur WeeklyView.tsx

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
  Circle, Room as RoomIcon, LocationOn,
  Person, Class
} from '@mui/icons-material'
import type { Room, RoomOccupancy } from '@/types/rooms'

interface RoomWeeklyViewProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  roomOccupancies: RoomOccupancy[]
  onEventClick?: (event: any) => void
  selectedRoom?: Room | null
}

const DISCIPLINE_TYPES = {
  chimie: { label: "Chimie", color: "#1976d2", icon: <Science /> },
  physique: { label: "Physique", color: "#f57c00", icon: <Schedule /> },
}

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
]

// Type pour un créneau avec ses informations de positionnement
interface PositionedTimeSlot {
  id: string
  eventId: string
  eventTitle: string
  eventType: 'chemistry' | 'physics'
  room: Room
  startDate: string
  endDate: string
  column: number
  totalColumns: number
  visualStartDate: Date
  visualEndDate: Date
  startsBeforeDay: boolean
  endsAfterDay: boolean
  startsBeforeSchedule: boolean
  endsAfterSchedule: boolean
}

const RoomWeeklyView: React.FC<RoomWeeklyViewProps> = ({
  currentDate,
  setCurrentDate,
  roomOccupancies,
  onEventClick,
  selectedRoom
}) => {
  const theme = useTheme()

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  // Fonction pour détecter les chevauchements entre créneaux
  const doTimeSlotsOverlap = (slot1: any, slot2: any) => {
    const start1 = new Date(slot1.startDate)
    const end1 = new Date(slot1.endDate)
    const start2 = new Date(slot2.startDate)
    const end2 = new Date(slot2.endDate)
    
    return start1 < end2 && start2 < end1
  }

  // Fonction pour obtenir les créneaux positionnés d'un jour
  const getPositionedTimeSlotsForDay = (date: Date): PositionedTimeSlot[] => {
    const dayStart = setHours(setMinutes(startOfDay(date), 0), 8) // 8h00
    const dayEnd = setHours(setMinutes(startOfDay(date), 0), 19) // 19h00

    // Récupérer tous les créneaux de toutes les salles pour ce jour
    const allTimeSlots: any[] = []
    
    const filteredOccupancies = selectedRoom 
      ? roomOccupancies.filter(occ => occ.room.id === selectedRoom.id)
      : roomOccupancies

    filteredOccupancies.forEach(occupancy => {
      occupancy.timeSlots.forEach(timeSlot => {
        const slotStart = new Date(timeSlot.startDate)
        const slotEnd = new Date(timeSlot.endDate)
        
        // Vérifier si ce créneau touche le jour en cours
        if (slotStart < endOfDay(date) && slotEnd > startOfDay(date)) {
          allTimeSlots.push({
            ...timeSlot,
            room: occupancy.room
          })
        }
      })
    })

    // Trier par heure de début
    allTimeSlots.sort((a, b) => {
      const startA = new Date(a.startDate)
      const startB = new Date(b.startDate)
      return startA.getTime() - startB.getTime()
    })

    // Calculer les colonnes pour éviter les chevauchements
    const positionedSlots: PositionedTimeSlot[] = []
    const columns: PositionedTimeSlot[][] = []

    allTimeSlots.forEach(timeSlot => {
      const slotStart = new Date(timeSlot.startDate)
      const slotEnd = new Date(timeSlot.endDate)

      // Déterminer les dates visuelles (clippées aux heures de la journée)
      const visualStartDate = slotStart < dayStart ? dayStart : slotStart
      const visualEndDate = slotEnd > dayEnd ? dayEnd : slotEnd

      // Déterminer si le créneau déborde
      const startsBeforeDay = slotStart < startOfDay(date)
      const endsAfterDay = slotEnd > endOfDay(date)
      const startsBeforeSchedule = slotStart < dayStart && isSameDay(slotStart, date)
      const endsAfterSchedule = slotEnd > dayEnd && isSameDay(slotEnd, date)

      // Trouver la première colonne disponible
      let columnIndex = 0
      for (let i = 0; i < columns.length; i++) {
        const columnSlots = columns[i]
        const hasOverlap = columnSlots.some(colSlot => {
          // Comparer les dates visuelles pour le chevauchement
          const colStart = colSlot.visualStartDate
          const colEnd = colSlot.visualEndDate
          return visualStartDate < colEnd && colStart < visualEndDate
        })
        if (!hasOverlap) {
          columnIndex = i
          break
        }
        if (i === columns.length - 1) {
          columnIndex = columns.length
        }
      }

      // Ajouter le créneau à la colonne
      if (!columns[columnIndex]) {
        columns[columnIndex] = []
      }
      
      const positioned: PositionedTimeSlot = {
        id: timeSlot.id,
        eventId: timeSlot.eventId,
        eventTitle: timeSlot.eventTitle,
        eventType: timeSlot.eventType,
        room: timeSlot.room,
        startDate: timeSlot.startDate,
        endDate: timeSlot.endDate,
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
      positionedSlots.push(positioned)
    })

    // Mettre à jour le nombre total de colonnes pour chaque créneau
    positionedSlots.forEach(slot => {
      // Trouver tous les créneaux qui chevauchent avec celui-ci
      const overlappingSlots = positionedSlots.filter(other => {
        return slot.visualStartDate < other.visualEndDate && other.visualStartDate < slot.visualEndDate
      })
      const maxColumn = Math.max(...overlappingSlots.map(s => s.column))
      slot.totalColumns = maxColumn + 1
    })

    return positionedSlots
  }

  const getDisciplineTypeInfo = (type: 'chemistry' | 'physics') => {
    const discipline = type === 'chemistry' ? 'chimie' : 'physique'
    return DISCIPLINE_TYPES[discipline] || DISCIPLINE_TYPES.chimie
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

  return (
    <Box>
      {/* Navigation */}
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
            <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RoomIcon />
              Planning des Salles - {format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMMM", { locale: fr })} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: fr })}
            </Typography>
            {selectedRoom && (
              <Typography variant="body2" color="text.secondary">
                {selectedRoom.name} {selectedRoom.capacity && `(${selectedRoom.capacity} places)`}
              </Typography>
            )}
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

      {/* Grille hebdomadaire */}
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
            const daySlots = getPositionedTimeSlotsForDay(day)

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
                {daySlots.length > 0 && (
                  <Badge
                    badgeContent={daySlots.length}
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
                alignItems: 'flex-start',
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

          {/* Créneaux positionnés absolument */}
          {getWeekDays().map((day, dayIndex) => {
            const positionedSlots = getPositionedTimeSlotsForDay(day)
            
            return positionedSlots.map((slot, index) => {
              const typeInfo = getDisciplineTypeInfo(slot.eventType)
              
              const startHour = slot.visualStartDate.getHours()
              const startMinute = slot.visualStartDate.getMinutes()
              const endHour = slot.visualEndDate.getHours()
              const endMinute = slot.visualEndDate.getMinutes()
              
              const durationInMinutes = differenceInMinutes(slot.visualEndDate, slot.visualStartDate)
              
              const headerHeight = 90
              const slotHeight = 80
              const top = headerHeight + (startHour - 8) * slotHeight + (startMinute / 60) * slotHeight + 2
              const height = Math.max((durationInMinutes / 60) * slotHeight - 4, 30)
              const isPastSlot = isPast(slot.visualEndDate)

              // Calculer la largeur et la position en fonction des colonnes
              const columnWidth = `calc((100% - 60px) / 7 / ${slot.totalColumns})`
              const leftOffset = `calc(60px + ${dayIndex} * ((100% - 60px) / 7) + ${slot.column} * ((100% - 60px) / 7 / ${slot.totalColumns}) + 2px)`
              
              // Opacité basée sur le nombre de colonnes
              const baseOpacity = slot.totalColumns > 1 ? 0.85 : 1
              const opacity = isPastSlot ? baseOpacity * 0.6 : baseOpacity

              // Déterminer les radius en fonction des débordements
              const borderRadius = {
                topLeft: slot.startsBeforeSchedule ? '8px' : '4px',
                topRight: slot.startsBeforeSchedule ? '8px' : '4px',
                bottomLeft: slot.endsAfterSchedule || slot.endsAfterDay ? '8px' : '4px',
                bottomRight: slot.endsAfterSchedule || slot.endsAfterDay ? '8px' : '4px',
              }

              return (
                <Tooltip 
                  key={`${slot.id}-${index}`}
                  title={
                    <Box>
                      <Typography variant="subtitle2">{slot.eventTitle}</Typography>
                      <Typography variant="caption">
                        {format(slot.visualStartDate, 'HH:mm')} - {format(slot.visualEndDate, 'HH:mm')}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Salle: {slot.room.name}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Type: {typeInfo.label}
                      </Typography>
                      {slot.startsBeforeDay && (
                        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                          Commence le {format(slot.visualStartDate, 'dd/MM à HH:mm')}
                        </Typography>
                      )}
                      {slot.endsAfterDay && (
                        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                          Se termine le {format(slot.visualEndDate, 'dd/MM à HH:mm')}
                        </Typography>
                      )}
                    </Box>
                  }
                  placement="right"
                >
                  <Card
                    sx={{
                      bgcolor: alpha(typeInfo.color, opacity),
                      color: 'white',
                      cursor: 'pointer',
                      position: 'absolute',
                      top: `${top}px`,
                      left: leftOffset,
                      width: `calc(${columnWidth} - 4px)`,
                      height: `${height}px`,
                      zIndex: 2 + slot.column,
                      transition: 'all 0.2s',
                      overflow: 'hidden',
                      borderTopLeftRadius: borderRadius.topLeft,
                      borderTopRightRadius: borderRadius.topRight,
                      borderBottomLeftRadius: borderRadius.bottomLeft,
                      borderBottomRightRadius: borderRadius.bottomRight,
                      '&::before': slot.startsBeforeSchedule ? {
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
                      '&::after': (slot.endsAfterSchedule || slot.endsAfterDay) ? {
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
                        zIndex: 10 + slot.column,
                        opacity: 1
                      }
                    }}
                    onClick={() => onEventClick && onEventClick({
                      eventId: slot.eventId,
                      title: slot.eventTitle,
                      room: slot.room,
                      startDate: slot.startDate,
                      endDate: slot.endDate,
                      type: slot.eventType
                    })}
                  >
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
                            WebkitLineClamp: slot.totalColumns > 2 ? 1 : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {slot.eventTitle}
                        </Typography>
                        {height > 40 && slot.totalColumns <= 2 && (
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                            {format(slot.visualStartDate, 'HH:mm')}
                            {slot.startsBeforeSchedule && ' ↑'}
                            {slot.endsAfterSchedule && ' ↓'}
                          </Typography>
                        )}
                        {height > 60 && slot.totalColumns === 1 && (
                          <Chip 
                            label={slot.room.name} 
                            size="small" 
                            icon={<RoomIcon />}
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

      {/* Légende */}
      <Stack direction="column" spacing={2} sx={{ mt: 3 }}>
        <Stack 
          direction="row" 
          spacing={2} 
          sx={{ justifyContent: 'center' }}
          flexWrap="wrap"
        >
          {Object.entries(DISCIPLINE_TYPES).map(([key, value], index) => (
            <Chip
              key={key+'_'+index}
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

export default RoomWeeklyView
