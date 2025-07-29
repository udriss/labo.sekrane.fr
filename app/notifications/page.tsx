'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Pagination,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  Paper,
  Divider,
  Container
} from '@mui/material';
import {
  Notifications,
  FilterList,
  Refresh,
  CheckCircle,
  Circle,
  Info,
  Warning,
  Error,
  Schedule,
  Person,
  Clear,
  MoreVert,
  Visibility
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ExtendedNotification, NotificationStats, NotificationFilter } from '@/types/notifications';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SEVERITY_CONFIG = {
  low: { icon: <Info />, color: 'info', label: 'Faible' },
  medium: { icon: <Warning />, color: 'warning', label: 'Moyen' },
  high: { icon: <Error />, color: 'error', label: 'Élevé' },
  critical: { icon: <Error />, color: 'error', label: 'Critique' }
} as const;

const MODULE_OPTIONS = [
  { value: '', label: 'Tous les modules' },
  { value: 'USERS', label: 'Utilisateurs' },
  { value: 'CHEMICALS', label: 'Produits chimiques' },
  { value: 'EQUIPMENT', label: 'Équipements' },
  { value: 'ROOMS', label: 'Salles' },
  { value: 'CALENDAR', label: 'Calendrier' },
  { value: 'ORDERS', label: 'Commandes' },
  { value: 'SECURITY', label: 'Sécurité' },
  { value: 'SYSTEM', label: 'Système' }
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'Toutes les priorités' },
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
  { value: 'critical', label: 'Critique' }
];

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
      id={`notification-tabpanel-${index}`}
      aria-labelledby={`notification-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // États
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, byModule: {}, bySeverity: {} });
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<NotificationFilter>({
    limit: 20,
    offset: 0
  });

  // Charger les données
  const fetchData = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const userId = (session.user as any).id;
      
      // Construire les paramètres de requête
      const params = new URLSearchParams({
        userId,
        limit: filters.limit?.toString() || '20',
        offset: ((page - 1) * (filters.limit || 20)).toString()
      });

      if (filters.module) params.append('module', filters.module);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      
      // Filtrer par statut selon l'onglet
      if (tabValue === 1) params.append('isRead', 'false'); // Non lues
      if (tabValue === 2) params.append('isRead', 'true');  // Lues

      const [notificationsResponse, statsResponse] = await Promise.all([
        fetch(`/api/notifications?${params.toString()}`),
        fetch(`/api/notifications/stats?userId=${userId}`)
      ]);

      if (notificationsResponse.ok && statsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        const statsData = await statsResponse.json();

        setNotifications(notificationsData.notifications || []);
        setStats(statsData.stats || { total: 0, unread: 0, byModule: {}, bySeverity: {} });
        
        // Calculer le nombre de pages
        const total = tabValue === 1 ? statsData.stats.unread : 
                     tabValue === 2 ? (statsData.stats.total - statsData.stats.unread) :
                     statsData.stats.total;
        setTotalPages(Math.ceil(total / (filters.limit || 20)));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session, page, tabValue, filters]);

  // Gestionnaires d'événements
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(1);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleFilterChange = (field: keyof NotificationFilter, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ limit: 20, offset: 0 });
    setPage(1);
  };

  const handleNotificationClick = async (notification: ExtendedNotification) => {
    // Marquer comme lue si nécessaire
    if (!notification.isRead) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'PUT'
        });
        
        // Mise à jour optimiste
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
        setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    router.push(`/notifications/${notification.id}`);
  };

  const markAllAsRead = async () => {
    if (!session?.user) return;

    try {
      const userId = (session.user as any).id;
      await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      // Recharger les données
      fetchData();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const formatNotificationTime = (createdAt: string) => {
    return format(new Date(createdAt), 'PPp', { locale: fr });
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'grey.50',
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={8}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ p: 4 }}>
            {/* Header avec gradient */}
            <Box 
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                p: 3,
                mb: 4,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                  opacity: 0.3
                }
              }}
            >
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center"
                sx={{ position: 'relative', zIndex: 1 }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Notifications sx={{ fontSize: 32 }} />
                  <Typography variant="h4" component="h1" fontWeight="bold">
                    Centre de Notifications
                  </Typography>
                </Box>
                <Box display="flex" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchData}
                    sx={{ 
                      color: 'white', 
                      borderColor: 'rgba(255,255,255,0.5)',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Actualiser
                  </Button>
                  {stats.unread > 0 && (
                    <Button
                      variant="contained"
                      startIcon={<CheckCircle />}
                      onClick={markAllAsRead}
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.3)'
                        }
                      }}
                    >
                      Marquer tout comme lu
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Statistiques avec cartes améliorées */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card 
                  elevation={4}
                  sx={{ 
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography color="inherit" variant="body2" sx={{ opacity: 0.9 }}>
                      Total
                    </Typography>
                    <Typography variant="h3" fontWeight="bold">
                      {stats.total}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card 
                  elevation={4}
                  sx={{ 
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography color="inherit" variant="body2" sx={{ opacity: 0.9 }}>
                      Non lues
                    </Typography>
                    <Typography variant="h3" fontWeight="bold">
                      {stats.unread}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card 
                  elevation={4}
                  sx={{ 
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    color: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography color="inherit" variant="body2" sx={{ opacity: 0.9 }}>
                      Modules actifs
                    </Typography>
                    <Typography variant="h3" fontWeight="bold">
                      {Object.keys(stats.byModule).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card 
                  elevation={4}
                  sx={{ 
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    color: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography color="inherit" variant="body2" sx={{ opacity: 0.9 }}>
                      Priorité élevée
                    </Typography>
                    <Typography variant="h3" fontWeight="bold">
                      {(stats.bySeverity.high || 0) + (stats.bySeverity.critical || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Filtres avec style amélioré */}
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                mb: 4, 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50'
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <FilterList color="primary" />
                <Typography variant="h6" color="primary" fontWeight="600">
                  Filtres de recherche
                </Typography>
                <Button 
                  size="small" 
                  onClick={clearFilters} 
                  startIcon={<Clear />}
                  variant="outlined"
                  color="secondary"
                >
                  Effacer
                </Button>
              </Box>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Module</InputLabel>
                    <Select
                      value={filters.module || ''}
                      label="Module"
                      onChange={(e) => handleFilterChange('module', e.target.value)}
                      sx={{ bgcolor: 'white' }}
                    >
                      {MODULE_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Priorité</InputLabel>
                    <Select
                      value={filters.severity || ''}
                      label="Priorité"
                      onChange={(e) => handleFilterChange('severity', e.target.value)}
                      sx={{ bgcolor: 'white' }}
                    >
                      {SEVERITY_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Date de début"
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ bgcolor: 'white' }}
                  />
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Date de fin"
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ bgcolor: 'white' }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Onglets avec style amélioré */}
            <Paper 
              elevation={2}
              sx={{ 
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange}
                  sx={{
                    '& .MuiTab-root': {
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }
                  }}
                >
                  <Tab 
                    label={
                      <Badge badgeContent={stats.total} color="primary" max={999}>
                        <Box sx={{ px: 1 }}>Toutes</Box>
                      </Badge>
                    } 
                  />
                  <Tab 
                    label={
                      <Badge badgeContent={stats.unread} color="error" max={999}>
                        <Box sx={{ px: 1 }}>Non lues</Box>
                      </Badge>
                    } 
                  />
                  <Tab 
                    label={`Lues (${stats.total - stats.unread})`}
                  />
                </Tabs>
              </Box>

              {/* Contenu des onglets */}
              <Box sx={{ bgcolor: 'white' }}>
                <TabPanel value={tabValue} index={0}>
                  <NotificationsList 
                    notifications={notifications}
                    loading={loading}
                    onNotificationClick={handleNotificationClick}
                    onMarkAsRead={async (id) => {
                      try {
                        await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
                        setNotifications(prev => 
                          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                        );
                        setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
                      } catch (error) {
                        console.error('Error marking notification as read:', error);
                      }
                    }}
                  />
                </TabPanel>
                
                <TabPanel value={tabValue} index={1}>
                  <NotificationsList 
                    notifications={notifications}
                    loading={loading}
                    onNotificationClick={handleNotificationClick}
                    onMarkAsRead={async (id) => {
                      try {
                        await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
                        setNotifications(prev => 
                          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                        );
                        setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
                      } catch (error) {
                        console.error('Error marking notification as read:', error);
                      }
                    }}
                  />
                </TabPanel>
                
                <TabPanel value={tabValue} index={2}>
                  <NotificationsList 
                    notifications={notifications}
                    loading={loading}
                    onNotificationClick={handleNotificationClick}
                    onMarkAsRead={async (id) => {
                      try {
                        await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
                        setNotifications(prev => 
                          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                        );
                        setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
                      } catch (error) {
                        console.error('Error marking notification as read:', error);
                      }
                    }}
                  />
                </TabPanel>
              </Box>
            </Paper>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={4}>
                <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                  />
                </Paper>
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

// Composant pour la liste des notifications avec style amélioré
interface NotificationsListProps {
  notifications: ExtendedNotification[];
  loading: boolean;
  onNotificationClick: (notification: ExtendedNotification) => void;
  onMarkAsRead: (id: string) => Promise<void>;
}

function NotificationsList({ notifications, loading, onNotificationClick, onMarkAsRead }: NotificationsListProps) {
  const formatNotificationTime = (createdAt: string) => {
    return format(new Date(createdAt), 'PPp', { locale: fr });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <Box textAlign="center">
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Chargement des notifications...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (notifications.length === 0) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert 
          severity="info" 
          sx={{ 
            borderRadius: 2,
            '& .MuiAlert-message': {
              fontSize: '1.1rem'
            }
          }}
        >
          <Typography variant="h6" gutterBottom>
            Aucune notification trouvée
          </Typography>
          <Typography variant="body2">
            Il n'y a actuellement aucune notification correspondant à vos critères de recherche.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <List sx={{ p: 0 }}>
      {notifications.map((notification, index) => {
        const severityConfig = SEVERITY_CONFIG[notification.severity];
        
        return (
          <React.Fragment key={notification.id}>
            <ListItem
              sx={{
                bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                '&:hover': { 
                  bgcolor: 'action.selected',
                  transform: 'translateX(4px)',
                  transition: 'all 0.2s ease'
                },
                borderLeft: notification.isRead ? 'none' : `4px solid ${
                  notification.severity === 'critical' ? '#f44336' :
                  notification.severity === 'high' ? '#ff9800' :
                  notification.severity === 'medium' ? '#2196f3' : '#4caf50'
                }`,
                cursor: 'pointer',
                py: 2,
                px: 3,
                transition: 'all 0.2s ease'
              }}
              onClick={() => onNotificationClick(notification)}
            >
              <ListItemIcon>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: '50%',
                      bgcolor: `${severityConfig.color}.light`,
                      color: `${severityConfig.color}.main`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {severityConfig.icon}
                  </Box>
                  {!notification.isRead && (
                    <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                  )}
                </Box>
              </ListItemIcon>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: notification.isRead ? 400 : 600,
                        flex: 1,
                        fontSize: '1.1rem'
                      }}
                    >
                      {notification.message}
                    </Typography>
                    <Chip 
                      label={notification.module} 
                      size="small" 
                      variant="outlined"
                      color="primary"
                      sx={{ 
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    />
                    <Chip 
                      label={severityConfig.label} 
                      size="small" 
                      color={severityConfig.color as any}
                      sx={{ 
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatNotificationTime(notification.createdAt)}
                      </Typography>
                    </Box>
                    {notification.triggeredBy && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {notification.triggeredBy.userName}
                        </Typography>
                      </Box>
                    )}
                    {notification.entityId && (
                      <Typography variant="body2" color="text.secondary">
                        ID: {notification.entityId.substring(0, 8)}...
                      </Typography>
                    )}
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {!notification.isRead && (
                    <Tooltip title="Marquer comme lue">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                        sx={{
                          bgcolor: 'success.light',
                          color: 'success.main',
                          '&:hover': {
                            bgcolor: 'success.main',
                            color: 'white'
                          }
                        }}
                      >
                        <CheckCircle />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Voir les détails">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNotificationClick(notification);
                      }}
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: 'primary.main',
                          color: 'white'
                        }
                      }}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            
            {index < notifications.length - 1 && (
              <Divider sx={{ mx: 3, opacity: 0.6 }} />
            )}
          </React.Fragment>
        );
      })}
    </List>
  );
}