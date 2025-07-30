// components/layout/NavbarLIMS.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Badge, Avatar,
  Menu, MenuItem, Divider, ListItemIcon, Tooltip, InputBase,
  alpha, styled, Chip, Button, CircularProgress, List, ListItem, ListItemText,
  ListItemAvatar, ListItemButton
} from '@mui/material';
import {
  Menu as MenuIcon, Notifications, Brightness4, Brightness7,
  AccountCircle, Logout, Settings, Search as SearchIcon, Science,
  Person, Info, Check, CheckCircle, Error, Warning, 
  NotificationsActive, Circle, AccessTime
} from '@mui/icons-material';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAppSettings } from '@/app/layout';
import { ExtendedNotification, NotificationStats } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Styled components avec correction des couleurs
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#ffffff',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
  boxShadow: theme.palette.mode === 'dark' 
    ? '0 2px 4px rgba(0,0,0,0.3)' 
    : '0 2px 4px rgba(0,0,0,0.1)',
  borderBottom: theme.palette.mode === 'dark' 
    ? 'none' 
    : `1px solid ${theme.palette.divider}`,
  // Variables CSS personnalisées
  '--AppBar-color': theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
  '& *': {
    color: 'var(--AppBar-color) !important',
  },
  // Exceptions pour certains éléments qui ont besoin de leurs couleurs spécifiques
  '& .MuiChip-root': {
    color: `${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'} !important`,
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.primary.main, 0.2)
      : alpha(theme.palette.primary.main, 0.1),
  },
  '& .MuiIconButton-root': {
    color: `${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'} !important`,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? alpha('#ffffff', 0.1)
        : alpha('#000000', 0.1),
    }
  },
  '& .MuiInputBase-root': {
    color: `${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'} !important`,
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha('#ffffff', 0.1)
      : alpha('#000000', 0.05),
    '& .MuiInputBase-input': {
      color: `${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'} !important`,
      '&::placeholder': {
        color: `${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} !important`,
      }
    }
  },
  '& .MuiTypography-root': {
    color: `${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'} !important`,
  },
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.error.main,
    color: '#ffffff',
  },
  // Animation de pulsation pour les notifications
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(1)',
      boxShadow: '0 0 0 0 rgba(255, 82, 82, 0.7)',
    },
    '70%': {
      transform: 'scale(1.1)',
      boxShadow: '0 0 10px 10px rgba(255, 82, 82, 0)',
    },
    '100%': {
      transform: 'scale(1)',
      boxShadow: '0 0 0 0 rgba(255, 82, 82, 0)',
    },
  },
  '.pulse': {
    animation: 'pulse 1s',
  },
}));

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.common.white, 0.15)
    : alpha(theme.palette.common.black, 0.05),
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.common.white, 0.25)
      : alpha(theme.palette.common.black, 0.1),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: '12ch',
      '&:focus': {
        width: '20ch',
      },
    },
    color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
    '&::placeholder': {
      color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
    }
  },
}));

// Interface pour les messages SSE
interface SSEMessage {
  type: 'notification' | 'connected' | 'heartbeat';
  userId?: string;
  data?: any;
  timestamp?: number;
}

// Icônes de sévérité avec couleurs adaptées au thème
const getSeverityIcon = (severity: string, isDarkMode: boolean) => {
  const iconColor = isDarkMode ? '#ffffff' : '#000000';
  
  const icons = {
    low: <Info fontSize="small" sx={{ color: iconColor }} />,
    medium: <Warning fontSize="small" sx={{ color: iconColor }} />,
    high: <Error fontSize="small" sx={{ color: iconColor }} />,
    critical: <Error fontSize="small" sx={{ color: iconColor }} />
  };
  
  return icons[severity as keyof typeof icons] || icons.low;
};

// Fonction utilitaire pour extraire le message dans la langue appropriée
const getNotificationMessage = (message: any, locale: string = 'fr'): string => {
  if (typeof message === 'string') {
    return message;
  }
  
  if (typeof message === 'object' && message !== null) {
    // Essayer d'abord la langue demandée, puis français, puis anglais, puis la première disponible
    return message[locale] || message.fr || message.en || Object.values(message)[0] || 'Message non disponible';
  }
  
  return 'Message non disponible';
};

// Fonction utilitaire pour extraire les détails
const getNotificationDetails = (details: any): string => {
  if (typeof details === 'string') {
    return details;
  }
  
  if (typeof details === 'object' && details !== null) {
    return details.fr || details.en || Object.values(details)[0] || '';
  }
  
  return '';
};

interface NavbarLIMSProps {
  onMenuClick: () => void;
}

export default function NavbarLIMS({ onMenuClick }: NavbarLIMSProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useAppSettings();
  
  // Déterminer si on est en mode sombre
  const isDarkMode = theme === 'dark';
  
  // États pour les menus
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState<null | HTMLElement>(null);
  
  // États pour les notifications avec byReason ajouté
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byModule: {},
    bySeverity: {},
    byReason: {} // Propriété manquante ajoutée
  });
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  
  // SSE (Server-Sent Events) au lieu de WebSocket
  const [sseConnected, setSseConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Gestionnaires de menu
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorElUser(null);
  };

  const handleNotificationsOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNotifications(event.currentTarget);
    // Les notifications sont déjà à jour grâce au SSE, pas besoin de refetch
  };

  const handleNotificationsClose = () => {
    setAnchorElNotifications(null);
  };

  const handleSignOut = async () => {
    handleUserMenuClose();
    
    try {
      // Fermer la connexion SSE avant la déconnexion
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Effectuer la déconnexion avec une URL de redirection absolue
      const result = await signOut({ 
        callbackUrl: `${window.location.origin}/auth/signin`,
        redirect: true // Forcer la redirection
      });
      
      // Si la redirection automatique ne fonctionne pas, forcer manuellement
      if (!result) {
        window.location.href = '/auth/signin';
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, rediriger quand même
      window.location.href = '/auth/signin';
    }
  };

  // Récupération des notifications
  const fetchNotifications = async () => {
    if (!session?.user) return;

    try {
      setLoadingNotifications(true);
      const userId = (session.user as any).id;
      const [notificationsResponse, statsResponse] = await Promise.all([
        fetch(`/api/notifications?userId=${userId}&limit=50`), // Récupérer plus pour avoir l'historique
        fetch(`/api/notifications/stats?userId=${userId}`)
      ]);

      if (notificationsResponse.ok && statsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        const statsData = await statsResponse.json();
        
        setNotifications(notificationsData.notifications || []);
        
        // S'assurer que toutes les propriétés requises sont présentes
        const stats = statsData.stats || {};
        setNotificationStats({
          total: stats.total || 0,
          unread: stats.unread || 0,
          byModule: stats.byModule || {},
          bySeverity: stats.bySeverity || {},
          byReason: stats.byReason || {} // S'assurer que byReason est présent
        });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fonction pour demander la permission des notifications push
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Ce navigateur ne supporte pas les notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPushNotificationsEnabled(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushNotificationsEnabled(true);
        return true;
      }
    }

    setPushNotificationsEnabled(false);
    return false;
  };

  // Fonction pour afficher une notification push
  const showPushNotification = (notification: ExtendedNotification) => {
    if (!pushNotificationsEnabled || Notification.permission !== 'granted') {
      return;
    }

    const title = `LIMS - ${notification.module}`;
    const message = getNotificationMessage(notification.message, 'fr');
    
    const options = {
      body: message,
      icon: '/logo.png', // Assurez-vous d'avoir ce fichier
      badge: '/logo.png',
      tag: notification.id,
      requireInteraction: notification.severity === 'critical',
      actions: [
        {
          action: 'view',
          title: 'Voir'
        },
        {
          action: 'dismiss',
          title: 'Ignorer'
        }
      ]
    };

    const pushNotification = new Notification(title, options);

    pushNotification.onclick = () => {
      window.focus();
      handleNotificationClick(notification);
      pushNotification.close();
    };

    // Auto-fermeture après 10 secondes sauf pour les notifications critiques
    if (notification.severity !== 'critical') {
      setTimeout(() => {
        pushNotification.close();
      }, 10000);
    }
  };

  // SSE pour les notifications en temps réel
  useEffect(() => {
    if (!session?.user) return;

    // Demander la permission pour les notifications push
    requestNotificationPermission();

    const userId = (session.user as any).id;
    
    const connectSSE = () => {
      try {
        // Fermer la connexion existante si elle existe
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        // Créer une nouvelle connexion SSE
        const eventSource = new EventSource(`/api/notifications/ws?userId=${encodeURIComponent(userId)}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          
          setSseConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const message: SSEMessage = JSON.parse(event.data);
            
            switch (message.type) {
              case 'connected':
                console.log('[SSE] Connexion établie, récupération des données initiales...');
                // Récupérer les notifications et stats à la connexion
                fetchNotifications();
                break;
                
              case 'notification':
                if (message.data) {
                  const notificationData = message.data as ExtendedNotification;
                  console.log('[SSE] Nouvelle notification reçue:', notificationData);
                  
                  // Animer l'icône de notification
                  const icon = document.getElementById('notification-icon');
                  if (icon) {
                    icon.classList.add('pulse');
                    setTimeout(() => icon.classList.remove('pulse'), 1000);
                  }
                  
                  // Afficher une notification push si elle n'est pas lue et que les permissions sont accordées
                  if (!notificationData.isRead && pushNotificationsEnabled) {
                    showPushNotification(notificationData);
                  }
                  
                  // Ajouter la nouvelle notification en tête de liste
                  setNotifications(prev => {
                    // Éviter les doublons
                    const exists = prev.some(n => n.id === notificationData.id);
                    if (exists) return prev;
                    return [notificationData, ...prev.slice(0, 49)]; // Garder max 50 notifications
                  });
                  
                  // Mettre à jour les statistiques de manière immuable
                  setNotificationStats(prev => {
                    const newUnread = prev.unread + (notificationData.isRead ? 0 : 1);
                    const newTotal = prev.total + 1;
                    
                    const newByModule = { ...prev.byModule };
                    newByModule[notificationData.module] = (newByModule[notificationData.module] || 0) + 1;

                    const newBySeverity = { ...prev.bySeverity };
                    newBySeverity[notificationData.severity] = (newBySeverity[notificationData.severity] || 0) + 1;

                    return {
                      ...prev,
                      total: newTotal,
                      unread: newUnread,
                      byModule: newByModule,
                      bySeverity: newBySeverity,
                    };
                  });
                }
                break;
                
              case 'heartbeat':
                setLastHeartbeat(message.timestamp || Date.now());
                break;
                
              default:
                console.log('[SSE] Message non géré:', message.type);
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          setSseConnected(false);
          
          // Tentative de reconnexion après 3 secondes
          setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              console.log('[SSE] Tentative de reconnexion...');
              connectSSE();
            }
          }, 3000);
        };

      } catch (error) {
        console.error('Error creating EventSource:', error);
        setSseConnected(false);
      }
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [session]);

  // Chargement initial des notifications
  useEffect(() => {
    fetchNotifications();
  }, [session]);

  const handleNotificationClick = async (notification: ExtendedNotification) => {
    handleNotificationsClose();
    
    // Marquer comme lue si nécessaire
    if (!notification.isRead) {
      try {
        const response = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'markAsRead',
            notificationId: notification.id
          }),
        });
        
        if (response.ok) {
          // Mise à jour optimiste
          setNotifications(prev => 
            prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
          );
          setNotificationStats(prev => ({
            ...prev,
            unread: Math.max(0, prev.unread - 1)
          }));
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    // Naviguer vers la page de détail ou une page appropriée selon le module
    if (notification.module && notification.entityId) {
      // Logique de navigation selon le module
      switch (notification.module.toLowerCase()) {
        case 'equipment':
          router.push(`/materiel?highlight=${notification.entityId}`);
          break;
        case 'calendar':
          router.push(`/calendrier?highlight=${notification.entityId}`);
          break;
        case 'chemicals':
          router.push(`/chemicals?highlight=${notification.entityId}`);
          break;
        default:
          router.push('/notifications');
      }
    } else {
      router.push('/notifications');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!session?.user) return;
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          action: 'markAllAsRead'
        })
      });
      
      if (response.ok) {
        // Mettre à jour l'état local
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setNotificationStats(prev => ({ ...prev, unread: 0 }));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <StyledAppBar position="fixed">
      <Toolbar>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          aria-label="menu"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Paul VALÉRY - Gestion du Laboratoire
        </Typography>

        {/* Barre de recherche */}
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Rechercher..."
            inputProps={{ 'aria-label': 'search' }}
          />
        </Search>

        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
          {/* Bouton de basculement du thème */}
          <Tooltip title={isDarkMode ? "Mode clair" : "Mode sombre"}>
            <IconButton onClick={toggleTheme}>
              {isDarkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title={`Notifications ${sseConnected ? '(temps réel)' : '(hors ligne)'}`}>
            <IconButton id="notification-icon" onClick={handleNotificationsOpen}>
              <Badge badgeContent={notificationStats.unread} color="error">
                {sseConnected ? (
                  <NotificationsActive sx={{ 
                    color: isDarkMode ? '#ffffff' : '#000000',
                  }} />
                ) : (
                  <Notifications sx={{ color: isDarkMode ? '#ffffff' : '#000000' }} />
                )}
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Menu utilisateur */}
          <Tooltip title="Profil utilisateur">
            <IconButton onClick={handleUserMenuOpen} sx={{ ml: 1 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {session?.user?.name?.charAt(0) || <AccountCircle />}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Menu des notifications */}
        <Menu
          anchorEl={anchorElNotifications}
          open={Boolean(anchorElNotifications)}
          onClose={handleNotificationsClose}
          slotProps={{
            paper: {
              sx: { 
                width: 400, 
                maxHeight: 500,
                mt: 1.5
              }
            }
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">
              Notifications
              {sseConnected && (
                <Chip 
                  component="span"
                  size="small" 
                  label="En ligne" 
                  color="success" 
                  sx={{ ml: 1 }} 
                />
              )}
              {pushNotificationsEnabled && (
                <Chip 
                  component="span"
                  size="small" 
                  label="Push" 
                  color="primary" 
                  sx={{ ml: 1 }} 
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {notificationStats.unread} non lues sur {notificationStats.total} • {notifications.length} affichées
              {!pushNotificationsEnabled && (
                <Button
                  size="small"
                  variant="text"
                  onClick={requestNotificationPermission}
                  sx={{ ml: 1, minWidth: 'auto', p: 0.5 }}
                >
                  Activer les notifications push
                </Button>
              )}
            </Typography>
            
            {lastHeartbeat && (
              <Typography variant="caption" color="text.secondary">
                Dernière activité: {new Date(lastHeartbeat).toLocaleTimeString()}
              </Typography>
            )}
          </Box>
          {notificationStats.unread > 0 && (
            <Button
              size="small"
              variant="text"
              onClick={handleMarkAllAsRead}
              sx={{ mt: 1 }}
            >
              Marquer tout comme lu
            </Button>
          )}
          {loadingNotifications ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Aucune notification
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
              {(() => {
                // Séparer les notifications lues et non lues
                const unreadNotifications = notifications.filter(n => !n.isRead);
                const readNotifications = notifications.filter(n => n.isRead);
                
                let displayNotifications = [];
                
                if (unreadNotifications.length >= 10) {
                  // Si 10+ non lues, afficher seulement les 10 premières non lues
                  displayNotifications = unreadNotifications.slice(0, 10);
                } else {
                  // Sinon, afficher toutes les non lues + compléter avec les lues jusqu'à 10
                  const remainingSlots = 10 - unreadNotifications.length;
                  displayNotifications = [
                    ...unreadNotifications,
                    ...readNotifications.slice(0, remainingSlots)
                  ];
                }
                
                return displayNotifications.map((notification) => (
                  <ListItem
                    key={notification.id}
                    disablePadding
                    sx={{
                      bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                      borderLeft: notification.isRead ? 'none' : '4px solid',
                      borderLeftColor: 'primary.main'
                    }}
                  >
                    <ListItemButton onClick={() => handleNotificationClick(notification)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getSeverityIcon(notification.severity, isDarkMode)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: notification.isRead ? 400 : 600,
                                flex: 1
                              }}
                            >
                              {getNotificationMessage(notification.message, 'fr')}
                            </Typography>
                            {!notification.isRead && (
                              <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box component={'span'} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip 
                              component={'span'}
                              label={notification.module} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              <AccessTime sx={{ fontSize: 12, mr: 0.5 }} />
                              {formatDistanceToNow(new Date(notification.createdAt), { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ));
              })()}
            </List>
          )}

          {notifications.length > 0 && (
            [<Divider key="divider" />,
            <Box key="button-container" sx={{ p: 1 }}>
                <Button 
                  fullWidth 
                  size="small" 
                  component={Link} 
                  href="/notifications"
                  onClick={handleNotificationsClose}
                >
                  Voir toutes les notifications
                </Button>
            </Box>]
          )}
        </Menu>

        {/* Menu utilisateur */}
        <Menu
          anchorEl={anchorElUser}
          open={Boolean(anchorElUser)}
          onClose={handleUserMenuClose}
          PaperProps={{
            sx: { mt: 1.5 }
          }}
        >
          {session?.user ? (
            // Menu pour utilisateur connecté
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1">
                  {session.user.name || 'Utilisateur'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {session.user.email}
                </Typography>
              </Box>

              <MenuItem component={Link} href="/utilisateurs" onClick={handleUserMenuClose}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                Profil
              </MenuItem>

              <MenuItem component={Link} href="/reglages" onClick={handleUserMenuClose}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Paramètres
              </MenuItem>

              <Divider />

              <MenuItem onClick={handleSignOut}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Déconnexion
              </MenuItem>
            </>
          ) : (
            // Menu pour utilisateur non connecté
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1">
                  Non connecté
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cliquez pour vous connecter
                </Typography>
              </Box>

              <MenuItem 
                component={Link} 
                href="/auth/signin" 
                onClick={handleUserMenuClose}
              >
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                Connexion
              </MenuItem>
            </>
          )}
        </Menu>
      </Toolbar>
    </StyledAppBar>
  );
}