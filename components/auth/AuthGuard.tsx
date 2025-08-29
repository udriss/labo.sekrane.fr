'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  CircularProgress,
  useTheme,
  alpha,
  Fade,
  Grow,
} from '@mui/material';
import { Security, Login, Lock, Biotech } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const theme = useTheme();
  const [retryGraceUntil, setRetryGraceUntil] = React.useState<number>(0);
  const [maintenance, setMaintenance] = React.useState<{ enabled: boolean; allowedIds: number[] }>({
    enabled: false,
    allowedIds: [1],
  });

  // On global retry, grant a brief grace window to avoid flashing unauthenticated
  React.useEffect(() => {
    const onRetry = () => setRetryGraceUntil(Date.now() + 1500);
    window.addEventListener('app:retry', onRetry);
    return () => window.removeEventListener('app:retry', onRetry);
  }, []);

  // Pages publiques qui ne nécessitent pas d'authentification
  const publicPages = ['/signin', '/activate', '/maintenance', '/newpass', '/docs', '/mentions'];
  const isPublicPage = publicPages.includes(pathname);

  // Charger et surveiller le mode maintenance (public settings)
  React.useEffect(() => {
    let stop = false;
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch('/api/public/settings', { cache: 'no-store', signal: controller.signal });
        if (!res.ok) {
          if (!stop) setMaintenance({ enabled: false, allowedIds: [1] });
          return;
        }
        const ct = res.headers.get('content-type') || '';
        let json: any = {};
        if (ct.includes('application/json')) {
          json = await res.json().catch(() => ({}));
        } // else HTML or other -> keep default {}
        if (!stop)
          setMaintenance({
            enabled: !!json.maintenanceMode,
            allowedIds: Array.isArray(json.maintenanceAllowedUserIds)
              ? json.maintenanceAllowedUserIds
              : [1],
          });
      } catch {
        if (!stop) setMaintenance({ enabled: false, allowedIds: [1] });
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      stop = true;
      clearInterval(t);
      controller.abort();
    };
  }, []);

  // Pendant le chargement de la session
  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.primary.dark, 0.1)} 0%, 
            ${alpha(theme.palette.primary.main, 0.1)} 50%, 
            ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
        }}
      >
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 4,
            textAlign: 'center',
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
          }}
        >
          <CircularProgress sx={{ mb: 2 }} size={40} />
          <Typography variant="h6" gutterBottom>
            Vérification de la session
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Authentification en cours...
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Maintenance: si activée et pas page publique, laisser passer seulement utilisateurs autorisés
  const maintenanceEnabled = !!maintenance?.enabled;
  // Coerce user id to a number if possible (NextAuth may provide string)
  const userIdRaw = (session?.user as any)?.id as string | number | undefined;
  const userId =
    typeof userIdRaw === 'number'
      ? userIdRaw
      : typeof userIdRaw === 'string'
        ? parseInt(userIdRaw, 10)
        : undefined;
  if (
    maintenanceEnabled &&
    !['/signin', '/maintenance'].includes(pathname) &&
    // ID 1 autorisé d'office
    !(userId && (userId === 1 || maintenance?.allowedIds?.includes(userId)))
  ) {
    // Si pas connecté, ou connecté mais non autorisé, on affiche la page maintenance
    if (pathname !== '/maintenance') {
      if (typeof window !== 'undefined') window.location.href = '/maintenance';
    }
    return null;
  }

  // Si l'utilisateur n'est pas authentifié et n'est pas sur une page publique
  if (status === 'unauthenticated' && Date.now() > retryGraceUntil && !isPublicPage) {
    return <UnauthenticatedPage />;
  }

  // Si l'utilisateur est authentifié ou sur une page publique, afficher le contenu
  return <>{children}</>;
}

// Composant pour les utilisateurs non authentifiés
function UnauthenticatedPage() {
  const theme = useTheme();

  const handleSignIn = () => {
    window.location.href = '/signin';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, 
          ${theme.palette.primary.dark} 0%, 
          ${theme.palette.primary.main} 50%, 
          ${theme.palette.secondary.main} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Particules en arrière-plan */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: [-30, 30, -30],
            opacity: [0, 0.2, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 12 + i * 2,
            delay: i * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${10 + i * 15}%`,
            top: `${20 + i * 10}%`,
          }}
        >
          <Biotech sx={{ fontSize: 40, color: 'rgba(255,255,255,0.1)' }} />
        </motion.div>
      ))}

      {/* Overlay avec motif */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `radial-gradient(circle at 30% 70%, transparent 30%, rgba(0,0,0,0.2) 70%),
                           radial-gradient(circle at 70% 30%, transparent 30%, rgba(0,0,0,0.2) 70%)`,
          zIndex: 1,
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2 }}>
        <Fade in timeout={1000}>
          <Paper
            elevation={24}
            sx={{
              p: { xs: 4, sm: 6 },
              borderRadius: 6,
              textAlign: 'center',
              background: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Icône principale */}
            <Grow in timeout={1200}>
              <Box
                sx={{
                  position: 'relative',
                  width: 120,
                  height: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(45deg, ${theme.palette.error.main}, ${theme.palette.warning.main})`,
                  borderRadius: 4,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                  margin: '0 auto 2rem',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: -3,
                    borderRadius: 4,
                    padding: 3,
                    background: `linear-gradient(45deg, ${theme.palette.error.light}, ${theme.palette.warning.light})`,
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude',
                    opacity: 0.6,
                  },
                }}
              >
                <Lock sx={{ fontSize: 70, color: 'white' }} />
              </Box>
            </Grow>

            <Stack spacing={3} alignItems="center">
              {/* Titre principal */}
              <Typography
                variant="h3"
                fontWeight={800}
                sx={{
                  background: `linear-gradient(45deg, ${theme.palette.error.main}, ${theme.palette.warning.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: -1,
                }}
              >
                Accès restreint
              </Typography>

              {/* Message principal */}
              <Typography variant="h6" color="text.primary" sx={{ fontWeight: 500, maxWidth: 500 }}>
                Authentification requise pour accéder à cette ressource
              </Typography>

              {/* Description */}
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 800, lineHeight: 1.7 }}
              >
                Cette application est un système de gestion de laboratoire scolaire réservé aux
                utilisateurs autorisés. Une authentification valide est nécessaire pour accéder aux
                fonctionnalités du système.
              </Typography>

              {/* Icônes de sécurité */}
              <Stack
                direction="row"
                spacing={4}
                sx={{
                  mt: 2,
                  p: 3,
                  borderRadius: 3,
                  background: alpha(theme.palette.primary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Security sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Sécurisé
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Biotech sx={{ fontSize: 40, color: theme.palette.secondary.main, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Laboratoire
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Login sx={{ fontSize: 40, color: theme.palette.success.main, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Authentifié
                  </Typography>
                </Box>
              </Stack>

              {/* Bouton de connexion */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Login />}
                  onClick={handleSignIn}
                  sx={{
                    py: 2,
                    px: 4,
                    borderRadius: 3,
                    fontSize: 18,
                    fontWeight: 600,
                    textTransform: 'none',
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                  }}
                >
                  Se connecter au système
                </Button>
              </motion.div>

              {/* Message d'aide */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 2,
                  background: alpha(theme.palette.info.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
              >
                💡 <strong>Première connexion ?</strong> Contactez votre administrateur système pour
                obtenir vos identifiants d'accès.
              </Typography>
            </Stack>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}
