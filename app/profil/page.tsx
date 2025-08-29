'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Stack,
  IconButton,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

interface ProfileDraft {
  id: number;
  name: string | null;
  email: string;
  role: string;
}

interface PendingEmailChange {
  newEmail: string;
  expiresAt: string;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeMsg, setEmailChangeMsg] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<PendingEmailChange | null>(null);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdNew2, setPwdNew2] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPwdCurrent, setShowPwdCurrent] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);
  const [showPwdNew2, setShowPwdNew2] = useState(false);
  const pendingPollRef = useRef<NodeJS.Timeout | null>(null);

  const ROLE_LABEL: Record<string, string> = {
    ADMIN: 'Administrateur',
    ADMINLABO: 'Administrateur Labo',
    ENSEIGNANT: 'Enseignant',
    LABORANTIN_PHYSIQUE: 'Laborantin Physique',
    LABORANTIN_CHIMIE: 'Laborantin Chimie',
    ELEVE: 'Étudiant',
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const u = session.user as any;
      setDraft({
        id: Number(u.id),
        name: u.name || '',
        email: u.email,
        role: u.role,
      });
      setEmailInput(u.email);
      const loadPending = () => {
        fetch('/api/profile/pending-email-change')
          .then(async (r) => {
            if (r.ok) {
              const data = await r.json();
              if (data && data.newEmail) {
                setPendingEmail(data);
              } else {
                setPendingEmail(null);
              }
            }
          })
          .catch(() => {});
      };
      loadPending();
      if (pendingPollRef.current) clearInterval(pendingPollRef.current);
      pendingPollRef.current = setInterval(loadPending, 30000); // poll 30s
    }
    return () => {
      if (pendingPollRef.current) clearInterval(pendingPollRef.current);
    };
  }, [status, session]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id, name: draft.name }), // users cannot change their role or email here
      });
      if (!res.ok) throw new Error('Échec mise à jour');
      setSuccess(true);
      update();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || !draft) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">Veuillez vous connecter pour accéder à votre profil.</Alert>
      </Container>
    );
  }

  // NOTE: On retire minHeight: '100vh' car AppShell ajoute déjà un offset (navbar fixe + margin top)
  // ce qui provoquait un dépassement vertical (100vh + 64px + spacing) et donc un scroll inutile.
  return (
    <Container 
    sx = {{
      maxWidth: '600px !important',
      '& .MuiContainer-root, & .MuiPaper-root': {
      maxWidth: '600px !important',
      margin: '0 auto',
    },
    }}
    >
      <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
        <Box 
        sx = {{
          display: 'flex',
          alignItems: 'left',
          justifyContent: 'flex-start',
          alignContent: 'flex-start',
          gap: 1,
          mb: 4
        }}
        >
          <AccountCircleIcon fontSize="large" color="primary" />
          <Box
          sx = {{
            display: 'flex',
            alignItems: 'left',
            justifyContent: 'flex-start',
            alignContent: 'flex-start',
            flexDirection: 'column',
            gap: .5,
            mb: 0,
          }}
          >
            <Typography variant="h4" fontWeight={600}>
              Mon Profil
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gérer vos informations personnelles
            </Typography>
          </Box>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Profil mis à jour
          </Alert>
        )}
        <TextField
          label="Nom complet"
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          value={draft.name || ''}
          onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
        />
        <TextField
          label="Email actuel"
          fullWidth
          size="small"
          value={draft.email}
          disabled
          sx={{ mb: 2 }}
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            alignContent: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              alignContent: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 52 }}>
              Rôle :
            </Typography>
            <Chip
              label={ROLE_LABEL[draft.role] || draft.role}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </Button>
        </Box>
        <Typography variant="caption" display="block" mt={2} color="text.secondary">
          Pour changer le rôle, contactez un administrateur.
        </Typography>

        <Divider sx={{ my: 4 }} />
        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ letterSpacing: 0.4, mb: 1 }}>
          Changer d'email
        </Typography>
        {pendingEmail && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Changement en attente: {pendingEmail.newEmail} (expire le{' '}
            {new Date(pendingEmail.expiresAt).toLocaleString()})
          </Alert>
        )}
        {emailChangeMsg && (
          <Alert
            severity={emailChangeMsg.startsWith('Erreur') ? 'error' : 'success'}
            sx={{ mb: 2 }}
          >
            {emailChangeMsg}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'column' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Nouvel email"
            fullWidth
            size="small"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          {(() => {
            const emailChanged = !!emailInput && emailInput !== draft.email;
            const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
            const emailValid = emailRegex.test(emailInput);
            const disabled = emailChangeLoading || !emailChanged || !emailValid;
            return (
              <Button
                variant="outlined"
                disabled={disabled}
                onClick={async () => {
                  if (disabled) return;
                  setEmailChangeLoading(true);
                  setEmailChangeMsg(null);
                  try {
                    const res = await fetch('/api/profile/request-email-change', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ newEmail: emailInput }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Erreur');
                    setEmailChangeMsg('Email de vérification envoyé');
                    setPendingEmail({ newEmail: emailInput, expiresAt: data.expiresAt });
                  } catch (e: any) {
                    setEmailChangeMsg('Erreur: ' + e.message);
                  } finally {
                    setEmailChangeLoading(false);
                  }
                }}
                sx={{ opacity: disabled ? 0.6 : 1 }}
              >
                {emailChangeLoading ? 'Envoi…' : 'Envoyer le lien'}
              </Button>
            );
          })()}
        </Stack>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
          Un email de confirmation sera envoyé à la nouvelle adresse. Le changement ne sera effectif
          qu'après validation.
        </Typography>

        <Divider sx={{ my: 4 }} />
        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ letterSpacing: 0.4, mb: 1 }}>
          Changer de mot de passe
        </Typography>
        {pwdMsg && (
          <Alert severity={pwdMsg.startsWith('Erreur') ? 'error' : 'success'} sx={{ mb: 2 }}>
            {pwdMsg}
          </Alert>
        )}
        <Stack
        sx={{ my: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxWidth: 400,
          margin: '0 auto'
        }}>
        <TextField
          label="Mot de passe actuel"
          type={showPwdCurrent ? 'text' : 'password'}
          fullWidth
          size="small"
          value={pwdCurrent}
          onChange={(e) => setPwdCurrent(e.target.value)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showPwdCurrent ? 'Masquer' : 'Afficher'}>
                    <IconButton size="small" onClick={() => setShowPwdCurrent((v) => !v)}>
                      {showPwdCurrent ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            },
          }}
        />
          <TextField
            label="Nouveau mot de passe"
            type={showPwdNew ? 'text' : 'password'}
            fullWidth
            size="small"
            value={pwdNew}
            onChange={(e) => setPwdNew(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showPwdNew ? 'Masquer' : 'Afficher'}>
                      <IconButton size="small" onClick={() => setShowPwdNew((v) => !v)}>
                        {showPwdNew ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Confirmer"
            type={showPwdNew2 ? 'text' : 'password'}
            fullWidth
            size="small"
            value={pwdNew2}
            onChange={(e) => setPwdNew2(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showPwdNew2 ? 'Masquer' : 'Afficher'}>
                      <IconButton size="small" onClick={() => setShowPwdNew2((v) => !v)}>
                        {showPwdNew2 ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />
        <Button
          variant="outlined"
          disabled={pwdLoading || !pwdCurrent || !pwdNew || pwdNew !== pwdNew2 || pwdNew.length < 5}
          onClick={async () => {
            setPwdLoading(true);
            setPwdMsg(null);
            try {
              const res = await fetch('/api/profile/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  currentPassword: pwdCurrent,
                  newPassword: pwdNew,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Erreur');
              setPwdMsg('Mot de passe changé');
              setPwdCurrent('');
              setPwdNew('');
              setPwdNew2('');
            } catch (e: any) {
              setPwdMsg('Erreur: ' + e.message);
            } finally {
              setPwdLoading(false);
            }
          }}
        >
          {pwdLoading ? 'Changement…' : 'Mettre à jour'}
        </Button>
        </Stack>

        <Typography variant="caption" display="block" mt={2} color="text.secondary">
          Longueur minimale : 5 caractères.
        </Typography>
      </Paper>
    </Container>
  );
}
