'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  InputAdornment,
  IconButton,
  useTheme,
  alpha,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import OtpInput from '@/components/auth/OtpInput';
import { Email, Password, Visibility, VisibilityOff, CheckCircle, AdminPanelSettings } from '@mui/icons-material';

const steps = ['Méthode', 'Authentification', 'Code de vérification', 'Nouveau mot de passe'];

export default function NewPasswordPage() {
  const theme = useTheme();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [method, setMethod] = useState<'email' | 'admin-token' | null>(null);
  const [email, setEmail] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Steps dynamiques selon la méthode
  const getStepsForMethod = () => {
    if (method === 'email') {
      return ['Authentification', 'Code de vérification', 'Nouveau mot de passe'];
    } else if (method === 'admin-token') {
      return ['Code de vérification', 'Nouveau mot de passe'];
    }
    return [];
  };

  const getCurrentStepIndex = () => {
    if (method === 'email') {
      return activeStep - 1; // Étape 1 = index 0, étape 2 = index 1, étape 3 = index 2
    } else if (method === 'admin-token') {
      return activeStep - 1; // Étape 1 = index 0, étape 2 = index 1
    }
    return 0;
  };

  const selectMethod = (selectedMethod: 'email' | 'admin-token') => {
    setMethod(selectedMethod);
    setActiveStep(1);
    setErr(null);
    setMsg(null);
  };

  const requestCode = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Echec');
      setMsg(
        'Si cette adresse est associée à un compte, un code a été envoyé. Consultez votre boîte mail.',
      );
      setActiveStep(2);
      // In dev, auto fill code to help
      // Ne jamais pré-remplir le code côté client
      // if (j.devCode) setCode(j.devCode);
    } catch (e: any) {
      setErr(e.message || 'Erreur lors de lenvoi');
    } finally {
      setLoading(false);
    }
  };

  const verifyAdminToken = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-admin-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken }),
      });
      const j = await res.json();
      if (!res.ok || !j.valid) throw new Error(j.error || 'Token invalide');
      setEmail(j.email);
      setMsg('Token validé. Vous pouvez définir un nouveau mot de passe.');
      setActiveStep(2);
    } catch (e: any) {
      setErr(e.message || 'Vérification impossible');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      const j = await res.json();
      if (!res.ok || !j.valid) throw new Error('Code invalide ou expiré');
      setMsg('Code validé. Vous pouvez définir un nouveau mot de passe.');
      setActiveStep(3);
    } catch (e: any) {
      setErr(e.message || 'Vérification impossible');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      if (newPassword.length < 5) throw new Error('Mot de passe trop court (min 5)');
      if (newPassword !== confirm) throw new Error('Les mots de passe ne correspondent pas');
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          token: method === 'email' ? code : adminToken, 
          newPassword,
          method 
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Echec');
      setMsg('Mot de passe réinitialisé. Redirection vers la connexion...');
      setActiveStep(method === 'email' ? 4 : 3);
      setTimeout(() => router.push('/signin'), 1500);
    } catch (e: any) {
      setErr(e.message || 'Erreur de réinitialisation');
    } finally {
      setLoading(false);
    }
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
        overflow: 'auto',
      }}
    >
    <Paper
      elevation={16}
      sx={{
        p: 3,
        borderRadius: 3,
        width: '100%',
        maxWidth: 560,
        bgcolor: alpha(theme.palette.background.paper, 0.96),
      }}
    >
      <Stack spacing={3}>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Réinitialiser le mot de passe
        </Typography>
        {activeStep > 0 && (
          <Stepper activeStep={getCurrentStepIndex()} alternativeLabel>
            {getStepsForMethod().map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {err && (
          <Alert severity="error" onClose={() => setErr(null)}>
            {err}
          </Alert>
        )}
        {msg && (
          <Alert severity="info" onClose={() => setMsg(null)}>
            {msg}
          </Alert>
        )}

        {activeStep === 0 && (
          <Stack spacing={3}>
            <Typography variant="h6" textAlign="center">
              Choisissez votre méthode de réinitialisation
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Card sx={{ flex: 1 }}>
                <CardActionArea onClick={() => selectMethod('email')}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Email sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Par email
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Recevez un code de vérification par email
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
              <Card sx={{ flex: 1 }}>
                <CardActionArea onClick={() => selectMethod('admin-token')}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <AdminPanelSettings sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Token admin
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Utilisez un token fourni par l'administrateur
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Stack>
          </Stack>
        )}

        {activeStep === 1 && method === 'email' && (
          <Stack
            spacing={2}
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading && email) requestCode();
            }}
          >
            <TextField
              label="Adresse email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(0)}
                sx={{ flex: 1 }}
              >
                Retour
              </Button>
              <Button type="submit" variant="contained" disabled={!email || loading} sx={{ flex: 1 }}>
                Envoyer le code
              </Button>
            </Stack>
          </Stack>
        )}

        {activeStep === 1 && method === 'admin-token' && (
          <Stack spacing={2}>
            <TextField
              label="Token administrateur"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              autoFocus
              required
              placeholder="Collez votre token ici"
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(0)}
                sx={{ flex: 1 }}
              >
                Retour
              </Button>
              <Button
                variant="contained"
                disabled={!adminToken || loading}
                onClick={verifyAdminToken}
                sx={{ flex: 1 }}
              >
                Vérifier le token
              </Button>
            </Stack>
          </Stack>
        )}

        {activeStep === 2 && method === 'admin-token' && (
          <Stack spacing={2}>
            <TextField
              label="Nouveau mot de passe"
              type={showPwd ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Password />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPwd((s) => !s)}>
                        {showPwd ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="Confirmer le mot de passe"
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <Button
              variant="contained"
              disabled={newPassword.length < 5 || newPassword !== confirm || loading}
              onClick={resetPassword}
            >
              Réinitialiser
            </Button>
          </Stack>
        )}

        {activeStep === 2 && method === 'email' && (
          <Stack spacing={2}>
            <Typography variant="body2">Un code à 6 chiffres a été envoyé à {email}.</Typography>
            <OtpInput code={code} setCode={setCode} />
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(1)}
                sx={{
                  px: '15px',
                  py: '5px',
                  position: 'relative',
                  overflow: 'hidden',
                  // Remove any extra spacing inside the TouchRipple wrapper
                  '& .MuiTouchRipple-root': { padding: 0 },
                  '& .MuiTouchRipple-ripple': {
                    margin: 0,
                    width: '100% !important',
                    left: '0 !important',
                  },
                  '&.MuiFocusVisible::after': {
                    padding: 0,
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
                    pointerEvents: 'none',
                  },
                }}
              >
                Changer d'email
              </Button>
              <Button
                variant="contained"
                disabled={code.length !== 6 || loading}
                onClick={verifyCode}
              >
                Vérifier
              </Button>
            </Stack>
          </Stack>
        )}

        {activeStep === 3 && (
          <Stack spacing={2}>
            <TextField
              label="Nouveau mot de passe"
              type={showPwd ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Password />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPwd((s) => !s)}>
                        {showPwd ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="Confirmer le mot de passe"
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <Button
              variant="contained"
              disabled={newPassword.length < 5 || newPassword !== confirm || loading}
              onClick={resetPassword}
            >
              Réinitialiser
            </Button>
          </Stack>
        )}

        {((method === 'email' && activeStep >= 4) || (method === 'admin-token' && activeStep >= 3)) && (
          <Stack spacing={1} alignItems="center">
            <CheckCircle color="success" sx={{ fontSize: 48 }} />
            <Typography>Mot de passe réinitialisé.</Typography>
          </Stack>
        )}
      </Stack>
    </Paper>
</Box>
  );
}
