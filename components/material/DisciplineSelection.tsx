'use client';
import React from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import {
  Science as ScienceIcon,
  Psychology as PsychologyIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';

export function DisciplineSelection({ onSelect }: { onSelect: (discipline: string) => void }) {
  return (
    <Box
      sx={{
        // minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        width: 'auto',
        p: 4,
        margin: '0 auto',
      }}
    >
      <Box sx={{ maxWidth: '896px', width: '100%' }}>
        <Typography variant="h3" align="center" gutterBottom>
          Gestion du matériel
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 8 }}>
          Choisissez la discipline pour gérer le matériel
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out',
                height: '256px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
              onClick={() => onSelect('chimie')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <ScienceIcon sx={{ fontSize: 80, mb: 2 }} />
                <Typography variant="h4" gutterBottom>
                  Chimie
                </Typography>
                <Typography variant="body1">
                  Gérer la verrerie, instruments de mesure, réactifs et équipements de chimie
                </Typography>
                <ArrowForwardIcon sx={{ mt: 2, fontSize: 32 }} />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out',
                height: '256px',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
              onClick={() => onSelect('physique')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <PsychologyIcon sx={{ fontSize: 80, mb: 2 }} />
                <Typography variant="h4" gutterBottom>
                  Physique
                </Typography>
                <Typography variant="body1">
                  Gérer les oscilloscopes, générateurs, optique et équipements de physique
                </Typography>
                <ArrowForwardIcon sx={{ mt: 2, fontSize: 32 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default DisciplineSelection;
