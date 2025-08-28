# Composants Material - Architecture Refactorisée

Cette refactorisation du composant `MaterielManagement` vise à améliorer la lisibilité, la maintenabilité et la réutilisabilité du code.

## Structure des Composants

### Composant Principal

- **`MaterielManagement.tsx`** - Composant principal orchestrant tous les autres composants et gérant l'état global

### Composants d'Interface

- **`MaterialInventory.tsx`** - Gestion de l'affichage de l'inventaire (onglet 1)
- **`MaterialCategories.tsx`** - Gestion des catégories de matériel (onglet 2)
- **`MaterialStatistics.tsx`** - Affichage des statistiques (onglet 3)
- **`MaterialEditDialog.tsx`** - Dialog de modification d'un matériel
- **`MaterialCard.tsx`** - Composant d'affichage en carte d'un matériel
- **`MaterialList.tsx`** - Composant d'affichage en liste des matériels

### Composants Existants

- **`AddMaterialStepper.tsx`** - Assistant d'ajout de matériel (déjà refactorisé)
- **`DisciplineSelection.tsx`** - Sélection de discipline

## Fonctionnalités Implementées

### Caractéristiques Personnalisées

- Support complet des caractéristiques personnalisées dans l'affichage
- Interface utilisateur avec chips pour les caractéristiques
- Intégration avec l'API materiel-perso

### Architecture Modulaire

- Chaque onglet est maintenant un composant séparé
- Séparation claire des responsabilités
- Props typées pour tous les composants
- État centralisé dans le composant principal

### Améliorations UX

- Affichage cohérent des informations
- Gestion des erreurs améliorée
- Interface responsive

## Types Partagés

Tous les types nécessaires sont exportés depuis `MaterielManagement.tsx` :

- `Materiel` - Interface principale du matériel
- `Category` - Interface des catégories
- `Salle` - Interface des salles
- `Localisation` - Interface des localisations
- `FormData` - Interface du formulaire d'édition

## Utilisation

```typescript
import { MaterielManagement } from '@/components/material';

// Utilisation du composant principal
<MaterielManagement discipline="physique" />
```

## Migration

L'ancien fichier `MaterielManagement.tsx` monolithique (2000+ lignes) a été décomposé en 8 composants plus petits et focalisés :

1. **MaterielManagement.tsx** (~500 lignes) - Logique principale et orchestration
2. **MaterialInventory.tsx** (~150 lignes) - Affichage inventaire
3. **MaterialCategories.tsx** (~600 lignes) - Gestion catégories
4. **MaterialStatistics.tsx** (~50 lignes) - Statistiques
5. **MaterialEditDialog.tsx** (~200 lignes) - Dialog d'édition
6. **MaterialCard.tsx** (~150 lignes) - Affichage carte
7. **MaterialList.tsx** (~100 lignes) - Affichage liste
8. **AddMaterialStepper.tsx** (déjà existant) - Assistant d'ajout

Cette refactorisation améliore considérablement la maintenabilité et permet une meilleure collaboration entre développeurs.
