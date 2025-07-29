'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  Alert,
  Button,
  Snackbar,
  CircularProgress,
  Divider,
  Container,
  Paper,
  Avatar,
  Badge,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AdminPanelSettings,
  Science,
  School,
  Visibility,
  Person,
  People,
  Biotech,
  Build,
  Business,
  CalendarMonth,
  LocalShipping,
  Security,
  Memory,
  Restore,
  Info,
  Warning,
  Error as ErrorIcon,
  BugReport,
  Speed
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { NotificationPreference } from '@/types/notifications';

interface NotificationConfig {
  id: string;
  module: string;
  actionType: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PreferencesByRole {
  [role: string]: {
    [key: string]: NotificationPreference;
  };
}

const ROLES = [
  { value: 'ADMIN', label: 'Administrateur', color: 'error' as const, icon: AdminPanelSettings },
  { value: 'ADMINLABO', label: 'Admin Labo', color: 'error' as const, icon: Science },
  { value: 'TEACHER', label: 'Enseignant', color: 'primary' as const, icon: School },
  { value: 'LABORANTIN', label: 'Laborantin', color: 'secondary' as const, icon: Visibility },
  { value: 'GUEST', label: 'Invité', color: 'default' as const, icon: Person }
];

const MODULES = [
  { value: 'USERS', label: 'Utilisateurs', icon: People, color: 'rgba(25, 118, 210, 0.1)' },
  { value: 'CHEMICALS', label: 'Produits chimiques', icon: Biotech, color: 'rgba(56, 142, 60, 0.1)' },
  { value: 'EQUIPMENT', label: 'Équipements', icon: Build, color: 'rgba(245, 124, 0, 0.1)' },
  { value: 'ROOMS', label: 'Salles', icon: Business, color: 'rgba(123, 31, 162, 0.1)' },
  { value: 'CALENDAR', label: 'Calendrier', icon: CalendarMonth, color: 'rgba(211, 47, 47, 0.1)' },
  { value: 'ORDERS', label: 'Commandes', icon: LocalShipping, color: 'rgba(25, 118, 210, 0.1)' },
  { value: 'SECURITY', label: 'Sécurité', icon: Security, color: 'rgba(211, 47, 47, 0.1)' },
  { value: 'SYSTEM', label: 'Système', icon: Memory, color: 'rgba(97, 97, 97, 0.1)' }
];

const SEVERITY_COLORS = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error'
} as const;

const SEVERITY_LABELS = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  critical: 'Critique'
} as const;

const SEVERITY_ICONS = {
  low: Info,
  medium: Warning,
  high: Error,
  critical: BugReport
};

export default function AdminNotificationsPage() {
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<PreferencesByRole>({});
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });
  const [stats, setStats] = useState({ 
    totalConfigs: 0, 
    enabledByRole: {} as Record<string, number>,
    totalPreferences: 0
  });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Vérification des permissions
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const user = session.user as any;
      if (!user.role || !['ADMIN', 'ADMINLABO'].includes(user.role)) {
        setSnackbar({
          open: true,
          message: 'Vous n\'avez pas les permissions pour accéder à cette page',
          severity: 'error'
        });
        return;
      }
      loadData();
    }
  }, [session, status]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('🔧 [ADMIN] Chargement des données de configuration...');
      
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
      
      console.log('✅ [ADMIN] Données chargées:', {
        preferences: preferencesData.preferences?.length || 0,
        configs: configsData.configs?.length || 0
      });
      
      // Organiser les préférences par rôle
      const preferencesByRole: PreferencesByRole = {};
      (preferencesData.preferences || []).forEach((pref: NotificationPreference) => {
        if (!preferencesByRole[pref.role]) {
          preferencesByRole[pref.role] = {};
        }
        const key = `${pref.module}-${pref.actionType}`;
        preferencesByRole[pref.role][key] = pref;
      });
      
      // Calculer les statistiques
      const enabledByRole: Record<string, number> = {};
      ROLES.forEach(role => {
        enabledByRole[role.value] = Object.values(preferencesByRole[role.value] || {})
          .filter(pref => pref.enabled).length;
      });
      
      setPreferences(preferencesByRole);
      setConfigs(configsData.configs || []);
      setStats({
        totalConfigs: configsData.configs?.length || 0,
        totalPreferences: preferencesData.preferences?.length || 0,
        enabledByRole
      });

      setSnackbar({
        open: true,
        message: 'Configuration chargée avec succès',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('❌ [ADMIN] Erreur lors du chargement:', error);
      setSnackbar({ 
        open: true, 
        message: `Erreur lors du chargement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 
        severity: 'error' 
      });
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
          ...prev[role]?.[key],
          id: prev[role]?.[key]?.id || crypto.randomUUID(),
          role,
          module,
          actionType,
          enabled,
          createdAt: prev[role]?.[key]?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    }));

    // Mettre à jour les stats localement
    setStats(prev => ({
      ...prev,
      enabledByRole: {
        ...prev.enabledByRole,
        [role]: enabled
          ? (prev.enabledByRole[role] || 0) + 1
          : Math.max(0, (prev.enabledByRole[role] || 0) - 1)
      }
    }));
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      
      console.log('💾 [ADMIN] Sauvegarde des préférences...');
      
      // Préparer les mises à jour par rôle
      const updates = Object.entries(preferences).map(([role, rolePrefs]) => ({
        role,
        updates: Object.values(rolePrefs).map(pref => ({
          module: pref.module,
          actionType: pref.actionType,
          enabled: pref.enabled
        }))
      }));
      
      console.log('💾 [ADMIN] Mises à jour à effectuer:', updates.length);
      
      // Sauvegarder chaque rôle
      let successCount = 0;
      for (const { role, updates: roleUpdates } of updates) {
        const response = await fetch('/api/admin/notification-preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, updates: roleUpdates })
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Erreur pour le rôle ${role}: ${errorData}`);
        }
        
        successCount++;
        console.log(`✅ [ADMIN] Préférences sauvegardées pour le rôle: ${role}`);
      }
      
      setSnackbar({ 
        open: true, 
        message: `Préférences sauvegardées avec succès (${successCount} rôles)`, 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('❌ [ADMIN] Erreur lors de la sauvegarde:', error);
      setSnackbar({ 
        open: true, 
        message: `Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 
        severity: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setResetting(true);
      
      console.log('🔄 [ADMIN] Réinitialisation aux valeurs par défaut...');
      
      const response = await fetch('/api/admin/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-defaults' })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erreur lors de la réinitialisation: ${errorData}`);
      }
      
      const data = await response.json();
      console.log('✅ [ADMIN] Réinitialisation réussie:', data);
      
      setSnackbar({
        open: true,
        message: 'Préférences réinitialisées aux valeurs par défaut',
        severity: 'success'
      });
      
      // Recharger les données
      await loadData();
      
    } catch (error) {
      console.error('❌ [ADMIN] Erreur lors de la réinitialisation:', error);
      setSnackbar({
        open: true,
        message: `Erreur lors de la réinitialisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        severity: 'error'
      });
    } finally {
      setResetting(false);
      setResetDialogOpen(false);
    }
  };

  const getConfigsByModule = (module: string) => {
    return configs.filter(config => config.module === module);
  };

  const getModuleStats = (module: string) => {
    const moduleConfigs = getConfigsByModule(module);
    const totalEnabled = ROLES.reduce((sum, role) => {
      return sum + moduleConfigs.filter(config => {
        const key = `${config.module}-${config.actionType}`;
        return preferences[role.value]?.[key]?.enabled || false;
      }).length;
    }, 0);
    
    return {
      total: moduleConfigs.length * ROLES.length,
      enabled: totalEnabled
    };
  };

  // Vérification de l'authentification
  if (status === 'loading') {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh',
          bgcolor: 'grey.50',
          py: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 6,
            borderRadius: 3,
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}
        >
          <CircularProgress size={48} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Vérification des permissions...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (status === 'unauthenticated' || !session?.user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Vous devez être connecté pour accéder à cette page.
        </Alert>
      </Container>
    );
  }

  const user = session.user as any;
  if (!user.role || !['ADMIN', 'ADMINLABO'].includes(user.role)) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Vous n'avez pas les permissions pour accéder à cette page d'administration.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh',
          bgcolor: 'grey.50',
          py: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 6,
            borderRadius: 3,
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}
        >
          <CircularProgress size={48} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Chargement de la configuration...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'grey.50',
        py: 4
      }}
    >
      <Container maxWidth="lg">
        {/* Boutons sticky placés en haut du Container */}
        <Box 
          display="flex" 
          gap={2}
          sx={{
            position: 'sticky',
            top: 120, // Ajuster selon votre navbar
            zIndex: 1000,
            bgcolor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            p: 1,
            mb: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            ml: 'auto',
            width: 'fit-content'
          }}
        >
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
            sx={{ 
              color: 'primary.main', 
              borderColor: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                bgcolor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            Actualiser
          </Button>
          
          {user.role === 'ADMIN' && (
            <Button
              variant="outlined"
              startIcon={<Restore />}
              onClick={() => setResetDialogOpen(true)}
              disabled={loading || saving}
              color="warning"
              sx={{ 
                '&:hover': {
                  bgcolor: 'rgba(237, 108, 2, 0.04)'
                }
              }}
            >
              Réinitialiser
            </Button>
          )}
          
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={savePreferences}
            disabled={saving || loading}
            sx={{ 
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark'
              },
              '&:disabled': {
                bgcolor: 'grey.300',
                color: 'grey.500'
              }
            }}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </Box>

        <Paper
          elevation={8}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06)',
          }}
        >
          {/* Header avec gradient */}
          <Box 
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px 12px 0 0',
              p: 4,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                opacity: 0.3
              }
            }}
          >
            <Box display="flex" alignItems="center" gap={3} sx={{ position: 'relative', zIndex: 1 }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  width: 64, 
                  height: 64,
                  backdropFilter: 'blur(10px)'
                }}
              >
                <NotificationsIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h3" component="h1" fontWeight="bold">
                  Gestion des Notifications
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, mt: 1 }}>
                  Configuration des préférences par rôle et module
                </Typography>
                <Box display="flex" gap={2} mt={2}>
                  <Chip 
                    label={`${stats.totalConfigs} configurations`} 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip 
                    label={`${stats.totalPreferences} préférences`} 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 4 }}>
            {/* Statistiques par rôle */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {ROLES.map((role) => (
                <Grid size = {{ xs: 12, sm: 6, lg: 2.4 }} key={role.value}>
                  <Card 
                    elevation={4}
                    sx={{ 
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${
                        role.color === 'error' ? 'rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.2) 100%' :
                        role.color === 'primary' ? 'rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.2) 100%' :
                        role.color === 'secondary' ? 'rgba(156, 39, 176, 0.1) 0%, rgba(156, 39, 176, 0.2) 100%' :
                        'rgba(158, 158, 158, 0.1) 0%, rgba(158, 158, 158, 0.2) 100%'
                      })`,
                      border: '1px solid',
                      borderColor: `${
                        role.color === 'error' ? 'rgba(244, 67, 54, 0.3)' :
                        role.color === 'primary' ? 'rgba(25, 118, 210, 0.3)' :
                        role.color === 'secondary' ? 'rgba(156, 39, 176, 0.3)' :
                        'rgba(158, 158, 158, 0.3)'
                      }`,
                      color: 'text.primary',
                      transition: 'all 0.2s',
                      '&:hover': { 
                        transform: 'translateY(-4px)',
                        borderColor: `${
                          role.color === 'error' ? 'rgba(244, 67, 54, 0.5)' :
                          role.color === 'primary' ? 'rgba(25, 118, 210, 0.5)' :
                          role.color === 'secondary' ? 'rgba(156, 39, 176, 0.5)' :
                          'rgba(158, 158, 158, 0.5)'
                        }`
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <role.icon sx={{ fontSize: 32, mb: 1, color: `${role.color}.main` }} />
                      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                        {role.label}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="primary">
                        {stats.enabledByRole[role.value] || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        notifications actives
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Alert 
              severity="info" 
              sx={{ 
                mb: 4,
                borderRadius: 2,
                '& .MuiAlert-message': {
                  fontSize: '1.1rem'
                }
              }}
            >
              <Typography variant="h6" gutterBottom>
                Configuration des notifications basée sur les rôles
              </Typography>
              <Typography variant="body2">
                Configurez les notifications que chaque rôle d'utilisateur doit recevoir pour chaque type d'action dans l'application. 
                Les modifications sont sauvegardées dans le fichier JSON et prises en compte immédiatement.
              </Typography>
            </Alert>

            {/* Modules */}
            {MODULES.map(module => {
              const moduleStats = getModuleStats(module.value);
              const moduleConfigs = getConfigsByModule(module.value);
              
              return (
                <Accordion 
                  key={module.value} 
                  sx={{ 
                    mb: 2,
                    borderRadius: 2,
                    '&:before': { display: 'none' },
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    '&.Mui-expanded': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      bgcolor: 'grey.50',
                      borderRadius: '8px 8px 0 0',
                      '&.Mui-expanded': {
                        borderRadius: '8px 8px 0 0'
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar 
                          sx={{ 
                            bgcolor: module.color,
                            width: 48,
                            height: 48,
                            border: '2px solid',
                            borderColor: 'rgba(0,0,0,0.1)'
                          }}
                        >
                          <module.icon sx={{ fontSize: 24, color: 'primary.main' }} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight="600">
                            {module.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {moduleConfigs.length} types de notifications
                          </Typography>
                        </Box>
                      </Box>
                      <Box display="flex" alignItems="center" gap={2} sx={{ mr: 2 }}>
                        <Chip 
                          label={`${moduleStats.enabled}/${moduleStats.total} actives`}
                          color={moduleStats.enabled > 0 ? 'success' : 'default'}
                          variant="outlined"
                          size="small"
                        />
                        <Badge 
                          badgeContent={moduleConfigs.length} 
                          color="primary"
                          sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
                        >
                          <SettingsIcon color="action" />
                        </Badge>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                      {moduleConfigs.map(config => {
                        const SeverityIcon = SEVERITY_ICONS[config.severity];
                        
                        return (
                          <Grid size = {{ xs: 12 }} key={config.id}>
                            <Card 
                              variant="outlined"
                              sx={{ 
                                borderRadius: 2,
                                transition: 'all 0.2s',
                                '&:hover': {
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  transform: 'translateY(-2px)'
                                }
                              }}
                            >
                              <CardContent sx={{ p: 3 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                                  <Box flex={1}>
                                    <Typography variant="h6" gutterBottom fontWeight="600">
                                      {config.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                                      {config.description}
                                    </Typography>
                                    <Box display="flex" gap={1}>
                                      <Chip 
                                        label={SEVERITY_LABELS[config.severity]}
                                        color={SEVERITY_COLORS[config.severity]}
                                        size="small"
                                        icon={<Speed />}
                                        sx={{ fontWeight: 600 }}
                                      />
                                      <Chip 
                                        label={config.actionType}
                                        variant="outlined"
                                        size="small"
                                        sx={{ fontWeight: 500 }}
                                      />
                                    </Box>
                                  </Box>
                                </Box>
                                
                                <Divider sx={{ my: 2 }} />
                                
                                <Typography variant="subtitle1" gutterBottom fontWeight="600" color="primary">
                                  Configuration par rôle
                                </Typography>
                                
                                <Grid container spacing={2}>
                                  {ROLES.map(role => {
                                    const key = `${config.module}-${config.actionType}`;
                                    const preference = preferences[role.value]?.[key];
                                    const isEnabled = preference?.enabled || false;
                                    
                                    return (
                                      <Grid size = {{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={role.value}>
                                        <Paper
                                          elevation={isEnabled ? 3 : 1}
                                          sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: isEnabled ? 'rgba(76, 175, 80, 0.05)' : 'grey.50',
                                            border: '2px solid',
                                            borderColor: isEnabled ? 'success.main' : 'transparent',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                              transform: 'scale(1.02)',
                                              borderColor: isEnabled ? 'success.dark' : 'grey.400'
                                            }
                                          }}
                                        >
                                          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                            <role.icon sx={{ fontSize: 24, color: isEnabled ? 'success.main' : 'grey.500' }} />
                                            <Chip 
                                              label={role.label} 
                                              color={role.color}
                                              size="small"
                                              variant={isEnabled ? 'filled' : 'outlined'}
                                              sx={{ 
                                                fontWeight: 600,
                                                bgcolor: isEnabled ? `${role.color}.main` : 'transparent',
                                                color: isEnabled ? 'white' : `${role.color}.main`
                                              }}
                                            />
                                            <Box display="flex" alignItems="center" gap={1}>
                                              <Tooltip title={isEnabled ? 'Désactiver' : 'Activer'}>
                                                <IconButton
                                                  size="small"
                                                  onClick={() => handlePreferenceChange(
                                                    role.value,
                                                    config.module,
                                                    config.actionType,
                                                    !isEnabled
                                                  )}
                                                  sx={{
                                                    color: isEnabled ? 'success.main' : 'grey.500'
                                                  }}
                                                >
                                                  {isEnabled ? <CheckCircleIcon /> : <CancelIcon />}
                                                </IconButton>
                                              </Tooltip>
                                              <Switch
                                                checked={isEnabled}
                                                onChange={(e) => handlePreferenceChange(
                                                  role.value,
                                                  config.module,
                                                  config.actionType,
                                                  e.target.checked
                                                )}
                                                size="small"
                                                color="success"
                                              />
                                            </Box>
                                          </Box>
                                        </Paper>
                                      </Grid>
                                    );
                                  })}
                                </Grid>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        </Paper>
      </Container>

      {/* Dialog de confirmation pour la réinitialisation */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Restore color="warning" />
            <Typography variant="h6">
              Réinitialiser aux valeurs par défaut
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Cette action va réinitialiser toutes les préférences de notifications aux valeurs par défaut.
            </Typography>
            <Typography variant="body2">
              Toutes les configurations personnalisées seront perdues.
            </Typography>
          </Alert>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Préférences par défaut qui seront appliquées :
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemIcon>
                <AdminPanelSettings color="error" />
              </ListItemIcon>
              <ListItemText 
                primary="ADMIN" 
                secondary="Accès à toutes les notifications système, utilisateurs, sécurité, commandes et calendrier"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Science color="error" />
              </ListItemIcon>
              <ListItemText 
                primary="ADMINLABO" 
                secondary="Notifications pour produits chimiques, équipements et commandes"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <School color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="TEACHER" 
                secondary="Notifications pour calendrier et réservations de salles"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Visibility color="secondary" />
              </ListItemIcon>
              <ListItemText 
                primary="LABORANTIN" 
                secondary="Notifications pour maintenance équipements, stocks et salles"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Person />
              </ListItemIcon>
              <ListItemText 
                primary="GUEST" 
                secondary="Accès minimal aux notifications"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setResetDialogOpen(false)}
            disabled={resetting}
          >
            Annuler
          </Button>
          <Button 
            onClick={resetToDefaults}
            color="warning"
            variant="contained"
            disabled={resetting}
            startIcon={resetting ? <CircularProgress size={16} /> : <Restore />}
          >
            {resetting ? 'Réinitialisation...' : 'Réinitialiser'}
          </Button>
        </DialogActions>
      </Dialog>

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