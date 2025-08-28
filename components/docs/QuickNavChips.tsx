'use client';
import React from 'react';
import { Paper, Stack, Chip } from '@mui/material';
import { Speed, Science, Groups, Lightbulb, Support } from '@mui/icons-material';

interface QuickNavChipsProps {
  value: number;
  onChange: (val: number) => void;
}
export const QuickNavChips: React.FC<QuickNavChipsProps> = ({ value, onChange }) => (
  <Paper elevation={1} sx={{ p: 2, mb: 4, borderRadius: 2 }}>
    <Stack direction="row" spacing={2} flexWrap="wrap">
      <Chip
        icon={<Speed />}
        label="Démarrage rapide"
        onClick={() => onChange(0)}
        color={value === 0 ? 'primary' : 'default'}
      />
      <Chip
        icon={<Science />}
        label="Modules"
        onClick={() => onChange(1)}
        color={value === 1 ? 'primary' : 'default'}
      />
      <Chip
        icon={<Groups />}
        label="Rôles & Permissions"
        onClick={() => onChange(2)}
        color={value === 2 ? 'primary' : 'default'}
      />
      <Chip
        icon={<Lightbulb />}
        label="Bonnes pratiques"
        onClick={() => onChange(3)}
        color={value === 3 ? 'primary' : 'default'}
      />
      <Chip
        icon={<Support />}
        label="FAQ & Support"
        onClick={() => onChange(4)}
        color={value === 4 ? 'primary' : 'default'}
      />
    </Stack>
  </Paper>
);

export default QuickNavChips;
