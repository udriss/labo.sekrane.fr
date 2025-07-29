'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Divider,
  Grid,
  Avatar,
  Button,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Schedule,
  Info,
  Warning,
  Error,
  CheckCircle,
  Home,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ExtendedNotification } from '@/types/notifications';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SEVERITY_CONFIG = {
  low: { icon: <Info />, color: 'info', label: 'Faible' },
  medium: { icon: <Warning />, color: 'warning', label: 'Moyen' },
  high: { icon: <Error />, color: 'error', label: 'Élevé' },
  critical: { icon: <Error />, color: 'error', label: 'Critique' }
} as const;

const MODULE_LABELS = {
  USERS: 'Utilisateurs',
  CHEMICALS: 'Produits chimiques',
  EQUIPMENT: 'Équipements',
  ROOMS: 'Salles',
  CALENDAR: 'Calendrier',
  ORDERS: 'Commandes',
  SECURITY: 'Sécurité',
  SYSTEM: 'Système'
} as const;

const ACTION_LABELS = {
  CREATE: 'Création',
  READ: 'Consultation',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  VALIDATE_EVENT: 'Validation d\'événement',
  APPROVE_SINGLE: 'Approbation',
  REJECT_SINGLE: 'Rejet'
} as const;

export default function NotificationDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const notificationId = params.id as string;

  const [notification, setNotification] = useState<ExtendedNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user || !notificationId) return;

    const fetchNotification = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/notifications/${notificationId}`);
        
        if (!response.ok) {
          throw new globalThis.Error('Notification non trouvée');
        }
        
        const data = await response.json();
        setNotification(data.notification);

        // Marquer comme lue si ce n'est pas déjà fait
        if (!data.notification.isRead) {
          await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PUT'
          });
        }

      } catch (err: any) {
        setError(err && typeof err.message === 'string' ? err.message : 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchNotification();
  }, [session, notificationId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !notification) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Notification non trouvée'}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
        >
          Retour
        </Button>
      </Box>
    );
  }

  const severityConfig = SEVERITY_CONFIG[notification.severity];
  const moduleLabel = MODULE_LABELS[notification.module as keyof typeof MODULE_LABELS] || notification.module;
  const actionLabel = ACTION_LABELS[notification.actionType as keyof typeof ACTION_LABELS] || notification.actionType;

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link href="/" passHref>
          <MuiLink underline="hover" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
            <Home sx={{ mr: 0.5, fontSize: 20 }} />
            Accueil
          </MuiLink>
        </Link>
        <Link href="/notifications" passHref>
          <MuiLink underline="hover" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
            <NotificationsIcon sx={{ mr: 0.5, fontSize: 20 }} />
            Notifications
          </MuiLink>
        </Link>
        <Typography color="text.primary">Détail</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Détail de la notification
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
        >
          Retour
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Informations principales */}
        <Grid size = {{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                {severityConfig.icon}
                <Typography variant="h5" component="h2">
                  {notification.message}
                </Typography>
              </Box>

              <Box display="flex" gap={1} mb={3}>
                <Chip 
                  label={moduleLabel} 
                  color="primary" 
                  variant="outlined" 
                />
                <Chip 
                  label={actionLabel} 
                  color="secondary" 
                  variant="outlined" 
                />
                <Chip 
                  label={severityConfig.label} 
                  color={severityConfig.color as any}
                  icon={severityConfig.icon}
                />
                {!notification.isRead && (
                  <Chip 
                    label="Non lue" 
                    color="warning" 
                    size="small"
                  />
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Détails de l'action */}
              <Typography variant="h6" gutterBottom>
                Détails de l'action
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Schedule />
                  </ListItemIcon>
                  <ListItemText
                    primary="Date et heure"
                    secondary={format(new Date(notification.createdAt), 'PPPp', { locale: fr })}
                  />
                </ListItem>

                {notification.triggeredBy && (
                  <ListItem>
                    <ListItemIcon>
                      <Person />
                    </ListItemIcon>
                    <ListItemText
                      primary="Utilisateur responsable"
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {notification.triggeredBy.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {notification.triggeredBy.userEmail}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                )}

                {notification.entityId && (
                  <ListItem>
                    <ListItemIcon>
                      <Info />
                    </ListItemIcon>
                    <ListItemText
                      primary="Élément concerné"
                      secondary={`${notification.entityType || 'Entité'}: ${notification.entityId}`}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* Détails techniques */}
          {notification.details && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Détails techniques
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <pre style={{ 
                    margin: 0, 
                    fontSize: '0.875rem', 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {JSON.stringify(notification.details, null, 2)}
                  </pre>
                </Paper>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid size = {{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="ID de notification"
                    secondary={notification.id}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Module"
                    secondary={moduleLabel}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Type d'action"
                    secondary={actionLabel}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Niveau de priorité"
                    secondary={severityConfig.label}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Statut"
                    secondary={notification.isRead ? 'Lue' : 'Non lue'}
                  />
                </ListItem>
              </List>

              {notification.triggeredBy && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Utilisateur responsable
                  </Typography>
                  
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {notification.triggeredBy.userName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {notification.triggeredBy.userName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {notification.triggeredBy.userEmail}
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<NotificationsIcon />}
                component={Link}
                href="/notifications"
                sx={{ mb: 1 }}
              >
                Toutes les notifications
              </Button>
              
              {notification.entityId && notification.entityType && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Info />}
                  onClick={() => {
                    // Rediriger vers l'entité concernée selon le type
                    const entityRoutes: Record<string, string> = {
                      'user': `/users/${notification.entityId}`,
                      'chemical': `/chemicals/${notification.entityId}`,
                      'equipment': `/equipment/${notification.entityId}`,
                      'room': `/rooms/${notification.entityId}`,
                      'event': `/calendar/events/${notification.entityId}`,
                    };
                    
                    const route = entityRoutes[notification.entityType?.toLowerCase() || ''];
                    if (route) {
                      router.push(route);
                    }
                  }}
                >
                  Voir l'élément
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}