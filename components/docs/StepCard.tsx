'use client';
import React from 'react';
import { Box, Avatar, Typography } from '@mui/material';

export const StepCard: React.FC<{
  number: number | string;
  title: string;
  description: string;
}> = ({ number, title, description }) => (
  <Box display="flex" gap={2} alignItems="flex-start">
    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>{number}</Avatar>
    <Box flex={1}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  </Box>
);

export default StepCard;
