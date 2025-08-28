'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  alpha,
  Fade,
  Grow,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import { Home, Search, BugReport, Science, Biotech, Warning } from '@mui/icons-material';
import { motion } from 'framer-motion';

// Thème simple pour la page 404
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
  },
});

export default function NotFound() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Marquer que nous sommes sur une page 404 pour le layout
  useEffect(() => {
    document.body.setAttribute('data-page-type', 'not-found');
    return () => {
      document.body.removeAttribute('data-page-type');
    };
  }, []);

  const handleGoHome = () => {
    // Si pas de session, rediriger vers signin
    if (status === 'unauthenticated') {
      router.push('/signin');
    } else {
      router.push('/');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  // Blagues de laboratoire aléatoires
  const labJokes = [
    'Cette page a subi une réaction de décomposition inattendue',
    'Page introuvable dans le tableau périodique',
    'Houston, nous avons un problème... de liaison chimique',
    'Cette URL a été neutralisée par une base trop forte',
    "Oups ! Cette page s'est volatilisée pendant l'expérience",
    'Attention : Fuite détectée dans le système de navigation',
    'Cette ressource a été aspirée dans un trou noir quantique',
  ];

  const randomJoke = labJokes[Math.floor(Math.random() * labJokes.length)];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)}, ${alpha(theme.palette.warning.main, 0.1)}, ${alpha('#ffab57', 0.1)})`,
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {/* Particules d'erreur en arrière-plan */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: 0, opacity: 0, scale: 0 }}
            animate={{
              y: [-40, 40, -40],
              opacity: [0.2, 0.8, 0.2],
              scale: [0.5, 1.2, 0.5],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 8 + i * 1.5,
              delay: i * 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              left: `${5 + i * 12}%`,
              top: `${15 + i * 8}%`,
              zIndex: 10000,
            }}
          >
            {i % 3 === 0 ? (
              <Science sx={{ fontSize: 35, color: 'rgba(244, 67, 54, 0.6)' }} />
            ) : i % 3 === 1 ? (
              <Biotech sx={{ fontSize: 35, color: 'rgba(255, 152, 0, 0.6)' }} />
            ) : (
              <Warning sx={{ fontSize: 35, color: 'rgba(33, 150, 243, 0.6)' }} />
            )}
          </motion.div>
        ))}

        {/* Overlay avec motif d'alerte */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `radial-gradient(circle at 25% 75%, transparent 20%, rgba(0,0,0,0.15) 60%), radial-gradient(circle at 75% 25%, transparent 20%, rgba(0,0,0,0.15) 60%)`,
            zIndex: 1,
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Fade in timeout={1000}>
            <Paper
              elevation={24}
              sx={{
                p: { xs: 4, sm: 6, md: 8 },
                borderRadius: 6,
                textAlign: 'center',
                background: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Icône d'erreur principale */}
              <Grow in timeout={1200}>
                <Box
                  sx={{
                    position: 'relative',
                    width: 150,
                    height: 150,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(45deg, ${theme.palette.error.main}, ${theme.palette.warning.main})`,
                    borderRadius: '50%',
                    boxShadow: '0 15px 50px rgba(0,0,0,0.3)',
                    margin: '0 auto 3rem',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '50%',
                      padding: 4,
                      background: `linear-gradient(45deg, ${theme.palette.error.light}, ${theme.palette.warning.light})`,
                      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      maskComposite: 'exclude',
                      opacity: 0.7,
                    },
                  }}
                >
                  <BugReport sx={{ fontSize: 80, color: 'white' }} />
                </Box>
              </Grow>

              <Stack spacing={4} alignItems="center">
                {/* Code d'erreur stylé */}
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '4rem', sm: '6rem', md: '8rem' },
                    fontWeight: 900,
                    background: `linear-gradient(45deg, ${theme.palette.error.main}, ${theme.palette.warning.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: -2,
                    textShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  }}
                >
                  404
                </Typography>

                {/* Titre principal */}
                <Typography
                  variant="h3"
                  fontWeight={700}
                  color="text.primary"
                  sx={{
                    maxWidth: 600,
                    fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3rem' },
                  }}
                >
                  Expérience ratée !
                </Typography>

                {/* Blague aléatoire */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    maxWidth: 700,
                    fontStyle: 'italic',
                    fontSize: { xs: '1.1rem', sm: '1.3rem' },
                    fontVariant: 'small-caps',
                  }}
                >
                  {randomJoke}
                </Typography>

                {/* Description technique */}
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    maxWidth: 800,
                    lineHeight: 1.8,
                    fontSize: { xs: '0.95rem', sm: '1.1rem' },
                  }}
                >
                  La page recherchée n'existe pas dans notre base de données. Elle a peut-être été
                  déplacée, supprimée, ou n'a jamais existé dans cette dimension !
                </Typography>

                {/* Icônes d'équipement de laboratoire */}
                <Stack
                  direction="row"
                  spacing={4}
                  sx={{
                    mt: 3,
                    p: 3,
                    borderRadius: 3,
                    background: alpha(theme.palette.warning.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Science sx={{ fontSize: 45, color: theme.palette.error.main, mb: 1 }} />
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Biotech sx={{ fontSize: 45, color: theme.palette.warning.main, mb: 1 }} />
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Search sx={{ fontSize: 45, color: theme.palette.info.main, mb: 1 }} />
                  </Box>
                </Stack>

                {/* Boutons d'action */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mt: 4 }}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<Home />}
                      onClick={handleGoHome}
                      sx={{
                        py: 2,
                        px: 4,
                        borderRadius: 3,
                        fontSize: 16,
                        fontWeight: 600,
                        textTransform: 'none',
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                        },
                      }}
                    >
                      Retour au laboratoire
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<Search />}
                      onClick={handleGoBack}
                      sx={{
                        py: 2,
                        px: 4,
                        borderRadius: 3,
                        fontSize: 16,
                        fontWeight: 600,
                        textTransform: 'none',
                        borderColor: theme.palette.warning.main,
                        color: theme.palette.warning.main,
                        '&:hover': {
                          borderColor: theme.palette.warning.dark,
                          background: alpha(theme.palette.warning.main, 0.1),
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      Refaire l'expérience
                    </Button>
                  </motion.div>
                </Stack>

                {/* Citation scientifique humoristique */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 4,
                    p: 3,
                    borderRadius: 2,
                    background: alpha(theme.palette.info.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                    fontStyle: 'italic',
                    maxWidth: 500,
                  }}
                >
                  🧪 <strong>Conseil du laborantin :</strong> En science comme en navigation web, il
                  faut parfois prendre un détour pour découvrir de nouvelles choses !
                </Typography>
              </Stack>
            </Paper>
          </Fade>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
