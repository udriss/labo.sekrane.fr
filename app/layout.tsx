"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Composants de layout (à créer)
// import { NavbarLIMS } from '@/components/layout/NavbarLIMS';
// import { SidebarLIMS } from '@/components/layout/SidebarLIMS';
// import { FooterLIMS } from '@/components/layout/FooterLIMS';
// import { ScrollToTopButton } from '@/components/layout/ScrollToTopButton';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Context pour les paramètres de l'application
export const AppSettingsContext = createContext<any>(null);
export function useAppSettings() {
  return useContext(AppSettingsContext);
}

// Configuration du thème Material-UI avec gradient et effets visuels
const createAppTheme = (mode: 'light' | 'dark', settings?: any) => {
  const primaryColor = settings?.primaryColor || '#667eea';
  const secondaryColor = settings?.secondaryColor || '#84fab0';
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryColor,
        light: '#764ba222',
        dark: '#5a4fcf',
      },
      secondary: {
        main: secondaryColor,
        light: '#8fd3f4',
        dark: '#6bc88e',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [appSettings, setAppSettings] = useState<any>({
    theme: 'light',
    sidebarCollapsed: false,
    notificationsEnabled: true,
    gradientType: 'linear',
    gradientColors: ['#f0fdf014', '#0052b00f'],
    primaryColor: '#5569c2ff',
    secondaryColor: '#009135ff',
  });
  const pathname = usePathname();

  // Charger les paramètres depuis localStorage ou API
  useEffect(() => {
    async function loadSettings() {
      try {
        // Charger depuis localStorage
        const savedSettings = localStorage.getItem('limsAppSettings');
        if (savedSettings) {
          setAppSettings(JSON.parse(savedSettings));
        }
        
        // Optionnel : charger depuis l'API
        // const response = await fetch('/api/app-settings');
        // if (response.ok) {
        //   const data = await response.json();
        //   setAppSettings(data);
        // }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
      }
    }
    loadSettings();
  }, []);

  // Sauvegarder les paramètres
  const updateSettings = (newSettings: any) => {
    setAppSettings(newSettings);
    localStorage.setItem('limsAppSettings', JSON.stringify(newSettings));
  };

  // Fonction pour basculer le thème
  const toggleTheme = () => {
    const newTheme = appSettings.theme === 'light' ? 'dark' : 'light';
    updateSettings({ ...appSettings, theme: newTheme });
  };

  // Fonction pour basculer la sidebar
  const toggleSidebar = () => {
    updateSettings({ ...appSettings, sidebarCollapsed: !appSettings.sidebarCollapsed });
  };

  // Générer le gradient de fond
  const getBackgroundGradient = () => {
    if (!appSettings.gradientType || appSettings.gradientType === 'none') {
      return undefined;
    }
    
    const colors = appSettings.gradientColors || ['#0025c925', '#764ba225'];
    const angle = appSettings.gradientAngle || 135;
    
    switch (appSettings.gradientType) {
      case 'radial':
        return `radial-gradient(circle at ${appSettings.gradientCenter || '50% 50%'}, ${colors.join(', ')})`;
      case 'conic':
        return `conic-gradient(from ${angle}deg at ${appSettings.gradientCenter || '50% 50%'}, ${colors.join(', ')})`;
      case 'linear':
      default:
        return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
    }
  };

  // Déterminer la page actuelle
  const getCurrentPageInfo = (path: string) => {
    const normalizedPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    
    if (normalizedPath === '' || normalizedPath === '/') return { name: 'Accueil', showLayout: false };
    if (normalizedPath.startsWith('/auth')) return { name: 'Auth', showLayout: false };
    if (normalizedPath.startsWith('/admin')) return { name: 'Admin', showLayout: true, isAdmin: true };
    if (normalizedPath === '/chemicals') return { name: 'Produits chimiques', showLayout: true };
    if (normalizedPath === '/materiel') return { name: 'Matériel', showLayout: true };
    if (normalizedPath === '/notebook') return { name: 'Cahier TP', showLayout: true };
    if (normalizedPath === '/calendrier') return { name: 'Calendrier', showLayout: true };
    
    return { name: 'Page', showLayout: true };
  };

  const pageInfo = getCurrentPageInfo(pathname || '/');
  const theme = createAppTheme(appSettings.theme, appSettings);

  // Appliquer les styles globaux
  useEffect(() => {
    if (appSettings.theme) {
      document.documentElement.setAttribute('data-theme', appSettings.theme);
    }
    
    // Gérer l'overflow pour les pages admin
    if (pageInfo.isAdmin) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = 'visible';
      document.body.style.height = 'auto';
    }

    // Appliquer le gradient de fond si configuré
    const gradient = getBackgroundGradient();
    if (gradient && !pageInfo.showLayout) {
      document.body.style.background = gradient;
    } else {
      document.body.style.background = '';
    }
  }, [appSettings, pageInfo]);

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="LIMS - Système de gestion intégré pour laboratoire de chimie. Gestion des produits chimiques, matériel, cahiers de TP et planification." />
        <meta name="keywords" content="LIMS, laboratoire, chimie, gestion, inventaire, TP, matériel, produits chimiques" />
        
        {/* Open Graph */}
        <meta property="og:title" content="LIMS - Laboratoire de Chimie" />
        <meta property="og:description" content="Système de gestion intégré pour laboratoire de chimie" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://labo.sekrane.fr" />
        <meta property="og:image" content="https://labo.sekrane.fr/og-image.jpg" />
        <meta property="og:url" content="https://labo.sekrane.fr" />
        <meta name="twitter:image" content="https://labo.sekrane.fr/og-image.jpg" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        <title>LIMS - {pageInfo.name}</title>
        
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
          <AppSettingsContext.Provider value={{ 
            ...appSettings,
            updateSettings,
            toggleTheme,
            toggleSidebar
          }}>
            <ThemeProvider theme={theme}>
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
                  <CssBaseline />
                  
                  {pageInfo.showLayout ? (
                    // Layout avec navigation pour les pages internes
                    <Box sx={{ 
                      display: 'flex', 
                      minHeight: '100vh',
                      background: theme.palette.background.default
                    }}>
                      {/* Sidebar - À décommenter quand le composant sera créé */}
                      {/* <SidebarLIMS collapsed={appSettings.sidebarCollapsed} /> */}
                      
                      <Box
                        component="main"
                        sx={{
                          flexGrow: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: '100vh',
                          transition: 'margin-left 0.3s ease',
                          marginLeft: appSettings.sidebarCollapsed ? '64px' : '240px',
                        }}
                      >
                        {/* Navbar - À décommenter quand le composant sera créé */}
                        {/* <NavbarLIMS 
                          onMenuClick={toggleSidebar} 
                          onThemeToggle={toggleTheme}
                        /> */}
                        
                        {/* Contenu principal */}
                        <Box
                          sx={{
                            flexGrow: 1,
                            p: { xs: 2, sm: 3, md: 4 },
                            position: 'relative',
                          }}
                        >
                          {children}
                        </Box>
                        
                        {/* Footer - À décommenter quand le composant sera créé */}
                        {/* <FooterLIMS /> */}
                      </Box>
                      
                      {/* Bouton retour en haut - À décommenter quand le composant sera créé */}
                      {/* <ScrollToTopButton /> */}
                    </Box>
                  ) : (
                    // Pages sans layout (accueil, auth)
                    <Box 
                      sx={{ 
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: getBackgroundGradient() || theme.palette.background.default
                      }}
                    >
                      {children}
                    </Box>
                  )}
                  
                  {/* Notifications Toast */}
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
                    theme={appSettings.theme === 'dark' ? 'dark' : 'light'}
                    style={{ fontSize: 14 }}
                  />
                </SnackbarProvider>
              </LocalizationProvider>
            </ThemeProvider>
          </AppSettingsContext.Provider>
        </SessionProvider>
      </body>
    </html>
  );
}