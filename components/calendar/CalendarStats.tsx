"use client"

import React from 'react'
import { Grid, Card, CardContent, Box, Avatar, Typography } from '@mui/material'
import { CalendarMonth, Science, Schedule, Room } from '@mui/icons-material'
import { CalendarType as EventType } from "@/types/prisma"

interface CalendarEvent {
  id: string
  title: string
  description?: string | null
  startDate: Date
  endDate: Date
  type: EventType
  class?: string | null
  room?: string | null
  notebookId?: string | null
  instructor?: string
  students?: string[]
}

interface CalendarStatsProps {
  events: CalendarEvent[]
  getTodayEvents: () => CalendarEvent[]
}

const CalendarStats: React.FC<CalendarStatsProps> = ({ events, getTodayEvents }) => {
  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <CalendarMonth />
              </Avatar>
              <Box>
                <Typography variant="h4" color="primary">
                  {getTodayEvents().length}
                </Typography>
                <Typography variant="body2">Séances aujourd'hui</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <Science />
              </Avatar>
              <Box>
                <Typography variant="h4" color="success.main">
                  {events.filter(e => e.type === 'TP').length}
                </Typography>
                <Typography variant="body2">TP programmés</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <Schedule />
              </Avatar>
              <Box>
                <Typography variant="h4" color="warning.main">
                  {events.filter(e => e.type === 'MAINTENANCE').length}
                </Typography>
                <Typography variant="body2">Maintenances</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'info.main' }}>
                <Room />
              </Avatar>
              <Box>
                <Typography variant="h4" color="info.main">
                  {Array.from(new Set(events.map(e => e.room).filter(room => room))).length}
                </Typography>
                <Typography variant="body2">Salles utilisées</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CalendarStats
