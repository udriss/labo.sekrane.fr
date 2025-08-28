// lib/theme/theme.ts

import { createTheme, Theme, ThemeOptions } from '@mui/material/styles';
import { getColors } from './colors';

// Extensions des types Material-UI pour nos couleurs personnalisées
declare module '@mui/material/styles' {
  interface Palette {
    lab: {
      chemistry: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      physics: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      equipment: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      rooms: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      chemicals: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
    };
  }

  interface PaletteOptions {
    lab?: {
      chemistry?: {
        main?: string;
        light?: string;
        dark?: string;
        contrastText?: string;
      };
      physics?: {
        main?: string;
        light?: string;
        dark?: string;
        contrastText?: string;
      };
      equipment?: {
        main?: string;
        light?: string;
        dark?: string;
        contrastText?: string;
      };
      rooms?: {
        main?: string;
        light?: string;
        dark?: string;
        contrastText?: string;
      };
      chemicals?: {
        main?: string;
        light?: string;
        dark?: string;
        contrastText?: string;
      };
    };
  }
}

// Configuration de base de la typographie
const baseTypography = {
  fontFamily: ['"Inter"', '"Roboto"', '"Helvetica"', '"Arial"', 'sans-serif'].join(','),
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.57,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.43,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.75,
    // textTransform: 'none' as const,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.66,
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 2.66,
    textTransform: 'uppercase' as const,
  },
};

// Configuration de base des composants
const baseComponents = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        fontFamily: baseTypography.fontFamily,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      // Use a function so we can access the current theme and set
      // the button text color to follow theme.palette.text.primary
      root: (props: any) => ({
        borderRadius: 8,
        textTransform: 'uppercase' as const,
        fontWeight: 700,
        boxShadow: 'none',
        // color: props.theme?.palette?.text?.primary,
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        },
      }),
      contained: (props: any) => ({
        // Contained buttons should use the primary contrast text so they remain readable
        // regardless of theme (common pattern for colored buttons)
        // color: props.theme?.palette?.primary?.contrastText,
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        },
      }),
      text: (props: any) => ({
        color: props.theme?.palette?.text?.primary,
      }),
      outlined: (props: any) => ({
        // color: props.theme?.palette?.text?.primary,
      }),
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        '&:hover': {
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
      elevation1: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      },
      elevation2: {
        boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
      },
      elevation3: {
        boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 16,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
      },
    },
  },
  MuiFab: {
    styleOverrides: {
      root: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        '&:hover': {
          boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
        },
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        minHeight: 48,
      },
      indicator: {
        height: 3,
        borderRadius: '3px 3px 0 0',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        // textTransform: 'none' as const,
        fontWeight: 500,
        // fontSize: '0.875rem',
        minHeight: 48,
      },
    },
  },
} as const;

// Configuration de base des formes
const baseShape = {
  borderRadius: 8,
};

// Configuration de base des transitions
const baseTransitions = {
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
};

// Configuration de base des z-index
const baseZIndex = {
  mobileStepper: 1000,
  fab: 1050,
  speedDial: 1050,
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
};

/**
 * Crée un thème personnalisé pour l'application
 */
export const createCustomTheme = (mode: 'light' | 'dark'): Theme => {
  const colors = getColors(mode);

  const themeOptions: ThemeOptions = {
    breakpoints: {
      values: {
        xs: 0,      // Mobile - 0px et plus
        sm: 500,    // Small tablet - 768px et plus
        md: 900,   // Tablet - 900px et plus
        lg: 1200,   // Desktop - 1200px et plus
        xl: 1400,   // Large desktop - 1400px et plus
      },
    },
    palette: {
      mode,
      ...colors,
    },
    typography: baseTypography,
    shape: baseShape,
    transitions: baseTransitions,
    zIndex: baseZIndex,
    components: {
      ...baseComponents,
      // Personnalisation spécifique au mode
      MuiCssBaseline: {
        styleOverrides: {
          ...baseComponents.MuiCssBaseline.styleOverrides,
          body: {
            ...baseComponents.MuiCssBaseline.styleOverrides.body,
            backgroundColor:
              colors.background?.default ?? (mode === 'dark' ? '#121212' : '#fafafa'),
            color: colors.text?.primary ?? (mode === 'dark' ? '#ffffff' : 'rgba(0, 0, 0, 0.87)'),
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};

// Thèmes pré-configurés
export const lightTheme = createCustomTheme('light');
export const darkTheme = createCustomTheme('dark');

// Fonction utilitaire pour obtenir le thème selon le mode
export const getTheme = (mode: 'light' | 'dark'): Theme => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

// Export par défaut
export default {
  light: lightTheme,
  dark: darkTheme,
  create: createCustomTheme,
  get: getTheme,
};
