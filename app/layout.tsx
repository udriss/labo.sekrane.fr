"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
import { AppSettingsContext, useAppSettings } from '@/lib/hooks/useAppSettings';

const inter = Inter({ subsets: ['latin'] });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DRAWER_WIDTH = 280;

// Configuration du thème Material-UI
const createAppTheme = (mode: 'light' | 'dark') => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#1976d2' : '#90caf9',
      },
      secondary: {
        main: mode === 'light' ? '#dc004e' : '#f48fb1',
      },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
    },
    typography: {
      fontFamily: `var(--font-geist-sans), sans-serif`,
      h1: { fontWeight: 700 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 600,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            borderRadius: 16,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
};

function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:768px)');

  // Charger le thème depuis localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Détecter la préférence système
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Sauvegarder le thème dans localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fermer la sidebar sur mobile lors du changement de route
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const currentTheme = createAppTheme(theme);

  return (
    <AppSettingsContext.Provider value={{ 
      theme, 
      toggleTheme, 
      sidebarOpen, 
      setSidebarOpen 
    }}>
      <ThemeProvider theme={currentTheme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          {/* Navbar */}
          <NavbarLIMS 
            onMenuClick={handleMenuClick}
          />

          {/* Sidebar */}
          <Drawer
            variant={isMobile ? 'temporary' : 'persistent'}
            open={sidebarOpen}
            onClose={handleSidebarClose}
            sx={{
              width: sidebarOpen ? DRAWER_WIDTH : 0,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                top: '64px', // Hauteur de la navbar
                height: 'calc(100vh - 64px)',
                borderRight: `1px solid ${currentTheme.palette.divider}`,
                position: 'fixed',
                zIndex: currentTheme.zIndex.drawer,
              },
            }}
            ModalProps={{
              keepMounted: true, // Meilleure performance sur mobile
            }}
          >
            <SidebarLIMS onClose={handleSidebarClose} />
          </Drawer>

          {/* Contenu principal */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              width: '100%',
              transition: currentTheme.transitions.create(['padding'], {
                easing: currentTheme.transitions.easing.sharp,
                duration: currentTheme.transitions.duration.leavingScreen,
              }),
              paddingLeft: isMobile ? 0 : (sidebarOpen ? `${DRAWER_WIDTH}px` : 0),
              marginTop: '64px', // Hauteur de la navbar
              minHeight: 'calc(100vh - 64px)',
              bgcolor: 'background.default',
              p: { xs: 1, sm: 2, md: 3 },
            }}
          >
            {children}
          </Box>
        </Box>
      </ThemeProvider>
    </AppSettingsContext.Provider>
  );
}



// Déterminer la page actuelle
const getCurrentPageInfo = (path: string) => {
  const normalizedPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;

  if (normalizedPath === '' || normalizedPath === '/') return { name: 'Accueil', showLayout: true }; // Modifier showLayout à true
  if (normalizedPath.startsWith('/auth')) return { name: 'Auth', showLayout: false };
  if (normalizedPath.startsWith('/admin')) return { name: 'Admin', showLayout: true, isAdmin: true };
  if (normalizedPath === '/chemicals') return { name: 'Réactifs chimiques', showLayout: true };
  if (normalizedPath === '/materiel') return { name: 'Matériel', showLayout: true };
  if (normalizedPath === '/notebook') return { name: 'Cahier TP', showLayout: true };
  if (normalizedPath === '/calendrier') return { name: 'Calendrier', showLayout: true };
  if (normalizedPath === '/notifications') return { name: 'Notifications', showLayout: true };
  if (normalizedPath === '/dashboard') return { name: 'Tableau de bord', showLayout: true };

  return { name: 'Page', showLayout: true };
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const pageInfo = getCurrentPageInfo(pathname || '/');

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="description" content="LIMS - Système de gestion intégré pour laboratoire de chimie. Gestion des réactifs chimiques, matériel, cahiers de TP et planification." />
        <meta name="keywords" content="LIMS, laboratoire, chimie, gestion, inventaire, TP, matériel, réactifs chimiques" />
        
        {/* Open Graph */}
        <meta property="og:title" content="LIMS - Laboratoire de Chimie" />
        <meta property="og:description" content="Système de gestion intégré pour laboratoire de chimie" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://labo.sekrane.fr" />
        <meta property="og:image" content="https://labo.sekrane.fr/og-image.jpg" />
        <meta name="twitter:image" content="https://labo.sekrane.fr/og-image.jpg" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        <title>{`LIMS - ${pageInfo.name}`}</title>
        
        {/* Données structurées */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "LIMS - Laboratory Information Management System",
            "applicationCategory": "BusinessApplication",
            "description": "Système de gestion intégré pour laboratoire de chimie",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR"
            }
          })
        }} />
      </head>
      
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <NotificationProvider>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <SnackbarProvider
              maxSnack={3}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              autoHideDuration={5000}
              preventDuplicate
            >
              {pageInfo.showLayout ? (
                // Layout avec navigation pour les pages internes
                  <AppSettingsProvider>
                    {children}
                  </AppSettingsProvider>
              ) : (
                // Pages sans layout (accueil, auth)
                <Box 
                  sx={{ 
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                >
                  {children}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#363636',
                        color: '#fff',
                      },
                      success: {
                        duration: 3000,
                        iconTheme: {
                          primary: '#4ade80',
                          secondary: '#fff',
                        },
                      },
                      error: {
                        duration: 5000,
                        iconTheme: {
                          primary: '#ef4444',
                          secondary: '#fff',
                        },
                      },
                    }}
                  />
                </Box>
              )}
              
              {/* Notifications Toast */}
              <ToastContainer 
                position="top-center" 
                autoClose={3000} 
                hideProgressBar 
                newestOnTop 
                closeOnClick 
                rtl={false} 
                pauseOnFocusLoss 
                draggable 
                pauseOnHover 
                theme="light"
                style={{ fontSize: 14 }}
              />
            </SnackbarProvider>
          </LocalizationProvider>
          </NotificationProvider>
          {/* Footer */}
          <FooterLIMS />
        </SessionProvider>
      </body>
    </html>
  );
}