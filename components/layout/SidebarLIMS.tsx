'use client';

import React, { useState } from 'react';
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
  Chip,
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
  Handyman,
  ExpandLess,
  ExpandMore,
  Notifications,
  History,
  GroupAdd,
  DocumentScanner,
} from '@mui/icons-material';
import { SiMoleculer } from 'react-icons/si';
import { TbTruckDelivery } from 'react-icons/tb';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useImpersonation } from '@/lib/contexts/ImpersonationContext';

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
    roles: ['ADMIN', 'ADMINLABO'],
  },
  {
    id: 'calendar',
    label: 'Calendrier',
    icon: <CalendarMonth />,
    path: '/calendrier',
    roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE', 'ENSEIGNANT'],
  },
  {
    id: 'notebook',
    label: 'Cahier TP',
    icon: <DocumentScanner />,
    path: '/cahier',
    roles: ['ADMIN', 'ENSEIGNANT'],
  },
  {
    id: 'users',
    label: 'Mon profil',
    icon: <People />,
    path: '/profil',
    roles: ['ADMIN', 'ADMINLABO', 'ENSEIGNANT', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE'],
  },
  {
    id: 'rooms',
    label: 'Salles',
    icon: <Room />,
    path: '/salles',
    roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE', 'ENSEIGNANT'],
  },
  {
    id: 'classes',
    label: 'Classes',
    icon: <GroupAdd />,
    path: '/classes',
    roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE', 'ENSEIGNANT'],
  },
  {
    id: 'laboratory',
    label: 'Laboratoire',
    icon: <Science />,
    roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE', 'ENSEIGNANT'],
    children: [
      {
        id: 'chemicals',
        label: 'Réactifs',
        icon: <SiMoleculer fontSize={25} />,
        path: '/reactifs',
        roles: ['ADMIN', 'ADMINLABO', 'ENSEIGNANT', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE'],
      },
      {
        id: 'equipement',
        label: 'Matériel',
        icon: <Handyman />,
        path: '/materiel',
        roles: ['ADMIN', 'ADMINLABO', 'ENSEIGNANT', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE'],
      },
      {
        id: 'suppliers',
        label: 'Fournisseurs',
        icon: <TbTruckDelivery fontSize={25} />,
        path: '/fournisseurs',
        roles: ['ADMIN', 'ADMINLABO', 'ENSEIGNANT', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE'],
      },
      {
        id: 'orders',
        label: 'Commandes',
        icon: <ShoppingCart />,
        path: '/orders',
        roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE'],
      },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Notifications />,
    path: '/notifications',
    roles: ['ADMIN', 'ADMINLABO', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE', 'ENSEIGNANT'],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: <AdminPanelSettings />,
    roles: ['ADMIN'],
    children: [
      {
        id: 'admin-notifications',
        label: 'Gestion notifications',
        icon: <Notifications />,
        path: '/admin/notifications',
        roles: ['ADMIN'],
      },
      {
        id: 'admin-security',
        label: 'Sécurité',
        icon: <Security />,
        path: '/admin/securite',
        roles: ['ADMIN'],
      },
      {
        id: 'admin-settings',
        label: 'Paramètres système',
        icon: <Settings />,
        path: '/admin/reglages',
        roles: ['ADMIN'],
      },
      {
        id: 'admin-users',
        label: 'Utilisateurs (admin)',
        icon: <People />,
        path: '/admin/utilisateurs',
        roles: ['ADMIN'],
      },
      {
        id: 'admin-tokens',
        label: "Tokens d'activation",
        icon: <Security />,
        path: '/admin/activation-tokens',
        roles: ['ADMIN'],
      },
      {
        id: 'logs',
        label: 'Journaux',
        icon: <History />,
        path: '/admin/logs',
        roles: ['ADMIN'],
      },
    ],
  },
];

export default function SidebarLIMS({ onClose }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<string[]>(['laboratory', 'admin']);
  const { impersonatedUser } = useImpersonation();
  const sessionRole = (session?.user as any)?.role || 'GUEST';
  const userRole =
    sessionRole === 'ADMIN' && impersonatedUser ? impersonatedUser.role : sessionRole;

  const handleItemClick = (id: string) =>
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  const hasPermission = (roles?: string[]) =>
    !roles || roles.length === 0 || roles.includes(userRole);
  const isActive = (path?: string) =>
    !!path && (pathname === path || (path !== '/' && pathname.startsWith(path)));

  const renderMenuItem = (item: MenuItem, level = 0) => {
    if (!hasPermission(item.roles)) return null;
    const hasChildren = !!item.children?.length;
    const open = openItems.includes(item.id);
    const active = isActive(item.path);

    if (hasChildren) {
      return (
        <React.Fragment key={item.id}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleItemClick(item.id)}
              sx={{ pl: 2 + level * 2, bgcolor: active ? 'action.selected' : undefined }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    fontSize: level > 0 ? '0.875rem' : '1rem',
                    fontWeight: active ? 600 : 400,
                  },
                }}
              />
              {item.badge && (
                <Chip label={item.badge} size="small" color="primary" sx={{ mr: 1 }} />
              )}
              {open ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    const disabled = item.id === 'orders';

    return (
      <ListItem key={item.id} disablePadding>
        <ListItemButton
          component={!disabled ? Link : 'div'}
          href={!disabled ? item.path || '#' : undefined}
          onClick={onClose}
          disabled={disabled}
          sx={{
            pl: 2 + level * 2,
            bgcolor: active ? 'action.selected' : undefined,
            borderRight: active ? 3 : 0,
            borderColor: 'primary.main',
            opacity: disabled ? 0.55 : undefined,
            pointerEvents: disabled ? 'none' : undefined,
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
          <ListItemText
            primary={item.label}
            slotProps={{
              primary: {
                fontSize: level > 0 ? '0.875rem' : '1rem',
                fontWeight: active ? 600 : 400,
                color: active ? 'primary.main' : undefined,
              },
            }}
          />
          {item.badge && <Chip label={item.badge} size="small" color="primary" />}
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Paul VALÉRY
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Gestion d&apos;Information du Laboratoire
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List>{menuItems.map((item) => renderMenuItem(item))}</List>
      </Box>
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        {!impersonatedUser ? (
          <>
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
          </>
        ) : (
          <>
            <Typography variant="caption" color="warning.main" display="block">
              Sous le rôle inspecté de
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {impersonatedUser.name || impersonatedUser.email}
            </Typography>
            <Chip
              label={impersonatedUser.role}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ mt: 0.5 }}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
