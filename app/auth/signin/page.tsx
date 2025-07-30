"use client"

import { signIn } from "next-auth/react"
import { useState, useEffect, useMemo } from "react"
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Alert,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Link,
  Divider,
  Collapse,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Fade,
  Grow,
  alpha,
  CircularProgress,
  Chip,
  GlobalStyles
} from "@mui/material"
import { 
  Visibility, 
  VisibilityOff, 
  Email,
  Lock,
  Science,
  Shield,
  School,
  Biotech,
  CheckCircle,
  ErrorOutline
} from "@mui/icons-material"
import { motion } from "framer-motion"
import TextAlign from "@tiptap/extension-text-align"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [successMessage, setSuccessMessage] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Générer les positions des particules une seule fois
  const particlePositions = useMemo(() => {
    return [...Array(5)].map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100
    }))
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Validation de l'email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    if (value && !validateEmail(value)) {
      setEmailError(true)
    } else {
      setEmailError(false)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    setPasswordError(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!email || !password) {
      setError("Veuillez remplir tous les champs")
      return
    }
    
    if (!validateEmail(email)) {
      setEmailError(true)
      setError("Veuillez entrer un email valide")
      return
    }
    
    setLoading(true)
    setError(null)
    
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      rememberMe: rememberMe.toString()
    })

    console.log("Tentative d'authentification avec les identifiants fournis:", {
      res,
      email,
      password,
      rememberMe: rememberMe.toString()
    })
    
    // Détection Safari
    const userAgent = navigator.userAgent;
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    
    // Pour Safari, si signIn réussit, on force la redirection sans vérifier la session
    if (isSafari && !res?.error) {
      
      setSuccessMessage(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
    
    // Vérification réelle de la session après signIn (autres navigateurs)
    let sessionValid = false;
    if (!res?.error) {
      for (let i = 0; i < 3; i++) {
        try {
          const sessionRes = await fetch("/api/auth/session?" + Date.now());
          const sessionData = await sessionRes.json();
          if (sessionData?.user) {
            sessionValid = true;
            break;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 150));
      }
    }

    // Gestion de l'erreur ou succès (sauf Safari qui est déjà traité)
    if (!isSafari && (res?.error || !sessionValid)) {
      setLoading(false)
      setError("Email ou mot de passe incorrect")
      setPasswordError(true)
      // Animation de secousse
      const form = document.getElementById('login-form')
      if (form) {
        form.style.animation = 'shake 0.5s'
        setTimeout(() => {
          form.style.animation = ''
        }, 500)
      }
    } else if (!isSafari) {
      // Succès pour les autres navigateurs
      setSuccessMessage(true)
      setTimeout(() => {
        window.location.href = "/"
      }, 1000)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // const bcrypt = require('bcryptjs');
  // bcrypt.hash('admin123', 12).then((hash: string) => {
  //  console.log(hash);
  // });

  const bcrypt = require('bcryptjs');
  bcrypt.compare('admin123', '$2b$12$OENV7sVwsCpxoBWcCp/Th.JuvdVsdo2XTrXHg9XeL8b9rugFhus32').then(console.log);

  // Composant de particule sans Math.random()
  const FloatingParticle = ({ delay, position }: { delay: number, position: { left: number, top: number } }) => {
    if (!mounted) return null
    
    return (
      <motion.div
        initial={{ y: 0, opacity: 0 }}
        animate={{ 
          y: [-20, 20, -20],
          opacity: [0, 0.3, 0]
        }}
        transition={{
          duration: 8,
          delay,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          left: `${position.left}%`,
          top: `${position.top}%`,
        }}
      >
        <Science sx={{ fontSize: 30, color: 'rgba(255,255,255,0.1)' }} />
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
          ${theme.palette.primary.dark} 0%, 
          ${theme.palette.primary.main} 50%, 
          ${theme.palette.secondary.main} 100%)`,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Particules en arrière-plan - ne s'affiche qu'après le montage */}
      {mounted && particlePositions.map((position, i) => (
        <FloatingParticle key={i} delay={i * 1.5} position={position} />
      ))}

      {/* Overlay avec motif */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `radial-gradient(circle at 20% 80%, transparent 30%, rgba(0,0,0,0.3) 70%),
                           radial-gradient(circle at 80% 20%, transparent 30%, rgba(0,0,0,0.3) 70%)`,
          zIndex: 1,
        }}
      />

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 2 }}>
        <Fade in timeout={1000}>
          <Paper 
            elevation={24} 
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              background: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: "blur(20px)",
              border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Progress bar */}
            <Collapse in={loading}>
              <LinearProgress 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0,
                  borderRadius: '4px 4px 0 0'
                }} 
              />
            </Collapse>

            {/* Logo et titre */}
            <Stack spacing={3} alignItems="center" mb={4}>
              <Grow in timeout={1200}>
                <Box
                  sx={{
                    position: 'relative',
                    width: 100,
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    borderRadius: 3,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: -2,
                      borderRadius: 3,
                      padding: 2,
                      background: `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.secondary.light})`,
                      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      maskComposite: 'exclude',
                      opacity: 0.5
                    }
                  }}
                >
                  <Biotech sx={{ fontSize: 60, color: 'white' }} />
                </Box>
              </Grow>

              <Box textAlign="center">
                <Typography
                  variant={isMobile ? "h5" : "h4"}
                  fontWeight={800}
                  gutterBottom
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: -0.5
                  }}
                >
                  Laboratoire LIMS
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ maxWidth: 400, mx: 'auto' }}
                >
                  Système de gestion de laboratoire scolaire
                </Typography>
              </Box>
            </Stack>

            {/* Indicateurs de sécurité */}
            <Stack 
              direction="row" 
              spacing={2} 
              justifyContent="center" 
              mb={3}
              sx={{ opacity: 0.8 }}
            >
              <Chip
                icon={<Shield sx={{ fontSize: 16 }} />}
                label="Connexion sécurisée"
                size="small"
                color="success"
                variant="outlined"
              />
              <Chip
                icon={<School sx={{ fontSize: 16 }} />}
                label="Accès réservé"
                size="small"
                color="primary"
                variant="outlined"
              />
            </Stack>

            <Divider sx={{ mb: 4 }}>
              <Typography variant="caption" color="text.secondary">
                AUTHENTIFICATION
              </Typography>
            </Divider>

            {/* Formulaire */}
            <Box 
              component="form" 
              onSubmit={handleSubmit} 
              id="login-form"
              sx={{ position: 'relative' }}
            >
              <Stack spacing={3}>
                {/* Messages */}
                <Collapse in={!!error}>
                  <Alert 
                    severity="error" 
                    icon={<ErrorOutline />}
                    onClose={() => setError(null)}
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiAlert-icon': { fontSize: 20 }
                    }}
                  >
                    {error}
                  </Alert>
                </Collapse>

                <Collapse in={successMessage}>
                  <Alert 
                    severity="success" 
                    icon={<CheckCircle />}
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiAlert-icon': { fontSize: 20 }
                    }}
                  >
                    Connexion réussie ! Redirection...
                  </Alert>
                </Collapse>

                {/* Champ Email */}
                <TextField
                  label="Adresse email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  fullWidth
                  required
                  autoFocus
                  autoComplete="email"
                  error={emailError}
                  helperText={emailError ? "Format d'email invalide" : ""}
                  disabled={loading}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email color={emailError ? "error" : "action"} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    textAlign: 'center',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2, // Border radius externe
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      },
                      '&.Mui-focused': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                      }
                    },
                    // Ajoutez cette partie pour styliser l'input interne
                    '& .MuiInputBase-input': {
                      borderRadius: 2, // Border radius de l'input interne (ajustez selon vos besoins)
                      backgroundColor: 'rgba(0, 0, 0, 0.02)', // Optionnel : fond légèrement différent
                      padding: '12px 8px', // Optionnel : ajuster le padding interne
                    }
                  }}
                />

                {/* Champ Mot de passe */}
                <TextField
                  label="Mot de passe"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  fullWidth
                  required
                  autoComplete="current-password"
                  error={passwordError}
                  disabled={loading}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color={passwordError ? "error" : "action"} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={togglePasswordVisibility}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      },
                      '&.Mui-focused': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                      },
                      // Ajoutez cette partie pour styliser l'input interne
                    '& .MuiInputBase-input': {
                      borderRadius: 1, // Border radius de l'input interne (ajustez selon vos besoins)
                      backgroundColor: 'rgba(0, 0, 0, 0.02)', // Optionnel : fond légèrement différent
                      padding: '12px 8px', // Optionnel : ajuster le padding interne
                    }
                    }
                  }}
                />

                {/* Options */}
                <Stack 
                  direction="row" 
                  justifyContent="space-between" 
                  alignItems="center"
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        name="rememberMe"
                        color="primary"
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Se souvenir de moi
                      </Typography>
                    }
                  />
                  <Link
                    href="#"
                    variant="body2"
                    sx={{ 
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    Mot de passe oublié ?
                  </Link>
                </Stack>

                {/* Bouton de connexion */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading || !email || !password}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: 16,
                    fontWeight: 600,
                    textTransform: 'none',
                    background: loading 
                      ? theme.palette.grey[400]
                      : `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    boxShadow: loading 
                      ? 'none' 
                      : '0 4px 20px rgba(0,0,0,0.25)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: loading ? 'none' : 'translateY(-2px)',
                      boxShadow: loading 
                        ? 'none' 
                        : '0 6px 30px rgba(0,0,0,0.3)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    }
                  }}
                >
                  {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={20} color="inherit" />
                      <span>Connexion en cours...</span>
                    </Stack>
                  ) : (
                    'Se connecter'
                  )}
                </Button>

                {/* Séparateur */}
                <Divider sx={{ my: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    OU
                  </Typography>
                </Divider>

                {/* Boutons de connexion alternative */}
                <Stack spacing={2}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<School />}
                    disabled={loading}
                    onClick={() => {
                      // Logique pour connexion SSO école
                      
                    }}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      borderColor: theme.palette.divider,
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        background: alpha(theme.palette.primary.main, 0.05)
                      }
                    }}
                  >
                    Connexion avec l'ENT
                  </Button>
                </Stack>
              </Stack>
            </Box>

            {/* Footer du formulaire */}
            <Box mt={4} textAlign="center">
              <Typography variant="caption" color="text.secondary">
                Première connexion ?{' '}
                <Link
                  href="#"
                  sx={{ 
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    fontWeight: 500,
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Contactez votre administrateur
                </Link>
              </Typography>
            </Box>
          </Paper>
        </Fade>

        {/* Footer */}
        <Stack 
          spacing={2} 
          alignItems="center" 
          sx={{ mt: 4, color: 'rgba(255,255,255,0.7)' }}
        >
          <Stack 
            direction="row" 
            spacing={3} 
            divider={
              <Divider 
                orientation="vertical" 
                flexItem 
                sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} 
              />
            }
          >
            <Link
              href="#"
              underline="hover"
              sx={{ 
                color: 'inherit',
                fontSize: 13,
                '&:hover': { color: 'white' }
              }}
            >
              Guide d'utilisation
            </Link>
            <Link
              href="#"
              underline="hover"
              sx={{ 
                color: 'inherit',
                fontSize: 13,
                '&:hover': { color: 'white' }
              }}
            >
              Support technique
            </Link>
            <Link
              href="#"
              underline="hover"
              sx={{ 
                color: 'inherit',
                fontSize: 13,
                '&:hover': { color: 'white' }
              }}
            >
              Mentions légales
            </Link>
          </Stack>
          
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            © {new Date().getFullYear()} LIMS - Laboratoire Intelligent de Management Scolaire
          </Typography>
        </Stack>
      </Container>

      {/* Styles CSS pour les animations */}
      <GlobalStyles
        styles={{
          '@keyframes shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
            '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
          },
          '@keyframes pulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.7)' },
            '70%': { boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)' }
          },
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-10px)' }
          }
        }}
      />
    </Box>
  )
}