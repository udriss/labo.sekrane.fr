// components/notifications/NotificationTester.tsx

'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Stack,
  Chip
} from '@mui/material';
import {
  NotificationImportant,
  Science,
  Event,
  Build
} from '@mui/icons-material';
import { NotificationService } from '@/lib/services/notification-service';
import { useSession } from 'next-auth/react';

const NotificationTester: React.FC = () => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleTestNotification = async (testType: string) => {
    if (!session?.user) {
      showMessage('Vous devez être connecté', 'error');
      return;
    }

    setLoading(testType);

    try {
      let success = false;
      const userId = (session.user as any).id;

      switch (testType) {
        case 'test':
          success = await NotificationService.createTestNotification(userId);
          break;
        
        case 'equipment':
          success = await NotificationService.notifyEquipmentAction(
            'created',
            'Microscope XYZ-123',
            userId
          );
          break;
        
        case 'calendar':
          success = await NotificationService.notifyCalendarAction(
            'created',
            'Réservation Salle TP1 - 14h-16h',
            userId
          );
          break;
        
        case 'chemical':
          success = await NotificationService.notifyChemicalAction(
            'low_stock',
            'Acide chlorhydrique HCl',
            userId
          );
          break;

        case 'direct-sse':
          // Test direct du système SSE
          const directResponse = await fetch('/api/notifications/ws', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'test'
            })
          });
          
          if (directResponse.ok) {
            const directData = await directResponse.json();
            success = directData.success;
            if (success) {
              showMessage(`Test SSE direct réussi ! Envoyé à ${directData.sentToConnections} connexions`, 'success');
              return;
            }
          }
          break;
        
        default:
          showMessage('Type de test inconnu', 'error');
          return;
      }

      if (success) {
        showMessage('Notification envoyée avec succès !', 'success');
      } else {
        showMessage('Erreur lors de l\'envoi de la notification', 'error');
      }

    } catch (error) {
      console.error('Erreur test notification:', error);
      showMessage('Erreur lors du test', 'error');
    } finally {
      setLoading(null);
    }
  };

  if (!session?.user) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="warning">
          Vous devez être connecté pour tester les notifications
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        🧪 Testeur de Notifications Push SSE
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Utilisez ces boutons pour tester le système de notifications en temps réel.
        Les notifications apparaîtront automatiquement dans la liste sans rafraîchissement.
      </Typography>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Stack spacing={2}>
        <Button
          variant="outlined"
          startIcon={<NotificationImportant />}
          onClick={() => handleTestNotification('direct-sse')}
          disabled={loading === 'direct-sse'}
          fullWidth
          color="error"
        >
          {loading === 'direct-sse' ? 'Test...' : '🚀 Test SSE Direct (Push immédiat)'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<NotificationImportant />}
          onClick={() => handleTestNotification('test')}
          disabled={loading === 'test'}
          fullWidth
        >
          {loading === 'test' ? 'Envoi...' : 'Test Notification Système'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<Build />}
          onClick={() => handleTestNotification('equipment')}
          disabled={loading === 'equipment'}
          fullWidth
          color="primary"
        >
          {loading === 'equipment' ? 'Envoi...' : 'Test Notification Équipement'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<Event />}
          onClick={() => handleTestNotification('calendar')}
          disabled={loading === 'calendar'}
          fullWidth
          color="secondary"
        >
          {loading === 'calendar' ? 'Envoi...' : 'Test Notification Calendrier'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<Science />}
          onClick={() => handleTestNotification('chemical')}
          disabled={loading === 'chemical'}
          fullWidth
          color="warning"
        >
          {loading === 'chemical' ? 'Envoi...' : 'Test Notification Produit Chimique'}
        </Button>
      </Stack>

      <Box mt={3}>
        <Typography variant="caption" color="text.secondary">
          <Chip 
            size="small" 
            label="User ID" 
            sx={{ mr: 1 }} 
          />
          {(session.user as any).id}
        </Typography>
      </Box>
    </Paper>
  );
};

export default NotificationTester;
