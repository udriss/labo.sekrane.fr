'use client';

import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export interface RoleTestConfig {
  testRole: 'ADMIN' | 'ADMINLABO' | 'ENSEIGNANT' | 'LABORANTIN_PHYSIQUE' | 'LABORANTIN_CHIMIE';
  overrideCanEdit: 'normal' | 'disabled' | 'forced';
  overrideCanValidate: 'normal' | 'disabled' | 'forced';
  overrideIsOwner: 'normal' | 'disabled' | 'forced';
  showRoleTest: boolean;
}

interface RoleTesterProps {
  config: RoleTestConfig;
  onConfigChange: (config: RoleTestConfig) => void;
}

export default function RoleTester({ config, onConfigChange }: RoleTesterProps) {
  const theme = useTheme();
  const handleRoleChange = (
    role: 'ADMIN' | 'ADMINLABO' | 'ENSEIGNANT' | 'LABORANTIN_PHYSIQUE' | 'LABORANTIN_CHIMIE',
  ) => {
    onConfigChange({ ...config, testRole: role });
  };

  const handleOverrideEditChange = (value: 'normal' | 'disabled' | 'forced') => {
    onConfigChange({ ...config, overrideCanEdit: value });
  };

  const handleOverrideValidateChange = (value: 'normal' | 'disabled' | 'forced') => {
    onConfigChange({ ...config, overrideCanValidate: value });
  };

  const handleOverrideIsOwnerChange = (value: 'normal' | 'disabled' | 'forced') => {
    onConfigChange({ ...config, overrideIsOwner: value });
  };

  const getStateLabel = (state: 'normal' | 'disabled' | 'forced') => {
    switch (state) {
      case 'normal':
        return 'Normal';
      case 'disabled':
        return 'Désactivé';
      case 'forced':
        return 'Forcé';
      default:
        return 'Normal';
    }
  };

  return (
    <Accordion
      sx={{
        mb: 2,
        border: '1px solid',
        borderColor: 'warning.main',
        borderRadius: 1,
        bgcolor: 'warning.light',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6" color="warning.main">
          Tests de rôles (Développement uniquement)
        </Typography>
      </AccordionSummary>

      <AccordionDetails>
        <Box sx={{ p: 2 }}>
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Rôle de test</FormLabel>
            <RadioGroup
              row
              value={config.testRole}
              onChange={(e) => handleRoleChange(e.target.value as any)}
            >
              <FormControlLabel value="ADMIN" control={<Radio />} label="Admin" />
              <FormControlLabel value="ADMINLABO" control={<Radio />} label="Admin Labo" />
              <FormControlLabel value="ENSEIGNANT" control={<Radio />} label="Enseignant" />
              <FormControlLabel
                value="LABORANTIN_PHYSIQUE"
                control={<Radio />}
                label="Laborantin Physique"
              />
              <FormControlLabel
                value="LABORANTIN_CHIMIE"
                control={<Radio />}
                label="Laborantin Chimie"
              />
            </RadioGroup>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {/* CanEditEvent Controls */}
          <Box sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 1, display: 'block' }}>
              canEditEvent
            </FormLabel>
            <ToggleButtonGroup
              value={config.overrideCanEdit}
              exclusive
              onChange={(_, value) => value && handleOverrideEditChange(value)}
              size="small"
            >
              <ToggleButton value="normal" color="info">
                Normal
              </ToggleButton>
              <ToggleButton value="disabled" color="error">
                Désactivé
              </ToggleButton>
              <ToggleButton value="forced" color="success">
                Forcé
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* CanValidateEvent Controls */}
          <Box sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 1, display: 'block' }}>
              canValidateEvent
            </FormLabel>
            <ToggleButtonGroup
              value={config.overrideCanValidate}
              exclusive
              onChange={(_, value) => value && handleOverrideValidateChange(value)}
              size="small"
            >
              <ToggleButton value="normal" color="info">
                Normal
              </ToggleButton>
              <ToggleButton value="disabled" color="error">
                Désactivé
              </ToggleButton>
              <ToggleButton value="forced" color="success">
                Forcé
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* IsOwner Controls */}
          <Box sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 1, display: 'block' }}>
              isOwner
            </FormLabel>
            <ToggleButtonGroup
              value={config.overrideIsOwner}
              exclusive
              onChange={(_, value) => value && handleOverrideIsOwnerChange(value)}
              size="small"
            >
              <ToggleButton value="normal" color="info">
                Normal
              </ToggleButton>
              <ToggleButton value="disabled" color="error">
                Désactivé
              </ToggleButton>
              <ToggleButton value="forced" color="success">
                Forcé
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Rôle actuel : {config.testRole} | Édition : {getStateLabel(config.overrideCanEdit)} |
            Validation : {getStateLabel(config.overrideCanValidate)} | Propriétaire :{' '}
            {getStateLabel(config.overrideIsOwner)}
          </Typography>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
