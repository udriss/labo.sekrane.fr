# Migration des Chemicals vers MySQL

## Résumé des modifications

Ce document décrit les modifications apportées pour migrer le système de gestion des réactifs chimiques du stockage JSON vers une base de données MySQL.

## 📁 Fichiers modifiés

### 1. Base de données (`lib/db.ts`)
- ✅ Ajout des tables `suppliers` et `chemicals` 
- ✅ Schéma complet avec index et relations
- ✅ Support des enums pour les statuts et unités

### 2. Routes API

#### `/app/api/chemicals/route.ts`
- ✅ Remplacement de la lecture JSON par requêtes MySQL
- ✅ GET: Filtrage et recherche en base
- ✅ POST: Création de nouveaux chemicals
- ✅ PUT: Mise à jour avec gestion dynamique des champs

#### `/app/api/chemicals/[id]/route.ts`
- ✅ GET: Récupération par ID avec relations supplier
- ✅ PUT: Mise à jour d'un chemical spécifique
- ✅ DELETE: Suppression avec vérifications

#### `/app/api/chemicals/update-forecast/route.ts`
- ✅ Mise à jour des quantités prévisionnelles en base

#### Routes connexes mises à jour:
- ✅ `/app/api/scanner/route.ts` - Recherche par code-barres
- ✅ `/app/api/stats/route.ts` - Statistiques des chemicals

### 3. Types TypeScript

#### `/types/chemicals.ts` (nouveau)
- ✅ Définition des enums: `ChemicalStatus`, `Unit`, `HazardClass`
- ✅ Interface `Chemical` compatible avec MySQL
- ✅ Interface `Supplier` pour les fournisseurs
- ✅ Types pour les réponses API et statistiques

### 4. Composants React

#### `/components/chemicals/chemicals-list.tsx`
- ✅ Import des nouveaux types au lieu de Prisma
- ✅ Gestion des dates en string et Date
- ✅ Fonction `isExpiringSoon` mise à jour

#### `/components/chemicals/chemical-form.tsx`
- ✅ Import des nouveaux types

#### `/components/chemicals/chemical-details.tsx`
- ✅ Import des nouveaux types
- ✅ Fonction `isExpiringSoon` mise à jour

### 5. Scripts utilitaires

#### `/scripts/migrate-chemicals-to-mysql.js` (nouveau)
- ✅ Migration automatique des données JSON vers MySQL
- ✅ Gestion des doublons et des erreurs
- ✅ Création de sauvegardes

#### `/test-chemicals-db.js` (nouveau)
- ✅ Tests unitaires des opérations CRUD
- ✅ Validation de la connexion MySQL

#### `/test-chemicals-integration.sh` (nouveau)
- ✅ Script de test d'intégration complet
- ✅ Vérification de la compilation TypeScript

## 🗄️ Structure de la base de données

### Table `suppliers`
```sql
CREATE TABLE suppliers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  website VARCHAR(255),
  contactPerson VARCHAR(255),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Table `chemicals`
```sql
CREATE TABLE chemicals (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  formula VARCHAR(255),
  casNumber VARCHAR(50),
  quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit ENUM('g', 'kg', 'mg', 'L', 'mL', 'mol', 'mmol', 'pieces'),
  status ENUM('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRED', 'EMPTY'),
  hazardClass ENUM('FLAMMABLE', 'CORROSIVE', 'TOXIC', 'OXIDIZING', 'EXPLOSIVE', 'RADIOACTIVE', 'BIOLOGICAL', 'NONE'),
  supplierId VARCHAR(36),
  quantityPrevision DECIMAL(10,3),
  -- autres champs...
  FOREIGN KEY (supplierId) REFERENCES suppliers(id)
);
```

## 🚀 Instructions de déploiement

### 1. Prérequis
- MySQL configuré et accessible
- Variables d'environnement définies dans `.env`
- Node.js et npm installés

### 2. Initialisation
```bash
# 1. Initialiser les tables (automatique au premier lancement)
node -e "const {initializeDatabase,closePool} = require('./lib/db.ts'); initializeDatabase().then(() => closePool())"

# 2. Migrer les données existantes (optionnel)
node scripts/migrate-chemicals-to-mysql.js

# 3. Tester l'intégration
./test-chemicals-integration.sh
```

### 3. Vérification
```bash
# Démarrer le serveur
npm run dev

# Tester les endpoints
curl http://localhost:3000/api/chemicals
```

## 🔧 Points d'attention

### Compatibilité rétrograde
- ✅ Les interfaces API restent identiques
- ✅ Les composants React fonctionnent sans modification majeure
- ✅ Les types sont compatibles avec l'usage existant

### Performance
- ✅ Index sur les champs de recherche fréquents
- ✅ Requêtes optimisées avec JOIN pour les relations
- ✅ Pool de connexions configuré pour limiter la charge

### Sécurité
- ✅ Requêtes paramétrées pour éviter les injections SQL
- ✅ Validation des données d'entrée
- ✅ Gestion d'erreurs robuste

## 📋 Tests à effectuer

### Tests fonctionnels
- [ ] Création d'un nouveau chemical
- [ ] Modification des quantités
- [ ] Suppression d'un chemical
- [ ] Recherche et filtrage
- [ ] Mise à jour des prévisions

### Tests d'intégration
- [ ] Scanner de code-barres
- [ ] Statistiques globales
- [ ] Interface utilisateur complète

### Tests de performance
- [ ] Temps de réponse des API
- [ ] Chargement de listes importantes
- [ ] Opérations concurrentes

## 🐛 Dépannage

### Erreurs de connexion MySQL
```bash
# Vérifier la connexion
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME
```

### Erreurs de compilation TypeScript
```bash
# Vérifier les types
npm run type-check
```

### Problèmes de migration
```bash
# Vérifier les données existantes
node -e "console.log(require('./data/chemicals-inventory.json'))"
```

## 📈 Améliorations futures

- [ ] Migration de l'équipement vers MySQL
- [ ] API REST complète avec pagination
- [ ] Système de cache Redis
- [ ] Sauvegarde automatique des données
- [ ] Audit trail des modifications
