'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Chip,
  Stack
} from '@mui/material';
import {
  Notifications,
  FilterList,
  Refresh,
  Settings
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import NotificationsList from '@/components/notifications/NotificationList';
import { NotificationFilter } from '@/types/notifications';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MODULES = [
  { value: '', label: 'Tous les modules' },
  { value: 'USERS', label: 'Utilisateurs' },
  { value: 'CHEMICALS', label: 'Produits chimiques' },
  { value: 'EQUIPMENT', label: 'Équipements' },
  { value: 'ROOMS', label: 'Salles' },
  { value: 'CALENDAR', label: 'Calendrier' },
  { value: 'ORDERS', label: 'Commandes' },
  { value: 'SECURITY', label: 'Sécurité' },
  { value: 'SYSTEM', label: 'Système' }
];

const SEVERITIES = [
  { value: '', label: 'Toutes les sévérités' },
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Élevée' },
  { value: 'critical', label: 'Critique' }
];

// Mémoriser le composant principal
const NotificationsPage = React.memo(function NotificationsPage() {
  const { data: session, status } = useSession();
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState<NotificationFilter>({
    limit: 20,
    offset: 0
  });

  // Mémoriser les handlers pour éviter les re-créations
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Ajuster les filtres selon l'onglet
    setFilters(prev => ({
      ...prev,
      isRead: newValue === 1 ? false : newValue === 2 ? true : undefined,
      offset: 0 // Reset pagination
    }));
  }, []);

  const handleFilterChange = useCallback((field: keyof NotificationFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value,
      offset: 0 // Reset pagination
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      limit: 20,
      offset: 0
    });
    setTabValue(0);
  }, []);

  // Mémoriser les filtres actuels pour éviter les recalculs
  const currentFilters = useMemo(() => ({
    ...filters,
    isRead: tabValue === 1 ? false : tabValue === 2 ? true : undefined
  }), [filters, tabValue]);

  // Mémoriser les informations utilisateur
  const userInfo = useMemo(() => {
    if (!session?.user) return null;
    const user = session.user as any;
    return {
      role: user.role,
      email: user.email,
      hasRole: !!user.role
    };
  }, [session?.user]);

  // Vérification de l'authentification
  if (status === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography>Chargement...</Typography>
        </Box>
      </Container>
    );
  }

  if (status === 'unauthenticated' || !session?.user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Vous devez être connecté pour accéder aux notifications.
        </Alert>
      </Container>
    );
  }

  if (!userInfo?.hasRole) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Votre compte n'a pas de rôle assigné. Contactez un administrateur.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* En-tête */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Notifications sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Notifications
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Gérez vos notifications système
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Chip 
              label={`Rôle: ${userInfo.role}`} 
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              label={userInfo.email} 
              variant="outlined" 
            />
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Filtres */}
        <Grid size = {{ xs: 12, md: 3 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <FilterList />
              <Typography variant="h6">Filtres</Typography>
            </Box>

            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Module</InputLabel>
                <Select
                  value={filters.module || ''}
                  label="Module"
                  onChange={(e) => handleFilterChange('module', e.target.value)}
                >
                  {MODULES.map((module) => (
                    <MenuItem key={module.value} value={module.value}>
                      {module.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Sévérité</InputLabel>
                <Select
                  value={filters.severity || ''}
                  label="Sévérité"
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                >
                  {SEVERITIES.map((severity) => (
                    <MenuItem key={severity.value} value={severity.value}>
                      {severity.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Date de début"
                type="date"
                size="small"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />

              <TextField
                label="Date de fin"
                type="date"
                size="small"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />

              <Button
                variant="outlined"
                onClick={resetFilters}
                startIcon={<Refresh />}
                fullWidth
              >
                Réinitialiser
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Liste des notifications */}
        <Grid size = {{ xs: 12, md: 9 }}>
          <Paper elevation={2}>
            {/* Onglets */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Toutes" />
                <Tab label="Non lues" />
                <Tab label="Lues" />
              </Tabs>
            </Box>

            {/* Contenu des onglets */}
            <TabPanel value={tabValue} index={0}>
              <NotificationsList 
                filters={currentFilters}
                showStats={true}
                maxHeight="70vh"
              />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <NotificationsList 
                filters={currentFilters}
                showStats={true}
                maxHeight="70vh"
              />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <NotificationsList 
                filters={currentFilters}
                showStats={true}
                maxHeight="70vh"
              />
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
});

export default NotificationsPage;