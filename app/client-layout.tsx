"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SessionProvider, useSession } from "next-auth/react";
import { usePathname } from 'next/navigation';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Inter } from 'next/font/google';
import { CssBaseline, Box, Drawer, useMediaQuery } from '@mui/material';

// Composants de layout
import NavbarLIMS from '@/components/layout/NavbarLIMS';
import { SidebarLIMS } from '@/components/layout/SidebarLIMS';
import { FooterLIMS } from '@/components/layout/FooterLIMS';
import { ScrollToTopButton } from '@/components/layout/ScrollToTopButton';

import { Toaster } from 'react-hot-toast';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';

const inter = Inter({ subsets: ['latin'] });

// Context pour les paramètres de l'application
interface AppSettingsContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);
const DRAWER_WIDTH = 280;

function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}

export { useAppSettings };

function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useMediaQuery('(max-width:768px)');

  // Fermer le sidebar sur mobile par défaut
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    sidebarOpen,
    setSidebarOpen,
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

function AppContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppSettings();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Pages qui n'ont pas besoin du layout complet
  const isAuthPage = pathname?.startsWith('/auth/');
  const isPublicPage = pathname === '/' || pathname === '/choose-discipline';
  const showFullLayout = session && !isAuthPage && !isPublicPage;

  // Fermer automatiquement le sidebar sur mobile lors du changement de page
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile, sidebarOpen, setSidebarOpen]);

  if (!showFullLayout) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Navbar */}
      <NavbarLIMS onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Sidebar */}
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          width: sidebarOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: '64px', // Hauteur de la navbar
            height: 'calc(100vh - 64px)',
            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          },
        }}
        ModalProps={{
          keepMounted: true, // Améliore les performances sur mobile
        }}
      >
        <SidebarLIMS />
      </Drawer>

      {/* Contenu principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          marginTop: '64px', // Hauteur de la navbar
          marginLeft: isMobile ? 0 : (sidebarOpen ? 0 : `-${DRAWER_WIDTH}px`),
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(sidebarOpen && !isMobile && {
            transition: theme.transitions.create(['margin'], {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}
      >
        <Box sx={{ flex: 1, p: 0 }}>
          {children}
        </Box>
        <FooterLIMS />
        <ScrollToTopButton />
      </Box>
    </Box>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
          <SnackbarProvider 
            maxSnack={3}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <NotificationProvider>
              <AppSettingsProvider>
                <AppContent>{children}</AppContent>
              </AppSettingsProvider>
            </NotificationProvider>
            <ToastContainer />
            <Toaster />
          </SnackbarProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
