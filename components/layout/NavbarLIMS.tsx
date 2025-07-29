'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Badge, Avatar,
  Menu, MenuItem, Divider, ListItemIcon, Tooltip, InputBase,
  alpha, styled, Chip, Button, CircularProgress, List, ListItem, ListItemText,
  ListItemAvatar
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
import { ExtendedNotification, NotificationStats, WebSocketMessage } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
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
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

interface NavbarLIMSProps {
  onMenuClick: () => void;
  onThemeToggle: () => void;
}

const SEVERITY_ICONS = {
  low: <Info fontSize="small" color="info" />,
  medium: <Warning fontSize="small" color="warning" />,
  high: <Error fontSize="small" color="error" />,
  critical: <Error fontSize="small" color="error" />
};

const SEVERITY_COLORS = {
  low: 'info',
  medium: 'warning', 
  high: 'error',
  critical: 'error'
} as const;

export function NavbarLIMS({ onMenuClick, onThemeToggle }: NavbarLIMSProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme } = useAppSettings();
  const wsRef = useRef<WebSocket | null>(null);
  
  // États
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, byModule: {}, bySeverity: {} });
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Handlers pour les menus
  const handleProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
    if (notifications.length === 0) {
      fetchNotifications();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setNotificationAnchorEl(null);
  };

  // Récupération des notifications
  const fetchNotifications = async () => {
    if (!session?.user) return;
    
    try {
      setLoading(true);
      const userId = (session.user as any).id;
      
      const [notificationsResponse, statsResponse] = await Promise.all([
        fetch(`/api/notifications?userId=${userId}&limit=10&isRead=false`),
        fetch(`/api/notifications/stats?userId=${userId}`)
      ]);
      
      if (notificationsResponse.ok && statsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        const statsData = await statsResponse.json();
        
        setNotifications(notificationsData.notifications || []);
        setStats(statsData.stats || { total: 0, unread: 0, byModule: {}, bySeverity: {} });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marquer une notification comme lue
  const handleNotificationClick = async (notification: ExtendedNotification) => {
    try {
      if (!notification.isRead) {
        const response = await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'PUT'
        });
        
        if (response.ok) {
          // Mise à jour optimiste
          setNotifications(prev => 
            prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
          );
          setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
        }
      }
      
      setNotificationAnchorEl(null);
      router.push(`/notifications/${notification.id}`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    if (!session?.user) return;
    
    try {
      const userId = (session.user as any).id;
      const response = await fetch(`/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setStats(prev => ({ ...prev, unread: 0 }));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
    setNotificationAnchorEl(null);
  };

  // Configuration WebSocket
  useEffect(() => {
    if (!session?.user) return;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/notifications/ws`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        
        // S'identifier auprès du serveur WebSocket
        wsRef.current?.send(JSON.stringify({
          type: 'identify',
          userId: (session.user as any).id
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'notification':
              const newNotification = message.data as ExtendedNotification;
              if (newNotification.userId === (session.user as any).id) {
                setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
                setStats(prev => ({ 
                  ...prev, 
                  total: prev.total + 1,
                  unread: prev.unread + 1 
                }));
                
                // Notification du navigateur si autorisée
                if (Notification.permission === 'granted') {
                  new Notification('Nouvelle notification LIMS', {
                    body: newNotification.message,
                    icon: '/favicon.ico',
                    tag: newNotification.id
                  });
                }
              }
              break;
              
            case 'notification_read':
              const readData = message.data as { notificationIds: string[] };
              setNotifications(prev => 
                prev.map(n => 
                  readData.notificationIds.includes(n.id) 
                    ? { ...n, isRead: true } 
                    : n
                )
              );
              setStats(prev => ({ 
                ...prev, 
                unread: Math.max(0, prev.unread - readData.notificationIds.length)
              }));
              break;
              
            case 'notification_bulk_read':
              const bulkData = message.data as { userId: string };
              if (bulkData.userId === (session.user as any).id) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setStats(prev => ({ ...prev, unread: 0 }));
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        
        // Reconnexion automatique après 3 secondes
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [session]);

  // Chargement initial des notifications
  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      
      // Demander la permission pour les notifications du navigateur
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [session]);

  const formatNotificationTime = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { 
      addSuffix: true, 
      locale: fr 
    });
  };

  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.appBar,
        backgroundColor: theme === 'dark' ? '#121212' : '#ffffff',
        top: 0,
        left: 0,
        right: 0,
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Science sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="div" sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.primary' }}>
          LIMS
        </Typography>

        <Search sx={{ display: { xs: 'none', md: 'block' } }}>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Rechercher…"
            inputProps={{ 'aria-label': 'search' }}
          />
        </Search>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Changer de thème">
            <IconButton onClick={onThemeToggle} color="inherit">
              {theme === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          <Tooltip title={`Notifications ${wsConnected ? '(connecté)' : '(déconnecté)'}`}>
            <IconButton color="inherit" onClick={handleNotificationMenu}>
              <Badge badgeContent={stats.unread} color="error" max={99}>
                {wsConnected ? <NotificationsActive /> : <Notifications />}
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Profil">
            <IconButton onClick={handleProfileMenu} sx={{ p: 0, ml: 1 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                {session?.user?.name?.[0] || <AccountCircle />}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Menu Profil */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {session?.user?.name || 'Utilisateur'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {session?.user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { handleClose(); router.push('/profile'); }}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            Mon Profil
          </MenuItem>
          <MenuItem onClick={() => { handleClose(); router.push('/settings'); }}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            Paramètres
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { handleClose(); signOut(); }}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            Déconnexion
          </MenuItem>
        </Menu>

        {/* Menu Notifications */}
        <Menu
          anchorEl={notificationAnchorEl}
          open={Boolean(notificationAnchorEl)}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { width: 400, maxHeight: 500 } }}
        >
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Notifications {stats.unread > 0 && `(${stats.unread})`}
            </Typography>
            <Box>
              {stats.unread > 0 && (
                <Tooltip title="Marquer tout comme lu">
                  <IconButton onClick={markAllAsRead} size="small">
                    <CheckCircle />
                  </IconButton>
                </Tooltip>
              )}
              {loading && <CircularProgress size={20} />}
            </Box>
          </Box>
          <Divider />
          
          {notifications.length === 0 ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', width: '100%' }}>
                {loading ? 'Chargement...' : 'Aucune notification récente'}
              </Typography>
            </MenuItem>
          ) : (
            <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  component="button"
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    bgcolor: notification.isRead ? undefined : alpha(theme === 'dark' ? '#fff' : '#000', 0.05),
                    borderLeft: notification.isRead ? 'none' : `3px solid ${
                      notification.severity === 'critical' ? '#f44336' :
                      notification.severity === 'high' ? '#ff9800' :
                      notification.severity === 'medium' ? '#2196f3' : '#4caf50'
                    }`,
                    '&:hover': {
                      bgcolor: alpha(theme === 'dark' ? '#fff' : '#000', 0.1),
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {SEVERITY_ICONS[notification.severity]}
                      {!notification.isRead && (
                        <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                      )}
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: notification.isRead ? 400 : 600 }}>
                          {notification.message}
                        </Typography>
                        <Chip 
                          label={notification.module} 
                          size="small" 
                          variant="outlined"
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <AccessTime sx={{ fontSize: 12 }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatNotificationTime(notification.createdAt)}
                        </Typography>
                        {notification.triggeredBy && (
                          <Typography variant="caption" color="text.secondary">
                            • par {notification.triggeredBy.userName}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
          
          <Divider />
          <MenuItem component={Link} href="/notifications" onClick={handleClose}>
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <Button variant="text" size="small">
                Voir toutes les notifications
              </Button>
            </Box>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}