// components/audit/AuditLogsDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
  Badge,
  Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { LogEntry, LogFilters, AuditStats } from '@/types/audit';

interface AuditLogsDashboardProps {
  userId?: string;  // Si défini, n'affiche que les logs de cet utilisateur
  hasFullAccess: boolean;
}

const MODULES = [
  { value: '', label: 'Tous les modules' },
  { value: 'USERS', label: 'Utilisateurs' },
  { value: 'CHEMICALS', label: 'Produits Chimiques' },
  { value: 'EQUIPMENT', label: 'Équipements' },
  { value: 'ROOMS', label: 'Salles' },
  { value: 'CALENDAR', label: 'Calendrier' },
  { value: 'ORDERS', label: 'Commandes' },
  { value: 'SECURITY', label: 'Sécurité' },
  { value: 'SYSTEM', label: 'Système' }
];

const ACTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'CREATE', label: 'Création' },
  { value: 'READ', label: 'Lecture' },
  { value: 'UPDATE', label: 'Modification' },
  { value: 'DELETE', label: 'Suppression' },
  { value: 'LOGIN', label: 'Connexion' },
  { value: 'LOGOUT', label: 'Déconnexion' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'IMPORT', label: 'Import' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'SUCCESS', label: 'Succès' },
  { value: 'ERROR', label: 'Erreur' },
  { value: 'WARNING', label: 'Avertissement' }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SUCCESS': return 'success';
    case 'ERROR': return 'error';
    case 'WARNING': return 'warning';
    default: return 'default';
  }
};

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircleIcon fontSize="small" />;
      case 'ERROR': return <ErrorIcon fontSize="small" />;
      case 'WARNING': return <WarningIcon fontSize="small" />;
      default: return <CheckCircleIcon fontSize="small" />;
    }
  };const getModuleIcon = (module: string) => {
  switch (module) {
    case 'USERS': return <PersonIcon fontSize="small" />;
    case 'SECURITY': return <SecurityIcon fontSize="small" />;
    case 'SYSTEM': return <ComputerIcon fontSize="small" />;
    default: return <TimelineIcon fontSize="small" />;
  }
};

export default function AuditLogsDashboard({ userId, hasFullAccess }: AuditLogsDashboardProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Filtres
  const [filters, setFilters] = useState<LogFilters>({
    userId: userId,
    module: '',
    action: '',
    status: undefined,
    search: '',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 jours
    endDate: new Date(),
    limit: 50,
    offset: 0
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Charger les données
  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Charger les logs
      const logsResponse = await fetch('/api/audit/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...filters,
          limit: rowsPerPage,
          offset: page * rowsPerPage
        })
      });

      if (!logsResponse.ok) {
        throw new Error('Erreur lors du chargement des logs');
      }

      const logsData = await logsResponse.json();
      setLogs(logsData.logs || []);
      setTotalCount(logsData.total || 0);

      // Charger les statistiques si accès complet
      if (hasFullAccess) {
        const statsResponse = await fetch('/api/audit/stats', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // Effet pour charger les données
  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, filters]);

  // Handlers
  const handleFilterChange = (field: keyof LogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset page
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (log: LogEntry) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/audit/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError('Erreur lors de l\'export');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const StatCard = ({ title, value, icon, color = 'primary' }: any) => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Box sx={{ flexGrow: 1 }}>
        {/* Statistiques */}
        {hasFullAccess && stats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size = {{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Total des Entrées"
                value={stats.totalEntries.toLocaleString()}
                icon={<TimelineIcon />}
                color="primary"
              />
            </Grid>
            <Grid size = {{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Succès"
                value={stats.byStatus.SUCCESS || 0}
                icon={<CheckCircleIcon />}
                color="success"
              />
            </Grid>
            <Grid size = {{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Erreurs"
                value={stats.byStatus.ERROR || 0}
                icon={<ErrorIcon />}
                color="error"
              />
            </Grid>
            <Grid size = {{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Avertissements"
                value={stats.byStatus.WARNING || 0}
                icon={<WarningIcon />}
                color="warning"
              />
            </Grid>
          </Grid>
        )}

        {/* Filtres */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterIcon sx={{ mr: 1 }} />
            Filtres de Recherche
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid size = {{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder="Rechercher..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            
            <Grid size = {{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                select
                label="Module"
                value={filters.module || ''}
                onChange={(e) => handleFilterChange('module', e.target.value)}
              >
                {MODULES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size = {{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                select
                label="Action"
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                {ACTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size = {{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                select
                label="Statut"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size = {{ xs: 12, md: 3 }}>
              <Box display="flex" gap={1}>
                <Tooltip title="Actualiser">
                  <IconButton onClick={loadData} color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Exporter">
                  <IconButton onClick={handleExport} color="primary">
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size = {{ xs: 12, md: 3 }}>
              <DateTimePicker
                label="Date de début"
                value={filters.startDate}
                onChange={(date) => handleFilterChange('startDate', date)}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid size = {{ xs: 12, md: 3 }}>
              <DateTimePicker
                label="Date de fin"
                value={filters.endDate}
                onChange={(date) => handleFilterChange('endDate', date)}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Messages d'erreur */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Table des logs */}
        <Paper elevation={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Horodatage</TableCell>
                  {hasFullAccess && <TableCell>Utilisateur</TableCell>}
                  <TableCell>Module</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entité</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={hasFullAccess ? 8 : 7} align="center">
                      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                        <CircularProgress />
                        <Typography sx={{ ml: 2 }}>Chargement...</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={hasFullAccess ? 8 : 7} align="center">
                      <Typography color="textSecondary" py={4}>
                        Aucun log trouvé pour les critères sélectionnés
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {formatTimestamp(log.timestamp)}
                        </Typography>
                      </TableCell>
                      
                      {hasFullAccess && (
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}>
                              {log.user.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2">{log.user.name}</Typography>
                              <Typography variant="caption" color="textSecondary">
                                {log.user.role}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                      )}
                      
                      <TableCell>
                        <Chip
                          icon={getModuleIcon(log.action.module)}
                          label={log.action.module}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={log.action.type}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {log.action.entity}
                          {log.action.entityId && (
                            <Typography variant="caption" display="block" color="textSecondary">
                              ID: {log.action.entityId}
                            </Typography>
                          )}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(log.status)}
                          label={log.status}
                          size="small"
                          color={getStatusColor(log.status) as any}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {log.context.ip}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Tooltip title="Voir détails">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(log)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Lignes par page:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
            }
          />
        </Paper>

        {/* Dialog détails */}
        <Dialog 
          open={detailsOpen} 
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Détails de l'Événement d'Audit
          </DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid size = {{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Informations Générales
                    </Typography>
                    <Typography variant="body2"><strong>ID:</strong> {selectedLog.id}</Typography>
                    <Typography variant="body2"><strong>Horodatage:</strong> {formatTimestamp(selectedLog.timestamp)}</Typography>
                    <Typography variant="body2"><strong>Statut:</strong> {selectedLog.status}</Typography>
                    {selectedLog.error && (
                      <Typography variant="body2" color="error">
                        <strong>Erreur:</strong> {selectedLog.error}
                      </Typography>
                    )}
                  </Grid>
                  
                  <Grid size = {{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Utilisateur
                    </Typography>
                    <Typography variant="body2"><strong>Nom:</strong> {selectedLog.user.name}</Typography>
                    <Typography variant="body2"><strong>Email:</strong> {selectedLog.user.email}</Typography>
                    <Typography variant="body2"><strong>Rôle:</strong> {selectedLog.user.role}</Typography>
                  </Grid>
                  
                  <Grid size = {{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Action
                    </Typography>
                    <Typography variant="body2"><strong>Type:</strong> {selectedLog.action.type}</Typography>
                    <Typography variant="body2"><strong>Module:</strong> {selectedLog.action.module}</Typography>
                    <Typography variant="body2"><strong>Entité:</strong> {selectedLog.action.entity}</Typography>
                    {selectedLog.action.entityId && (
                      <Typography variant="body2"><strong>ID Entité:</strong> {selectedLog.action.entityId}</Typography>
                    )}
                  </Grid>
                  
                  <Grid size = {{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Contexte
                    </Typography>
                    <Typography variant="body2"><strong>IP:</strong> {selectedLog.context.ip}</Typography>
                    <Typography variant="body2"><strong>User Agent:</strong> {selectedLog.context.userAgent}</Typography>
                    {selectedLog.context.path && (
                      <Typography variant="body2"><strong>Chemin:</strong> {selectedLog.context.path}</Typography>
                    )}
                    {selectedLog.context.method && (
                      <Typography variant="body2"><strong>Méthode:</strong> {selectedLog.context.method}</Typography>
                    )}
                  </Grid>
                  
                  {selectedLog.details && (
                    <Grid size = {{ xs: 12 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Détails
                      </Typography>
                      <Box component="pre" sx={{ 
                        bgcolor: 'grey.100', 
                        p: 2, 
                        borderRadius: 1, 
                        overflow: 'auto',
                        fontSize: '0.875rem'
                      }}>
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>
              Fermer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
