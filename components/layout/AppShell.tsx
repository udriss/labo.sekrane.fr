// components/layout/AppShell.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Box, Drawer, Alert, Stack, Chip } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { usePathname } from 'next/navigation';
import NavbarLIMS from '@/components/layout/NavbarLIMS';
import SidebarLIMS from '@/components/layout/SidebarLIMS';
import Footer from '@/components/layout/Footer';
import { useImpersonation } from '@/lib/contexts/ImpersonationContext';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { Button } from '@mui/material';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [brandName, setBrandName] = useState('');
  const NAVBAR_HEIGHT = 64;
  const theme = useTheme();
  const pathname = usePathname();
  const { impersonatedUser, stopImpersonation } = useImpersonation();

  // Fermer automatiquement le drawer sur mobile lors du changement de route
  const prevPathname = React.useRef(pathname);
  useEffect(() => {
    if (drawerOpen && prevPathname.current !== pathname) {
      setDrawerOpen(false);
    }
    prevPathname.current = pathname;
  }, [pathname, drawerOpen]);

  // Maintenance banner state
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch('/api/public/settings', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!stop) {
          setMaintenance(!!json.maintenanceMode);
          setBrandName(json.NOM_ETABLISSEMENT || json.brandingName || '');
        }
      } catch {
        if (!stop) setMaintenance(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  // Styles computed from theme to keep sx tidy and responsive to palette mode
  const outerWrapperStyles = {
    display: 'flex',
    alignItems: 'flex-start',
    minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
    // On ajoute un padding-top qui combine la hauteur de la navbar + un espace
    pt: `${NAVBAR_HEIGHT}px`,
    // Permet au fond (si on en met un plus tard) de couvrir toute la zone visible
    width: '100%',
  } as const;

  const DRAWER_WIDTH = 260;
  const sidebarStyles = {
    width: DRAWER_WIDTH,
    borderRight: '1px solid',
    borderColor: 'divider',
    height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
    position: 'sticky',
    top: NAVBAR_HEIGHT,
    flexShrink: 0,
  } as const;

  const mainContainerStyles = {
    flex: 1,
    maxWidth: 1280,
    display: 'flex',
    flexDirection: 'column',
    // Espace interne du contenu
    p: { xs: 2, md: 4 },
    // Centrage horizontal du bloc de contenu si large
    mx: 'auto',
    // S'assure que le contenu prend au moins l'espace restant
    minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px -  ${16 * 4}px)`, // (navbar + spacing top)
    /* Forcer tous les conteneurs MUI */
    '& .MuiContainer-root, & .MuiBox-root, & .MuiPaper-root': {
      maxWidth: '100vw !important',
    },
  } as const;

  const primaryColor =
    theme.palette.mode === 'light' ? theme.palette.primary.dark : theme.palette.primary.light;
  const secondaryColor =
    theme.palette.mode === 'light' ? theme.palette.secondary.dark : theme.palette.secondary.light;
  const primaryTransparent = alpha(primaryColor, 0.12);
  const secondaryTransparent = alpha(secondaryColor, 0.08);

  const innerPanelStyles = {
    background: `linear-gradient(135deg, ${primaryTransparent} 0%, ${secondaryTransparent} 100%)`,
    p: { xs: 2, md: 4 },
    borderRadius: 4,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    mx: 'auto',
    height: '100%',
    mb: 4,
  } as const;

  return (
    <>
      <NavbarLIMS onMenuClick={() => setDrawerOpen((o) => !o)} />
      {/* Impersonation banner */}
      {impersonatedUser && (
        <Alert
          severity="warning"
          icon={false}
          sx={{
            position: 'fixed',
            top: NAVBAR_HEIGHT,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.appBar - 1,
            borderRadius: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<ExitToAppIcon />}
              onClick={stopImpersonation}
            >
              Quitter
            </Button>
          }
        >
          Vous visualisez l'application sous le profil de{' '}
          <strong>{impersonatedUser.name || impersonatedUser.email}</strong>
          <Chip label={impersonatedUser.role} color="warning" size="small" sx={{ ml: 1 }} />
        </Alert>
      )}
      {/* Wrapper principal: occupe toute la hauteur disponible sous la navbar fixe */}
      <Box sx={outerWrapperStyles}>
        {/* Sidebar: temporary on mobile, persistent on larger screens */}
        <Drawer
          anchor="left"
          variant="temporary" // toujours en overlay pour ne pas réserver d'espace
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: {
              elevation: 16,
              sx: {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                top: `${NAVBAR_HEIGHT}px`, // décale sous la navbar
                height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
                borderRight: '1px solid',
                borderColor: 'divider',
                position: 'fixed',
              },
            },
          }}
          sx={{
            '& .MuiBackdrop-root': {
              top: `${NAVBAR_HEIGHT}px`,
              height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
            },
          }}
        >
          <SidebarLIMS onClose={() => setDrawerOpen(false)} />
        </Drawer>
        <Box sx={mainContainerStyles}>
          {maintenance && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Mode maintenance activé — accès réservé aux utilisateurs autorisés
            </Alert>
          )}
          {impersonatedUser && (
            <Alert severity="info" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              Inspection: {impersonatedUser.name || impersonatedUser.email} — rôle{' '}
              {impersonatedUser.role}
              <Button
                size="small"
                color="inherit"
                startIcon={<ExitToAppIcon />}
                onClick={stopImpersonation}
                sx={{ ml: 'auto' }}
              >
                Quitter l'inspection
              </Button>
            </Alert>
          )}
          <Box sx={innerPanelStyles}>{children}</Box>
          <Footer brandName={brandName} />
        </Box>
      </Box>
    </>
  );
}
