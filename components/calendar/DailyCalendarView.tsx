// components/calendar/DailyCalendarView.tsx
import React from 'react'
import { Box, Typography, IconButton, Card, CardContent, Chip, Stack } from '@mui/material'
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material'
import { format, addDays, subDays, isSameDay, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarEvent } from '@/types/calendar'

interface DailyCalendarViewProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export default function DailyCalendarView({ 
  currentDate, 
  setCurrentDate, 
  events, 
  onEventClick 
}: DailyCalendarViewProps) {
  const dayEvents = events.filter(event => 
    isSameDay(new Date(event.startDate), currentDate)
  )

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
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              .map((event) => (
                <Card 
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  sx={{ cursor: 'pointer' }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start">
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                          {event.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(event.startDate), 'HH:mm')} - {format(new Date(event.endDate), 'HH:mm')}
                        </Typography>
                        {event.class && (
                          <Chip 
                            label={event.class} 
                            size="small" 
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                      <Chip 
                        label={event.type} 
                        size="small" 
                        color="primary"
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
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
            const hasEvents = events.some(event => 
              isSameDay(new Date(event.startDate), day)
            )
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