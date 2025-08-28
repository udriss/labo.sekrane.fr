'use client';

import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
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
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  Warning,
  PowerSettingsNew,
  Assessment,
  Info,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { NotificationConfig } from '@/types/notifications';

// Constantes (reprennent fidèlement celles de l'ancienne page monolithique)
const ROLES = [
  { value: 'ADMIN', label: 'Administrateur', color: 'error' as const, icon: AdminPanelSettings },
  { value: 'ADMINLABO', label: 'Admin Labo', color: 'warning' as const, icon: Science },
  { value: 'ENSEIGNANT', label: 'Enseignant', color: 'primary' as const, icon: School },
  {
    value: 'LABORANTIN_PHYSIQUE',
    label: 'Laborantin Physique',
    color: 'secondary' as const,
    icon: Visibility,
  },
  {
    value: 'LABORANTIN_CHIMIE',
    label: 'Laborantin Chimie',
    color: 'secondary' as const,
    icon: Visibility,
  },
  { value: 'GUEST', label: 'Invité', color: 'default' as const, icon: Person },
];

const MODULES = [
  { value: 'USERS', label: 'Utilisateurs', icon: People, color: '#1976d2', bgColor: 'default' },
  {
    value: 'CHEMICALS',
    label: 'Produits chimiques',
    icon: Biotech,
    color: '#388e3c',
    bgColor: 'default',
  },
  { value: 'MATERIEL', label: 'Équipements', icon: Build, color: '#f57c00', bgColor: 'default' },
  { value: 'ROOMS', label: 'Salles', icon: Business, color: '#7b1fa2', bgColor: 'default' },
  {
    value: 'CALENDAR',
    label: 'Calendrier',
    icon: CalendarMonth,
    color: '#d32f2f',
    bgColor: 'default',
  },
  {
    value: 'ORDERS',
    label: 'Commandes',
    icon: LocalShipping,
    color: '#1976d2',
    bgColor: 'default',
  },
  { value: 'SECURITY', label: 'Sécurité', icon: Security, color: '#d32f2f', bgColor: 'default' },
  { value: 'SYSTEM', label: 'Système', icon: Memory, color: '#616161', bgColor: 'default' },
];

const ACTION_TYPES = [
  {
    value: 'CREATE',
    label: 'Ajout',
    icon: AddIcon,
    color: '#4caf50',
    description: "Lors de l'ajout d'éléments",
  },
  {
    value: 'UPDATE',
    label: 'Modification',
    icon: EditIcon,
    color: '#ff9800',
    description: 'Lors de modifications',
  },
  {
    value: 'DELETE',
    label: 'Suppression',
    icon: DeleteIcon,
    color: '#f44336',
    description: 'Lors de suppressions',
  },
  {
    value: 'SYNC',
    label: 'Synchronisation',
    icon: SyncIcon,
    color: '#2196f3',
    description: 'Lors de synchronisations',
  },
  {
    value: 'ALERT',
    label: 'Alerte',
    icon: Warning,
    color: '#ff5722',
    description: 'Alertes système importantes',
  },
  {
    value: 'STATUS',
    label: 'État',
    icon: PowerSettingsNew,
    color: '#9c27b0',
    description: "Changements d'état",
  },
  {
    value: 'REPORT',
    label: 'Rapport',
    icon: Assessment,
    color: '#607d8b',
    description: 'Génération de rapports',
  },
];

const SEVERITY_COLORS = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error',
} as const;

const SEVERITY_LABELS = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  critical: 'Critique',
} as const;

function getActionTypeInfo(actionType: string) {
  return (
    ACTION_TYPES.find((at) => at.value === actionType) || {
      value: actionType,
      label: actionType,
      icon: SettingsIcon,
      color: '#9e9e9e',
      description: 'Action personnalisée',
    }
  );
}

interface NotificationPreferencesProps {
  configs: NotificationConfig[];
  saving: boolean;
  onSave: () => void;
  onPreferenceChange: (configId: string, role: string, enabled: boolean) => void;
}

export default function NotificationPreferences({
  configs,
  saving,
  onSave,
  onPreferenceChange,
}: NotificationPreferencesProps) {
  // Calcul des stats par rôle sur la base de config.targetRoles
  const statsByRole = useMemo(() => {
    const result: Record<string, number> = {};
    ROLES.forEach((r) => {
      result[r.value] = configs.filter((c) => c.targetRoles?.includes(r.value)).length;
    });
    return result;
  }, [configs]);

  // Groupes par module
  const configsByModule = useMemo(() => {
    const map: Record<string, NotificationConfig[]> = {};
    configs.forEach((c) => {
      if (!map[c.module]) map[c.module] = [];
      map[c.module].push(c);
    });
    return map;
  }, [configs]);

  // Bulk toggle module pour un rôle
  const toggleModuleForRole = (module: string, role: string, enabled: boolean) => {
    (configsByModule[module] || []).forEach((cfg) => {
      const currently = cfg.targetRoles?.includes(role) || false;
      if (currently !== enabled) onPreferenceChange(cfg.id, role, enabled);
    });
  };

  const getRoleColor = (role: string) => ROLES.find((r) => r.value === role)?.color || 'default';

  return (
    <Box>
      {/* Statistiques par rôle */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        {ROLES.map((role) => (
          <Box
            key={role.value}
            sx={{
              flex: '1 1 240px',
              maxWidth: {
                xs: '100%',
                sm: 'calc(50% - 12px)',
                md: 'calc(33.33% - 16px)',
                lg: 'calc(20% - 16px)',
              },
            }}
          >
            <Card
              elevation={4}
              sx={{
                borderRadius: 2,
                background: `linear-gradient(135deg, ${
                  role.color === 'error'
                    ? 'rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.2) 100%'
                    : role.color === 'warning'
                      ? 'rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.2) 100%'
                      : role.color === 'primary'
                        ? 'rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.2) 100%'
                        : role.color === 'secondary'
                          ? 'rgba(156, 39, 176, 0.1) 0%, rgba(156, 39, 176, 0.2) 100%'
                          : 'rgba(158, 158, 158, 0.1) 0%, rgba(158, 158, 158, 0.2) 100%'
                })`,
                border: '1px solid',
                borderColor: `${
                  role.color === 'error'
                    ? 'rgba(244, 67, 54, 0.3)'
                    : role.color === 'warning'
                      ? 'rgba(255, 152, 0, 0.3)'
                      : role.color === 'primary'
                        ? 'rgba(25, 118, 210, 0.3)'
                        : role.color === 'secondary'
                          ? 'rgba(156, 39, 176, 0.3)'
                          : 'rgba(158, 158, 158, 0.3)'
                }`,
                color: 'text.primary',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  borderColor: `${
                    role.color === 'error'
                      ? 'rgba(244, 67, 54, 0.5)'
                      : role.color === 'warning'
                        ? 'rgba(255, 152, 0, 0.5)'
                        : role.color === 'primary'
                          ? 'rgba(25, 118, 210, 0.5)'
                          : role.color === 'secondary'
                            ? 'rgba(156, 39, 176, 0.5)'
                            : 'rgba(158, 158, 158, 0.5)'
                  }`,
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <role.icon sx={{ fontSize: 36, mb: 2, color: `${role.color}.main` }} />
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                  {role.label}
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                  {statsByRole[role.value] || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  notifications actives
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      <Alert
        severity="info"
        sx={{
          mb: 4,
          borderRadius: 2,
          '& .MuiAlert-message': { fontSize: '1.1rem' },
        }}
      >
        <Typography variant="h6" gutterBottom>
          💡 Configuration intelligente des notifications
        </Typography>
        <Typography variant="body2">
          Organisez les préférences de notification par module et type d'action. Chaque carte
          représente une configuration que vous pouvez activer ou désactiver pour chaque rôle.
        </Typography>
      </Alert>

      {MODULES.map((module) => {
        const moduleConfigs = configsByModule[module.value] || [];
        const totalEnabled = ROLES.reduce(
          (sum, role) =>
            sum + moduleConfigs.filter((c) => c.targetRoles?.includes(role.value)).length,
          0,
        );
        const totalPossible = moduleConfigs.length * ROLES.length;

        return (
          <Accordion
            key={module.value}
            sx={{
              mb: 3,
              borderRadius: 2,
              '&:before': { display: 'none' },
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              '&.Mui-expanded': { boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                bgcolor: module.bgColor,
                borderRadius: '8px 8px 0 0',
                minHeight: 72,
                '&.Mui-expanded': { borderRadius: '8px 8px 0 0' },
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Box display="flex" alignItems="center" gap={3}>
                  <Avatar
                    sx={{
                      bgcolor: module.color,
                      width: 56,
                      height: 56,
                      boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                    }}
                  >
                    <module.icon sx={{ fontSize: 28, color: 'primary.contrastText' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight="700" color="text.primary">
                      {module.label}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                      {moduleConfigs.length} types de notifications disponibles
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={3} sx={{ mr: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {totalEnabled}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      sur {totalPossible}
                    </Typography>
                  </Box>
                  <Chip label={moduleConfigs.length} color="primary" size="small" />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 4 }}>
              {/* Switches globaux par rôle */}
              <Box sx={{ mb: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  ⚡ Actions en lot par rôle
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {ROLES.map((role) => {
                    const modulePrefs = moduleConfigs.map(
                      (c) => c.targetRoles?.includes(role.value) || false,
                    );
                    const allEnabled = modulePrefs.every(Boolean);
                    const someEnabled = !allEnabled && modulePrefs.some(Boolean);
                    return (
                      <Box
                        key={role.value}
                        sx={{
                          flex: '1 1 240px',
                          maxWidth: {
                            xs: '100%',
                            sm: 'calc(50% - 8px)',
                            md: 'calc(33.33% - 12px)',
                            lg: 'calc(20% - 12px)',
                          },
                        }}
                      >
                        <Paper
                          elevation={2}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            // Always use paper background to adapt to theme
                            bgcolor: 'background.paper',
                            border: '2px solid',
                            // Colorize border according to enablement state
                            borderColor: allEnabled
                              ? 'success.main'
                              : someEnabled
                                ? 'warning.dark'
                                : 'divider',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'scale(1.02)',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            },
                          }}
                        >
                          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                            <role.icon
                              sx={{
                                fontSize: 28,
                                color: allEnabled
                                  ? 'success.dark'
                                  : someEnabled
                                    ? 'warning.dark'
                                    : 'grey.500',
                              }}
                            />
                            <Chip
                              label={role.label}
                              color={getRoleColor(role.value)}
                              size="small"
                              variant="filled"
                              sx={{ fontWeight: 600 }}
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={allEnabled}
                                  onChange={(e) =>
                                    toggleModuleForRole(module.value, role.value, e.target.checked)
                                  }
                                  color="success"
                                />
                              }
                              label={
                                <Typography variant="caption" fontWeight={600}>
                                  {allEnabled
                                    ? 'Tout activé'
                                    : someEnabled
                                      ? 'Partiel'
                                      : 'Tout désactivé'}
                                </Typography>
                              }
                              sx={{ m: 0 }}
                            />
                          </Box>
                        </Paper>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {/* Cartes d'action */}
              <Box display="flex" flexWrap="wrap" gap={4}>
                {moduleConfigs.map((config) => {
                  const actionInfo = getActionTypeInfo(config.actionType);
                  const ActionIcon = actionInfo.icon;
                  return (
                    <Box
                      key={config.id}
                      sx={{ flex: '1 1 500px', maxWidth: { xs: '100%', lg: 'calc(50% - 16px)' } }}
                    >
                      <Card
                        elevation={6}
                        sx={{
                          borderRadius: 3,
                          background:
                            'linear-gradient(145deg, background.paper 0%, background.default 100%)',
                          border: '1px solid rgba(0,0,0,0.08)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                            borderColor: actionInfo.color,
                          },
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box display="flex" alignItems="center" gap={2} mb={3}>
                            <Avatar
                              sx={{
                                bgcolor: actionInfo.color,
                                width: 48,
                                height: 48,
                                boxShadow: `0 4px 14px ${actionInfo.color}40`,
                              }}
                            >
                              <ActionIcon sx={{ fontSize: 24, color: 'primary.contrastText' }} />
                            </Avatar>
                            <Box flex={1}>
                              <Typography variant="h6" fontWeight="700" color="text.primary">
                                {config.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {config.description}
                              </Typography>
                              <Box display="flex" gap={1}>
                                <Chip
                                  label={actionInfo.label}
                                  size="small"
                                  sx={{
                                    bgcolor: actionInfo.color,
                                    color: 'primary.contrastText',
                                    fontWeight: 600,
                                  }}
                                />
                                <Chip
                                  label={SEVERITY_LABELS[config.severity]}
                                  color={SEVERITY_COLORS[config.severity]}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          </Box>
                          <Divider sx={{ my: 2 }} />
                          <Box display="flex" flexWrap="wrap" gap={2}>
                            {ROLES.map((role) => {
                              const isEnabled = config.targetRoles?.includes(role.value) || false;
                              const roleColor = getRoleColor(role.value);
                              return (
                                <Box
                                  key={role.value}
                                  sx={{
                                    flex: '1 1 220px',
                                    maxWidth: {
                                      xs: '100%',
                                      sm: 'calc(50% - 8px)',
                                      md: 'calc(33.33% - 12px)',
                                    },
                                  }}
                                >
                                  <Paper
                                    elevation={isEnabled ? 8 : 2}
                                    sx={{
                                      p: 2.5,
                                      borderRadius: 2,
                                      // Prefer system background for theme adaptability
                                      bgcolor: 'background.paper',
                                      border: '2px solid',
                                      // Colorize border based on state
                                      borderColor: isEnabled ? 'success.main' : 'divider',
                                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                      cursor: 'pointer',
                                      '&:hover': {
                                        transform: 'scale(1.03)',
                                        borderColor: isEnabled ? 'success.dark' : 'divider',
                                        boxShadow: isEnabled
                                          ? '0 8px 25px rgba(76, 175, 80, 0.25)'
                                          : '0 4px 20px rgba(0,0,0,0.1)',
                                      },
                                    }}
                                    onClick={() =>
                                      onPreferenceChange(config.id, role.value, !isEnabled)
                                    }
                                  >
                                    <Box
                                      display="flex"
                                      flexDirection="column"
                                      alignItems="center"
                                      gap={1.5}
                                    >
                                      <role.icon
                                        sx={{
                                          fontSize: 32,
                                          color: isEnabled ? 'success.main' : 'grey.500',
                                          transition: 'color 0.2s',
                                        }}
                                      />
                                      <Chip
                                        label={role.label}
                                        color={roleColor}
                                        size="small"
                                        variant={isEnabled ? 'filled' : 'outlined'}
                                        sx={{
                                          fontWeight: 700,
                                          fontSize: '0.75rem',
                                          transition: 'all 0.2s',
                                        }}
                                      />
                                      <FormControlLabel
                                        control={
                                          <Switch
                                            checked={isEnabled}
                                            onChange={(e) =>
                                              onPreferenceChange(
                                                config.id,
                                                role.value,
                                                e.target.checked,
                                              )
                                            }
                                            size="small"
                                            color="success"
                                          />
                                        }
                                        label={
                                          <Typography variant="caption" fontWeight={600}>
                                            {isEnabled ? 'Activé' : 'Désactivé'}
                                          </Typography>
                                        }
                                        sx={{ m: 0 }}
                                      />
                                    </Box>
                                  </Paper>
                                </Box>
                              );
                            })}
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Bouton de sauvegarde sticky en bas du composant */}
      <Box mt={6} textAlign="right">
        <Button
          onClick={onSave}
          disabled={saving}
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          sx={{ borderRadius: 2, px: 4 }}
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </Box>
    </Box>
  );
}
