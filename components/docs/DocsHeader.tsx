'use client';
import React from 'react';
import { Paper, Box, Stack, Typography, TextField, InputAdornment } from '@mui/material';
import { MenuBook, Search } from '@mui/icons-material';

interface DocsHeaderProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}
export const DocsHeader: React.FC<DocsHeaderProps> = ({ searchQuery, setSearchQuery }) => (
  <Paper
    elevation={0}
    sx={{
      p: 6,
      mb: 4,
      borderRadius: 3,
      background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: '50%',
        bgcolor: 'rgba(255,255,255,0.1)',
      }}
    />
    <Stack spacing={3} position="relative">
      <Box display="flex" alignItems="center" gap={2}>
        <MenuBook sx={{ fontSize: 48 }} />
        <Box>
          <Typography variant="h3" component="h1" fontWeight="bold">
            Documentation SGIL
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Guide complet d'utilisation du système de gestion de laboratoire
          </Typography>
        </Box>
      </Box>
      <TextField
        placeholder="Rechercher dans la documentation..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'white' }} />
              </InputAdornment>
            ),
            sx: {
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
            },
          },
        }}
        sx={{ maxWidth: 600 }}
      />
    </Stack>
  </Paper>
);

export default DocsHeader;
