// lib/theme/index.ts

/**
 * Point d'entrée principal pour le système de thème
 * Exporte toutes les couleurs, thèmes et utilitaires
 */

// Export des couleurs
export {
  primaryColors,
  secondaryColors,
  errorColors,
  warningColors,
  infoColors,
  successColors,
  greyColors,
  commonColors,
  labColors,
  lightModeColors,
  darkModeColors,
  getColors,
  type ColorPalette,
  type LabColors,
} from './colors';

// Export des thèmes
export { createCustomTheme, lightTheme, darkTheme, getTheme } from './theme';

// Export des utilitaires
export { default as colors } from './colors';
export { default as theme } from './theme';

// Export par défaut
export { default } from './theme';
