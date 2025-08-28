'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Snackbar,
  Alert,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Stack,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useSession } from 'next-auth/react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';

interface AppSettingsDraft {
  maintenanceMode: boolean;
  maintenanceAllowedUserIds?: number[];
  allowRegistrations: boolean;
  defaultUserRole: string;
  sessionTimeoutMinutes: number;
  timezone: string;
  brandingName: string;
  NOM_ETABLISSEMENT?: string;
  lockThreshold: number;
  lockWindowMinutes: number;
  lockDurationMinutes: number;
  adminAllowedRoles?: string[];
  adminAllowedUserIds?: number[];
  inspectionAllowedRoles?: string[];
  inspectionAllowedUserIds?: number[];
}

const DEFAULTS: AppSettingsDraft = {
  maintenanceMode: false,
  maintenanceAllowedUserIds: [1],
  allowRegistrations: true,
  defaultUserRole: 'ENSEIGNANT',
  sessionTimeoutMinutes: 480,
  timezone: 'Europe/Paris',
  brandingName: 'SGIL',
  NOM_ETABLISSEMENT: 'Paul VALÉRY — Paris 12e',
  lockThreshold: 5,
  lockWindowMinutes: 15,
  lockDurationMinutes: 15,
  adminAllowedRoles: ['ADMIN'],
  adminAllowedUserIds: [1],
  inspectionAllowedRoles: ['ADMIN'],
  inspectionAllowedUserIds: [1],
};

export default function AdminReglagesPage() {
  const theme = useTheme();
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [draft, setDraft] = useState<AppSettingsDraft>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

  // Load settings from API
  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      (async () => {
        try {
          const res = await fetch('/api/admin/settings');
          if (res.ok) {
            const json = await res.json();
            if (json.settings) setDraft(json.settings);
          }
        } catch {}
        setLoading(false);
      })();
    } else if (status === 'authenticated') {
      setLoading(false);
    }
  }, [status, isAdmin]);

  const handleChange = (field: keyof AppSettingsDraft, value: any) => {
    setDraft((d) => ({ ...d, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: draft }),
      });
      if (!res.ok) throw new Error('Erreur API');
      const json = await res.json();
      setDraft(json.settings || draft);
      setSnackbar({ open: true, message: 'Paramètres sauvegardés', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur sauvegarde', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography>Chargement…</Typography>
      </Container>
    );
  }
  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">Accès refusé. Administrateurs uniquement.</Alert>
      </Container>
    );
  }

  return (
    // Retrait de minHeight: '100vh' (cause de scroll supplémentaire avec AppShell)
    <Box
      sx={{
        p: 0,
      }}
    >
      <Box component={motion.div} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <SettingsIcon fontSize="large" color="primary" />
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Paramètres Système
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configuration globale de l'application
            </Typography>
          </Box>
        </Box>

        <Stack spacing={3}>
          {/* Section Maintenance */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Mode maintenance
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={draft.maintenanceMode}
                    onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                  />
                }
                label="Mode maintenance (lecture seule)"
              />
              <TextField
                size="small"
                fullWidth
                label="IDs autorisés en maintenance (séparés par des virgules)"
                helperText="L'utilisateur ID=1 est toujours autorisé. Exemple: 1,2,5"
                value={(draft.maintenanceAllowedUserIds || []).join(',')}
                onChange={(e) =>
                  handleChange(
                    'maintenanceAllowedUserIds',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((s) => Number(s))
                      .filter((n) => !Number.isNaN(n)),
                  )
                }
              />
            </Stack>
          </Paper>

          {/* Section Utilisateurs */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Gestion des utilisateurs
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={draft.allowRegistrations}
                    onChange={(e) => handleChange('allowRegistrations', e.target.checked)}
                  />
                }
                label="Autoriser les inscriptions utilisateurs"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Rôle par défaut</InputLabel>
                <Select
                  label="Rôle par défaut"
                  value={draft.defaultUserRole}
                  onChange={(e) => handleChange('defaultUserRole', e.target.value)}
                >
                  {[
                    'ELEVE',
                    'LABORANTIN_PHYSIQUE',
                    'LABORANTIN_CHIMIE',
                    'ENSEIGNANT',
                    'ADMINLABO',
                    'ADMIN',
                  ].map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Durée de session (minutes)"
                type="number"
                size="small"
                value={draft.sessionTimeoutMinutes}
                onChange={(e) => handleChange('sessionTimeoutMinutes', Number(e.target.value))}
                fullWidth
              />
            </Stack>
          </Paper>

          {/* Section Sécurité */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Sécurité et verrouillage
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Seuil verrouillage"
                type="number"
                size="small"
                value={draft.lockThreshold}
                onChange={(e) => handleChange('lockThreshold', Number(e.target.value))}
                fullWidth
              />
              <TextField
                label="Fenêtre échecs (min)"
                type="number"
                size="small"
                value={draft.lockWindowMinutes}
                onChange={(e) => handleChange('lockWindowMinutes', Number(e.target.value))}
                fullWidth
              />
              <TextField
                label="Durée verrouillage (min)"
                type="number"
                size="small"
                value={draft.lockDurationMinutes}
                onChange={(e) => handleChange('lockDurationMinutes', Number(e.target.value))}
                fullWidth
              />
            </Stack>
          </Paper>

          {/* Section Localisation & Identité */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Localisation et identité
            </Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Fuseau horaire"
                  size="small"
                  value={draft.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  helperText="Identifiant IANA"
                  fullWidth
                />
                <TextField
                  label="Nom affiché / Branding"
                  size="small"
                  value={draft.brandingName}
                  onChange={(e) => handleChange('brandingName', e.target.value)}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Nom de l'établissement (emails)"
                size="small"
                value={draft.NOM_ETABLISSEMENT || ''}
                onChange={(e) => handleChange('NOM_ETABLISSEMENT', e.target.value)}
                helperText="Sera utilisé dans le pied de page des emails"
                fullWidth
              />
            </Stack>
          </Paper>

          {/* Section Accès Administration */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Accès administration (avancé)
            </Typography>
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Rôles autorisés (admin)</InputLabel>
                <Select
                  multiple
                  label="Rôles autorisés (admin)"
                  value={draft.adminAllowedRoles || []}
                  onChange={(e) => handleChange('adminAllowedRoles', e.target.value as string[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {[
                    'ELEVE',
                    'LABORANTIN_PHYSIQUE',
                    'LABORANTIN_CHIMIE',
                    'ENSEIGNANT',
                    'ADMINLABO',
                    'ADMIN',
                  ].map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                fullWidth
                label="IDs autorisés (admin)"
                helperText="Exemple: 1,2,5"
                value={(draft.adminAllowedUserIds || []).join(',')}
                onChange={(e) =>
                  handleChange(
                    'adminAllowedUserIds',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((s) => Number(s))
                      .filter((n) => !Number.isNaN(n)),
                  )
                }
              />
            </Stack>
          </Paper>

          {/* Section Inspection */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Inspection (impersonification)
            </Typography>
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Rôles autorisés (inspection)</InputLabel>
                <Select
                  multiple
                  label="Rôles autorisés (inspection)"
                  value={draft.inspectionAllowedRoles || []}
                  onChange={(e) =>
                    handleChange('inspectionAllowedRoles', e.target.value as string[])
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {[
                    'ELEVE',
                    'LABORANTIN_PHYSIQUE',
                    'LABORANTIN_CHIMIE',
                    'ENSEIGNANT',
                    'ADMINLABO',
                    'ADMIN',
                  ].map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                fullWidth
                label="IDs autorisés (inspection)"
                helperText="Exemple: 1,2,5"
                value={(draft.inspectionAllowedUserIds || []).join(',')}
                onChange={(e) =>
                  handleChange(
                    'inspectionAllowedUserIds',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((s) => Number(s))
                      .filter((n) => !Number.isNaN(n)),
                  )
                }
              />
            </Stack>
          </Paper>
        </Stack>

        <Divider sx={{ my: 4 }} />
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Résumé
        </Typography>
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Maintenance</TableCell>
                <TableCell>{draft.maintenanceMode ? 'ON' : 'OFF'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>IDs autorisés</TableCell>
                <TableCell>{(draft.maintenanceAllowedUserIds || []).join(', ') || '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Inscriptions</TableCell>
                <TableCell>{draft.allowRegistrations ? 'OUVERTES' : 'FERMÉES'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Rôle par défaut</TableCell>
                <TableCell>{draft.defaultUserRole}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Session</TableCell>
                <TableCell>{draft.sessionTimeoutMinutes} min</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Verrouillage</TableCell>
                <TableCell>
                  Seuil {draft.lockThreshold} / Fenêtre {draft.lockWindowMinutes}m / Durée{' '}
                  {draft.lockDurationMinutes}m
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Fuseau</TableCell>
                <TableCell>{draft.timezone}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nom affiché</TableCell>
                <TableCell>{draft.brandingName}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Établissement</TableCell>
                <TableCell>{draft.NOM_ETABLISSEMENT || '—'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          fullWidth={isMobileSmall}
        >
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </Button>
        <Typography variant="caption" display="block" mt={2} color="text.secondary">
          Paramètres persistés via /api/admin/settings.
        </Typography>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
