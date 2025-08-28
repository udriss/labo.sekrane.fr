'use client';

import React from 'react';
import { Box, Typography, Button, useTheme, useMediaQuery } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import DisciplineToggle from '@/components/shared/DisciplineToggle';

interface ActionHeaderProps {
  disciplineFilter: 'chimie' | 'physique';
  onDisciplineChange: (discipline: 'chimie' | 'physique') => void;
  onCreateTP: () => void;
  onCreateLaborantin?: () => void;
  canValidateEvent: boolean;
}

export default function ActionHeader({
  disciplineFilter,
  onDisciplineChange,
  onCreateTP,
  onCreateLaborantin,
  canValidateEvent,
}: ActionHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        mb: 4,
        bgcolor: 'background.paper',
        borderRadius: 4,
        p: 3,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Box sx={{ mb: 3 }}>
        <DisciplineToggle value={disciplineFilter} onChange={onDisciplineChange} />
      </Box>

      <Box display="flex" gap={2} mt={3} flexDirection={isMobile ? 'column' : 'row'}>
        <Button
          variant="outlined"
          color="success"
          startIcon={<AddIcon />}
          onClick={onCreateTP}
          fullWidth
          sx={{ borderRadius: 3, px: 3, py: 1.5 }}
        >
          Nouveau TP
        </Button>
        {canValidateEvent && onCreateLaborantin && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onCreateLaborantin}
            fullWidth
            color="primary"
            sx={{ borderRadius: 3, px: 3, py: 1.5, textTransform: 'none' }}
          >
            Événement Laborantin
          </Button>
        )}
      </Box>
    </Box>
  );
}
