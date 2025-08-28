'use client';

import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';

type Discipline = 'chimie' | 'physique';

export default function DisciplineToggle({
  value,
  onChange,
  fullWidth = true,
}: {
  value: Discipline;
  onChange: (v: Discipline) => void;
  fullWidth?: boolean;
}) {
  const handleChange = (_event: React.MouseEvent<HTMLElement>, next: Discipline | null) => {
    if (next) onChange(next);
  };

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      <ToggleButtonGroup
        exclusive
        value={value}
        onChange={handleChange}
        sx={{
          display: 'flex',
          width: '100%',
          borderRadius: 9999,
          p: 0.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <ToggleButton
          value="chimie"
          sx={{
            flex: 1,
            borderRadius: 9999,
            textTransform: 'none',
            py: 1.25,
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
            },
          }}
        >
          <BiotechIcon sx={{ mr: 1 }} />
          <Typography fontWeight={600}>Chimie</Typography>
        </ToggleButton>
        <ToggleButton
          value="physique"
          sx={{
            flex: 1,
            borderRadius: 9999,
            textTransform: 'none',
            py: 1.25,
            '&.Mui-selected': {
              bgcolor: 'secondary.main',
              color: 'secondary.contrastText',
              '&:hover': { bgcolor: 'secondary.dark' },
            },
          }}
        >
          <ScienceIcon sx={{ mr: 1 }} />
          <Typography fontWeight={600}>Physique</Typography>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
