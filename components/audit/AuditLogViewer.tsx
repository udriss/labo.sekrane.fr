// components/audit/AuditLogViewer.tsx
"use client";

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Pagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Search,
  FilterList,
  Download,
  Refresh,
  Visibility,
  Person,
  Computer,
  Schedule
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { LogEntry, LogFilters } from '@/types/audit';
import { useAuditQuery } from '@/lib/hooks/useAuditQuery';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AuditLogViewerProps {
  initialFilters?: Partial<LogFilters>;
  showFilters?: boolean;
  maxHeight?: number;
}

const MODULES = [
  { value: '', label: 'Tous les modules' },
  { value: 'USERS', label: 'Utilisateurs' },
  { value: 'CHEMICALS', label: 'Réactifs chimiques' },
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

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  initialFilters = {},
  showFilters = true,
  maxHeight = 600
}) => {
  const [filters, setFilters] = useState<LogFilters>({
    limit: 50,
    offset: 0,
    ...initialFilters
  });
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { entries, loading, error, total, refetch } = useAuditQuery(filters);

  const totalPages = Math.ceil(total / (filters.limit || 50));

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return entries;
    
    const term = searchTerm.toLowerCase();
    return entries.filter(entry => 
      entry.user.name.toLowerCase().includes(term) ||
      entry.user.email.toLowerCase().includes(term) ||
      entry.action.type.toLowerCase().includes(term) ||
      entry.action.module.toLowerCase().includes(term) ||
      entry.action.entity.toLowerCase().includes(term) ||
      JSON.stringify(entry.details).toLowerCase().includes(term)
    );
  }, [entries, searchTerm]);

  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset to first page when filters change
    }));
    setCurrentPage(1);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    setFilters(prev => ({
      ...prev,
      offset: (page - 1) * (prev.limit || 50)
    }));
  };

  const toggleRowExpansion = (entryId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'success';
      case 'ERROR': return 'error';
      case 'WARNING': return 'warning';
      default: return 'default';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'info';
      case 'DELETE': return 'error';
      case 'READ': return 'default';
      default: return 'primary';
    }
  };

  const exportLogs = async () => {
    try {
      const response = await fetch('/api/audit/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" component="h2">
                Journal d'audit ({total} entrées)
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  startIcon={<Refresh />}
                  onClick={refetch}
                  disabled={loading}
                >
                  Actualiser
                </Button>
                <Button
                  startIcon={<Download />}
                  onClick={exportLogs}
                  variant="outlined"
                >
                  Exporter
                </Button>
              </Stack>
            </Box>

            {/* Filters */}
            {showFilters && (
              <Accordion expanded={showAdvancedFilters} onChange={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <FilterList />
                    <Typography>Filtres de recherche</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Recherche globale"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Rechercher dans les logs..."
                      InputProps={{
                        startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <TextField
                        sx={{ minWidth: 200 }}
                        select
                        label="Module"
                        value={filters.module || ''}
                        onChange={(e) => handleFilterChange('module', e.target.value || undefined)}
                      >
                        {MODULES.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        sx={{ minWidth: 200 }}
                        select
                        label="Action"
                        value={filters.action || ''}
                        onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
                      >
                        {ACTIONS.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <DatePicker
                        label="Date de début"
                        value={filters.startDate || null}
                        onChange={(date) => {
                          // Correction du problème de timezone
                          if (date) {
                            const correctedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
                            handleFilterChange('startDate', correctedDate)
                          } else {
                            handleFilterChange('startDate', null)
                          }
                        }}
                          slotProps={{
                            textField: { 
                              size: "small",
                              sx: { minWidth: { xs: '100%', sm: 200 } },
                              onClick: (e: any) => {
                                if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                                  const button = e.currentTarget.querySelector('button')
                                  if (button) button.click()
                                }
                              }
                            }
                          }}
                      />
                      <DatePicker
                        label="Date de fin"
                        value={filters.endDate || null}
                        onChange={(date) => {
                          // Correction du problème de timezone
                          if (date) {
                            const correctedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
                            handleFilterChange('endDate', correctedDate)
                          } else {
                            handleFilterChange('endDate', null)
                          }
                        }}
                          slotProps={{
                            textField: { 
                              size: "small",
                              sx: { minWidth: { xs: '100%', sm: 200 } },
                              onClick: (e: any) => {
                                if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                                  const button = e.currentTarget.querySelector('button')
                                  if (button) button.click()
                                }
                              }
                            }
                          }}
                      />
                      <TextField
                        sx={{ minWidth: 200 }}
                        select
                        label="Statut"
                        value={filters.status || ''}
                        onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                      >
                        {STATUS_OPTIONS.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Error Display */}
            {error && (
              <Alert severity="error" onClose={() => {}}>
                {error}
              </Alert>
            )}

            {/* Loading */}
            {loading && (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress />
              </Box>
            )}

            {/* Table */}
            {!loading && (
              <TableContainer 
                component={Paper} 
                sx={{ maxHeight: maxHeight, overflowY: 'auto' }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell width={40}></TableCell>
                      <TableCell>Date/Heure</TableCell>
                      <TableCell>Utilisateur</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Module</TableCell>
                      <TableCell>Entité</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>IP</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <React.Fragment key={entry.id}>
                        <TableRow hover>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => toggleRowExpansion(entry.id)}
                            >
                              {expandedRows.has(entry.id) ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant="body2">
                                {format(new Date(entry.timestamp), 'dd/MM/yyyy', { locale: fr })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(entry.timestamp), 'HH:mm:ss')}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Person fontSize="small" />
                              <Stack spacing={0.5}>
                                <Typography variant="body2">{entry.user.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {entry.user.email}
                                </Typography>
                              </Stack>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.action.type}
                              color={getActionColor(entry.action.type) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{entry.action.module}</Typography>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant="body2">{entry.action.entity}</Typography>
                              {entry.action.entityId && (
                                <Typography variant="caption" color="text.secondary">
                                  ID: {entry.action.entityId}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.status}
                              color={getStatusColor(entry.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{entry.context.ip}</Typography>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                            <Collapse in={expandedRows.has(entry.id)} timeout="auto" unmountOnExit>
                              <Box sx={{ margin: 1 }}>
                                <Typography variant="h6" gutterBottom component="div">
                                  Détails de l'action
                                </Typography>
                                <Box display="flex" gap={2} flexWrap="wrap">
                                  <Paper sx={{ p: 2, flex: 1, minWidth: 300 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Contexte
                                    </Typography>
                                    <Stack spacing={1}>
                                      <Box display="flex" alignItems="center" gap={1}>
                                        <Computer fontSize="small" />
                                        <Typography variant="body2">
                                          User-Agent: {entry.context.userAgent?.substring(0, 50)}...
                                        </Typography>
                                      </Box>
                                      <Box display="flex" alignItems="center" gap={1}>
                                        <Schedule fontSize="small" />
                                        <Typography variant="body2">
                                          Durée: {entry.context.duration || 'N/A'}ms
                                        </Typography>
                                      </Box>
                                      {entry.context.path && (
                                        <Typography variant="body2">
                                          Chemin: {entry.context.path}
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Paper>
                                  {entry.details && (
                                    <Paper sx={{ p: 2, flex: 1, minWidth: 300 }}>
                                      <Typography variant="subtitle2" gutterBottom>
                                        Données
                                      </Typography>
                                      <Box
                                        component="pre"
                                        sx={{
                                          fontSize: '0.75rem',
                                          backgroundColor: 'grey.100',
                                          p: 1,
                                          borderRadius: 1,
                                          overflow: 'auto',
                                          maxHeight: 200
                                        }}
                                      >
                                        {JSON.stringify(entry.details, null, 2)}
                                      </Box>
                                    </Paper>
                                  )}
                                </Box>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Pagination */}
            {!loading && filteredEntries.length > 0 && (
              <Box display="flex" justifyContent="center">
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}

            {/* No Results */}
            {!loading && filteredEntries.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  Aucune entrée d'audit trouvée pour les critères sélectionnés.
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
};
