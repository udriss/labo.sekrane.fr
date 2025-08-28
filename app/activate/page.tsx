'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function ActivatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string>('');
  const [alreadyActive, setAlreadyActive] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [sessionConflict, setSessionConflict] = useState<{ currentEmail?: string } | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setError('Jeton manquant');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/auth/activate?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || 'Jeton invalide');
        setEmailHint(json.emailHint || '');
        setAlreadyActive(!!json.alreadyActive);
        // If someone is already logged in, warn and block activation
        if (status === 'authenticated' && session?.user?.email) {
          setSessionConflict({ currentEmail: session.user.email as string });
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, status, session?.user?.email]);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (password.length < 5) throw new Error('Mot de passe trop court (min 5 caractères)');
      if (password !== confirm) throw new Error('Les mots de passe ne correspondent pas');
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Activation impossible');
      setOk(true);
      // Auto sign-in then redirect to /profil
      if (json.email) {
        const signInRes = await signIn('credentials', {
          email: json.email,
          password,
          redirect: false,
        });
        // Inform AuthGuard to grant a grace period while session hydrates
        try {
          window.dispatchEvent(new Event('app:retry'));
        } catch {}
        // Force refresh so the new session is visible to app router
        try {
          router.refresh();
        } catch {}
        if (signInRes && (signInRes as any).error) {
          throw new Error('Connexion automatique échouée. Veuillez vous connecter.');
        }
      }
      setTimeout(() => router.push('/profil'), 500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }} elevation={4}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Activation du compte
        </Typography>
        {sessionConflict && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Un autre compte est actuellement connecté ({sessionConflict.currentEmail}).
            <br />
            <Box mt={1} display="flex" gap={1}>
              <Button size="small" variant="outlined" onClick={() => router.push('/')}>
                Continuer avec ce compte
              </Button>
              <Button
                size="small"
                color="error"
                variant="contained"
                onClick={() =>
                  signOut({ callbackUrl: `/activate?token=${encodeURIComponent(token)}` })
                }
              >
                Se déconnecter et activer
              </Button>
            </Box>
          </Alert>
        )}
        {alreadyActive && !sessionConflict && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Ce compte est déjà actif. Aucune activation n'est nécessaire.
            <Box mt={1} display="flex" gap={1}>
              <Button size="small" variant="outlined" onClick={() => router.push('/')}>
                Aller à l'accueil
              </Button>
              <Button size="small" variant="contained" onClick={() => router.push('/profil')}>
                Ouvrir mon profil
              </Button>
            </Box>
          </Alert>
        )}
        {emailHint && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Compte: {emailHint}
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {ok && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Mot de passe défini. Redirection…
          </Alert>
        )}
        <TextField
          label="Nouveau mot de passe"
          type={showPwd ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPwd((v) => !v)}
                  edge="end"
                  aria-label="afficher/masquer le mot de passe"
                >
                  {showPwd ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          helperText="Au moins 5 caractères"
        />
        <TextField
          label="Confirmer le mot de passe"
          type={showConfirm ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          fullWidth
          sx={{ mt: 2, mb: 2 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirm((v) => !v)}
                  edge="end"
                  aria-label="afficher/masquer le mot de passe"
                >
                  {showConfirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          error={!!confirm && confirm !== password}
          helperText={confirm && confirm !== password ? 'Les mots de passe diffèrent' : ' '}
        />
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={
            !!sessionConflict ||
            alreadyActive ||
            submitting ||
            password.length < 5 ||
            password !== confirm
          }
        >
          {submitting ? 'Activation…' : 'Activer'}
        </Button>
      </Paper>
    </Container>
  );
}
