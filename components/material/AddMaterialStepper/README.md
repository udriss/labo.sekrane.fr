# AddMaterialStepper - Architecture modulaire

## Vue d'ensemble

Ce dossier contient la version refactorisée du composant `AddMaterialStepper`, organisée en modules séparés pour améliorer la maintenabilité et la lisibilité du code.

## Structure des fichiers

### `types.ts`

- Contient toutes les interfaces TypeScript utilisées dans le stepper
- `MaterialFormData` : Structure des données du formulaire
- `CustomCharacteristic` : Structure des caractéristiques personnalisées
- `AddMaterialStepperProps` : Props du composant principal
- `DISCIPLINES` : Constante des disciplines disponibles

### `index.ts`

- Point d'entrée centralisé pour tous les exports
- Simplifie les imports dans le composant principal

### Composants UI

#### `StepIndicator.tsx`

- Affiche l'indicateur de progression des étapes
- Gère l'état de chargement

#### `Step1.tsx`

- Première étape : Sélection de catégorie et preset
- Gestion des presets existants
- Création/édition de nouveaux presets

#### `Step2.tsx`

- Deuxième étape : Informations détaillées du matériel
- Formulaire complet avec tous les champs
- Gestion des caractéristiques personnalisées

#### `Step3.tsx`

- Troisième étape : Finalisation et récapitulatif
- Affichage des informations saisies
- Validation finale

#### `CharacteristicDialog.tsx`

- Dialog pour ajouter/éditer des caractéristiques personnalisées
- Formulaire avec nom, type et valeur
- Support des différents types de données

### Composants utilitaires

#### `PresetForm.tsx`

- Formulaire pour ajouter/éditer des presets
- Utilisé dans Step1 pour la gestion des presets

## Avantages de cette architecture

1. **Séparation des responsabilités** : Chaque composant a un rôle spécifique
2. **Réutilisabilité** : Les composants peuvent être réutilisés ailleurs
3. **Maintenabilité** : Plus facile de maintenir et déboguer
4. **Lisibilité** : Code plus organisé et compréhensible
5. **Tests** : Plus facile de tester individuellement chaque composant

## Migration réalisée

- ✅ Extraction des types dans un fichier dédié
- ✅ Séparation des trois étapes en composants distincts
- ✅ Extraction du dialog des caractéristiques
- ✅ Création d'un point d'entrée centralisé
- ✅ Maintien de toutes les fonctionnalités existantes
- ✅ Correction des erreurs de compilation
- ✅ Validation par compilation réussie

## Usage

```tsx
import { AddMaterialStepper } from './AddMaterialStepper';

// Le composant s'utilise exactement comme avant la refactorisation
<AddMaterialStepper
  onComplete={handleComplete}
  onCancel={handleCancel}
  isLoading={isLoading}
  onOptimisticAdd={handleOptimisticAdd}
  discipline={discipline}
/>;
```
