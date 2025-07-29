"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Paper,
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Badge,
  CircularProgress
} from "@mui/material"
import {
  Dashboard as DashboardIcon,
  Science,
  Inventory,
  Assignment,
  ShoppingCart,
  TrendingUp,
  Warning,
  Notifications,
  NotificationsActive,
  Send,
  Podcasts,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  WifiOff,
  Wifi,
  YoutubeSearchedFor,
  PlayArrow,
  Clear
} from "@mui/icons-material"
import { StatsData } from "@/types/prisma"
import { useNotificationContext } from "@/components/notifications/NotificationProvider"
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // États pour les tests de notifications
  const [testMessage, setTestMessage] = useState('')
  const [testType, setTestType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [testLoading, setTestLoading] = useState(false)

  // Hook de notifications
  const {
    isConnected,
    notifications,
    connectionStatus,
    lastHeartbeat,
    reconnect,
    clearNotifications
  } = useNotificationContext()

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stats')
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des statistiques: ${response.statusText}`)
      }
      const statsData = await response.json()
      setStats(statsData)
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error)
      setError(error instanceof Error ? error.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour envoyer une notification de test
  const sendTestNotification = async () => {
    if (!testMessage.trim()) return

    try {
      setTestLoading(true)
      const response = await fetch('/api/notifications/ws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send',
          userId: 'user-123', // Remplacez par l'ID utilisateur actuel
          notification: {
            message: testMessage,
            severity: testType === 'error' ? 'high' : testType === 'warning' ? 'medium' : 'low',
            module: 'DASHBOARD',
            actionType: 'TEST_NOTIFICATION',
            role: 'user',
            details: {
              testType,
              timestamp: Date.now(),
              source: 'dashboard'
            }
          }
        }),
      })

      const result = await response.json()
      if (result.success) {
        setTestMessage('')
        console.log('Test notification sent:', result)
      } else {
        console.error('Failed to send test notification:', result)
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
    } finally {
      setTestLoading(false)
    }
  }

  // Fonction pour envoyer une diffusion générale
  const sendBroadcast = async () => {
    if (!testMessage.trim()) return

    try {
      setTestLoading(true)
      const response = await fetch('/api/notifications/ws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'broadcast',
          notification: {
            id: crypto.randomUUID(),
            type: testType,
            title: 'Diffusion générale',
            message: testMessage,
            createdAt: new Date().toISOString(),
            source: 'dashboard'
          }
        }),
      })

      const result = await response.json()
      console.log('Broadcast sent to', result.sent, 'connections')
      setTestMessage('')
    } catch (error) {
      console.error('Error sending broadcast:', error)
    } finally {
      setTestLoading(false)
    }
  }

  // Fonction pour tester les notifications prédéfinies
  const sendPredefinedNotification = async (type: 'chemical' | 'equipment' | 'order' | 'system') => {
    const notifications = {
      chemical: {
        message: '⚠️ Stock faible détecté pour le réactif Acide sulfurique (H2SO4)',
        severity: 'medium',
        module: 'CHEMICALS',
        actionType: 'LOW_STOCK_ALERT'
      },
      equipment: {
        message: '🔧 Maintenance programmée pour le microscope électronique MEB-001',
        severity: 'low',
        module: 'EQUIPMENT',
        actionType: 'MAINTENANCE_SCHEDULED'
      },
      order: {
        message: '📦 Nouvelle commande reçue - Réactifs organiques (CMD-2024-001)',
        severity: 'low',
        module: 'ORDERS',
        actionType: 'ORDER_RECEIVED'
      },
      system: {
        message: '🚨 Mise à jour système disponible - Version 2.1.0',
        severity: 'high',
        module: 'SYSTEM',
        actionType: 'SYSTEM_UPDATE'
      }
    }

    const notif = notifications[type]
    
    try {
      setTestLoading(true)
      const response = await fetch('/api/notifications/ws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send',
          userId: 'user-123',
          notification: {
            ...notif,
            role: 'user',
            details: {
              predefinedType: type,
              timestamp: Date.now()
            }
          }
        }),
      })

      const result = await response.json()
      console.log(`${type} notification sent:`, result)
    } catch (error) {
      console.error(`Error sending ${type} notification:`, error)
    } finally {
      setTestLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success'
      case 'connecting': return 'warning'
      case 'error': return 'error'
      default: return 'default'
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi />
      case 'connecting': return <CircularProgress size={20} />
      case 'error': return <WifiOff />
      default: return <WifiOff />
    }
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Box textAlign="center">
            <CircularProgress size={48} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Chargement du tableau de bord...
            </Typography>
          </Box>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            <DashboardIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Tableau de bord
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Vue d'ensemble du laboratoire
          </Typography>
        </Box>
        
        {/* Indicateur de statut des notifications */}
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            icon={getConnectionStatusIcon()}
            label={`Notifications ${connectionStatus === 'connected' ? 'connectées' : 
                   connectionStatus === 'connecting' ? 'connexion...' : 'déconnectées'}`}
            color={getConnectionStatusColor() as any}
            variant={isConnected ? 'filled' : 'outlined'}
          />
          <Badge badgeContent={notifications.length} color="error" max={99}>
            <NotificationsActive color={isConnected ? 'primary' : 'disabled'} />
          </Badge>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {stats && (
        <>
          {/* Statistiques principales */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#1976d2' }}>
                      <Science />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" color="primary">
                        {stats.chemicals.total}
                      </Typography>
                      <Typography variant="body2">Réactifs chimiques</Typography>
                      {stats.chemicals.lowStock > 0 && (
                        <Typography variant="caption" color="warning.main">
                          {stats.chemicals.lowStock} stock bas
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#388e3c' }}>
                      <Inventory />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" color="success.main">
                        {stats.equipment.total}
                      </Typography>
                      <Typography variant="body2">Équipements</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stats.equipment.available} disponibles
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#f57c00' }}>
                      <Assignment />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" color="warning.main">
                        {stats.notebook.total}
                      </Typography>
                      <Typography variant="body2">Cahiers de TP</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stats.notebook.completed} terminés
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#7b1fa2' }}>
                      <ShoppingCart />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" color="secondary.main">
                        {stats.orders.pending}
                      </Typography>
                      <Typography variant="body2">Commandes en cours</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total: {stats.orders.total}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Alertes */}
          {(stats.chemicals.expired > 0 || stats.chemicals.lowStock > 0) && (
            <Alert severity="warning" sx={{ mb: 4 }}>
              <Box>
                {stats.chemicals.expired > 0 && (
                  <Typography variant="body2">
                    ⚠️ {stats.chemicals.expired} réactifs expirés
                  </Typography>
                )}
                {stats.chemicals.lowStock > 0 && (
                  <Typography variant="body2">
                    📉 {stats.chemicals.lowStock} réactifs en stock faible
                  </Typography>
                )}
              </Box>
            </Alert>
          )}

          {/* Section Notifications et Tests */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Panel de test des notifications */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Paper sx={{ p: 3, height: 'fit-content' }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <YoutubeSearchedFor color="primary" />
                  <Typography variant="h6">
                    Test des notifications en temps réel
                  </Typography>
                  <Chip 
                    size="small" 
                    label={isConnected ? 'Connecté' : 'Déconnecté'} 
                    color={isConnected ? 'success' : 'error'}
                  />
                </Box>

                {/* Statut de connexion détaillé */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Statut:</strong> {connectionStatus}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Notifications reçues:</strong> {notifications.length}
                  </Typography>
                  {lastHeartbeat && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Dernier heartbeat:</strong> {format(new Date(lastHeartbeat), 'HH:mm:ss', { locale: fr })}
                    </Typography>
                  )}
                </Box>

                {/* Tests prédéfinis */}
                <Typography variant="subtitle2" gutterBottom>
                  Tests prédéfinis :
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Science />}
                    onClick={() => sendPredefinedNotification('chemical')}
                    disabled={!isConnected || testLoading}
                  >
                    Chimique
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Inventory />}
                    onClick={() => sendPredefinedNotification('equipment')}
                    disabled={!isConnected || testLoading}
                  >
                    Équipement
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ShoppingCart />}
                    onClick={() => sendPredefinedNotification('order')}
                    disabled={!isConnected || testLoading}
                  >
                    Commande
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Warning />}
                    onClick={() => sendPredefinedNotification('system')}
                    disabled={!isConnected || testLoading}
                  >
                    Système
                  </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Test personnalisé */}
                <Typography variant="subtitle2" gutterBottom>
                  Test personnalisé :
                </Typography>
                <Box display="flex" gap={2} mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Message de test"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Entrez votre message..."
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={testType}
                      label="Type"
                      onChange={(e) => setTestType(e.target.value as any)}
                    >
                      <MenuItem value="info">Info</MenuItem>
                      <MenuItem value="success">Succès</MenuItem>
                      <MenuItem value="warning">Attention</MenuItem>
                      <MenuItem value="error">Erreur</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={testLoading ? <CircularProgress size={16} /> : <Send />}
                    onClick={sendTestNotification}
                    disabled={!testMessage.trim() || !isConnected || testLoading}
                    size="small"
                  >
                    Envoyer
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={testLoading ? <CircularProgress size={16} /> : <Podcasts />}
                    onClick={sendBroadcast}
                    disabled={!testMessage.trim() || !isConnected || testLoading}
                    size="small"
                  >
                    Diffuser
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={reconnect}
                    disabled={testLoading}
                    size="small"
                  >
                    Reconnecter
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Notifications récentes */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Paper sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Notifications récentes ({notifications.length})
                  </Typography>
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={clearNotifications}
                      disabled={notifications.length === 0}
                    >
                      <Clear />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {notifications.length === 0 ? (
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center" 
                      height="100%"
                      color="text.secondary"
                    >
                      <Typography variant="body2">
                        Aucune notification récente
                      </Typography>
                    </Box>
                  ) : (
                    <List dense>
                      {notifications.slice(0, 10).map((notification, index) => (
                        <ListItem key={notification.id || index} divider>
                          <ListItemIcon>
                            {notification.type === 'error' ? <ErrorIcon color="error" /> :
                             notification.type === 'warning' ? <Warning color="warning" /> :
                             notification.type === 'success' ? <CheckCircle color="success" /> :
                             <Info color="info" />}
                          </ListItemIcon>
                          <ListItemText
                            primary={notification.message || notification.title}
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  {notification.createdAt ? 
                                    format(new Date(notification.createdAt), 'HH:mm:ss', { locale: fr }) :
                                    'Maintenant'
                                  }
                                </Typography>
                                {notification.module && (
                                  <Chip 
                                    size="small" 
                                    label={notification.module} 
                                    variant="outlined"
                                    sx={{ mt: 0.5, fontSize: '0.7rem', height: '20px' }}
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Détails par statut */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  État des réactifs chimiques
                </Typography>
                <Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Total</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.chemicals.total}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Stock bas</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.chemicals.lowStock}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Expirés</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.chemicals.expired}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  État des équipements
                </Typography>
                <Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Total</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.equipment.total}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Disponibles</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.equipment.available}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Maintenance</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.equipment.maintenance}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Rupture de stock</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.equipment.outOfStock}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  )
}