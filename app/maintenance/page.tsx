'use client';

import React from 'react';
import { Box, Container, Paper, Typography, Button } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';

export default function MaintenancePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.grey[900]} 0%, ${theme.palette.grey[800]} 100%)`,
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={16} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <BuildIcon color="warning" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Maintenance en cours
          </Typography>
          <Typography variant="body1" color="text.secondary" component="div">
            Le site est temporairement indisponible pendant des travaux de maintenance. Merci de
            revenir plus tard.
          </Typography>
          <Button
            variant="contained"
            onClick={() => (window.location.href = '/signin')}
            sx={{
              my: 2,
            }}
          >
            Se connecter
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
