# Système de Thème et Couleurs

Ce dossier contient le système complet de thème et de couleurs pour l'application de laboratoire.

## Structure des fichiers

```
lib/theme/
├── colors.ts      # Définition de toutes les couleurs
├── theme.ts       # Configuration des thèmes Material-UI
├── index.ts       # Point d'entrée principal
├── examples.tsx   # Exemples d'utilisation
└── README.md      # Cette documentation
```

## 🎨 Couleurs disponibles

### Couleurs Standard Material-UI

- **Primary**: Bleu scientifique (#2196f3)
- **Secondary**: Orange laboratoire (#ff9800)
- **Error**: Rouge sécurité (#f44336)
- **Warning**: Jaune attention (#ffeb3b)
- **Info**: Cyan (#00bcd4)
- **Success**: Vert laboratoire (#4caf50)

### Couleurs Spéciales Laboratoire

- **Chemistry**: Rose (#e91e63) - Pour les sections chimie
- **Physics**: Violet (#673ab7) - Pour les sections physique
- **Equipment**: Bleu-gris (#607d8b) - Pour le matériel
- **Rooms**: Marron (#795548) - Pour les salles
- **Chemicals**: Teal (#009688) - Pour les réactifs

## 🚀 Utilisation

### 1. Import du thème

```typescript
import { useTheme } from '@mui/material/styles';
import { getColors, labColors } from '@/lib/theme';
```

### 2. Utilisation avec useTheme

```typescript
const MyComponent = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        bgcolor: theme.palette.lab.chemistry.main,
        color: theme.palette.lab.chemistry.contrastText
      }}
    >
      Contenu chimie
    </Box>
  );
};
```

### 3. Utilisation directe avec sx

```typescript
<Button
  sx={{
    bgcolor: 'lab.physics.main',
    color: 'lab.physics.contrastText',
    '&:hover': {
      bgcolor: 'lab.physics.dark'
    }
  }}
>
  Physique
</Button>
```

### 4. Gradients

```typescript
<Card
  sx={{
    background: (theme) =>
      `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
  }}
>
  Contenu avec gradient
</Card>
```

### 5. Transparences

```typescript
import { alpha } from '@mui/material/styles';

<Box
  sx={{
    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
  }}
>
  Contenu avec transparence
</Box>
```

## 🌓 Modes Light/Dark

Le système gère automatiquement les modes light et dark :

```typescript
// Les couleurs s'adaptent automatiquement
const theme = useTheme();
const isDark = theme.palette.mode === 'dark';

// Couleurs conditionnelles
<Box
  sx={{
    bgcolor: isDark ? 'lab.chemistry.dark' : 'lab.chemistry.light'
  }}
>
  Contenu adaptatif
</Box>
```

## 📝 Exemples complets

Consultez `examples.tsx` pour voir des exemples complets d'utilisation incluant :

- Couleurs de laboratoire
- Gradients et transparences
- États interactifs
- Mode responsive
- Conditions sur le thème

## 🛠 Personnalisation

### Ajouter de nouvelles couleurs

1. Modifiez `colors.ts` pour ajouter vos couleurs :

```typescript
export const labColors = {
  // Couleurs existantes...
  newCategory: {
    main: '#your-color',
    light: '#your-light-color',
    dark: '#your-dark-color',
    contrastText: '#contrast-color',
  },
} as const;
```

2. Mettez à jour les types dans `theme.ts` :

```typescript
declare module '@mui/material/styles' {
  interface Palette {
    lab: {
      // Types existants...
      newCategory: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
    };
  }
}
```

### Modifier la configuration des composants

Modifiez `baseComponents` dans `theme.ts` pour personnaliser l'apparence des composants Material-UI.

## 🎯 Bonnes pratiques

1. **Cohérence** : Utilisez toujours les couleurs définies plutôt que des valeurs hardcodées
2. **Accessibilité** : Respectez les ratios de contraste avec `contrastText`
3. **Thème** : Testez vos composants en mode light ET dark
4. **Performance** : Utilisez `useMemo` pour les calculs de couleurs complexes
5. **TypeScript** : Profitez du typage pour éviter les erreurs

## 🔧 Configuration avancée

### Variables CSS personnalisées

```typescript
// Dans votre CSS global
:root {
  --lab-chemistry: #e91e63;
  --lab-physics: #673ab7;
  // etc...
}

// Utilisation
<Box sx={{ color: 'var(--lab-chemistry)' }}>
```

### Thèmes conditionnels

```typescript
const getThemeForSection = (section: string) => {
  const base = useTheme();
  return {
    ...base,
    palette: {
      ...base.palette,
      primary: base.palette.lab[section as keyof typeof base.palette.lab],
    },
  };
};
```

## 🚨 Notes importantes

- Les couleurs sont optimisées pour l'accessibilité WCAG AA
- Le mode dark adapte automatiquement les couleurs pour une meilleure lisibilité
- Tous les composants Material-UI sont pré-stylés avec des bordures arrondies
- Les transitions sont configurées pour une expérience fluide
