// app/notifications/page.tsx
'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Chip,
  Stack,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Badge,
  Divider,
  Switch,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import {
  Notifications,
  FilterList,
  Refresh,
  Settings,
  Delete,
  DoneAll,
  Clear,
  WifiTethering,
  WifiTetheringOff,
  Send,
  Circle
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import NotificationItem from '@/components/notifications/NotificationItem';
import { toast } from 'react-hot-toast';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const {
    isConnected,
    lastHeartbeat,
    notifications,
    stats,
    connect,
    disconnect,
    reconnect,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    clearNotification,
    sendMessage,
    loadDatabaseNotifications
  } = useNotificationContext();

  const [tabValue, setTabValue] = useState(0);
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [testMessage, setTestMessage] = useState('');
  const [testSeverity, setTestSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fonction pour rafraîchir manuellement les notifications depuis la base de données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDatabaseNotifications();
    setIsRefreshing(false);
    toast.success('Notifications rafraîchies');
  };

  // Charger les notifications au montage du composant
  useEffect(() => {
    
    loadDatabaseNotifications().then(() => {
      
    });
  }, [loadDatabaseNotifications]);

  // Debug notifications when they change
  useEffect(() => {
    
  }, [notifications]);

  // Filtrer les notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (filterModule !== 'all' && notification.module !== filterModule) return false;
      if (filterSeverity !== 'all' && notification.severity !== filterSeverity) return false;
      if (filterRead === 'read' && !notification.isRead) return false;
      if (filterRead === 'unread' && notification.isRead) return false;
      return true;
    });
  }, [notifications, filterModule, filterSeverity, filterRead]);

  // Obtenir les modules uniques
  const availableModules = useMemo(() => {
    const modules = new Set(notifications.map(n => n.module));
    return Array.from(modules).sort();
  }, [notifications]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSendTestNotification = async () => {
    if (!testMessage.trim()) {
      toast.error('Veuillez saisir un message de test');
      return;
    }

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: testMessage,
          severity: testSeverity
        })
      });

      if (response.ok) {
        toast.success('Notification de test envoyée');
        setTestMessage('');
      } else {
        toast.error('Erreur lors de l\'envoi de la notification de test');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la notification de test');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return 'ℹ️';
      case 'low': return '📢';
      default: return '📨';
    }
  };

  const formatMessage = (message: string | object) => {
    if (typeof message === 'string') return message;
    if (typeof message === 'object' && message !== null) {
      return (message as any).fr || JSON.stringify(message);
    }
    return 'Message de notification';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            <Badge badgeContent={stats.unreadNotifications} color="error">
              <Notifications sx={{ mr: 2, verticalAlign: "middle", fontSize: "inherit" }} />
            </Badge>
            Notifications
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Système de notifications en temps réel
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Box display="flex" alignItems="center" gap={1}>
            {isConnected ? (
              <WifiTethering color="success" />
            ) : (
              <WifiTetheringOff color="error" />
            )}
            <Typography variant="body2" color={isConnected ? 'success.main' : 'error.main'}>
              {isConnected ? 'Connecté' : 'Déconnecté'}
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={isRefreshing ? <CircularProgress size={20} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            Rafraîchir
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={reconnect}
            disabled={isConnected}
          >
            Reconnecter
          </Button>
        </Stack>
      </Box>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label={`Notifications (${stats.totalNotifications})`} />
        <Tab label="Statistiques" />
        {session?.user && (session.user as any).role === 'ADMIN' && (
          <Tab label="Administration" />
        )}
      </Tabs>

      {/* Onglet Notifications */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Filtres */}
          <Grid size = {{ xs:12 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <FilterList />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Module</InputLabel>
                  <Select
                    value={filterModule}
                    label="Module"
                    onChange={(e) => setFilterModule(e.target.value)}
                  >
                    <MenuItem value="all">Tous</MenuItem>
                    {availableModules.map(module => (
                      <MenuItem key={module} value={module}>{module}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sévérité</InputLabel>
                  <Select
                    value={filterSeverity}
                    label="Sévérité"
                    onChange={(e) => setFilterSeverity(e.target.value)}
                  >
                    <MenuItem value="all">Toutes</MenuItem>
                    <MenuItem value="critical">Critique</MenuItem>
                    <MenuItem value="high">Élevée</MenuItem>
                    <MenuItem value="medium">Moyenne</MenuItem>
                    <MenuItem value="low">Faible</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>État</InputLabel>
                  <Select
                    value={filterRead}
                    label="État"
                    onChange={(e) => setFilterRead(e.target.value)}
                  >
                    <MenuItem value="all">Toutes</MenuItem>
                    <MenuItem value="unread">Non lues</MenuItem>
                    <MenuItem value="read">Lues</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ flexGrow: 1 }} />
                
                <Button
                  startIcon={<DoneAll />}
                  onClick={markAllAsRead}
                  disabled={stats.unreadNotifications === 0}
                >
                  Marquer toutes comme lues
                </Button>
                
                <Button
                  startIcon={<Clear />}
                  onClick={clearNotifications}
                  color="error"
                  disabled={notifications.length === 0}
                >
                  Effacer toutes
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* Liste des notifications */}
          <Grid size = {{ xs:12 }}>
            {filteredNotifications.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Notifications sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Aucune notification
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {notifications.length === 0 
                    ? 'Vous n\'avez aucune notification pour le moment.'
                    : 'Aucune notification ne correspond aux filtres sélectionnés.'
                  }
                </Typography>
              </Paper>
            ) : (
              <List>
                {filteredNotifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem sx={{ p: 0 }}>
                      <NotificationItem 
                        notification={notification}
                        onClick={() => {/* Optionnel: action au clic */}}
                        compact={false}
                        showActions={true}
                        onMarkRead={() => markAsRead(notification.id)}
                        onDelete={() => clearNotification(notification.id)}
                      />
                    </ListItem>
                    {index < filteredNotifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* Onglet Statistiques */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid size = {{ xs:12, md:6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  État de la connexion
                </Typography>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>État:</Typography>
                    <Chip
                      label={isConnected ? 'Connecté' : 'Déconnecté'}
                      color={isConnected ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  {lastHeartbeat && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Dernier heartbeat:</Typography>
                      <Typography variant="body2">
                        {lastHeartbeat.toLocaleTimeString('fr-FR')}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size = {{ xs:12, md:6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Résumé des notifications
                </Typography>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Total:</Typography>
                    <Typography fontWeight="bold">{stats.totalNotifications}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Non lues:</Typography>
                    <Typography fontWeight="bold" color="primary">
                      {stats.unreadNotifications}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size = {{ xs:12, md:6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Par module
                </Typography>
                <Stack spacing={1}>
                  {Object.entries(stats.notificationsByModule).map(([module, count]) => (
                    <Box key={module} display="flex" justifyContent="space-between">
                      <Typography>{module}:</Typography>
                      <Typography fontWeight="bold">{count}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size = {{ xs:12, md:6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Par sévérité
                </Typography>
                <Stack spacing={1}>
                  {Object.entries(stats.notificationsBySeverity).map(([severity, count]) => (
                    <Box key={severity} display="flex" justifyContent="space-between">
                      <Typography>
                        {getSeverityIcon(severity)} {severity}:
                      </Typography>
                      <Typography fontWeight="bold">{count}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Onglet Administration (Admin seulement) */}
      {session?.user && (session.user as any).role === 'ADMIN' && (
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid size = {{ xs:12, md:6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Test de notification
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Message de test"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      multiline
                      rows={3}
                    />
                    <FormControl fullWidth>
                      <InputLabel>Sévérité</InputLabel>
                      <Select
                        value={testSeverity}
                        label="Sévérité"
                        onChange={(e) => setTestSeverity(e.target.value as any)}
                      >
                        <MenuItem value="low">Faible</MenuItem>
                        <MenuItem value="medium">Moyenne</MenuItem>
                        <MenuItem value="high">Élevée</MenuItem>
                        <MenuItem value="critical">Critique</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      startIcon={<Send />}
                      onClick={handleSendTestNotification}
                      disabled={!testMessage.trim()}
                    >
                      Envoyer notification de test
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size = {{ xs:12, md:6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Contrôles de connexion
                  </Typography>
                  <Stack spacing={2}>
                    <Button
                      variant="outlined"
                      onClick={connect}
                      disabled={isConnected}
                      fullWidth
                    >
                      Se connecter
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={disconnect}
                      disabled={!isConnected}
                      fullWidth
                    >
                      Se déconnecter
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={reconnect}
                      fullWidth
                    >
                      Reconnecter
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => sendMessage({ type: 'ping' })}
                      disabled={!isConnected}
                      fullWidth
                    >
                      Envoyer ping
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      )}
    </Container>
  );
}
