// lib/theme/colors.ts

/**
 * Configuration complète des couleurs pour les thèmes light et dark
 * Toutes les couleurs sont définies selon les standards Material Design 3
 */

// Couleurs primaires (bleu scientifique)
export const primaryColors = {
  50: '#e3f2fd',
  100: '#bbdefb',
  200: '#90caf9',
  300: '#64b5f6',
  400: '#42a5f5',
  500: '#2196f3', // Couleur principale
  600: '#1e88e5',
  700: '#1976d2',
  800: '#1565c0',
  900: '#0d47a1',
  main: '#0776d1ff',
  light: '#64b5f6',
  dark: '#0060c0ff',
  contrastText: '#ffffff',
};

// Couleurs secondaires (orange laboratoire)
export const secondaryColors = {
  // Couleurs secondaires (violet laboratoire basé sur #9967ceff) — teintes éclaircies
  50: '#f7f4fb',
  100: '#efe8f7',
  200: '#e0d1f0',
  300: '#ccb3e6',
  400: '#b28dda',
  500: '#9967ceff', // Couleur principale (base)
  600: '#875bb5',
  700: '#734d9b',
  800: '#5c3e7c',
  900: '#452e5d',
  main: '#9967ceff',
  light: '#ccb3e6ff',
  dark: '#5c3e7cff',
  contrastText: '#ffffff',
};

// Couleurs d'erreur (rouge sécurité)
export const errorColors = {
  50: '#ffebee',
  100: '#ffcdd2',
  200: '#ef9a9a',
  300: '#e57373',
  400: '#ef5350',
  500: '#f44336', // Couleur principale
  600: '#e53935',
  700: '#d32f2f',
  800: '#c62828',
  900: '#b71c1c',
  main: '#f44336',
  light: '#ef5350',
  dark: '#d32f2f',
  contrastText: '#ffffff',
};

// Couleurs d'avertissement (jaune attention)
export const warningColors = {
  50: '#fff8e6',
  100: '#fff2c2',
  200: '#ffe599',
  300: '#ffd76b',
  400: '#ffcf41',
  500: '#ffcb3b', // Couleur principale (nuance numérique)
  600: '#e6b32f',
  700: '#c59425',
  800: '#a3761a',
  900: '#7a4f10',
  main: '#ffcb3bff', // Référence principale fournie
  light: '#ffd76bff',
  dark: '#c59425ff',
  contrastText: '#000000',
};

// Couleurs d'information (cyan)
export const infoColors = {
  50: '#e0f7fa',
  100: '#b2ebf2',
  200: '#80deea',
  300: '#4dd0e1',
  400: '#26c6da',
  500: '#00bcd4', // Couleur principale
  600: '#00acc1',
  700: '#0097a7',
  800: '#00838f',
  900: '#006064',
  main: '#00bcd4',
  light: '#26c6da',
  dark: '#0097a7',
  contrastText: '#ffffff',
};

// Couleurs de succès (vert laboratoire)
export const successColors = {
  50: '#e8f5e8',
  100: '#c8e6c9',
  200: '#a5d6a7',
  300: '#81c784',
  400: '#66bb6a',
  500: '#4caf50', // Couleur principale
  600: '#43a047',
  700: '#388e3c',
  800: '#2e7d32',
  900: '#1b5e20',
  main: '#4caf50',
  light: '#66bb6a',
  dark: '#388e3c',
  contrastText: '#ffffff',
};

// Couleurs de gris personnalisées
export const greyColors = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#eeeeee',
  300: '#e0e0e0',
  400: '#bdbdbd',
  500: '#9e9e9e',
  600: '#757575',
  700: '#616161',
  800: '#424242',
  900: '#212121',
  A100: '#f5f5f5',
  A200: '#eeeeee',
  A400: '#bdbdbd',
  A700: '#616161',
};

// Couleurs communes
export const commonColors = {
  black: '#000000',
  white: '#ffffff',
};

// Couleurs spécifiques au laboratoire
export const labColors = {
  // Couleurs pour la chimie
  chemistry: {
    main: '#e91e63', // Rose pour chimie
    light: '#f06292',
    dark: '#ad1457',
    contrastText: '#ffffff',
  },
  // Couleurs pour la physique
  physics: {
    main: '#673ab7', // Violet pour physique
    light: '#9575cd',
    dark: '#512da8',
    contrastText: '#ffffff',
  },
  // Couleurs pour le matériel
  equipment: {
    main: '#607d8b', // Bleu-gris pour matériel
    light: '#90a4ae',
    dark: '#455a64',
    contrastText: '#ffffff',
  },
  // Couleurs pour les salles
  rooms: {
    main: '#795548', // Marron pour salles
    light: '#a1887f',
    dark: '#5d4037',
    contrastText: '#ffffff',
  },
  // Couleurs pour les réactifs
  chemicals: {
    main: '#009688', // Teal pour réactifs
    light: '#4db6ac',
    dark: '#00695c',
    contrastText: '#ffffff',
  },
};

// Configuration pour le mode light
export const lightModeColors = {
  primary: primaryColors,
  secondary: secondaryColors,
  error: errorColors,
  warning: warningColors,
  info: infoColors,
  success: successColors,
  grey: greyColors,
  common: commonColors,
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
    hint: 'rgba(0, 0, 0, 0.38)',
  },
  divider: 'rgba(0, 0, 0, 0.12)',
  background: {
    paper: '#ffffff',
    default: '#fafafa',
  },
  action: {
    active: 'rgba(0, 0, 0, 0.54)',
    hover: 'rgba(0, 0, 0, 0.04)',
    hoverOpacity: 0.04,
    selected: 'rgba(0, 0, 0, 0.08)',
    selectedOpacity: 0.08,
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
    disabledOpacity: 0.38,
    focus: 'rgba(0, 0, 0, 0.12)',
    focusOpacity: 0.12,
    activatedOpacity: 0.12,
  },
  // Couleurs personnalisées pour le laboratoire
  lab: labColors,
};

// Configuration pour le mode dark
export const darkModeColors = {
  primary: {
    ...primaryColors,
    main: '#90caf9', // Plus clair en mode dark
    light: '#076fc5ff',
    dark: '#003f72ff',
  },
  secondary: {
    ...secondaryColors,
    main: '#7939bdff', // Plus clair en mode dark
    light: '#a575d9ff',
    dark: '#330069ff',
  },
  error: errorColors,
  warning: warningColors,
  info: infoColors,
  success: successColors,
  grey: greyColors,
  common: commonColors,
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    disabled: 'rgba(255, 255, 255, 0.5)',
    hint: 'rgba(255, 255, 255, 0.5)',
  },
  divider: 'rgba(255, 255, 255, 0.12)',
  background: {
    paper: '#1e1e1e',
    default: '#121212',
  },
  action: {
    active: '#ffffff',
    hover: 'rgba(255, 255, 255, 0.08)',
    hoverOpacity: 0.08,
    selected: 'rgba(255, 255, 255, 0.16)',
    selectedOpacity: 0.16,
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
    disabledOpacity: 0.38,
    focus: 'rgba(255, 255, 255, 0.12)',
    focusOpacity: 0.12,
    activatedOpacity: 0.24,
  },
  // Couleurs personnalisées pour le laboratoire (adaptées au mode dark)
  lab: {
    chemistry: {
      main: '#f48fb1',
      light: '#f8bbd9',
      dark: '#e91e63',
      contrastText: '#000000',
    },
    physics: {
      main: '#b39ddb',
      light: '#d1c4e9',
      dark: '#673ab7',
      contrastText: '#000000',
    },
    equipment: {
      main: '#90a4ae',
      light: '#cfd8dc',
      dark: '#607d8b',
      contrastText: '#000000',
    },
    rooms: {
      main: '#a1887f',
      light: '#d7ccc8',
      dark: '#795548',
      contrastText: '#000000',
    },
    chemicals: {
      main: '#4db6ac',
      light: '#b2dfdb',
      dark: '#009688',
      contrastText: '#000000',
    },
  },
};

// Types pour TypeScript
// Utiliser les types fournis par Material-UI pour un typage correct
import type { PaletteOptions } from '@mui/material/styles';

export type ColorPalette = PaletteOptions;
export type LabColors = typeof labColors;

// Fonction utilitaire pour obtenir les couleurs selon le mode
export const getColors = (mode: 'light' | 'dark'): ColorPalette => {
  return mode === 'dark' ? darkModeColors : lightModeColors;
};

// Export par défaut
export default {
  light: lightModeColors,
  dark: darkModeColors,
  getColors,
};
