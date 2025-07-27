import { 
  Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton,
  Divider, Box, Typography, Collapse, Avatar, Chip, IconButton,
  Tooltip, alpha
} from '@mui/material';
import { 
  Science, Inventory, Assignment, CalendarMonth, Dashboard, 
  Person, Settings, School, Room, ExpandLess, ExpandMore,
  AdminPanelSettings, ShoppingCart, QrCodeScanner, Analytics,
  ChevronLeft, ChevronRight, Construction
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import React from 'react';

interface MenuItem {
  title: string;
  icon: React.ReactElement;
  href?: string;
  children?: MenuItem[];
  badge?: number | string;
  disabled?: boolean;
}

const mainMenuItems: MenuItem[] = [
  { title: 'Tableau de bord', icon: <Dashboard />, href: '/' },
  { title: 'Réactifs chimiques', icon: <Science />, href: '/chemicals', badge: 'New' },
  { title: 'Matériel', icon: <Inventory />, href: '/materiel' },
  { title: 'Cahier TP', icon: <Assignment />, href: '/notebook' },
  { title: 'Calendrier', icon: <CalendarMonth />, href: '/calendrier' },
  { title: 'Commandes', icon: <ShoppingCart />, href: '/orders', disabled: true },
  { title: 'Scanner', icon: <QrCodeScanner />, href: '/scanner', disabled: true },
];

const adminMenuItems: MenuItem[] = [
  { 
    title: 'Administration', 
    icon: <AdminPanelSettings />,
    children: [
      { title: 'Utilisateurs', icon: <Person />, href: '/admin/users' },
      { title: 'Salles', icon: <Room />, href: '/admin/rooms' },
      { title: 'Classes', icon: <School />, href: '/admin/classes' },
      { title: 'Paramètres', icon: <Settings />, href: '/admin/settings' },
      { title: 'Analytics', icon: <Analytics />, href: '/admin/analytics' },
    ]
  },
];

interface SidebarLIMSProps {
  collapsed: boolean;
}

export function SidebarLIMS({ collapsed }: SidebarLIMSProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [openItems, setOpenItems] = useState<string[]>(['Administration']);
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const handleClick = (title: string) => {
    setOpenItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openItems.includes(item.title);
    const isActive = pathname === item.href;

    return (
      <Box key={item.title}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleClick(item.title);
              } else if (item.href && !item.disabled) {
                router.push(item.href);
              }
            }}
            disabled={item.disabled}
            selected={isActive}
            sx={{
              minHeight: 48,
              justifyContent: collapsed ? 'center' : 'initial',
              px: collapsed ? 1 : 2.5,
              ml: depth * 2,
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: alpha('#667eea', 0.15),
                '&:hover': {
                  bgcolor: alpha('#667eea', 0.25),
                }
              }
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: collapsed ? 0 : 3,
                justifyContent: 'center',
                color: isActive ? 'primary.main' : 'inherit',
              }}
            >
              {item.disabled ? (
                <Tooltip title="En développement">
                  <Construction fontSize="small" />
                </Tooltip>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            {!collapsed && (
              <>
                <ListItemText 
                  primary={item.title} 
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
                {item.badge && (
                  <Chip 
                    label={item.badge} 
                    size="small" 
                    color={item.badge === 'New' ? 'primary' : 'default'}
                    sx={{ height: 20 }}
                  />
                )}
                {hasChildren && (isOpen ? <ExpandLess /> : <ExpandMore />)}
              </>
            )}
          </ListItemButton>
        </ListItem>
        {hasChildren && !collapsed && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? 64 : 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? 64 : 240,
          boxSizing: 'border-box',
          transition: 'width 0.3s ease',
          borderRight: 1,
          borderColor: 'divider',
          overflowX: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 64,
        }}
      >
        {collapsed ? (
          <Science sx={{ color: 'primary.main' }} />
        ) : (
          <>
            <Box display="flex" alignItems="center" gap={1}>
              <Image src="/logo.png" alt="LIMS" width={32} height={32} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                LIMS Lab
              </Typography>
            </Box>
          </>
        )}
      </Box>
      
      <Divider />
      
      {/* User Info */}
      {!collapsed && session?.user && (
        <Box sx={{ p: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {session.user.name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {session.user.name}
              </Typography>
                            <Typography variant="caption" color="text.secondary">
                {isAdmin ? 'Administrateur' : 'Utilisateur'}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
      
      <Divider />
      
      {/* Menu Items */}
      <List sx={{ pt: 1 }}>
        {mainMenuItems.map(item => renderMenuItem(item))}
      </List>
      
      {/* Admin Section */}
      {isAdmin && (
        <>
          <Divider sx={{ my: 1 }} />
          <List>
            {adminMenuItems.map(item => renderMenuItem(item))}
          </List>
        </>
      )}
      
      {/* Bottom Space */}
      <Box sx={{ flexGrow: 1 }} />
      
      {/* Version */}
      {!collapsed && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Version 2.0.0
          </Typography>
        </Box>
      )}
    </Drawer>
  );
}