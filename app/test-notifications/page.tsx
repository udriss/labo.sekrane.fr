import { Metadata } from 'next';
import { Container, Typography, Box, Stack } from '@mui/material';
import NotificationsList from '@/components/notifications/NotificationList';
import NotificationTester from '@/components/notifications/NotificationTester';

export const metadata: Metadata = {
  title: 'Test Notifications | Labo',
  description: 'Page de test pour le système de notifications en temps réel',
};

export default function NotificationsTestPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          🔔 Test du Système de Notifications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Cette page permet de tester le système de notifications push en temps réel avec SSE (Server-Sent Events).
        </Typography>
      </Box>

      <Stack 
        direction={{ xs: 'column', md: 'row' }} 
        spacing={3}
        sx={{ height: '80vh' }}
      >
        {/* Panneau de test */}
        <Box sx={{ flex: '0 0 350px' }}>
          <NotificationTester />
        </Box>

        {/* Liste des notifications */}
        <Box sx={{ flex: 1 }}>
          <NotificationsList 
            showStats={true}
            maxHeight="100%"
          />
        </Box>
      </Stack>
    </Container>
  );
}
