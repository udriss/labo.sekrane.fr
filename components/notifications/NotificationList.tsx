import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import {
  Refresh,
  MarkEmailRead,
  FilterList,
  ExpandMore,
  Warning,
  Wifi,
  WifiOff
} from '@mui/icons-material';
import { useNotifications } from '@/lib/hooks/useNotifications';
import NotificationItem from './NotificationItem';
import { NotificationFilter } from '@/types/notifications';

interface NotificationsListProps {
  filters?: NotificationFilter;
  showStats?: boolean;
  maxHeight?: string | number;
  onNotificationClick?: (notificationId: string) => void;
}

// Mémoriser le composant pour éviter les re-rendus inutiles
const NotificationsList = React.memo(function NotificationsList({
  filters = {},
  showStats = true,
  maxHeight = '600px',
  onNotificationClick
}: NotificationsListProps) {
  const {
    notifications,
    stats,
    loading,
    error,
    hasMore,
    total,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refresh,
    loadMore,
    isSSEConnected,
    reconnectSSE
  } = useNotifications(filters);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning'>('success');

  // Mémoriser les fonctions pour éviter les re-créations
  const showMessage = useCallback((message: string, severity: 'success' | 'error' | 'warning' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  // Gérer les erreurs de notification
  const handleNotificationError = useCallback((error: string) => {
    console.error('Erreur de notification:', error);
    showMessage(error, 'error');
  }, [showMessage]);

  // Gérer le marquage comme lu
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      const success = await markAsRead(notificationId);
      if (success) {
        showMessage('Notification marquée comme lue');
      } else {
        showMessage('Erreur lors du marquage comme lu', 'error');
      }
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
      showMessage('Erreur lors du marquage comme lu', 'error');
    }
  }, [markAsRead, showMessage]);

  // Gérer le marquage de toutes comme lues
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const success = await markAllAsRead();
      if (success) {
        showMessage('Toutes les notifications marquées comme lues');
      } else {
        showMessage('Erreur lors du marquage de toutes comme lues', 'error');
      }
    } catch (error) {
      console.error('Erreur lors du marquage de toutes comme lues:', error);
      showMessage('Erreur lors du marquage de toutes comme lues', 'error');
    }
  }, [markAllAsRead, showMessage]);

  // Gérer le rafraîchissement
  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
      showMessage('Notifications rafraîchies');
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
      showMessage('Erreur lors du rafraîchissement', 'error');
    }
  }, [refresh, showMessage]);

  // Gérer le chargement de plus
  const handleLoadMore = useCallback(async () => {
    try {
      await loadMore();
    } catch (error) {
      console.error('Erreur lors du chargement de plus:', error);
      showMessage('Erreur lors du chargement de plus', 'error');
    }
  }, [loadMore, showMessage]);

  // Mémoriser les notifications valides pour éviter les recalculs
  const validNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (!notification || typeof notification !== 'object') {
        console.warn('Notification invalide filtrée:', notification);
        return false;
      }
      return notification.id && notification.userId && notification.module;
    });
  }, [notifications]);

  // Mémoriser le compteur de notifications non lues
  const unreadCount = useMemo(() => {
    return validNotifications.filter(n => !n.isRead).length;
  }, [validNotifications]);

  // Mémoriser les chips de statistiques
  const statsChips = useMemo(() => {
    if (!showStats || !stats) return null;

    return (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip 
          label={`Total: ${stats.total}`} 
          size="small" 
          variant="outlined" 
        />
        <Chip 
          label={`Non lues: ${stats.unread}`} 
          size="small" 
          color={stats.unread > 0 ? 'primary' : 'default'}
        />
        {Object.entries(stats.byModule).map(([module, count]) => (
          <Chip 
            key={module}
            label={`${module}: ${count}`} 
            size="small" 
            variant="outlined" 
          />
        ))}
      </Stack>
    );
  }, [showStats, stats]);

  // Charger les notifications au montage du composant
  useEffect(() => {
    fetchNotifications().catch((error) => {
      console.error('Erreur lors du chargement initial des notifications:', error);
      showMessage('Erreur lors du chargement initial des notifications', 'error');
    });
  }, [fetchNotifications, showMessage]);

  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* En-tête */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Notifications
          {total > 0 && (
            <Chip 
              label={`${total} total`} 
              size="small" 
              sx={{ ml: 1 }} 
            />
          )}
          {unreadCount > 0 && (
            <Chip 
              label={`${unreadCount} non lues`} 
              size="small" 
              color="primary" 
              sx={{ ml: 1 }} 
            />
          )}
        </Typography>

        <Box display="flex" gap={1}>
          {/* Indicateur de connexion SSE */}
          <Tooltip title={isSSEConnected ? "Notifications temps réel actives" : "Notifications temps réel déconnectées"}>
            <IconButton 
              size="small" 
              onClick={reconnectSSE}
              color={isSSEConnected ? "success" : "error"}
            >
              {isSSEConnected ? <Wifi /> : <WifiOff />}
            </IconButton>
          </Tooltip>

          {unreadCount > 0 && (
            <Tooltip title="Marquer toutes comme lues">
              <IconButton 
                size="small" 
                onClick={handleMarkAllAsRead}
                disabled={loading}
              >
                <MarkEmailRead />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Rafraîchir">
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Statistiques (optionnel) */}
      {statsChips && (
        <Box mb={2}>
          {statsChips}
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Contenu principal */}
      <Box 
        flex={1} 
        sx={{ 
          maxHeight, 
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#a8a8a8',
          },
        }}
      >
        {/* Erreur */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {error}
            </Typography>
            <Button 
              size="small" 
              onClick={handleRefresh}
              sx={{ mt: 1 }}
            >
              Réessayer
            </Button>
          </Alert>
        )}

        {/* Chargement initial */}
        {loading && validNotifications.length === 0 && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Chargement des notifications...
            </Typography>
          </Box>
        )}

        {/* Aucune notification */}
        {!loading && !error && validNotifications.length === 0 && (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <Warning color="action" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Aucune notification
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Vous n'avez aucune notification pour le moment.
            </Typography>
            <Button 
              variant="outlined" 
              onClick={handleRefresh}
              sx={{ mt: 2 }}
              startIcon={<Refresh />}
            >
              Vérifier à nouveau
            </Button>
          </Box>
        )}

        {/* Liste des notifications */}
        {validNotifications.length > 0 && (
          <Stack spacing={1}>
            {validNotifications.map((notification, index) => (
              <NotificationItem
                key={notification?.id || `notification-${index}`}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onError={handleNotificationError}
              />
            ))}

            {/* Bouton "Charger plus" */}
            {hasMore && (
              <Box display="flex" justifyContent="center" py={2}>
                <Button
                  variant="outlined"
                  onClick={handleLoadMore}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <ExpandMore />}
                >
                  {loading ? 'Chargement...' : 'Charger plus'}
                </Button>
              </Box>
            )}

            {/* Indicateur de fin */}
            {!hasMore && validNotifications.length > 0 && (
              <Box display="flex" justifyContent="center" py={2}>
                <Typography variant="caption" color="text.secondary">
                  Toutes les notifications ont été chargées
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </Box>

      {/* Snackbar pour les messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
});

export default NotificationsList;