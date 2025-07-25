"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  useTheme,
  alpha,
  IconButton,
  Fade,
  Paper
} from "@mui/material"
import {
  Science,
  Biotech,
  BubbleChart,
  Colorize,
  FilterVintage,
  Home,
  ArrowBack,
  Warning,
  Psychology,
  Vaccines,
  LocalFireDepartment
} from "@mui/icons-material"
import { motion, AnimatePresence } from "framer-motion"

export default function NotFoundPage() {
  const theme = useTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [glitchActive, setGlitchActive] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Activer le glitch périodiquement
    const glitchInterval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 200)
    }, 3000)

    return () => clearInterval(glitchInterval)
  }, [])

  // Icônes flottantes
  const floatingIcons = [
    { Icon: Science, delay: 0, x: -200, y: -100, rotation: 360 },
    { Icon: Biotech, delay: 0.5, x: 200, y: -150, rotation: -360 },
    { Icon: BubbleChart, delay: 1, x: -150, y: 100, rotation: 180 },
    { Icon: Colorize, delay: 1.5, x: 150, y: 150, rotation: -180 },
    { Icon: FilterVintage, delay: 2, x: 0, y: -200, rotation: 360 },
    { Icon: Vaccines, delay: 2.5, x: -100, y: 50, rotation: -360 },
    { Icon: LocalFireDepartment, delay: 3, x: 100, y: -50, rotation: 180 }
  ]

  const FloatingIcon = ({ 
    Icon, 
    delay, 
    x, 
    y, 
    rotation 
  }: { 
    Icon: any, 
    delay: number, 
    x: number, 
    y: number,
    rotation: number 
  }) => {
    if (!mounted) return null

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0.1, 0.3, 0.1],
          scale: [0.8, 1.2, 0.8],
          x: [x, x * 0.5, x],
          y: [y, y * 1.5, y],
          rotate: [0, rotation, 0]
        }}
        transition={{
          duration: 10,
          delay,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          position: "absolute",
          zIndex: 0
        }}
      >
        <Icon 
          sx={{ 
            fontSize: { xs: 40, md: 60 },
            color: alpha(theme.palette.primary.main, 0.2),
            filter: glitchActive ? 'blur(2px)' : 'none',
            transition: 'filter 0.1s'
          }} 
        />
      </motion.div>
    )
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, 
          ${theme.palette.grey[900]} 0%, 
          ${theme.palette.primary.dark} 50%, 
          ${theme.palette.secondary.dark} 100%)`,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Effet de grille en arrière-plan */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              ${alpha(theme.palette.primary.main, 0.03)} 2px,
              ${alpha(theme.palette.primary.main, 0.03)} 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              ${alpha(theme.palette.primary.main, 0.03)} 2px,
              ${alpha(theme.palette.primary.main, 0.03)} 4px
            )
          `,
          backgroundSize: '50px 50px',
          opacity: glitchActive ? 0.5 : 1,
          transition: 'opacity 0.1s'
        }}
      />

      {/* Icônes flottantes */}
      <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {floatingIcons.map((props, index) => (
          <FloatingIcon key={index} {...props} />
        ))}
      </Box>

      <Container maxWidth="md" sx={{ position: "relative", zIndex: 2 }}>
        <Fade in timeout={800}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              background: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: "blur(20px)",
              border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
              position: "relative",
              overflow: "hidden",
              textAlign: "center"
            }}
          >
            {/* Icône d'erreur principale */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  margin: "0 auto",
                  mb: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: alpha(theme.palette.error.main, 0.1),
                  border: `2px solid ${theme.palette.error.main}`,
                  position: "relative",
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: -10,
                    borderRadius: '50%',
                    border: `2px dashed ${alpha(theme.palette.error.main, 0.3)}`,
                    animation: 'spin 20s linear infinite'
                  }
                }}
              >
                <Psychology 
                  sx={{ 
                    fontSize: 60, 
                    color: theme.palette.error.main,
                    filter: glitchActive 
                      ? `hue-rotate(${Math.random() * 360}deg) saturate(3)` 
                      : 'none',
                    transition: 'filter 0.1s'
                  }} 
                />
              </Box>
            </motion.div>

            {/* Titre avec effet glitch */}
            <Box sx={{ position: 'relative', mb: 3 }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '4rem', md: '6rem' },
                  fontWeight: 900,
                  color: theme.palette.text.primary,
                  textShadow: glitchActive
                    ? `
                      2px 2px 0 ${theme.palette.error.main},
                      -2px -2px 0 ${theme.palette.primary.main},
                      0 0 10px ${alpha(theme.palette.secondary.main, 0.5)}
                    `
                    : 'none',
                  transform: glitchActive ? 'skew(-5deg)' : 'none',
                  transition: 'all 0.1s',
                  '&::before': {
                    content: '"404"',
                    position: 'absolute',
                    left: glitchActive ? '2px' : '0',
                    top: glitchActive ? '-2px' : '0',
                    color: theme.palette.error.main,
                    opacity: glitchActive ? 0.8 : 0,
                    clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
                    transition: 'all 0.1s'
                  },
                  '&::after': {
                    content: '"404"',
                    position: 'absolute',
                    left: glitchActive ? '-2px' : '0',
                    top: glitchActive ? '2px' : '0',
                    color: theme.palette.primary.main,
                    opacity: glitchActive ? 0.8 : 0,
                    clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
                    transition: 'all 0.1s'
                  }
                }}
              >
                404
              </Typography>
            </Box>

            {/* Sous-titre avec animation */}
            <motion.div
              animate={{
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                  filter: glitchActive 
                    ? `blur(${Math.random() * 2}px)` 
                    : 'none',
                  transition: 'filter 0.1s'
                }}
              >
                Expérience non trouvée
              </Typography>
            </motion.div>

            <Typography
              variant="body1"
              sx={{
                mb: 4,
                color: theme.palette.text.secondary,
                maxWidth: 500,
                mx: 'auto',
                px: 2
              }}
            >
              Il semble que cette expérience ait échappé à notre laboratoire. 
              La page que vous recherchez n'existe pas ou a été déplacée dans une autre éprouvette.
            </Typography>

            {/* Boutons d'action */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              sx={{ mt: 4 }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<Home />}
                onClick={() => router.push('/')}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 30px rgba(0,0,0,0.3)'
                  }
                }}
              >
                Retour au laboratoire
              </Button>

              <Button
                variant="outlined"
                size="large"
                startIcon={<ArrowBack />}
                onClick={() => router.back()}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.primary,
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    background: alpha(theme.palette.primary.main, 0.05)
                  }
                }}
              >
                Page précédente
              </Button>
            </Stack>

            {/* Message d'aide */}
            <Box sx={{ mt: 6, pt: 4, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="caption" color="text.secondary">
                Code d'erreur: EXP-404 | Si le problème persiste, contactez l'administrateur du laboratoire
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Container>

      {/* Styles pour les animations */}
      {/* Styles pour les animations */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes glitch {
          0%, 100% { 
            clip-path: inset(0 0 0 0); 
          }
          20% { 
            clip-path: inset(20% 0 30% 0); 
          }
          40% { 
            clip-path: inset(50% 0 20% 0); 
          }
          60% { 
            clip-path: inset(10% 0 60% 0); 
          }
          80% { 
            clip-path: inset(80% 0 5% 0); 
          }
        }

        @keyframes distort {
          0%, 100% { 
            transform: skew(0deg) scale(1); 
          }
          20% { 
            transform: skew(-2deg) scale(1.01); 
          }
          40% { 
            transform: skew(1deg) scale(0.99); 
          }
          60% { 
            transform: skew(-1deg) scale(1.01); 
          }
          80% { 
            transform: skew(0.5deg) scale(0.99); 
          }
        }

        @keyframes chromatic {
          0%, 100% {
            text-shadow: 
              0 0 0 transparent,
              0 0 0 transparent;
          }
          50% {
            text-shadow: 
              -2px 0 #ff00ff,
              2px 0 #00ffff;
          }
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.6; }
          94% { opacity: 1; }
          96% { opacity: 0.8; }
          97% { opacity: 1; }
        }

        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        /* Effet de ligne de scan */
        .scan-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          animation: scan 8s linear infinite;
          pointer-events: none;
        }

        /* Effet de bruit statique */
        .static-noise {
          position: absolute;
          inset: 0;
          opacity: 0.02;
          z-index: 1;
          pointer-events: none;
          background-image: 
            repeating-radial-gradient(
              circle at 0 0,
              transparent 0,
              #ffffff 1px,
              transparent 1px,
              transparent 2px
            );
          background-size: 3px 3px;
          animation: flicker 5s linear infinite;
        }

        /* Effet RGB split sur le texte */
        .rgb-split {
          animation: chromatic 4s ease-in-out infinite;
        }
      `}</style>

      {/* Overlay avec effet de scan */}
      <Box
        className="scan-line"
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '100px',
          background: `linear-gradient(
            180deg,
            transparent,
            ${alpha(theme.palette.primary.light, 0.1)},
            transparent
          )`,
          animation: 'scan 6s linear infinite',
          pointerEvents: 'none',
          zIndex: 3
        }}
      />

      {/* Effet de bruit statique */}
      <Box
        className="static-noise"
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: glitchActive ? 0.1 : 0.02,
          transition: 'opacity 0.1s',
          mixBlendMode: 'overlay'
        }}
      />

      {/* Particules de glitch */}
      <AnimatePresence>
        {glitchActive && mounted && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              style={{
                position: 'absolute',
                top: '20%',
                left: '10%',
                width: 100,
                height: 20,
                background: alpha(theme.palette.error.main, 0.3),
                filter: 'blur(40px)',
                zIndex: 1
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              style={{
                position: 'absolute',
                bottom: '30%',
                right: '15%',
                width: 150,
                height: 30,
                background: alpha(theme.palette.primary.main, 0.3),
                filter: 'blur(60px)',
                zIndex: 1
              }}
            />
          </>
        )}
      </AnimatePresence>
    </Box>
  )
}