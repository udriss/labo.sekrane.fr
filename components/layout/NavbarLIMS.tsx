// components/layout/NavbarLIMS.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Tooltip,
  InputBase,
  Chip,
  Button,
  List,
  Stack,
  ClickAwayListener,
  Fade,
} from '@mui/material';
import { styled, alpha, useTheme } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  Notifications,
  Brightness4,
  Brightness7,
  AccountCircle,
  Logout,
  Settings,
  Search as SearchIcon,
  Person,
  NotificationsActive,
} from '@mui/icons-material';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAppSettings } from '../../lib/hooks/useAppSettings';
import { useWebSocketNotifications } from '../../lib/hooks/useWebSocketNotifications';
import type { WebSocketNotification } from '../../types/notifications';
import NotificationItem from '../notifications/NotificationItem';
import useMediaQuery from '@mui/material/useMediaQuery';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.appBar,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#ffffff',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
  boxShadow:
    theme.palette.mode === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
  borderBottom: theme.palette.mode === 'dark' ? 'none' : `1px solid ${theme.palette.divider}`,
  '& *': { color: `${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'} !important` },
  '& .MuiBadge-badge': { backgroundColor: theme.palette.error.main, color: '#ffffff' },
}));

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.15)
      : alpha(theme.palette.common.black, 0.05),
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.25)
        : alpha(theme.palette.common.black, 0.1),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: { marginLeft: theme.spacing(1), width: 'auto' },
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
    [theme.breakpoints.up('sm')]: { width: '12ch', '&:focus': { width: '20ch' } },
    '&::placeholder': {
      color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
    },
  },
}));

interface Props {
  onMenuClick?: () => void;
}

export default function NavbarLIMS({ onMenuClick }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useAppSettings();

  const themeMUI = useTheme();
  const isMobile = useMediaQuery(themeMUI.breakpoints.down('md'));
  const isMobileSmall = useMediaQuery(themeMUI.breakpoints.down('sm'));

  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState<null | HTMLElement>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Notifications state backed by WS messages
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  // Number of items currently visible in the notifications menu list
  const [visibleCount, setVisibleCount] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const localUnread = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const [unreadServer, setUnreadServer] = useState<number | null>(null);
  const unread = unreadServer ?? localUnread;
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const isAuthenticated = status === 'authenticated' && !!session?.user;

  // Initial load from API (DB persisted)
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await fetch('/api/notifications?limit=50');
        if (!res.ok) return;
        const json = await res.json();
        if (typeof json.total === 'number') setTotalCount(json.total);
        if (typeof json.unreadTotal === 'number') setUnreadServer(json.unreadTotal);
        if (json.items) {
          const items: WebSocketNotification[] = json.items.map((it: any) => {
            const notif = it.notification;
            const data = notif.data || {};
            return {
              id: String(notif.id),
              ts: new Date(notif.createdAt).getTime(),
              type: notif.type || notif.severity || 'notification',
              title: notif.title || notif.module + ' ' + notif.actionType,
              message: notif.message,
              isRead: !!it.readAt,
              module: notif.module,
              actionType: notif.actionType,
              severity: notif.severity,
              data,
              triggeredBy: data.triggeredBy,
              quantityPrev: data.quantityPrev,
              quantityNew: data.quantityNew,
              stockPrev: data.stockPrev,
              stockNew: data.stockNew,
              eventId: data.eventId,
              timeslotIds: data.timeslotIds,
              entityId: data.materielId || data.reactifId || undefined,
              createdAt: notif.createdAt,
            } as WebSocketNotification;
          });
          setNotifications(items);
          if (items.length) setCursor(Number(items[items.length - 1].id));
          setHasMore(items.length === 50);
        }
      } catch (e) {
        console.warn('Failed to load notifications', e);
      }
    })();
  }, [isAuthenticated]);
  const userId = (session?.user as any)?.id ?? 'guest';
  const { connected, reconnecting, attempts, disconnect } = useWebSocketNotifications({
    userId,
    onMessage: (msg) => {
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[NavbarLIMS] WS message received:', msg);
      }

      // Ignorer les messages de contrôle WebSocket
      if (
        !msg ||
        msg.type === 'connected' ||
        msg.type === 'pong' ||
        (typeof msg === 'string' && (msg === 'pong' || msg === 'ping'))
      ) {
        return;
      }

      if (msg.type === 'bulk-notifications' && Array.isArray(msg.items)) {
        // Legacy bulk path (in-memory) kept for backward compat
        const mapped = msg.items.map((m: any) => ({
          id: String(m.id),
          ts: m.createdAt || Date.now(),
          type: m.type || 'info',
          title: m.title || 'Notification',
          message: m.message || '',
          isRead: !!m.read,
          module: m.module,
          actionType: m.actionType,
          severity: m.severity,
          data: m.data || {},
          triggeredBy: m.data?.triggeredBy,
          quantityPrev: m.data?.quantityPrev,
          quantityNew: m.data?.quantityNew,
          stockPrev: m.data?.stockPrev,
          stockNew: m.data?.stockNew,
          entityId: m.data?.materielId || m.data?.reactifId || undefined,
          createdAt:
            typeof m.createdAt === 'string'
              ? m.createdAt
              : m.createdAt
                ? new Date(m.createdAt).toISOString()
                : new Date().toISOString(),
        }));
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnes = mapped.filter((m) => !existingIds.has(m.id));
          const merged = [...newOnes, ...prev];
          // Update total count dynamically (+ number of truly new items)
          if (newOnes.length > 0) {
            setTotalCount((t) => (typeof t === 'number' ? t + newOnes.length : merged.length));
          }
          return merged.slice(0, 50);
        });
        return;
      }
      if (msg.type === 'presence' && msg.userId) {
        // Maintain a global set of online users for cross-component consumption
        try {
          const ev = new CustomEvent('ws-presence', { detail: msg });
          window.dispatchEvent(ev);
        } catch {}
        return;
      }
      if (msg.type === 'notification' && msg.notification) {
        const n = msg.notification;
        const data = n.data || {};
        const notif: WebSocketNotification = {
          id: String(n.id),
          ts: new Date(n.createdAt || Date.now()).getTime(),
          type: n.type || n.severity || 'notification',
          title: n.title || n.module + ' ' + n.actionType,
          message: n.message,
          isRead: !!n.read,
          module: n.module,
          actionType: n.actionType,
          severity: n.severity,
          data,
          triggeredBy: data.triggeredBy,
          quantityPrev: data.quantityPrev,
          quantityNew: data.quantityNew,
          stockPrev: data.stockPrev,
          stockNew: data.stockNew,
          entityId: data.materielId || data.reactifId || undefined,
          eventId: data.eventId,
          timeslotIds: data.timeslotIds,
          createdAt: n.createdAt,
        };
        // Emit role update signal for the active user
        if (n.actionType === 'ROLE_CHANGED' && data?.userId) {
          try {
            window.dispatchEvent(
              new CustomEvent('role-changed', {
                detail: { userId: data.userId, newRole: data.newRole },
              }),
            );
          } catch {}
          // If this is the current user, force a reload so the new role is applied everywhere
          try {
            const myId = (session?.user as any)?.id;
            if (myId && String(myId) === String(data.userId)) {
              setTimeout(() => window.location.reload(), 300);
            }
          } catch {}
        }
        setNotifications((prev) => {
          const exists = prev.some((p) => p.id === notif.id);
          const next = [notif, ...prev.filter((p) => p.id !== notif.id)].slice(0, 50);
          if (!exists) {
            setTotalCount((t) => (typeof t === 'number' ? t + 1 : next.length));
          }
          return next;
        });
        setUnreadServer((u) => (typeof u === 'number' ? u + 1 : u));
        return;
      }
      if (msg.type === 'notification-read') {
        if (msg.id) {
          setNotifications((prev) =>
            prev.map((p) => (p.id === String(msg.id) ? { ...p, isRead: true } : p)),
          );
          setUnreadServer((u) => (typeof u === 'number' ? Math.max(0, u - 1) : u));
        }
        return;
      }
    },
  });

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read', { method: 'PUT' });
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadServer(0);
  };
  const loadMore = async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/notifications?limit=50&cursor=${cursor}`);
      if (res.ok) {
        const json = await res.json();
        if (typeof json.total === 'number') setTotalCount(json.total);
        if (typeof json.unreadTotal === 'number') setUnreadServer(json.unreadTotal);
        const items: WebSocketNotification[] = (json.items || []).map((it: any) => {
          const notif = it.notification;
          const data = notif.data || {};
          return {
            id: String(notif.id),
            ts: new Date(notif.createdAt).getTime(),
            type: notif.type || notif.severity || 'notification',
            title: notif.title || notif.module + ' ' + notif.actionType,
            message: notif.message,
            isRead: !!it.readAt,
            module: notif.module,
            actionType: notif.actionType,
            severity: notif.severity,
            data,
            triggeredBy: data.triggeredBy,
            quantityPrev: data.quantityPrev,
            quantityNew: data.quantityNew,
            stockPrev: data.stockPrev,
            stockNew: data.stockNew,
            createdAt: notif.createdAt,
          } as WebSocketNotification;
        });
        setNotifications((prev) => [...prev, ...items]);
        if (items.length) setCursor(Number(items[items.length - 1].id));
        if (items.length < 50) setHasMore(false);
        setVisibleCount((c) => c + items.length);
      }
    } finally {
      setLoadingMore(false);
    }
  };
  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {}
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadServer((u) => (typeof u === 'number' ? Math.max(0, u - 1) : u));
  };

  const handleUserMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorElUser(e.currentTarget);
  const handleUserMenuClose = () => setAnchorElUser(null);
  const handleNotificationsOpen = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorElNotifications(e.currentTarget);
  const handleNotificationsClose = () => setAnchorElNotifications(null);

  const handleSignOut = async () => {
    handleUserMenuClose();
    disconnect();
    const callbackUrl = `${window.location.origin}/signin`;
    await signOut({ callbackUrl });
  };

  return (
    <StyledAppBar position="fixed" sx={{ mb: 0 }}>
      <Toolbar>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          aria-label="menu"
          sx={{ mr: 2, ...(isMobile && mobileSearchOpen ? { visibility: 'hidden' } : {}) }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Link
            href="/"
            className="font-semibold"
            style={isMobile && mobileSearchOpen ? { visibility: 'hidden' } : undefined}
          >
            SGIL
          </Link>
          {/* Desktop search */}
          {!isMobile && (
            <Search>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const q = String(fd.get('q') || '').trim();
                  if (q) router.push(`/recherche?q=${encodeURIComponent(q)}`);
                }}
              >
                <StyledInputBase
                  name="q"
                  placeholder="Rechercher..."
                  slotProps={{ input: { 'aria-label': 'search' } }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      const q = target.value.trim();
                      if (q) router.push(`/recherche?q=${encodeURIComponent(q)}`);
                    }
                  }}
                />
              </form>
            </Search>
          )}
        </Box>

        {/* Mobile search toggle */}
        {isMobile && !mobileSearchOpen && (
          <IconButton onClick={() => setMobileSearchOpen(true)} aria-label="search">
            <SearchIcon />
          </IconButton>
        )}

        {/* Mobile search overlay */}
        {isMobile && mobileSearchOpen && (
          <ClickAwayListener onClickAway={() => setMobileSearchOpen(false)}>
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
              }}
            >
              <Fade in={mobileSearchOpen}>
                <Box sx={{ flex: 1 }}>
                  <Search sx={{ width: '100%' }}>
                    <SearchIconWrapper>
                      <SearchIcon />
                    </SearchIconWrapper>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const q = String(fd.get('q') || '').trim();
                        setMobileSearchOpen(false);
                        if (q) router.push(`/recherche?q=${encodeURIComponent(q)}`);
                      }}
                    >
                      <StyledInputBase
                        autoFocus
                        name="q"
                        placeholder="Rechercher..."
                        slotProps={{ input: { 'aria-label': 'search' } }}
                      />
                    </form>
                  </Search>
                </Box>
              </Fade>
              <IconButton onClick={() => setMobileSearchOpen(false)} aria-label="close-search">
                ✕
              </IconButton>
            </Box>
          </ClickAwayListener>
        )}

        {!isMobile || !mobileSearchOpen ? (
          <Tooltip title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
            <IconButton onClick={toggleTheme}>
              {theme === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
        ) : null}

        {!isMobileSmall || !mobileSearchOpen ? (
          <Tooltip
            title={`Notifications ${connected ? '(temps réel)' : reconnecting ? '(reconnexion...)' : '(hors ligne)'}`}
          >
            <IconButton id="notification-icon" onClick={handleNotificationsOpen} sx={{ mx: 1 }}>
              <Badge badgeContent={unread} color="error">
                {connected ? <NotificationsActive /> : <Notifications />}
              </Badge>
            </IconButton>
          </Tooltip>
        ) : null}
        {reconnecting && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={`Reconnexion (${attempts})`}
            sx={{ mx: 1 }}
          />
        )}

        {isAuthenticated && !isMobileSmall && !mobileSearchOpen && (
          <Chip
            size="small"
            variant="outlined"
            label={`${session!.user!.name ?? session!.user!.email}`}
            sx={{ mx: 1, maxWidth: 260 }}
          />
        )}

        {!mobileSearchOpen && (
          <Tooltip title="Profil utilisateur">
            <IconButton onClick={handleUserMenuOpen} sx={{ ml: 1 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {isAuthenticated && session?.user?.name ? (
                  session.user.name.charAt(0)
                ) : (
                  <AccountCircle />
                )}
              </Avatar>
            </IconButton>
          </Tooltip>
        )}

        {isAuthenticated && !isMobileSmall && !mobileSearchOpen && (
          <IconButton onClick={handleSignOut}>
            <Logout />
          </IconButton>
        )}

        {/* Notifications menu */}
        <Menu
          anchorEl={anchorElNotifications}
          open={Boolean(anchorElNotifications)}
          onClose={handleNotificationsClose}
          sx={{
            maxWidth: { xs: '90%', md: 600 },
            width: '100%',
            minWidth: 250,
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Notifications</Typography>
            <Typography variant="body2" color="text.secondary">
              {unread} non lues / {totalCount ?? notifications.length} total •{' '}
              {Math.min(visibleCount, notifications.length)} affichées
            </Typography>
            <Stack
              sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              {notifications.length > 0 && (
                <Button size="small" onClick={markAllAsRead} sx={{ flex: '3 1 0%' }} fullWidth>
                  Marquer tout comme lu
                </Button>
              )}
              {/* Show load more if there are hidden loaded items or server has more */}
              {(notifications.length > visibleCount || hasMore) && (
                <Stack
                  sx={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    flex: '4 1 0%',
                    width: '100%',
                  }}
                >
                  {notifications.length > visibleCount && (
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      sx={{ flex: 1 }}
                      onClick={() => setVisibleCount((c) => c + 20)}
                    >
                      Afficher +20
                    </Button>
                  )}
                  {hasMore && (
                    <Button
                      size="small"
                      onClick={loadMore}
                      disabled={loadingMore}
                      variant="outlined"
                      fullWidth
                      sx={{ flex: 1 }}
                    >
                      {loadingMore ? 'Chargement…' : 'Charger plus'}
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Box>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Aucune notification
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 360, overflow: 'auto', px: 2, pb: 2 }}>
              <Stack spacing={1}>
                {notifications.slice(0, visibleCount).map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onRead={markAsRead}
                    onOpen={(notif) => {
                      try {
                        const eventId =
                          (notif.data && (notif.data.eventId || notif.data.event?.id)) || undefined;
                        const focusIds = notif.data?.timeslotIds as number[] | undefined;
                        if (eventId) {
                          const query =
                            focusIds && focusIds.length ? `?focus=${focusIds.join(',')}` : '';
                          // Close menu to avoid overlay on navigation
                          setAnchorElNotifications(null);
                          window.open(
                            `/evenements/${eventId}/timeslots${query}`,
                            '_blank',
                            'noopener,noreferrer',
                          );
                          return;
                        }
                      } catch {}
                    }}
                  />
                ))}
                {/* Show load more if there are hidden loaded items or server has more */}
                {(notifications.length > visibleCount || hasMore) && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    {notifications.length > visibleCount && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setVisibleCount((c) => c + 20)}
                      >
                        Afficher +20
                      </Button>
                    )}
                    {hasMore && (
                      <Button
                        size="small"
                        onClick={loadMore}
                        disabled={loadingMore}
                        variant="outlined"
                      >
                        {loadingMore ? 'Chargement…' : 'Charger plus'}
                      </Button>
                    )}
                  </Stack>
                )}
              </Stack>
            </Box>
          )}
        </Menu>

        {/* User menu */}
        <Menu anchorEl={anchorElUser} open={Boolean(anchorElUser)} onClose={handleUserMenuClose}>
          {status === 'loading'
            ? [
                <Box key="loading" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chargement de la session…
                  </Typography>
                </Box>,
              ]
            : isAuthenticated
              ? [
                  <Box key="user-info" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle1">
                      {session.user.name || 'Utilisateur'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {session.user.email}
                    </Typography>
                  </Box>,
                  <MenuItem
                    key="profile"
                    component={Link}
                    href="/profil"
                    onClick={handleUserMenuClose}
                  >
                    <ListItemIcon>
                      <Person fontSize="small" />
                    </ListItemIcon>
                    Profil
                  </MenuItem>,
                  <MenuItem
                    key="settings"
                    component={Link}
                    href="/reglages"
                    onClick={handleUserMenuClose}
                  >
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
                  </MenuItem>,
                ]
              : [
                  <Box key="not-connected" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle1">Non connecté</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cliquez pour vous connecter
                    </Typography>
                  </Box>,
                  <MenuItem
                    key="signin"
                    component={Link}
                    href="/signin"
                    onClick={handleUserMenuClose}
                  >
                    <ListItemIcon>
                      <AccountCircle fontSize="small" />
                    </ListItemIcon>
                    Connexion
                  </MenuItem>,
                ]}
        </Menu>
      </Toolbar>
    </StyledAppBar>
  );
}
