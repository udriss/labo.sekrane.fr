// component/calendar/WeeklyView.tsx

"use client"

import React from 'react'
import { 
  Box, Stack, IconButton, Chip, Typography, Card, CardContent, 
  Tooltip, Paper, useTheme, alpha, Badge
} from '@mui/material'
import { 
  format, startOfWeek, endOfWeek, eachDayOfInterval, 
  isSameDay, isToday, addDays, subDays, differenceInMinutes,
  isPast, isFuture
} from "date-fns"
import { fr } from "date-fns/locale"
import { 
  ChevronLeft, ChevronRight, Today, 
  Science, Schedule, Assignment, EventAvailable,
  Circle
} from '@mui/icons-material'
import { CalendarEvent, EventType } from '@/types/calendar'

interface WeeklyViewProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
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

const WeeklyView: React.FC<WeeklyViewProps> = ({
  currentDate,
  setCurrentDate,
  events,
  onEventClick
}) => {
  const theme = useTheme()
  
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = typeof event.startDate === 'string' 
        ? new Date(event.startDate) 
        : event.startDate
      return isSameDay(eventDate, date)
    })
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

  return (
    <Box>
      {/* Navigation améliorée */}
      {/* Titre */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          p: 2, 
          bgcolor: 'background.default',
          borderRadius: 2
        }}
      >
        <Stack 
          direction="row" 
          spacing={2} 
          alignItems="center" 
          justifyContent="space-between"
        >
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
            const dayEvents = getEventsForDay(day)
            
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
                      top: 8, 
                      right: 8,
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
            const dayEvents = getEventsForDay(day)
            return dayEvents.map(event => {
              const typeInfo = getEventTypeInfo(event.type)
              
              const startDate = typeof event.startDate === 'string' 
                ? new Date(event.startDate) 
                : event.startDate
              const endDate = typeof event.endDate === 'string' 
                ? new Date(event.endDate) 
                : event.endDate
              
              const startHour = startDate.getHours()
              const startMinute = startDate.getMinutes()
              const durationInMinutes = differenceInMinutes(endDate, startDate)
              
              const headerHeight = 90
              const slotHeight = 80
              const top = headerHeight + (startHour - 8) * slotHeight + (startMinute / 60) * slotHeight + 2
              const height = Math.max((durationInMinutes / 60) * slotHeight - 4, 30)
              const isPastEvent = isPast(endDate)

              return (
                <Tooltip 
                  key={event.id}
                  title={
                    <Box>
                      <Typography variant="subtitle2">{event.title}</Typography>
                      <Typography variant="caption">
                        {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                      </Typography>
                      {event.class && (
                        <Typography variant="caption" display="block">
                          Classe: {event.class}
                        </Typography>
                      )}
                    </Box>
                  }
                  placement="right"
                >
                  <Card
                    sx={{
                      bgcolor: isPastEvent ? alpha(typeInfo.color, 0.5) : typeInfo.color,
                      color: 'white',
                      cursor: 'pointer',
                      position: 'absolute',
                      top: `${top}px`,
                      left: `calc(60px + ${dayIndex * (100 - 60) / 7}% + 2px)`,
                      width: `calc(${(100 - 60) / 7}% - 4px)`,
                      height: `${height}px`,
                      zIndex: 2,
                      transition: 'all 0.2s',
                      overflow: 'hidden',
                      '&:hover': { 
                        transform: 'scale(1.02)',
                        boxShadow: theme.shadows[8],
                        zIndex: 3
                      }
                    }}
                    onClick={() => onEventClick(event)}
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
                            lineHeight: 1.2
                          }}
                        >
                          {event.title}
                        </Typography>
                        {height > 40 && (
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                            {format(startDate, 'HH:mm')}
                          </Typography>
                        )}
                        {height > 60 && event.class && (
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

      {/* Légende */}
      <Stack 
        direction="row" 
        spacing={2} 
        sx={{ mt: 2, justifyContent: 'center' }}
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
    </Box>
  )
}

export default WeeklyView