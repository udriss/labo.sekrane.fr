'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  GlobalStyles,
} from '@mui/material';
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
  ErrorOutline,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inactivePrompt, setInactivePrompt] = useState<{ email: string; token?: string } | null>(
    null,
  );
  const [footerBrand, setFooterBrand] = useState('');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);

    // Si l'utilisateur est déjà connecté, rediriger vers la page d'accueil
    if (status === 'authenticated' && session) {
      router.replace('/');
      return;
    }

    // Capture browser autofill on mount to ensure the submit button enables correctly
    try {
      const form = document.getElementById('login-form') as HTMLFormElement | null;
      const emailEl = form?.querySelector('input[name="email"]') as HTMLInputElement | null;
      const passEl = form?.querySelector('input[name="password"]') as HTMLInputElement | null;
      if (emailEl?.value) setEmail(emailEl.value);
      if (passEl?.value) setPassword(passEl.value);
    } catch {}
  }, [status, session, router]);

  // Charger les paramètres de l'application
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/public/settings');
        if (response.ok) {
          const settings = await response.json();
          const brand = settings.NOM_ETABLISSEMENT || settings.brandingName || '';
          setFooterBrand(brand);
        } else {
          console.warn('Erreur HTTP lors du chargement des paramètres:', response.status);
          // Garder la valeur par défaut 'SGIL'
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        // Garder la valeur par défaut 'SGIL'
      }
    };

    loadSettings();
  }, []);

  // Validation de l'email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError(true);
    } else {
      setEmailError(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError(true);
      setError('Veuillez entrer un email valide');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
      rememberMe: rememberMe.toString(),
    });

    // Gestion des erreurs d'authentification d'abord
    if (res?.error) {
      // On inactive/no-password accounts, the server returns a generic credentials error.
      // We'll fetch a fresh activation token and show a nice prompt.
      try {
        const r = await fetch(`/api/auth/activation-token?email=${encodeURIComponent(email)}`);
        const j = await r.json().catch(() => ({}));
        if (r.ok && j?.ok && j?.token) {
          setInactivePrompt({ email, token: j.token });
          setLoading(false);
          return;
        }
      } catch {}
      setLoading(false);
      setError('Email ou mot de passe incorrect');
      setPasswordError(true);
      // Animation de secousse
      const form = document.getElementById('login-form');
      if (form) {
        form.style.animation = 'shake 0.5s';
        setTimeout(() => {
          form.style.animation = '';
        }, 500);
      }
      return;
    }

    // Si l'authentification réussit, NextAuth gère automatiquement la redirection
    if (res?.ok) {
      setSuccessMessage(true);
      // Attendre un peu pour permettre à NextAuth de synchroniser la session
      setTimeout(() => {
        // Utiliser window.location.href pour une meilleure compatibilité
        window.location.href = '/';
      }, 1500);
      return;
    }

    // Cas d'erreur non identifiée
    setLoading(false);
    setError("Une erreur inattendue s'est produite");
    setPasswordError(true);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Ne rien afficher pendant la vérification de la session
  if (status === 'loading') {
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
        }}
      >
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6">Vérification de la session...</Typography>
        </Paper>
      </Box>
    );
  }

  // Si l'utilisateur est déjà connecté, afficher un message de redirection
  if (status === 'authenticated') {
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
        }}
      >
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6">Vous êtes déjà connecté</Typography>
          <Typography variant="body2" color="text.secondary">
            Redirection en cours...
          </Typography>
        </Paper>
      </Box>
    );
  }

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
        overflow: 'auto',
      }}
    >

      <AnimatePresence mode="wait">
        {!inactivePrompt ? (
          <Container
            key="login"
            maxWidth="sm"
            sx={{ position: 'relative', zIndex: 2 }}
            component={motion.div}
            style={{ overflow: 'hidden' }}
            initial={{ opacity: 0, y: 10, height: 'auto' }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{
              opacity: 0,
              height: 0,
              marginTop: 0,
              marginBottom: 0,
              paddingTop: 0,
              paddingBottom: 0,
            }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
          >
            <Fade in timeout={1000}>
              <Paper
                elevation={24}
                sx={{
                  p: { xs: 3, sm: 5 },
                  borderRadius: 4,
                  background: alpha(theme.palette.background.paper, 0.95),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                  position: 'relative',
                  overflow: 'hidden',
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
                      borderRadius: '4px 4px 0 0',
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
                      background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 1)}, ${alpha(theme.palette.secondary.main, 1)})`,
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
                        opacity: 0.5,
                      },
                      }}
                    >
                      <Biotech sx={{ fontSize: 60, color: 'white' }} />
                    </Box>
                  </Grow>

                  <Box textAlign="center">
                    <Typography
                      variant={isMobile ? 'h5' : 'h4'}
                      fontWeight={800}
                      gutterBottom
                      sx={{
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: -0.5,
                      }}
                    >
                      SGIL &nbsp;
                      {footerBrand}
                    </Typography>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ maxWidth: 400, mx: 'auto', fontSize: 9 }}
                    >
                      Système de gestion de l'information du laboratoire scolaire
                    </Typography>
                  </Box>
                </Stack>

                {/* Indicateurs de sécurité */}
                <Stack
                  justifyContent="center"
                  mb={3}
                  sx={{ opacity: 0.8,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    gap: 2,
                   }}
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
                          '& .MuiAlert-icon': { fontSize: 20 },
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
                          '& .MuiAlert-icon': { fontSize: 20 },
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
                      name="email"
                      onChange={handleEmailChange}
                      onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                      fullWidth
                      required
                      autoFocus
                      autoComplete="email"
                      error={emailError}
                      helperText={emailError ? "Format d'email invalide" : ''}
                      disabled={loading}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Email color={emailError ? 'error' : 'action'} />
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
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          },
                          '&.Mui-focused': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          },
                        },
                      }}
                    />

                    {/* Champ Mot de passe */}
                    <TextField
                      label="Mot de passe"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      name="password"
                      onChange={handlePasswordChange}
                      onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                      fullWidth
                      required
                      autoComplete="current-password"
                      error={passwordError}
                      disabled={loading}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock color={passwordError ? 'error' : 'action'} />
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
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          },
                          '&.Mui-focused': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          },
                        },
                      }}
                    />

                    {/* Options */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center"
                    sx = {{
                      display : 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: 'center',
                      gap: 2,
                    }}
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
                        label={<Typography variant="body2">Se souvenir de moi</Typography>}
                      />
                      <Link
                        href="/newpass"
                        variant="body2"
                        sx={{
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
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
                        boxShadow: loading ? 'none' : '0 4px 20px rgba(0,0,0,0.25)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: loading ? 'none' : 'translateY(-2px)',
                          boxShadow: loading ? 'none' : '0 6px 30px rgba(0,0,0,0.3)',
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                      }}
                    >
                      {loading ? (
                        <Stack
                          direction="column"
                          spacing={1}
                          alignItems="center"
                          sx={{
                            backgroundColor: 'transparent',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              py: 1,
                              backgroundColor: 'transparent',
                            }}
                          >
                            <CircularProgress size={34} color="success" />
                          </Box>
                          <Typography
                            variant="body1"
                            sx={{ color: 'text.primary', fontWeight: 'bold' }}
                          >
                            Connexion en cours...
                          </Typography>
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
                        disabled
                        onClick={() => {
                          // Logique pour connexion SSO école
                        }}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          borderColor: theme.palette.divider,
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            background: alpha(theme.palette.primary.main, 0.05),
                          },
                        }}
                      >
                        Connexion avec l&apos;ENT
                      </Button>
                    </Stack>
                  </Stack>
                </Box>

                {/* Footer du formulaire */}
                <Box mt={4} textAlign="center">
                  {/* Message temporaire pour les tests - à supprimer en production */}
                  {process.env.NODE_ENV === 'development' && (
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                      <Typography variant="caption">
                        <strong>Test:</strong> admin@labo.fr / admin123
                      </Typography>
                    </Alert>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    Première connexion ?{' '}
                    <Link
                      href="mailto:admin@sekrane.fr?subject=Demande%20d%27acc%C3%A8s%20SGIL"
                      sx={{
                        color: theme.palette.primary.main,
                        textDecoration: 'none',
                        fontWeight: 500,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Contactez votre administrateur
                    </Link>
                  </Typography>
                </Box>
              </Paper>
            </Fade>
            {/* Footer */}
            <Stack spacing={2} alignItems="center" sx={{ mt: 4, color: 'rgba(255,255,255,0.7)' }}>
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
                  href="/docs"
                  underline="hover"
                  sx={{
                  color: 'inherit',
                  fontSize: 13,
                  '&:hover': { color: 'white' },
                  }}
                >
                  Guide d&apos;utilisation
                </Link>
                <Link
                  href="/mentions"
                  underline="hover"
                  sx={{
                  color: 'inherit',
                  fontSize: 13,
                  '&:hover': { color: 'white' },
                  }}
                >
                  Mentions légales
                </Link>
              </Stack>

              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                © {new Date().getFullYear()} {footerBrand} - Laboratoire Intelligent de Management Scolaire
              </Typography>
            </Stack>
          </Container>
        ) : (
          <Container
            key="activation"
            maxWidth="sm"
            component={motion.div}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            sx={{ position: 'relative', zIndex: 3 }}
          >
            <Paper elevation={10} sx={{ p: 4, borderRadius: 4 }}>
              <Stack spacing={2} alignItems="center" textAlign="center">
                <Chip color="warning" label="Compte inactif" />
                <Typography variant="h6" fontWeight={700}>
                  Activez votre compte pour continuer
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Nous avons trouvé un lien d'activation encore valable pour {inactivePrompt.email}.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => {
                    if (inactivePrompt?.token) {
                      router.push(`/activate?token=${encodeURIComponent(inactivePrompt.token)}`);
                    } else {
                      router.push(`/activate?email=${encodeURIComponent(inactivePrompt.email)}`);
                    }
                  }}
                >
                  Ouvrir la page d'activation
                </Button>
                <Button variant="text" onClick={() => setInactivePrompt(null)} sx={{ mt: 1 }}>
                  Retour
                </Button>
              </Stack>
            </Paper>
          </Container>
        )}
      </AnimatePresence>

      {/* Styles CSS pour les animations */}
      <GlobalStyles
        styles={{
          '@keyframes shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
            '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
          },
          '@keyframes pulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.7)' },
            '70%': { boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)' },
          },
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-10px)' },
          },
        }}
      />
    </Box>
  );
}
