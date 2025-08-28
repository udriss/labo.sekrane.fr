'use client';

import React from 'react';
import { Box, useTheme, alpha } from '@mui/material';

interface SignInLayoutProps {
  children: React.ReactNode;
}

export default function SignInLayout({ children }: SignInLayoutProps) {
  const theme = useTheme();

  return (
    <Box
    >
      {children}
    </Box>
  );
}
