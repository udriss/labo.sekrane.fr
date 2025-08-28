'use client';

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

interface Event {
  id: number;
  title: string;
  discipline: string;
  ownerId: number;
  owner: { id: number; name: string; email: string };
  timeslots: any[];
  classes?: Array<{ classe: { id: number; name: string } }>;
  salles?: Array<{ salle: { id: number; name: string } }>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface EventCardProps {
  event: Event;
  onClick: (event: Event) => void;
  groupTimeslotsLabel?: (slots: any[]) => string;
  discipline?: string;
  showDiscipline?: boolean;
}

export default function EventCard({
  event,
  onClick,
  groupTimeslotsLabel,
  discipline,
  showDiscipline = false,
}: EventCardProps) {
  const theme = useTheme();

  return (
    <Box
      key={event.id}
      onClick={() => onClick(event)}
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px ${theme.palette.primary.main}22`,
          borderColor: 'primary.main',
        },
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {showDiscipline && `[${event.discipline.toUpperCase()}] `}
        {event.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {discipline === 'today' ? 'Propriétaire' : 'Créateur'}: {event.owner.name}
      </Typography>
    </Box>
  );
}
