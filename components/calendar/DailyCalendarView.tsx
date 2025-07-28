// components/calendar/DailyCalendarView.tsx
import React from 'react'
import { 
  Box, Typography, IconButton, Card, CardContent, Chip, Stack 
} from '@mui/material'
import { 
  ChevronLeft, ChevronRight, Today, Edit, Delete 
} from '@mui/icons-material'
import { format, addDays, subDays, isSameDay, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarEvent } from '@/types/calendar'

interface DailyCalendarViewProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onEventEdit?: (event: CalendarEvent) => void
  onEventDelete?: (event: CalendarEvent) => void
  canEditEvent?: (event: CalendarEvent) => boolean
}

export default function DailyCalendarView({ 
  currentDate, 
  setCurrentDate, 
  events, 
  onEventClick,
  onEventEdit,
  onEventDelete,
  canEditEvent
}: DailyCalendarViewProps) {
  const dayEvents = events.filter(event => {
    // Utiliser actuelTimeSlots en priorité, sinon timeSlots actifs
    const slotsToCheck = event.actuelTimeSlots || event.timeSlots?.filter(slot => slot.status === 'active') || []
    return slotsToCheck.some(slot => 
      isSameDay(new Date(slot.startDate), currentDate)
    )
  })

  const handlePreviousDay = () => {
    setCurrentDate(subDays(currentDate, 1))
  }

  const handleNextDay = () => {
    setCurrentDate(addDays(currentDate, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <Box>
      {/* Navigation */}
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="space-between" 
        mb={3}
        sx={{ 
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
          py: 2
        }}
      >
        <IconButton onClick={handlePreviousDay}>
          <ChevronLeft />
        </IconButton>
        
        <Box textAlign="center" flex={1}>
          <Typography variant="h5" gutterBottom>
            {format(currentDate, 'EEEE d MMMM', { locale: fr })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {format(currentDate, 'yyyy', { locale: fr })}
          </Typography>
        </Box>
        
        <IconButton onClick={handleNextDay}>
          <ChevronRight />
        </IconButton>
      </Box>

      {/* Bouton retour à aujourd'hui */}
      {!isSameDay(currentDate, new Date()) && (
        <Box display="flex" justifyContent="center" mb={2}>
          <Chip
            icon={<Today />}
            label="Aujourd'hui"
            onClick={handleToday}
            color="primary"
            variant="outlined"
          />
        </Box>
      )}

      {/* Événements du jour */}
      <Box>
        {dayEvents.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary" textAlign="center">
                Aucun événement prévu ce jour
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {dayEvents
              .sort((a, b) => {
                // Utiliser actuelTimeSlots en priorité pour le tri
                const aSlots = a.actuelTimeSlots || a.timeSlots?.filter(s => s.status === 'active') || []
                const bSlots = b.actuelTimeSlots || b.timeSlots?.filter(s => s.status === 'active') || []
                const aFirstSlot = aSlots[0]
                const bFirstSlot = bSlots[0]
                if (!aFirstSlot || !bFirstSlot) return 0
                return new Date(aFirstSlot.startDate).getTime() - new Date(bFirstSlot.startDate).getTime()
              })
              .map((event) => {
                const showActions = canEditEvent && canEditEvent(event)
                
                return (
                  <Card 
                    key={event.id}
                    sx={{ 
                      cursor: 'pointer',
                      position: 'relative',
                      '&:hover': {
                        boxShadow: 3,
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
                    <CardContent>
                      {/* Boutons d'action */}
                      {showActions && (
                        <Box
                          className="event-actions"
                          sx={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            display: 'flex',
                            gap: 0.5,
                            opacity: 1,
                            transition: 'opacity 0.2s',
                            zIndex: 2
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
                                bgcolor: 'background.paper',
                                boxShadow: 1,
                                '&:hover': {
                                  bgcolor: 'primary.light'
                                }
                              }}
                            >
                              <Edit fontSize="small" />
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
                                bgcolor: 'background.paper',
                                boxShadow: 1,
                                '&:hover': {
                                  bgcolor: 'error.light'
                                }
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      )}

                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box flex={1} pr={showActions ? 10 : 0}>
                          <Typography variant="h6" gutterBottom>
                            {event.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {(() => {
                              // Utiliser actuelTimeSlots en priorité pour l'affichage
                              const displaySlots = event.actuelTimeSlots || event.timeSlots?.filter(s => s.status === 'active') || []
                              if (displaySlots.length > 0) {
                                return (
                                  <>
                                    {format(new Date(displaySlots[0].startDate), 'HH:mm')} - {format(new Date(displaySlots[0].endDate), 'HH:mm')}
                                    {displaySlots.length > 1 && ` (+${displaySlots.length - 1} autres créneaux)`}
                                  </>
                                )
                              }
                              return 'Aucun créneau défini'
                            })()}
                          </Typography>
                          {event.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {event.description}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {event.class && (
                              <Chip 
                                label={event.class} 
                                size="small"
                              />
                            )}
                            {event.location && (
                              <Chip 
                                label={event.location} 
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Box>
                        <Chip 
                          label={event.type} 
                          size="small" 
                          color={event.type === 'TP' ? 'primary' : 'secondary'}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                )
              })}
          </Stack>
        )}
      </Box>

      {/* Vue mini-calendrier en bas */}
      <Box mt={4}>
        <Typography variant="subtitle2" gutterBottom>
          Vue de la semaine
        </Typography>
        <Box display="flex" gap={1} justifyContent="space-between">
          {[...Array(7)].map((_, index) => {
            const day = addDays(startOfDay(subDays(currentDate, currentDate.getDay())), index)
            const hasEvents = events.some(event => {
              // Utiliser actuelTimeSlots en priorité pour détecter les événements
              const slotsToCheck = event.actuelTimeSlots || event.timeSlots?.filter(s => s.status === 'active') || []
              return slotsToCheck.some(slot => 
                isSameDay(new Date(slot.startDate), day)
              )
            })
            const isToday = isSameDay(day, new Date())
            const isSelected = isSameDay(day, currentDate)

            return (
              <Box
                key={index}
                onClick={() => setCurrentDate(day)}
                sx={{
                  flex: 1,
                  textAlign: 'center',
                  py: 1,
                  px: 0.5,
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: isSelected ? 'primary.main' : isToday ? 'primary.light' : 'transparent',
                  color: isSelected ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    bgcolor: isSelected ? 'primary.dark' : 'action.hover'
                  }
                }}
              >
                <Typography variant="caption" display="block">
                  {format(day, 'EEE', { locale: fr })}
                </Typography>
                <Typography variant="body2" fontWeight={isToday ? 'bold' : 'normal'}>
                  {format(day, 'd')}
                </Typography>
                {hasEvents && (
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: isSelected ? 'primary.contrastText' : 'primary.main',
                      mx: 'auto',
                      mt: 0.5
                    }}
                  />
                )}
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}