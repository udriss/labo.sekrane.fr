'use client';

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Switch,
  Pagination,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { NotificationConfig } from '@/types/notifications';

// Constantes
const MODULES = [
  { value: 'USERS', label: 'Utilisateurs', color: '#1976d2' },
  { value: 'CHEMICALS', label: 'Produits chimiques', color: '#388e3c' },
  { value: 'MATERIEL', label: 'Équipements', color: '#f57c00' },
  { value: 'ROOMS', label: 'Salles', color: '#7b1fa2' },
  { value: 'EVENTS_GLOBAL', label: 'Événements (rôles)', color: '#d32f2f' },
  { value: 'ORDERS', label: 'Commandes', color: '#1976d2' },
  { value: 'SECURITY', label: 'Sécurité', color: '#d32f2f' },
  { value: 'SYSTEM', label: 'Système', color: '#616161' },
];

const ACTION_TYPES = [
  { value: 'CREATE', label: 'Ajout', color: '#4caf50' },
  { value: 'UPDATE', label: 'Modification', color: '#ff9800' },
  { value: 'DELETE', label: 'Suppression', color: '#f44336' },
  { value: 'SYNC', label: 'Synchronisation', color: '#2196f3' },
  { value: 'ALERT', label: 'Alerte', color: '#ff5722' },
  { value: 'STATUS', label: 'État', color: '#9c27b0' },
  { value: 'REPORT', label: 'Rapport', color: '#607d8b' },
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
  return ACTION_TYPES.find((at) => at.value === actionType) || ACTION_TYPES[0];
}

interface NotificationCatalogProps {
  configs: NotificationConfig[];
  saving: boolean;
  cfgPage: number;
  pageSize: number;
  onSave: () => void;
  onConfigChange: (configId: string, field: string, value: any) => void;
  onPageChange: (page: number) => void;
}

export default function NotificationCatalog({
  configs,
  saving,
  cfgPage,
  pageSize,
  onSave,
  onConfigChange,
  onPageChange,
}: NotificationCatalogProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          onClick={onSave}
          disabled={saving}
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Module</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Nom</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Sévérité</TableCell>
            <TableCell>Actif</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {configs.slice((cfgPage - 1) * pageSize, cfgPage * pageSize).map((config) => (
            <TableRow key={config.id}>
              <TableCell>
                <Chip
                  label={config.module}
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: MODULES.find((m) => m.value === config.module)?.color || '#9e9e9e',
                    color: 'default',
                    fontWeight: 600,
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  variant="outlined"
                  label={getActionTypeInfo(config.actionType).label}
                  size="small"
                  sx={{
                    borderColor: getActionTypeInfo(config.actionType).color,
                    color: 'default',
                  }}
                />
              </TableCell>
              <TableCell>{config.name}</TableCell>
              <TableCell>{config.description}</TableCell>
              <TableCell>
                <Chip
                  variant="outlined"
                  size="small"
                  label={SEVERITY_LABELS[config.severity as keyof typeof SEVERITY_LABELS]}
                  color={SEVERITY_COLORS[config.severity as keyof typeof SEVERITY_COLORS]}
                />
              </TableCell>
              <TableCell>
                <Switch
                  checked={config.enabled}
                  onChange={(e) => onConfigChange(config.id, 'enabled', e.target.checked)}
                  color="primary"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={Math.ceil(configs.length / pageSize)}
          page={cfgPage}
          onChange={(_, page) => onPageChange(page)}
          color="primary"
          showLastButton
          showFirstButton
        />
      </Box>
    </Paper>
  );
}
