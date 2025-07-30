'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  Container,
  Paper
} from '@mui/material';
import {
  ExpandMore,
  BugReport,
  Refresh,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { ExtendedNotification, NotificationStats } from '@/types/notifications';

interface DebugInfo {
  session: any;
  apiResponses: {
    notifications: any;
    stats: any;
  };
  errors: string[];
  timestamps: {
    start: string;
    sessionCheck: string;
    apiCalls: string;
    end: string;
  };
}

export default function NotificationsDebugPage() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    session: null,
    apiResponses: { notifications: null, stats: null },
    errors: [],
    timestamps: { start: '', sessionCheck: '', apiCalls: '', end: '' }
  });
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    const startTime = new Date().toISOString();
    const errors: string[] = [];
    
    try {
      // 1. Vérifier la session
      const sessionCheckTime = new Date().toISOString();
      
      
      
      if (!session?.user) {
        errors.push('Session utilisateur non trouvée ou invalide');
      }

      const userId = (session?.user as any)?.id;
      if (!userId) {
        errors.push('ID utilisateur non trouvé dans la session');
      }

      // 2. Tester les appels API
      const apiCallsTime = new Date().toISOString();
      let notificationsResponse = null;
      let statsResponse = null;

      if (userId) {
        try {
          // Test API notifications
          
          const notifRes = await fetch(`/api/notifications?userId=${userId}&limit=20&offset=0`);
          
          
          if (notifRes.ok) {
            notificationsResponse = await notifRes.json();
            
          } else {
            const errorText = await notifRes.text();
            errors.push(`API notifications erreur ${notifRes.status}: ${errorText}`);
          }

          // Test API stats
          
          const statsRes = await fetch(`/api/notifications/stats?userId=${userId}`);
          
          
          if (statsRes.ok) {
            statsResponse = await statsRes.json();
            
          } else {
            const errorText = await statsRes.text();
            errors.push(`API stats erreur ${statsRes.status}: ${errorText}`);
          }
        } catch (apiError) {
          console.error('🔍 Erreur API:', apiError);
          errors.push(`Erreur lors des appels API: ${apiError}`);
        }
      }

      const endTime = new Date().toISOString();

      setDebugInfo({
        session: {
          status,
          user: session?.user,
          userId,
          role: (session?.user as any)?.role
        },
        apiResponses: {
          notifications: notificationsResponse,
          stats: statsResponse
        },
        errors,
        timestamps: {
          start: startTime,
          sessionCheck: sessionCheckTime,
          apiCalls: apiCallsTime,
          end: endTime
        }
      });

    } catch (error) {
      console.error('🔍 Erreur générale:', error);
      errors.push(`Erreur générale: ${error}`);
      setDebugInfo(prev => ({ ...prev, errors }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'loading') {
      runDiagnostic();
    }
  }, [session, status]);

  const getStatusColor = (hasError: boolean) => hasError ? 'error' : 'success';
  const getStatusIcon = (hasError: boolean) => hasError ? <ErrorIcon /> : <CheckCircle />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      <Container maxWidth="lg">
        <Paper elevation={8} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 4 }}>
            {/* Header */}
            <Box 
              sx={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                borderRadius: 2,
                p: 3,
                mb: 4,
                color: 'white'
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  <BugReport sx={{ fontSize: 32 }} />
                  <Typography variant="h4" component="h1" fontWeight="bold">
                    Diagnostic Notifications
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={runDiagnostic}
                  disabled={loading}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Relancer le diagnostic
                </Button>
              </Box>
            </Box>

            {loading && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}

            {/* Résumé des erreurs */}
            {debugInfo.errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {debugInfo.errors.length} erreur(s) détectée(s):
                </Typography>
                {debugInfo.errors.map((error, index) => (
                  <Typography key={index} variant="body2">
                    • {error}
                  </Typography>
                ))}
              </Alert>
            )}

            {debugInfo.errors.length === 0 && !loading && (
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="h6">
                  Aucune erreur détectée - Le problème pourrait être dans la logique métier
                </Typography>
              </Alert>
            )}

            {/* Détails du diagnostic */}
            <Box sx={{ mt: 3 }}>
              {/* Session */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={2}>
                    {getStatusIcon(!debugInfo.session?.userId)}
                    <Typography variant="h6">
                      Session Utilisateur
                    </Typography>
                    <Chip 
                      label={debugInfo.session?.status || 'unknown'} 
                      color={getStatusColor(!debugInfo.session?.userId)}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                      {JSON.stringify(debugInfo.session, null, 2)}
                    </pre>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* API Notifications */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={2}>
                    {getStatusIcon(!debugInfo.apiResponses.notifications)}
                    <Typography variant="h6">
                      API Notifications
                    </Typography>
                    <Chip 
                      label={debugInfo.apiResponses.notifications ? 'Succès' : 'Échec'} 
                      color={getStatusColor(!debugInfo.apiResponses.notifications)}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                      {JSON.stringify(debugInfo.apiResponses.notifications, null, 2)}
                    </pre>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* API Stats */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={2}>
                    {getStatusIcon(!debugInfo.apiResponses.stats)}
                    <Typography variant="h6">
                      API Statistiques
                    </Typography>
                    <Chip 
                      label={debugInfo.apiResponses.stats ? 'Succès' : 'Échec'} 
                      color={getStatusColor(!debugInfo.apiResponses.stats)}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                      {JSON.stringify(debugInfo.apiResponses.stats, null, 2)}
                    </pre>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Timestamps */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CheckCircle color="success" />
                    <Typography variant="h6">
                      Chronologie
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                      {JSON.stringify(debugInfo.timestamps, null, 2)}
                    </pre>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>

            {/* Recommandations */}
            <Card sx={{ mt: 3, bgcolor: 'info.light' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="info.dark">
                  Recommandations de débogage:
                </Typography>
                <Typography variant="body2" component="div" color="info.dark">
                  <ul>
                    <li>Vérifiez que l'utilisateur a bien le rôle ADMIN dans la base de données</li>
                    <li>Vérifiez que les APIs `/api/notifications` et `/api/notifications/stats` retournent des données</li>
                    <li>Vérifiez les logs du serveur pour d'éventuelles erreurs</li>
                    <li>Vérifiez que les notifications existent en base de données</li>
                    <li>Vérifiez les filtres appliqués (module, rôle, etc.)</li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}