// components/calendar/ImprovedDailyPlanning.tsx
// Version améliorée du planning quotidien avec système simplifié

"use client"

import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Stack, TextField, InputAdornment, Chip, useTheme, useMediaQuery
} from '@mui/material'
import { Search, Event } from '@mui/icons-material'
import { CalendarEvent } from '@/types/calendar'
import { getDisplayTimeSlots } from '@/lib/calendar-migration-utils'
import ImprovedEventBlock from './ImprovedEventBlock'
import { isSameDay } from 'date-fns'

interface ImprovedDailyPlanningProps {
  events: CalendarEvent[]
  selectedDate?: Date
  canOperate: boolean
  onEventUpdate?: (updatedEvent: CalendarEvent) => void
  discipline?: 'chimie' | 'physique'
  onEdit?: (event: CalendarEvent) => void
  onEventCopy?: (event: CalendarEvent) => void
  onEventDelete?: (event: CalendarEvent) => void
}

const ImprovedDailyPlanning: React.FC<ImprovedDailyPlanningProps> = ({
  events,
  selectedDate = new Date(),
  canOperate,
  onEventUpdate,
  discipline = 'chimie',
  onEdit,
  onEventCopy,
  onEventDelete
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    // Filtrer les événements pour la date sélectionnée
    const dayEvents = events.filter(event => {
      const displaySlots = getDisplayTimeSlots(event)
      return displaySlots.some(slot => {
        const slotDate = new Date(slot.startDate)
        return isSameDay(slotDate, selectedDate)
      })
    })
    
    // Appliquer le filtre de recherche
    let filtered = dayEvents
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = dayEvents.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.class?.toLowerCase().includes(query) ||
        event.room?.toLowerCase().includes(query) ||
        event.createdBy?.toLowerCase().includes(query)
      )
    }
    
    // Trier par heure de début du premier créneau
    const sortedEvents = filtered.sort((a, b) => {
      const getFirstSlotTime = (event: CalendarEvent) => {
        const daySlots = getDisplayTimeSlots(event).filter(slot => {
          const slotDate = new Date(slot.startDate)
          return isSameDay(slotDate, selectedDate)
        })
        
        if (daySlots.length === 0) return new Date().getTime()
        return Math.min(...daySlots.map(slot => new Date(slot.startDate).getTime()))
      }
      
      return getFirstSlotTime(a) - getFirstSlotTime(b)
    })
    
    setFilteredEvents(sortedEvents)
  }, [events, selectedDate, searchQuery])

  const getStatsByState = () => {
    const stats = {
      PENDING: 0,
      VALIDATED: 0,
      CANCELLED: 0,
      MOVED: 0,
      IN_PROGRESS: 0
    }
    
    filteredEvents.forEach(event => {
      const state = event.state || 'PENDING'
      if (state in stats) {
        stats[state as keyof typeof stats]++
      }
    })
    
    return stats
  }

  const stats = getStatsByState()
  const needsActionCount = stats.PENDING + stats.MOVED

  console.log('events by IMPROVE', events)
  
  return (
    <Box sx={{ p: 2 }}>
      {/* En-tête avec date et statistiques */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems={isMobile ? 'flex-start' : 'center'}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" gutterBottom>
              Planning du {selectedDate.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip 
                label={`${filteredEvents.length} événement${filteredEvents.length > 1 ? 's' : ''}`}
                color="primary"
                variant="outlined"
                size="small"
              />
              {needsActionCount > 0 && (
                <Chip 
                  label={`${needsActionCount} nécessite${needsActionCount > 1 ? 'nt' : ''} une action`}
                  color="warning"
                  size="small"
                />
              )}
              {stats.VALIDATED > 0 && (
                <Chip 
                  label={`${stats.VALIDATED} validé${stats.VALIDATED > 1 ? 's' : ''}`}
                  color="success"
                  size="small"
                />
              )}
              {stats.CANCELLED > 0 && (
                <Chip 
                  label={`${stats.CANCELLED} annulé${stats.CANCELLED > 1 ? 's' : ''}`}
                  color="error"
                  size="small"
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Barre de recherche */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher par titre, description, classe, salle ou professeur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          size="small"
        />
      </Box>

      {/* Liste des événements */}
      {filteredEvents.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          color: 'text.secondary'
        }}>
          <Event sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" gutterBottom>
            {searchQuery.trim() ? 'Aucun événement trouvé' : 'Aucun événement prévu'}
          </Typography>
          <Typography variant="body2">
            {searchQuery.trim() 
              ? 'Essayez de modifier votre recherche' 
              : `pour le ${selectedDate.toLocaleDateString('fr-FR')}`
            }
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {filteredEvents.map((event) => (
            <ImprovedEventBlock
              key={event.id}
              event={event}
              canOperate={canOperate}
              isMobile={isMobile}
              onEventUpdate={onEventUpdate}
              discipline={discipline}
              onEdit={onEdit}
              onEventCopy={onEventCopy}
              onEventDelete={onEventDelete}
            />
          ))}
        </Stack>
      )}
    </Box>
  )
}

export default ImprovedDailyPlanning
