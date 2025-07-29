'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  Alert,
  Button,
  Snackbar,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { NotificationPreference, NotificationConfig } from '@/types/notifications';

interface PreferencesByRole {
  [role: string]: {
    [key: string]: NotificationPreference;
  };
}

const ROLES = [
  { value: 'ADMIN', label: 'Administrateur', color: 'error' as const },
  { value: 'TEACHER', label: 'Enseignant', color: 'primary' as const },
  { value: 'STUDENT', label: 'Étudiant', color: 'secondary' as const },
  { value: 'GUEST', label: 'Invité', color: 'default' as const }
];

const MODULES = [
  { value: 'USERS', label: 'Utilisateurs', icon: '👥' },
  { value: 'CHEMICALS', label: 'Produits chimiques', icon: '🧪' },
  { value: 'EQUIPMENT', label: 'Équipements', icon: '🔬' },
  { value: 'ROOMS', label: 'Salles', icon: '🏢' },
  { value: 'CALENDAR', label: 'Calendrier', icon: '📅' },
  { value: 'ORDERS', label: 'Commandes', icon: '📦' },
  { value: 'SECURITY', label: 'Sécurité', icon: '🔒' },
  { value: 'SYSTEM', label: 'Système', icon: '⚙️' }
];

const SEVERITY_COLORS = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error'
} as const;

export default function AdminNotificationsPage() {
  const [preferences, setPreferences] = useState<PreferencesByRole>({});
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les préférences
      const preferencesResponse = await fetch('/api/admin/notification-preferences');
      const preferencesData = await preferencesResponse.json();
      
      // Charger les configurations
      const configsResponse = await fetch('/api/admin/notification-configs');
      const configsData = await configsResponse.json();
      
      // Organiser les préférences par rôle
      const preferencesByRole: PreferencesByRole = {};
      preferencesData.preferences.forEach((pref: NotificationPreference) => {
        if (!preferencesByRole[pref.role]) {
          preferencesByRole[pref.role] = {};
        }
        const key = `${pref.module}-${pref.actionType}`;
        preferencesByRole[pref.role][key] = pref;
      });
      
      setPreferences(preferencesByRole);
      setConfigs(configsData.configs);
    } catch (error) {
      console.error('Error loading data:', error);
      setSnackbar({ open: true, message: 'Erreur lors du chargement des données', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (role: string, module: string, actionType: string, enabled: boolean) => {
    const key = `${module}-${actionType}`;
    setPreferences(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: {
          ...prev[role][key],
          enabled
        }
      }
    }));
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      
      // Préparer les mises à jour par rôle
      const updates = Object.entries(preferences).map(([role, rolePrefs]) => ({
        role,
        updates: Object.values(rolePrefs).map(pref => ({
          module: pref.module,
          actionType: pref.actionType,
          enabled: pref.enabled
        }))
      }));
      
      // Sauvegarder chaque rôle
      for (const { role, updates: roleUpdates } of updates) {
        await fetch('/api/admin/notification-preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, updates: roleUpdates })
        });
      }
      
      setSnackbar({ open: true, message: 'Préférences sauvegardées avec succès', severity: 'success' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la sauvegarde', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getConfigsByModule = (module: string) => {
    return configs.filter(config => config.module === module);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gestion des Notifications
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ mr: 2 }}
          >
            Actualiser
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={savePreferences}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Sauvegarder'}
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configurez les notifications que chaque rôle d'utilisateur doit recevoir pour chaque type d'action dans l'application.
      </Alert>

      {MODULES.map(module => (
        <Accordion key={module.value} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h6">
                {module.icon} {module.label}
              </Typography>
              <Chip 
                label={`${getConfigsByModule(module.value).length} actions`} 
                size="small" 
                variant="outlined" 
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {getConfigsByModule(module.value).map(config => (
                <Grid size = {{ xs: 12 }} key={config.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {config.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {config.description}
                          </Typography>
                          <Chip 
                            label={config.severity.toUpperCase()} 
                            color={SEVERITY_COLORS[config.severity]}
                            size="small"
                          />
                        </Box>
                      </Box>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Notifications par rôle :
                      </Typography>
                      
                      <Grid container spacing={2}>
                        {ROLES.map(role => {
                          const key = `${config.module}-${config.actionType}`;
                          const preference = preferences[role.value]?.[key];
                          
                          return (
                            <Grid size = {{ xs: 12, sm: 6, md: 3 }} key={role.value}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Chip 
                                  label={role.label} 
                                  color={role.color}
                                  size="small"
                                  variant="outlined"
                                />
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={preference?.enabled || false}
                                      onChange={(e) => handlePreferenceChange(
                                        role.value,
                                        config.module,
                                        config.actionType,
                                        e.target.checked
                                      )}
                                      size="small"
                                    />
                                  }
                                  label=""
                                />
                              </Box>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}