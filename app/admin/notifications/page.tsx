'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocketNotifications } from '@/lib/hooks/useWebSocketNotifications';
import {
  NotificationCatalog,
  NotificationPreferences,
  NotificationLiveFeed,
  NotificationOwnerSettings,
} from '@/components/notifications';

type WSMessage = {
  type: string;
  [key: string]: any;
};

import {
  Box,
  Container,
  Paper,
  Typography,
  Chip,
  Alert,
  Button,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useTabWithURL } from '@/lib/hooks/useTabWithURL';
import {
  NotificationPreference,
  NotificationConfig,
  PreferencesByRole,
  Notification,
} from '@/types/notifications';
import { LibraryBooks, Groups2, CellTower } from '@mui/icons-material';

// Interface pour les notifications brutes (compatible avec le type Notification des composants)
interface RawNotification {
  id: number;
  module: string;
  actionType: string;
  severity: string;
  message: string;
  title?: string | null;
  data?: any;
  targetRoles?: string[];
  createdAt: string;
}

export default function AdminNotificationsPage() {
  const { data: session, status } = useSession();
  const theme = useTheme();
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));

  // WebSocket pour les notifications en temps réel
  const { connected } = useWebSocketNotifications({
    userId: session?.user?.id || '',
    onMessage: (msg: WSMessage) => {
      // Lorsqu'une nouvelle notification arrive, l'ajouter au flux live
      if (msg.type === 'notification' && msg.id) {
        const rawNotification: Notification = {
          id: msg.id,
          module: msg.module || '',
          actionType: msg.actionType || '',
          severity: msg.severity || 'low',
          message: msg.message || '',
          title: msg.title || null,
          data: msg.data || null,
          targetRoles: msg.targetRoles || [],
          createdAt: msg.createdAt || new Date().toISOString(),
        };
        setRawNotifications((prev) => [rawNotification, ...prev]);
      }
    },
    autoConnect: !!session?.user?.id,
  });

  // États généraux
  const [preferences, setPreferences] = useState<PreferencesByRole>({});
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [rawCursor, setRawCursor] = useState<number | undefined>(undefined);
  const [rawLoading, setRawLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });

  // États pour les tabs (persistantes via URL)
  const { tabValue: activeTab, handleTabChange } = useTabWithURL({ defaultTab: 0, maxTabs: 4 });
  // Réglages ciblés propriétaire d'événement
  const [ownerNotif, setOwnerNotif] = useState({
    enabled: true,
    includeTimeslots: true,
    includeDocuments: true,
  });
  // Réglages notifications compte
  const [accountNotif, setAccountNotif] = useState({
    loginSuccess: false,
    loginFailed: true,
    passwordChanged: true,
    passwordResetRequested: true,
    passwordResetCompleted: true,
    emailChangeRequested: true,
    emailChanged: true,
  });

  // États pour les filtres et pagination
  const [cfgPage, setCfgPage] = useState(1);
  const pageSize = 10;

  // Vérification des permissions
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const user = session.user as any;
      if (!user.role || user.role !== 'ADMIN') {
        setSnackbar({
          open: true,
          message: "Vous n'avez pas les permissions pour accéder à cette page",
          severity: 'error',
        });
        return;
      }
      loadData();
    }
  }, [session, status]);

  // Charger les notifications brutes quand on switch vers l'onglet flux libre
  useEffect(() => {
    if (activeTab === 3 && rawNotifications.length === 0) {
      loadRawNotifications();
    }
  }, [activeTab, rawNotifications.length]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les préférences
      const preferencesResponse = await fetch('/api/admin/notification-preferences');
      if (!preferencesResponse.ok) {
        throw new Error(`Erreur préférences: ${preferencesResponse.status}`);
      }
      const preferencesData = await preferencesResponse.json();

      // Charger les configurations
      const configsResponse = await fetch('/api/admin/notification-configs');
      if (!configsResponse.ok) {
        throw new Error(`Erreur configurations: ${configsResponse.status}`);
      }
      const configsData = await configsResponse.json();

      // Organiser les préférences par rôle
      const preferencesByRole: PreferencesByRole = {};
      (preferencesData.preferences || []).forEach((pref: NotificationPreference) => {
        if (!preferencesByRole[pref.role]) {
          preferencesByRole[pref.role] = {};
        }
        const key = `${pref.module}-${pref.actionType}`;
        preferencesByRole[pref.role][key] = pref;
      });

      // Mettre à jour les configs avec les rôles ciblés
      const configsWithRoles = (configsData.configs || []).map((config: NotificationConfig) => {
        const targetRoles = Object.keys(preferencesByRole).filter((role) => {
          const key = `${config.module}-${config.actionType}`;
          return preferencesByRole[role][key]?.enabled;
        });
        return {
          ...config,
          targetRoles,
        };
      });

      // Charger les réglages applicatifs (onglet propriétaire + compte)
      try {
        const settingsRes = await fetch('/api/admin/settings');
        if (settingsRes.ok) {
          const { settings } = await settingsRes.json();
          if (settings?.notificationOwnerEvents) {
            setOwnerNotif(settings.notificationOwnerEvents);
          }
          if (settings?.accountNotifications) {
            setAccountNotif(settings.accountNotifications);
          }
        }
      } catch {}

      setPreferences(preferencesByRole);
      setConfigs(configsWithRoles);

      setSnackbar({
        open: true,
        message: 'Configuration chargée avec succès',
        severity: 'success',
      });
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement des données',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRawNotifications = async (cursor?: number) => {
    try {
      setRawLoading(true);
      const url = new URL('/api/admin/notifications/raw', window.location.origin);
      url.searchParams.set('limit', '50');
      if (cursor) url.searchParams.set('cursor', String(cursor));
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Erreur: ${response.status}`);
      const data = await response.json();
      const items: Notification[] = data.items || [];
      if (cursor) {
        setRawNotifications((prev) => [...prev, ...items]);
      } else {
        setRawNotifications(items);
      }
      if (items.length) {
        setRawCursor(items[items.length - 1].id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications brutes:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement des notifications',
        severity: 'error',
      });
    } finally {
      setRawLoading(false);
    }
  };

  const saveConfigs = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/notification-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      setSnackbar({
        open: true,
        message: 'Configurations sauvegardées avec succès',
        severity: 'success',
      });
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la sauvegarde',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);

      // Convertir les préférences en format API
      const flatPreferences: NotificationPreference[] = [];
      Object.entries(preferences).forEach(([role, rolePrefs]) => {
        Object.values(rolePrefs).forEach((pref) => {
          flatPreferences.push(pref);
        });
      });

      const response = await fetch('/api/admin/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: flatPreferences }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      setSnackbar({
        open: true,
        message: 'Préférences sauvegardées avec succès',
        severity: 'success',
      });
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la sauvegarde',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (configId: string, field: string, value: any) => {
    setConfigs((prev) =>
      prev.map((config) => (config.id === configId ? { ...config, [field]: value } : config)),
    );
  };

  const handlePreferenceChange = (configId: string, role: string, enabled: boolean) => {
    const config = configs.find((c) => c.id === configId);
    if (!config) return;

    setPreferences((prev) => {
      const updated = { ...prev };
      if (!updated[role]) {
        updated[role] = {};
      }

      const key = `${config.module}-${config.actionType}`;
      updated[role][key] = {
        id: updated[role][key]?.id || `${role}-${config.module}-${config.actionType}`,
        role,
        module: config.module,
        actionType: config.actionType,
        enabled,
        createdAt: updated[role][key]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return updated;
    });

    // Mettre à jour les targetRoles dans les configs
    setConfigs((prev) =>
      prev.map((c) => {
        if (c.id === configId) {
          const targetRoles = Object.keys(preferences).filter((r) => {
            if (r === role) return enabled;
            const key = `${c.module}-${c.actionType}`;
            return preferences[r]?.[key]?.enabled;
          });
          return { ...c, targetRoles };
        }
        return c;
      }),
    );
  };

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={48} />
        </Box>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Vous devez être connecté pour accéder à cette page.</Alert>
      </Container>
    );
  }

  return (
    // minHeight supprimé pour éviter scroll vertical superflu sous AppShell
    <Box
      sx={{ bgcolor: 'default' }}
      component={motion.div}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper elevation={8} sx={{ overflow: 'hidden', borderRadius: 3 }}>
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              py: 6,
            }}
          >
            <Box maxWidth="lg" mx="auto" px={4}>
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Gestion des Notifications
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mt: 1 }}>
                Configuration avancée des préférences par rôle et module
              </Typography>
              <Box display="flex" gap={2} mt={2}>
                <Chip
                  label={`${configs.length} configurations`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
                <Chip
                  label={`WebSocket ${connected ? 'connecté' : 'déconnecté'}`}
                  sx={{
                    bgcolor: connected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)',
                    color: 'white',
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 4 }}>
            {/* Tabs de navigation */}
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => {
                handleTabChange(newValue);
                if (newValue === 3 && rawNotifications.length === 0) {
                  loadRawNotifications();
                }
              }}
              sx={{ mb: 4 }}
              variant={isMobileSmall ? 'scrollable' : 'standard'}
              scrollButtons={isMobileSmall ? 'auto' : false}
              allowScrollButtonsMobile
            >
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <LibraryBooks fontSize="small" />
                    Catalogue modifiable
                  </Box>
                }
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Groups2 fontSize="small" />
                    Préférences par rôle
                  </Box>
                }
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <CellTower fontSize="small" />
                    Propriétaire d'événement
                  </Box>
                }
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <CellTower fontSize="small" />
                    Flux brut
                  </Box>
                }
              />
            </Tabs>

            {/* Contenu des tabs */}
            {activeTab === 0 && (
              <NotificationCatalog
                configs={configs}
                saving={saving}
                cfgPage={cfgPage}
                pageSize={pageSize}
                onSave={saveConfigs}
                onConfigChange={handleConfigChange}
                onPageChange={setCfgPage}
              />
            )}

            {activeTab === 1 && (
              <NotificationPreferences
                configs={configs}
                saving={saving}
                onSave={savePreferences}
                onPreferenceChange={handlePreferenceChange}
              />
            )}

            {activeTab === 2 && (
              <NotificationOwnerSettings
                value={ownerNotif}
                onChange={setOwnerNotif}
                account={accountNotif}
                onAccountChange={setAccountNotif}
                onSave={async () => {
                  try {
                    setSaving(true);
                    const res = await fetch('/api/admin/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        settings: {
                          notificationOwnerEvents: ownerNotif,
                          accountNotifications: accountNotif,
                        },
                      }),
                    });
                    if (!res.ok) throw new Error('save settings failed');
                    setSnackbar({
                      open: true,
                      message: 'Réglages sauvegardés',
                      severity: 'success',
                    });
                  } catch (e) {
                    setSnackbar({
                      open: true,
                      message: 'Échec sauvegarde réglages',
                      severity: 'error',
                    });
                  } finally {
                    setSaving(false);
                  }
                }}
                saving={saving}
              />
            )}

            {activeTab === 3 && (
              <NotificationLiveFeed
                notifications={rawNotifications}
                loading={rawLoading}
                wsConnected={connected}
                onRefresh={() => loadRawNotifications()}
                onLoadMore={rawCursor ? () => loadRawNotifications(rawCursor) : undefined}
              />
            )}
          </Box>
        </Paper>
      </Container>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
