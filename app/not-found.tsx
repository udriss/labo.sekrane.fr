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
  Paper,
  GlobalStyles
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
  LocalFireDepartment,
} from "@mui/icons-material"
import { motion, AnimatePresence } from "framer-motion"

export default function NotFoundPage() {
  const theme = useTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [glitchActive, setGlitchActive] = useState(false)
  const [glitchElements, setGlitchElements] = useState<{[key: string]: boolean}>({})
  const [randomGlitchParticles, setRandomGlitchParticles] = useState<Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    blur: number;
  }>>([])

  useEffect(() => {
    setMounted(true)
    
    // Fonction pour créer des particules de glitch aléatoires
    const createRandomGlitchParticles = () => {
      const particles = []
      const colors = [
        theme.palette.error.main,
        theme.palette.primary.main,
        theme.palette.secondary.main,
        '#ff00ff',
        '#00ffff',
        '#ff6b35'
      ]
      
      for (let i = 0; i < Math.random() * 8 + 3; i++) {
        particles.push({
          id: `particle-${i}-${Date.now()}`,
          x: Math.random() * 100,
          y: Math.random() * 100,
          width: Math.random() * 200 + 50,
          height: Math.random() * 40 + 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          blur: Math.random() * 80 + 20
        })
      }
      return particles
    }

    // Glitch global plus fréquent
    const globalGlitchInterval = setInterval(() => {
      setGlitchActive(true)
      setRandomGlitchParticles(createRandomGlitchParticles())
      
      setTimeout(() => {
        setGlitchActive(false)
        setRandomGlitchParticles([])
      }, Math.random() * 300 + 100) // Durée variable entre 100-400ms
    }, Math.random() * 2000 + 800) // Intervalle variable entre 800-2800ms

    // Glitch d'éléments individuels
    const elementGlitchInterval = setInterval(() => {
      const elements = ['title', 'subtitle', 'icon', 'background', 'buttons']
      const randomElement = elements[Math.floor(Math.random() * elements.length)]
      
      setGlitchElements(prev => ({ ...prev, [randomElement]: true }))
      
      setTimeout(() => {
        setGlitchElements(prev => ({ ...prev, [randomElement]: false }))
      }, Math.random() * 200 + 50) // Durée entre 50-250ms
    }, Math.random() * 1500 + 500) // Intervalle entre 500-2000ms

    // Micro-glitches très rapides
    const microGlitchInterval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% de chance
        setGlitchActive(true)
        setTimeout(() => setGlitchActive(false), 50) // Très court
      }
    }, Math.random() * 800 + 200) // Très fréquent

    return () => {
      clearInterval(globalGlitchInterval)
      clearInterval(elementGlitchInterval) 
      clearInterval(microGlitchInterval)
    }
  }, [theme])

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
            filter: (glitchActive || glitchElements.background) 
              ? `blur(1.5px) hue-rotate(180deg) saturate(1.5)` 
              : 'none',
            transition: 'filter 0.05s',
            transform: glitchElements.background 
              ? `translate(1px, -1px) scale(0.95)` 
              : 'none'
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
          opacity: (glitchActive || glitchElements.background) ? 0.5 : 1,
          transition: 'opacity 0.05s',
          transform: glitchElements.background 
            ? `skew(0.5deg) scale(0.99)` 
            : 'none',
          filter: glitchActive 
            ? `hue-rotate(180deg) invert(0.05)` 
            : 'none'
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
                scale: glitchElements.icon ? [1, 1.2, 0.9, 1.1, 1] : [1, 1.1, 1],
                rotate: glitchElements.icon ? [0, 8, -5, 3, 0] : [0, 5, -5, 0],
                x: glitchElements.icon ? [0, -2, 3, -1, 0] : 0,
                y: glitchElements.icon ? [0, 1, -2, 1, 0] : 0
              }}
              transition={{
                duration: glitchElements.icon ? 0.3 : 4,
                repeat: glitchElements.icon ? 0 : Infinity,
                ease: glitchElements.icon ? "easeInOut" : "easeInOut"
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
                  background: (glitchActive || glitchElements.icon) 
                    ? `linear-gradient(${Math.random() * 360}deg, ${alpha(theme.palette.error.main, Math.random() * 0.3 + 0.1)}, ${alpha(theme.palette.primary.main, Math.random() * 0.3 + 0.1)})`
                    : alpha(theme.palette.error.main, 0.1),
                  border: `2px solid ${theme.palette.error.main}`,
                  position: "relative",
                  filter: glitchElements.icon 
                    ? `blur(${Math.random() * 1}px) saturate(${Math.random() * 2 + 1})` 
                    : 'none',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: -10,
                    borderRadius: '50%',
                    border: `2px dashed ${alpha(theme.palette.error.main, 0.3)}`,
                    animation: glitchElements.icon 
                      ? `spin ${Math.random() * 5 + 5}s linear infinite` 
                      : 'spin 20s linear infinite',
                    transform: glitchElements.icon 
                      ? `scale(${Math.random() * 0.4 + 0.8})` 
                      : 'none'
                  }
                }}
              >
                <Psychology 
                  sx={{ 
                    fontSize: 60, 
                    color: theme.palette.error.main,
                    filter: (glitchActive || glitchElements.icon)
                      ? `hue-rotate(${Math.random() * 360}deg) saturate(${Math.random() * 3 + 1}) brightness(${Math.random() * 0.8 + 0.6})` 
                      : 'none',
                    transition: 'filter 0.05s',
                    transform: glitchElements.icon 
                      ? `rotate(${Math.random() * 20 - 10}deg) scale(${Math.random() * 0.3 + 0.85})` 
                      : 'none'
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
                  textShadow: (glitchActive || glitchElements.title)
                  ? `
                    2px -1px 0 ${theme.palette.error.main},
                    -2px 1px 0 ${theme.palette.primary.main},
                    0 0 15px ${alpha(theme.palette.secondary.main, 0.6)},
                    3px 0 0 #ff00ff,
                    -3px 0 0 #00ffff
                  `
                  : 'none',
                  transform: (glitchActive || glitchElements.title) 
                  ? `skew(-2deg) scale(0.98) translate(1px, -1px)` 
                  : 'none',
                  transition: 'all 0.05s',
                  filter: glitchElements.title 
                  ? `blur(1px) hue-rotate(30deg)` 
                  : 'none',
                  '&::before': {
                  content: '"404"',
                  position: 'absolute',
                  right: (glitchActive || glitchElements.title) ? `15px` : '0',
                  top: (glitchActive || glitchElements.title) ? `15px` : '0',
                  color: theme.palette.error.main,
                  opacity: (glitchActive || glitchElements.title) ? 0.5 : 0,
                  clipPath: `polygon(0 0, 100% 0, 100% 40%, 0 40%)`,
                  transition: 'all 0.05s',
                  filter: `blur(0.5px)`,
                  zIndex: -1
                  },
                  '&::after': {
                  content: '"404"',
                  position: 'absolute',
                  left: (glitchActive || glitchElements.title) ? `-5px` : '0',
                  top: (glitchActive || glitchElements.title) ? `-5px` : '0',
                  color: theme.palette.primary.main,
                  opacity: (glitchActive || glitchElements.title) ? 0.6 : 0,
                  clipPath: `polygon(0 60%, 100% 60%, 100% 100%, 0 100%)`,
                  transition: 'all 0.05s',
                  filter: `blur(0.5px)`,
                  zIndex: -1
                  }
                }}
              >
                404
              </Typography>
              
              {/* Lignes de glitch aléatoires sur le titre */}
              {(glitchActive || glitchElements.title) && mounted && (
                <>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${Math.random() * 80}%`,
                      top: `${Math.random() * 80}%`,
                      width: `${Math.random() * 100 + 50}px`,
                      height: '2px',
                      background: theme.palette.error.main,
                      opacity: 0.6,
                      transform: `rotate(45deg)`,
                      zIndex: 1
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `40%`,
                      top: `60%`,
                      width: `60px`,
                      height: '1px',
                      background: theme.palette.primary.main,
                      opacity: 0.8,
                      transform: `rotate(135deg)`,
                      zIndex: 1
                    }}
                  />
                </>
              )}
            </Box>

            {/* Sous-titre avec animation */}
            <motion.div
              animate={{
                opacity: glitchElements.subtitle ? [1, 0.3, 0.8, 0.1, 1] : [0.6, 1, 0.6],
                x: glitchElements.subtitle ? [0, -3, 5, -1, 0] : 0,
                y: glitchElements.subtitle ? [0, 1, -2, 1, 0] : 0
              }}
              transition={{
                duration: glitchElements.subtitle ? 0.4 : 3,
                repeat: glitchElements.subtitle ? 0 : Infinity,
                ease: "easeInOut"
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                  filter: (glitchActive || glitchElements.subtitle)
                    ? `blur(${Math.random() * 3}px) saturate(${Math.random() * 2 + 1}) hue-rotate(${Math.random() * 180}deg)` 
                    : 'none',
                  transition: 'filter 0.05s',
                  textTransform: 'uppercase',
                  transform: glitchElements.subtitle 
                    ? `scale(${Math.random() * 0.2 + 0.9}) skew(${Math.random() * 4 - 2}deg)` 
                    : 'none',
                  textShadow: glitchElements.subtitle 
                    ? `${Math.random() * 4 - 2}px 0 ${theme.palette.error.main}, ${Math.random() * 4 - 2}px 0 ${theme.palette.primary.main}` 
                    : 'none'
                }}
              >
                Page introuvable
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
              Il semble que cette page ait échappé à notre laboratoire. 
              La page que vous recherchez n'existe pas ou a été déplacée dans une autre éprouvette.
            </Typography>

            {/* Boutons d'action */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              sx={{ 
                mt: 4,
                transform: glitchElements.buttons 
                  ? `translate(${Math.random() * 6 - 3}px, ${Math.random() * 6 - 3}px)` 
                  : 'none',
                filter: glitchElements.buttons 
                  ? `hue-rotate(${Math.random() * 60}deg) saturate(${Math.random() * 1.5 + 0.5})` 
                  : 'none'
              }}
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
                  background: (glitchActive || glitchElements.buttons)
                    ? `linear-gradient(${Math.random() * 360}deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.error.main})`
                    : `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  boxShadow: (glitchActive || glitchElements.buttons)
                    ? `0 ${Math.random() * 8 + 4}px ${Math.random() * 30 + 20}px rgba(0,0,0,${Math.random() * 0.3 + 0.25}), inset 0 0 ${Math.random() * 20 + 10}px rgba(255,255,255,0.1)`
                    : '0 4px 20px rgba(0,0,0,0.25)',
                  transition: 'all 0.1s',
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
                  borderColor: (glitchActive || glitchElements.buttons) 
                    ? theme.palette.error.main 
                    : theme.palette.divider,
                  color: (glitchActive || glitchElements.buttons)
                    ? theme.palette.error.main
                    : theme.palette.text.primary,
                  backgroundColor: glitchElements.buttons 
                    ? alpha(theme.palette.error.main, 0.1) 
                    : 'transparent',
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
      <GlobalStyles
        styles={{
          '@keyframes spin': {
            from: { transform: 'rotate(0deg)' },
            to: { transform: 'rotate(360deg)' }
          },
          '@keyframes glitch': {
            '0%, 100%': { 
              clipPath: 'inset(0 0 0 0)' 
            },
            '20%': { 
              clipPath: 'inset(20% 0 30% 0)' 
            },
            '40%': { 
              clipPath: 'inset(50% 0 20% 0)' 
            },
            '60%': { 
              clipPath: 'inset(10% 0 60% 0)' 
            },
            '80%': { 
              clipPath: 'inset(80% 0 5% 0)' 
            }
          },
          '@keyframes distort': {
            '0%, 100%': { 
              transform: 'skew(0deg) scale(1)' 
            },
            '20%': { 
              transform: 'skew(-2deg) scale(1.01)' 
            },
            '40%': { 
              transform: 'skew(1deg) scale(0.99)' 
            },
            '60%': { 
              transform: 'skew(-1deg) scale(1.01)' 
            },
            '80%': { 
              transform: 'skew(0.5deg) scale(0.99)' 
            }
          },
          '@keyframes chromatic': {
            '0%, 100%': {
              textShadow: '0 0 0 transparent, 0 0 0 transparent'
            },
            '50%': {
              textShadow: '-2px 0 #ff00ff, 2px 0 #00ffff'
            }
          },
          '@keyframes flicker': {
            '0%, 100%': { opacity: 1 },
            '92%': { opacity: 1 },
            '93%': { opacity: 0.6 },
            '94%': { opacity: 1 },
            '96%': { opacity: 0.8 },
            '97%': { opacity: 1 }
          },
          '@keyframes scan': {
            '0%': { transform: 'translateY(-100%)' },
            '100%': { transform: 'translateY(100%)' }
          },
          '.scan-line': {
            position: 'absolute',
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
            animation: 'scan 8s linear infinite',
            pointerEvents: 'none'
          },
          '.static-noise': {
            position: 'absolute',
            inset: 0,
            opacity: 0.02,
            zIndex: 1,
            pointerEvents: 'none',
            backgroundImage: 'repeating-radial-gradient(circle at 0 0, transparent 0, #ffffff 1px, transparent 1px, transparent 2px)',
            backgroundSize: '3px 3px',
            animation: 'flicker 5s linear infinite'
          },
          '.rgb-split': {
            animation: 'chromatic 4s ease-in-out infinite'
          }
        }}
      />

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
          opacity: (glitchActive || Object.values(glitchElements).some(Boolean)) 
            ? Math.random() * 0.15 + 0.05 
            : 0.02,
          transition: 'opacity 0.05s',
          mixBlendMode: 'overlay',
          backgroundSize: `${Math.random() * 2 + 2}px ${Math.random() * 2 + 2}px`,
          filter: glitchActive ? `hue-rotate(${Math.random() * 360}deg)` : 'none'
        }}
      />

      {/* Particules de glitch aléatoires */}
      <AnimatePresence>
        {randomGlitchParticles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, Math.random() * 0.8 + 0.2, 0],
              scale: [0, Math.random() * 1.5 + 0.5, 0],
              rotate: [0, Math.random() * 360],
              x: [0, Math.random() * 20 - 10],
              y: [0, Math.random() * 20 - 10]
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: Math.random() * 0.3 + 0.1 }}
            style={{
              position: 'absolute',
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.width,
              height: particle.height,
              background: alpha(particle.color, Math.random() * 0.6 + 0.2),
              filter: `blur(${particle.blur}px)`,
              zIndex: 1,
              mixBlendMode: Math.random() > 0.5 ? 'multiply' : 'screen'
            }}
          />
        ))}
      </AnimatePresence>

      {/* Particules de glitch permanentes mais variables */}
      <AnimatePresence>
        {(glitchActive || Object.values(glitchElements).some(Boolean)) && mounted && (
          <>
            {/* Glitch rectangles multiples */}
            {[...Array(Math.floor(Math.random() * 8 + 3))].map((_, index) => (
              <motion.div
                key={`glitch-rect-${index}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [0, Math.random() * 0.8 + 0.2, 0],
                  scale: [0, Math.random() * 2 + 0.5, 0],
                  rotate: Math.random() * 360,
                  x: [0, Math.random() * 50 - 25],
                  y: [0, Math.random() * 50 - 25]
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  duration: Math.random() * 0.4 + 0.1,
                  delay: Math.random() * 0.2
                }}
                style={{
                  position: 'absolute',
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  width: Math.random() * 200 + 50,
                  height: Math.random() * 50 + 10,
                  background: [
                    alpha(theme.palette.error.main, Math.random() * 0.6 + 0.2),
                    alpha(theme.palette.primary.main, Math.random() * 0.6 + 0.2),
                    alpha(theme.palette.secondary.main, Math.random() * 0.6 + 0.2),
                    alpha('#ff00ff', Math.random() * 0.6 + 0.2),
                    alpha('#00ffff', Math.random() * 0.6 + 0.2)
                  ][Math.floor(Math.random() * 5)],
                  filter: `blur(${Math.random() * 60 + 20}px)`,
                  zIndex: 1,
                  mixBlendMode: ['multiply', 'screen', 'overlay', 'difference'][Math.floor(Math.random() * 4)] as any
                }}
              />
            ))}
            
            {/* Lignes de glitch horizontales */}
            {[...Array(Math.floor(Math.random() * 5 + 2))].map((_, index) => (
              <motion.div
                key={`glitch-line-h-${index}`}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ 
                  scaleX: [0, Math.random() * 2 + 0.5, 0],
                  opacity: [0, Math.random() * 0.9 + 0.1, 0],
                  x: Math.random() * 100 - 50
                }}
                exit={{ scaleX: 0, opacity: 0 }}
                transition={{ 
                  duration: Math.random() * 0.3 + 0.1,
                  delay: Math.random() * 0.15
                }}
                style={{
                  position: 'absolute',
                  top: `${Math.random() * 100}%`,
                  left: 0,
                  right: 0,
                  height: Math.random() * 4 + 1,
                  background: `linear-gradient(90deg, transparent, ${theme.palette.error.main}, transparent)`,
                  zIndex: 2
                }}
              />
            ))}
            
            {/* Lignes de glitch verticales */}
            {[...Array(Math.floor(Math.random() * 3 + 1))].map((_, index) => (
              <motion.div
                key={`glitch-line-v-${index}`}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ 
                  scaleY: [0, Math.random() * 2 + 0.5, 0],
                  opacity: [0, Math.random() * 0.7 + 0.3, 0],
                  y: Math.random() * 100 - 50
                }}
                exit={{ scaleY: 0, opacity: 0 }}
                transition={{ 
                  duration: Math.random() * 0.4 + 0.1,
                  delay: Math.random() * 0.1
                }}
                style={{
                  position: 'absolute',
                  left: `${Math.random() * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: Math.random() * 3 + 1,
                  background: `linear-gradient(180deg, transparent, ${theme.palette.primary.main}, transparent)`,
                  zIndex: 2
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </Box>
  )
}