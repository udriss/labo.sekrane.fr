// components/calendar/FloatingActionButtons.tsx
import React, { useState } from 'react'
import { Fab, SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material'
import { Add, Class, EventNote } from '@mui/icons-material'

interface FloatingActionButtonsProps {
  userRole: 'TEACHER' | 'LABORANTIN' | 'ADMIN' | 'ADMINLABO'
  onCreateTP: () => void
  onCreateLaborantin: () => void
}

export function FloatingActionButtons({ userRole, onCreateTP, onCreateLaborantin }: FloatingActionButtonsProps) {
  const [speedDialOpen, setSpeedDialOpen] = useState(false)

  if (userRole === 'ADMIN' || userRole === 'ADMINLABO') {
    return (
      <SpeedDial
        ariaLabel="Actions rapides"
        sx={{ 
          position: 'fixed', 
          bottom: { xs: 72, sm: 16 },
          right: 16 
        }}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onOpen={() => setSpeedDialOpen(true)}
        onClose={() => setSpeedDialOpen(false)}
      >
        <SpeedDialAction
          icon={<Class />}
          onClick={() => {
            setSpeedDialOpen(false)
            onCreateTP()
          }}
          slotProps={{ 
            tooltip: { 
              open: speedDialOpen, 
              title: "Nouvelle séance",
              slotProps: {
                tooltip: {
                  sx: {
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    maxWidth: 'none',
                    width: 'auto'
                  }
                }
              }
            } 
          }}
        />
        <SpeedDialAction
          icon={<EventNote />}
          onClick={() => {
            setSpeedDialOpen(false)
            onCreateLaborantin()
          }}
          slotProps={{ 
            tooltip: { 
              open: speedDialOpen, 
              title: "Nouvel événement",
              slotProps: {
                tooltip: {
                  sx: {
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    maxWidth: 'none',
                    width: 'auto'
                  }
                }
              }
            } 
          }}
        />
      </SpeedDial>
    )
  }

  return (
    <Fab
      color="primary"
      aria-label="add"
      sx={{ 
        position: 'fixed', 
        bottom: { xs: 72, sm: 16 },
        right: 16 
      }}
      onClick={
        userRole === 'LABORANTIN' ? onCreateLaborantin : 
        userRole === 'TEACHER' ? onCreateTP : 
        onCreateTP
      }
    >
      <Add />
    </Fab>
  )
}