'use client';

import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Collapse,
  Chip
} from '@mui/material';
import {
  Dashboard,
  People,
  Science,
  Biotech,
  Room,
  CalendarMonth,
  ShoppingCart,
  Security,
  Settings,
  AdminPanelSettings,
  Assessment,
  Inventory,
  ExpandLess,
  ExpandMore,
  Notifications,
  History,
  GroupAdd
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

interface SidebarProps {
  onClose?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  roles?: string[];
  badge?: string | number;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Accueil',
    icon: <Dashboard />,
    path: '/',
    roles: ['ADMIN', 'ADMINLABO']
  },
  {
    id: 'users',
    label: 'Utilisateurs',
    icon: <People />,
    path: '/utilisateurs',
    roles: ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'],
  },
  {
    id: 'laboratory',
    label: 'Laboratoire',
    icon: <Science />,
    children: [
      {
        id: 'chemicals',
        label: 'Réactifs',
        icon: <Biotech />,
        path: '/chemicals',
        roles: ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'],
      },
      {
        id: 'equipment',
        label: 'Matériel',
        icon: <Inventory />,
        path: '/materiel',
        roles: ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'],
      },
      {
        id: 'rooms',
        label: 'Salles',
        icon: <Room />,
        path: '/admin/salles',
        roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN', 'TEACHER'],
      },
      {
        id: 'classes',
        label: 'Classes',
        icon: <GroupAdd />,
        path: '/admin/classes',
        roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN', 'TEACHER'],
      }
    ],
    roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN', 'TEACHER'],
  },
  {
    id: 'calendar',
    label: 'Calendrier',
    icon: <CalendarMonth />,
    path: '/calendrier',
    roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN', 'TEACHER'],
  },
  {
    id: 'orders',
    label: 'Commandes',
    icon: <ShoppingCart />,
    path: '/orders',
    roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Notifications />,
    path: '/notifications',
    roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN', 'TEACHER'],
  },
  {
    id: 'logs',
    label: 'Journaux',
    icon: <History />,
    path: '/logs',
    roles: ['ADMIN']
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: <AdminPanelSettings />,
    children: [
      {
        id: 'admin-notifications',
        label: 'Gestion notifications',
        icon: <Notifications />,
        path: '/admin/notifications',
        roles: ['ADMIN']
      },
      {
        id: 'admin-security',
        label: 'Sécurité',
        icon: <Security />,
        path: '/securite',
        roles: ['ADMIN']
      },
      {
        id: 'admin-settings',
        label: 'Paramètres système',
        icon: <Settings />,
        path: '/reglages',
        roles: ['ADMIN']
      }
    ],
    roles: ['ADMIN']
  }
];

export function SidebarLIMS({ onClose }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<string[]>(['laboratory', 'admin']);

  const userRole = (session?.user as any)?.role || 'GUEST';

  const handleItemClick = (itemId: string) => {
    if (openItems.includes(itemId)) {
      setOpenItems(openItems.filter(id => id !== itemId));
    } else {
      setOpenItems([...openItems, itemId]);
    }
  };

  const hasPermission = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(userRole);
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return pathname === path || (path !== '/' && pathname.startsWith(path));
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    if (!hasPermission(item.roles)) {
      return null;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isItemOpen = openItems.includes(item.id);
    const active = isActive(item.path);

    if (hasChildren) {
      return (
        <React.Fragment key={item.id}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleItemClick(item.id)}
              sx={{
                pl: 2 + level * 2,
                bgcolor: active ? 'action.selected' : undefined,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: level > 0 ? '0.875rem' : '1rem',
                  fontWeight: active ? 600 : 400
                }}
              />
              {item.badge && (
                <Chip 
                  label={item.badge} 
                  size="small" 
                  color="primary"
                  sx={{ mr: 1 }}
                />
              )}
              {isItemOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={isItemOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return (
      <ListItem key={item.id} disablePadding>
        <ListItemButton
          component={Link}
          href={item.path || '#'}
          onClick={onClose}
          sx={{
            pl: 2 + level * 2,
            bgcolor: active ? 'action.selected' : undefined,
            '&:hover': {
              bgcolor: 'action.hover',
            },
            borderRight: active ? 3 : 0,
            borderColor: 'primary.main',
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText 
            primary={item.label}
            primaryTypographyProps={{
              fontSize: level > 0 ? '0.875rem' : '1rem',
              fontWeight: active ? 600 : 400,
              color: active ? 'primary.main' : undefined
            }}
          />
          {item.badge && (
            <Chip 
              label={item.badge} 
              size="small" 
              color="primary"
            />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Paul VALÉRY
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Gestion d'Information du Laboratoire
        </Typography>
      </Box>

      {/* Menu principal */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List>
          {menuItems.map(item => renderMenuItem(item))}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Connecté en tant que
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {session?.user?.name || 'Utilisateur'}
        </Typography>
        <Chip 
          label={userRole} 
          size="small" 
          color="primary" 
          variant="outlined"
          sx={{ mt: 0.5 }}
        />
      </Box>
    </Box>
  );
}