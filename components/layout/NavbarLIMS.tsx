// components/layout/NavbarLIMS.tsx


import NotificationItem from '../notifications/NotificationItem';

// Styled components avec correction des couleurs
// components/layout/NavbarLIMS.tsx

'use client';

import React, { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Badge, Avatar,
  Menu, MenuItem, Divider, ListItemIcon, Tooltip, InputBase,
  alpha, styled, Chip, Button, CircularProgress, List, ListItem, ListItemText,
  ListItemAvatar, ListItemButton
} from '@mui/material';
import {
  Menu as MenuIcon, Notifications, Brightness4, Brightness7,
  AccountCircle, Logout, Settings, Search as SearchIcon, 
  Person, Info, Error as ErrorIcon, Warning, 
  NotificationsActive, Circle, AccessTime
} from '@mui/icons-material';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAppSettings } from '@/app/layout';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useWebSocketNotifications } from '@/lib/hooks/useWebSocketNotifications';
import type { WebSocketNotification } from '@/types/notifications';



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

const getSeverityIcon = (severity: string, isDarkMode: boolean) => {
  const iconColor = isDarkMode ? '#ffffff' : '#000000';
  
  const icons = {
    low: <Info fontSize="small" sx={{ color: iconColor }} />,
    medium: <Warning fontSize="small" sx={{ color: iconColor }} />,
    high: <ErrorIcon fontSize="small" sx={{ color: iconColor }} />,
    critical: <ErrorIcon fontSize="small" sx={{ color: iconColor }} />
  };
  
  return icons[severity as keyof typeof icons] || icons.low;
};

const getNotificationMessage = (message: any, locale: string = 'fr'): string => {
  if (typeof message === 'string') return message;
  if (typeof message === 'object' && message !== null) {
    return message[locale] || message.fr || message.en || Object.values(message)[0] || 'Message non disponible';
  }
  return 'Message non disponible';
};

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

  const {
    notifications,
    stats,
    isConnected,
    isLoading,
    lastHeartbeat,
    markAsRead,
    markAllAsRead,
    disconnect,
  } = useWebSocketNotifications();

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorElUser(event.currentTarget);
  const handleUserMenuClose = () => setAnchorElUser(null);
  const handleNotificationsOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorElNotifications(event.currentTarget);
  const handleNotificationsClose = () => setAnchorElNotifications(null);

  const handleSignOut = async () => {
    handleUserMenuClose();
    disconnect();
    await signOut({ callbackUrl: `${window.location.origin}/auth/signin` });
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

        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Paul VALÉRY - Gestion du Laboratoire
        </Typography>

        <Search>
          <SearchIconWrapper><SearchIcon /></SearchIconWrapper>
          <StyledInputBase placeholder="Rechercher..." inputProps={{ 'aria-label': 'search' }} />
        </Search>

        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
          <Tooltip title={isDarkMode ? "Mode clair" : "Mode sombre"}>
            <IconButton onClick={toggleTheme}>
              {isDarkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          <Tooltip title={`Notifications ${isConnected ? '(temps réel)' : '(hors ligne)'}`}>
            <IconButton id="notification-icon" onClick={handleNotificationsOpen}>
              <Badge badgeContent={stats.unreadNotifications} color="error">
                {isConnected ? <NotificationsActive /> : <Notifications />}
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Profil utilisateur">
            <IconButton onClick={handleUserMenuOpen} sx={{ ml: 1 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {session?.user?.name?.charAt(0) || <AccountCircle />}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={anchorElNotifications}
          open={Boolean(anchorElNotifications)}
          onClose={handleNotificationsClose}
          slotProps={{ paper: { sx: { width: 400, maxHeight: 500, mt: 1.5 } } }}
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
            <Box sx={{ p: 3, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">Aucune notification</Typography></Box>
          ) : (
            <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
              {notifications.slice(0, 10).map((notification) => (
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
                          <Typography variant="body2" sx={{ fontWeight: notification.isRead ? 400 : 600, flex: 1 }}>
                            {getNotificationMessage(notification.message, 'fr')}
                          </Typography>
                          {!notification.isRead && <Circle sx={{ fontSize: 8, color: 'primary.main' }} />}
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip component="span" label={notification.module} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          <Typography variant="caption" color="text.secondary">
                            <AccessTime sx={{ fontSize: 12, mr: 0.5 }} />
                            {formatDistanceToNow(new Date(notification.createdAt || notification.timestamp), { addSuffix: true, locale: fr })}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}

          {notifications.length > 0 && (
            <>
              <Divider />
              <Box sx={{ p: 1 }}>
                <Button fullWidth size="small" component={Link} href="/notifications" onClick={handleNotificationsClose}>
                  Voir toutes les notifications
                </Button>
              </Box>
            </>
          )}
        </Menu>

        <Menu
          anchorEl={anchorElUser}
          open={Boolean(anchorElUser)}
          onClose={handleUserMenuClose}
          PaperProps={{ sx: { mt: 1.5 } }}
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



const NavMenu = () => {
    const { data: session } = useSession();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  // Gestionnaires de menu
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };
    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };
  const handleUserMenuClose = () => {
    setAnchorElUser(null);
  };
    const handleSignOut = async () => {
        handleClose();
        await signOut({ callbackUrl: '/auth/signin' });
    };

    return (
        <div>
          <Tooltip title="Profil utilisateur">
            <IconButton onClick={handleUserMenuOpen} sx={{ ml: 1 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {session?.user?.name?.charAt(0) || <AccountCircle />}
              </Avatar>
            </IconButton>
          </Tooltip>
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
            [
              <Box key="user-info" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1">
                  {session.user.name || 'Utilisateur'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {session.user.email}
                </Typography>
              </Box>,
              <MenuItem key="profile" component={Link} href="/utilisateurs" onClick={handleUserMenuClose}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                Profil
              </MenuItem>,
              <MenuItem key="settings" component={Link} href="/reglages" onClick={handleUserMenuClose}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Paramètres
              </MenuItem>,
              <Divider key="divider" />,
              <MenuItem key="logout" onClick={handleSignOut}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Déconnexion
              </MenuItem>
            ]
          ) : (
            // Menu pour utilisateur non connecté
            [
              <Box key="guest-info" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1">
                  Non connecté
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cliquez pour vous connecter
                </Typography>
              </Box>,
              <MenuItem
                key="login"
                component={Link}
                href="/auth/signin"
                onClick={handleUserMenuClose}
              >
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                Connexion
              </MenuItem>
            ]
          )}
        </Menu>
        </div>
    );
};




