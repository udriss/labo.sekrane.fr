# CharacteristicDialog - Amélioration avec Presets

## 🎯 Nouvelles fonctionnalités

Le dialog pour ajouter/modifier des caractéristiques personnalisées a été amélioré avec des **presets de caractéristiques** pour faciliter la saisie.

## 📋 Presets disponibles

### 🔬 **Scientifiques**

- **Volume** (mL) : 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000
- **Résolution (masse)** (g) : ± 0.1, ± 0.5, ± 1, ± 2, ± 5, ± 10
- **Résolution (volume)** (mL) : ± 0.1, ± 0.5, ± 1, ± 2, ± 5

### 🌡️ **Physiques**

- **Température** (°C) : -20, -10, 0, 4, 20, 25, 37, 50, 100, 150, 200
- **Tension** (V) : 5, 12, 24, 110, 220, 230, 240
- **Puissance** (W) : 50, 100, 200, 500, 1000, 1500, 2000, 3000
- **Vitesse** (rpm) : 100, 300, 500, 1000, 1500, 3000, 5000, 10000

### 📏 **Dimensions**

- **Longueur** (mm) : 10, 25, 50, 100, 150, 200, 250, 300, 500
- **Durée** (min) : 1, 5, 10, 15, 30, 60, 120, 180

### 🎨 **Matériaux**

- **Visibilité** : Transparent, Translucide, Opaque, Teinté
- **Matériau** : Verre, Plastique, Métal, Céramique, Caoutchouc, Silicone

## ⚡ Comment utiliser

1. **Ouvrir le dialog** pour ajouter une caractéristique
2. **Cliquer sur un preset** dans la grille colorée
3. **Tous les champs sont préremplis** automatiquement :
   - Nom de la caractéristique
   - Unité (si applicable)
   - Type de valeur (numérique/texte)
   - Liste des valeurs possibles
4. **Modifier si nécessaire** les valeurs préremplies
5. **Ajouter des valeurs supplémentaires** si besoin
6. **Sauvegarder** la caractéristique

## 🎨 Interface utilisateur

- **Grille colorée** : Chaque preset a sa propre couleur et icône
- **Tooltips informatifs** : Description de chaque preset au survol
- **Animation au hover** : Effet visuel attrayant
- **Responsive** : S'adapte à la taille de l'écran
- **Accessible** : Compatible avec les lecteurs d'écran

## 🔧 Personnalisation

Les presets sont définis dans la constante `CHARACTERISTIC_PRESETS` et peuvent être facilement étendus avec :

- Nouveaux types de caractéristiques
- Nouvelles valeurs
- Nouvelles icônes et couleurs
- Nouvelles descriptions

## 💡 Avantages

- **Gain de temps** : Plus besoin de saisir manuellement les valeurs courantes
- **Standardisation** : Valeurs cohérentes dans toute l'application
- **Moins d'erreurs** : Valeurs prédéfinies et validées
- **Meilleure UX** : Interface intuitive et visuelle
- **Extensibilité** : Facilement extensible avec de nouveaux presets
