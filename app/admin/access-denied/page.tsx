'use client';
import { Box, Container, Typography, Button } from '@mui/material';
import Link from 'next/link';

export default function AdminAccessDeniedPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box textAlign="center">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Accès refusé
        </Typography>
        <Typography variant="body1" color="text.secondary" component="div">
          Cette section est réservée aux administrateurs.
        </Typography>
        <Button component={Link} href="/" variant="contained" color="primary">
          Retour à l'accueil
        </Button>
      </Box>
    </Container>
  );
}
