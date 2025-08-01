// components/layout/NavbarLIMS.tsx

'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Badge, Avatar,
  Menu, MenuItem, Divider, ListItemIcon, Tooltip, InputBase,
  alpha, styled, Chip, Button, CircularProgress, List, ListItem, useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon, Notifications, Brightness4, Brightness7,
  AccountCircle, Logout, Settings, Search as SearchIcon, 
  Person, NotificationsActive
} from '@mui/icons-material';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAppSettings } from '@/app/layout';
import { useWebSocketNotifications } from '@/lib/hooks/useWebSocketNotifications';
import type { WebSocketNotification } from '@/types/notifications';
import NotificationItem from '@/components/notifications/NotificationItem';
import Image from "next/image"
import { is } from 'date-fns/locale';



// Styled components avec correction des couleurs
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1, // Ensure AppBar is above the drawer
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

interface NavbarLIMSProps {
  onMenuClick: () => void;
}

export default function NavbarLIMS({ onMenuClick }: NavbarLIMSProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useAppSettings();
  const isDarkMode = theme === 'dark';
  
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState<null | HTMLElement>(null);
  const themeMUI = useTheme();
  
  // Responsive breakpoints
  const isDesktop = useMediaQuery(themeMUI.breakpoints.up('md'));
  const isTablet = useMediaQuery(themeMUI.breakpoints.between('sm', 'md'));
  const isMobile = useMediaQuery(themeMUI.breakpoints.down('sm'));

  const {
    notifications,
    stats,
    isConnected,
    isLoading,
    lastHeartbeat,
    markAsRead,
    markAllAsRead,
    disconnect,
    loadDatabaseNotifications
  } = useWebSocketNotifications();

  // Debug pour voir les notifications au chargement
  useEffect(() => {
  }, [notifications, stats]);
  
  // Charger les notifications depuis la base de données au démarrage
  useEffect(() => {
    if (session?.user?.id) {
      console.log('🔔 [NavbarLIMS] Loading database notifications');
      loadDatabaseNotifications();
    }
  }, [session?.user?.id, loadDatabaseNotifications]);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorElUser(event.currentTarget);
  const handleUserMenuClose = () => setAnchorElUser(null);
  const handleNotificationsOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorElNotifications(event.currentTarget);
  const handleNotificationsClose = () => setAnchorElNotifications(null);

  console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
  const handleSignOut = async () => {
    handleUserMenuClose();
    disconnect();
    // Correction: forcer le callbackUrl sur localhost en DEV
    let callbackUrl = `${window.location.origin}/auth/signin`;
    if (process.env.NODE_ENV === 'development') {
      callbackUrl = 'http://localhost:3000/auth/signin';
    }
    await signOut({ callbackUrl });
  };

  const handleNotificationClick = async (notification: WebSocketNotification) => {
    handleNotificationsClose();
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.module && notification.entityId) {
      const path = `/${notification.module.toLowerCase()}?highlight=${notification.entityId}`;
      router.push(path);
    } else {
      router.push('/notifications');
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <StyledAppBar position="fixed">
      <Toolbar>
        <IconButton edge="start" onClick={onMenuClick} aria-label="menu" sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>
            <Box display="flex" justifyContent="space-between" alignItems="center" position="relative"
            sx={{ flexGrow: 1 }}
            >
              <Box display="flex" alignItems="center" gap={isMobile ? 2 : 3}>
                <Avatar
                  sx={{
                    width: isMobile ? 40 : 50,
                    height: isMobile ? 40 : 50,
                    bgcolor: themeMUI.palette.background.paper,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                  }}
                >
                  <Image
                    src="/logo_2.png"
                    alt="Logo"
                    width={100}
                    height={100}
                  />
                </Avatar>
                {!isMobile && (
                  <Box>
                    <Typography variant={isTablet ? "h6" : "h5"} component="div" sx={{ fontWeight: 700 }}>
                      Gestion du Labo
                    </Typography>
                    {isDesktop && (
                      <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                        Version 2.1 • CMR Paul VALÉRY
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              </Box>
        {!isMobile && !isTablet && (
          <Search>
            <SearchIconWrapper><SearchIcon /></SearchIconWrapper>
            <StyledInputBase placeholder="Rechercher..." inputProps={{ 'aria-label': 'search' }} />
          </Search>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
          <Tooltip title={isDarkMode ? "Mode clair" : "Mode sombre"}>
            <IconButton onClick={toggleTheme}>
              {isDarkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          <Tooltip title={`Notifications ${isConnected ? '(temps réel)' : '(hors ligne)'}`}
          >
            <IconButton 
            id="notification-icon" 
            onClick={handleNotificationsOpen}
          sx ={{
            mx: 1
          }}
            >
              <Badge badgeContent={stats.unreadNotifications} color="error">
                {isConnected ? <NotificationsActive /> : <Notifications />}
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Responsive user info */}
          <Tooltip title="Profil utilisateur">
          <IconButton onClick={handleUserMenuOpen}
                  sx={{ 
                    bgcolor: themeMUI.palette.action.hover,
                    color: themeMUI.palette.text.primary,
                    height: 48,
                    borderRadius: 24,
                    '& .MuiChip-label': { px: 2 },
                    ml: 1,
                  }}
                  >
          {!isMobile  && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mr: 1, px: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {session?.user?.name || "Utilisateur"}
                  </Typography>
            {!isTablet  && (
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {(session?.user as any)?.role === 'ADMIN' ? 'ADMIN' : 
                     (session?.user as any)?.role === 'TEACHER' ? 'Enseignant' : 
                     (session?.user as any)?.role === 'ADMINLABO' ? 'Administrateur de Laboratoire' : 
                     (session?.user as any)?.role === 'LABORANTIN' ? 'Laborantin' : 'Utilisateur'}
                  </Typography>
            )}
            </Box>
            )}
                
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {session?.user?.name?.charAt(0) || <AccountCircle />}
                  </Avatar>
                </IconButton>
          </Tooltip>
                <IconButton 
                  color="inherit"
                  onClick={() => handleSignOut()}
                  
                  sx={{ 
                    bgcolor: themeMUI.palette.action.hover,
                    '&:hover': { bgcolor: themeMUI.palette.action.selected }
                  }}
                >
                  <Logout />
                </IconButton>
        </Box>

        <Menu
          anchorEl={anchorElNotifications}
          open={Boolean(anchorElNotifications)}
          onClose={handleNotificationsClose}
          slotProps={{ paper: { sx: { 
            width: 400, maxHeight: 500, mt: 1.5 } } }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">
              Notifications
              {isConnected && <Chip component="span" size="small" label="En ligne" color="success" sx={{ ml: 1 }} />}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats.unreadNotifications} non lues sur {stats.totalNotifications}
            </Typography>
            {lastHeartbeat && (
              <Typography variant="caption" color="text.secondary">
                Dernière activité: {new Date(lastHeartbeat).toLocaleTimeString()}
              </Typography>
            )}
          </Box>
          {stats.unreadNotifications > 0 && (
            <Button size="small" variant="text" onClick={handleMarkAllAsRead} sx={{ mt: 1, width: '100%' }}>
              Marquer tout comme lu
            </Button>
          )}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Aucune notification</Typography>
            </Box>
          ) : (
            <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
              {notifications.slice(0, 10).map((notification) => (
                <ListItem key={notification.id} disablePadding>
                  <NotificationItem 
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    compact={true}
                  />
                </ListItem>
              ))}
            </List>
          )}

          {notifications.length > 0 && (
            <Box>
              <Divider />
              <Box sx={{ p: 1 }}>
                <Button fullWidth size="small" component={Link} href="/notifications" onClick={handleNotificationsClose}>
                  Voir toutes les notifications
                </Button>
              </Box>
            </Box>
          )}
        </Menu>

        <Menu
          anchorEl={anchorElUser}
          open={Boolean(anchorElUser)}
          onClose={handleUserMenuClose}
          slotProps={{ paper: { sx: { mt: 1.5 } } }}
        >
          {session?.user ? [
            <Box key="user-info" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1">{session.user.name || 'Utilisateur'}</Typography>
              <Typography variant="body2" color="text.secondary">{session.user.email}</Typography>
            </Box>,
            <MenuItem key="profile" component={Link} href="/utilisateurs" onClick={handleUserMenuClose}>
              <ListItemIcon><Person fontSize="small" /></ListItemIcon>
              Profil
            </MenuItem>,
            <MenuItem key="settings" component={Link} href="/reglages" onClick={handleUserMenuClose}>
              <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
              Paramètres
            </MenuItem>,
            <Divider key="divider" />,
            <MenuItem key="logout" onClick={handleSignOut}>
              <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
              Déconnexion
            </MenuItem>
          ] : [
            <Box key="guest-info" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1">Non connecté</Typography>
              <Typography variant="body2" color="text.secondary">Cliquez pour vous connecter</Typography>
            </Box>,
            <MenuItem key="login" component={Link} href="/auth/signin" onClick={handleUserMenuClose}>
              <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
              Connexion
            </MenuItem>
          ]}
        </Menu>
      </Toolbar>
    </StyledAppBar>
  );
}






