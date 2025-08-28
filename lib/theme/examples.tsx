// lib/theme/examples.tsx

/**
 * Exemples d'utilisation du système de couleurs et thèmes
 * Ce fichier montre comment utiliser les couleurs personnalisées dans vos composants
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Science as ChemistryIcon,
  Psychology as PhysicsIcon,
  Build as EquipmentIcon,
  Room as RoomsIcon,
  Colorize as ChemicalsIcon,
} from '@mui/icons-material';

/**
 * Exemple 1: Utilisation des couleurs de laboratoire avec useTheme
 */
export const LabColorExample = () => {
  const theme = useTheme();

  return (
    <Box display="flex" gap={2} flexWrap="wrap">
      {/* Chimie */}
      <Card
        sx={{
          bgcolor: theme.palette.lab.chemistry.main,
          color: theme.palette.lab.chemistry.contrastText,
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1}>
            <ChemistryIcon />
            <Typography variant="h6">Chimie</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Physique */}
      <Card
        sx={{
          bgcolor: theme.palette.lab.physics.main,
          color: theme.palette.lab.physics.contrastText,
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1}>
            <PhysicsIcon />
            <Typography variant="h6">Physique</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Matériel */}
      <Card
        sx={{
          bgcolor: theme.palette.lab.equipment.main,
          color: theme.palette.lab.equipment.contrastText,
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1}>
            <EquipmentIcon />
            <Typography variant="h6">Matériel</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

/**
 * Exemple 2: Utilisation avec sx prop directement
 */
export const DirectColorExample = () => {
  return (
    <Box display="flex" gap={2} flexDirection="column">
      {/* Boutons avec couleurs de laboratoire */}
      <Box display="flex" gap={1}>
        <Button
          variant="contained"
          sx={{
            bgcolor: 'lab.chemistry.main',
            color: 'lab.chemistry.contrastText',
            '&:hover': {
              bgcolor: 'lab.chemistry.dark',
            },
          }}
        >
          Chimie
        </Button>

        <Button
          variant="contained"
          sx={{
            bgcolor: 'lab.physics.main',
            color: 'lab.physics.contrastText',
            '&:hover': {
              bgcolor: 'lab.physics.dark',
            },
          }}
        >
          Physique
        </Button>
      </Box>

      {/* Chips avec couleurs personnalisées */}
      <Box display="flex" gap={1}>
        <Chip
          icon={<ChemicalsIcon />}
          label="Réactifs"
          sx={{
            bgcolor: 'lab.chemicals.main',
            color: 'lab.chemicals.contrastText',
          }}
        />
        <Chip
          icon={<RoomsIcon />}
          label="Salles"
          sx={{
            bgcolor: 'lab.rooms.main',
            color: 'lab.rooms.contrastText',
          }}
        />
      </Box>
    </Box>
  );
};

/**
 * Exemple 3: Gradients et transparences
 */
export const GradientExample = () => {
  const theme = useTheme();

  return (
    <Box display="flex" gap={2} flexDirection="column">
      {/* Gradient avec couleurs primaires et secondaires */}
      <Card
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: theme.palette.primary.contrastText,
          minHeight: 120,
        }}
      >
        <CardContent>
          <Typography variant="h5">Gradient Principal</Typography>
          <Typography variant="body2">Utilise les couleurs primaires et secondaires</Typography>
        </CardContent>
      </Card>

      {/* Gradient avec couleurs de laboratoire */}
      <Card
        sx={{
          background: `linear-gradient(45deg, ${theme.palette.lab.chemistry.main} 0%, ${theme.palette.lab.physics.main} 100%)`,
          color: 'white',
          minHeight: 120,
        }}
      >
        <CardContent>
          <Typography variant="h5">Gradient Laboratoire</Typography>
          <Typography variant="body2">Combine chimie et physique</Typography>
        </CardContent>
      </Card>

      {/* Transparence */}
      <Card
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          minHeight: 120,
        }}
      >
        <CardContent>
          <Typography variant="h5" color="primary">
            Transparence
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Utilise alpha pour la transparence
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

/**
 * Exemple 4: États et interactions
 */
export const InteractiveExample = () => {
  const theme = useTheme();

  return (
    <Box display="flex" gap={2}>
      {/* Bouton avec états personnalisés */}
      <Button
        variant="contained"
        sx={{
          bgcolor: theme.palette.lab.equipment.main,
          color: theme.palette.lab.equipment.contrastText,
          '&:hover': {
            bgcolor: theme.palette.lab.equipment.dark,
            transform: 'translateY(-2px)',
            boxShadow: `0 4px 12px ${alpha(theme.palette.lab.equipment.main, 0.4)}`,
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: `0 2px 8px ${alpha(theme.palette.lab.equipment.main, 0.3)}`,
          },
          transition: 'all 0.2s ease',
        }}
      >
        Matériel
      </Button>

      {/* Avatar avec couleur de fond dynamique */}
      <Avatar
        sx={{
          bgcolor: theme.palette.lab.rooms.main,
          color: theme.palette.lab.rooms.contrastText,
          width: 56,
          height: 56,
          fontSize: '1.5rem',
          fontWeight: 'bold',
        }}
      >
        S1
      </Avatar>
    </Box>
  );
};

/**
 * Exemple 5: Mode responsive et conditions
 */
export const ResponsiveExample = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card
      sx={{
        bgcolor: isDark ? theme.palette.lab.chemistry.dark : theme.palette.lab.chemistry.light,
        color: isDark ? theme.palette.lab.chemistry.contrastText : theme.palette.text.primary,
        minHeight: 120,
        transition: 'all 0.3s ease',
      }}
    >
      <CardContent>
        <Typography variant="h5">Mode {isDark ? 'Sombre' : 'Clair'}</Typography>
        <Typography variant="body2">Les couleurs s'adaptent automatiquement au thème</Typography>
      </CardContent>
    </Card>
  );
};

/**
 * Composant de démonstration complète
 */
export const ThemeDemo = () => {
  return (
    <Box p={3} display="flex" flexDirection="column" gap={4}>
      <Typography variant="h4" gutterBottom>
        Démonstration du Système de Thème
      </Typography>

      <Box>
        <Typography variant="h6" gutterBottom>
          1. Couleurs de Laboratoire
        </Typography>
        <LabColorExample />
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          2. Utilisation Directe
        </Typography>
        <DirectColorExample />
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          3. Gradients et Transparences
        </Typography>
        <GradientExample />
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          4. États Interactifs
        </Typography>
        <InteractiveExample />
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          5. Mode Responsive
        </Typography>
        <ResponsiveExample />
      </Box>
    </Box>
  );
};
