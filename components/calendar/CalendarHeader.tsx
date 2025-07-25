// components/calendar/CalendarHeader.tsx
import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { Add, EventNote } from '@mui/icons-material'
import { useMediaQuery, useTheme } from '@mui/material'
import { UserRole } from "@/types/global";

interface CalendarHeaderProps {
  userRole: UserRole
  onCreateTP: () => void
  onCreateLaborantin: () => void
}

export function CalendarHeader({ userRole, onCreateTP, onCreateLaborantin }: CalendarHeaderProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const renderActionButtons = () => {
    switch(userRole) {
      case 'TEACHER':
        return (
          <Button
            variant="contained"
            startIcon={<Add />}
            size={isMobile ? 'medium' : 'large'}
            onClick={onCreateTP}
            fullWidth={isMobile}
          >
            Nouvelle séance
          </Button>
        )
      case 'LABORANTIN':
        return (
          <Button
            variant="contained"
            startIcon={<Add />}
            size={isMobile ? 'medium' : 'large'}
            onClick={onCreateLaborantin}
            fullWidth={isMobile}
          >
            Nouvel événement
          </Button>
        )
      case 'ADMIN':
      case 'ADMINLABO':
        return (
          <Box display="flex" gap={2} flexDirection={isMobile ? "column" : "row"}>
            <Button
              variant="contained"
              startIcon={<Add />}
              size={isMobile ? 'medium' : 'large'}
              onClick={onCreateTP}
              fullWidth={isMobile}
            >
              Nouvelle séance
            </Button>
            <Button
              variant="outlined"
              startIcon={<EventNote />}
              size={isMobile ? 'medium' : 'large'}
              onClick={onCreateLaborantin}
              fullWidth={isMobile}
            >
              Nouvel événement
            </Button>
          </Box>
        )
      default:
        return null
    }
  }

  return (
    <Box 
      display="flex" 
      flexDirection={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between" 
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      gap={2}
      mb={4}
    >
      <Box>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}
        >
          Planification des TP
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          Calendrier et gestion des séances de laboratoire
        </Typography>
      </Box>
      
      {renderActionButtons()}
    </Box>
  )
}