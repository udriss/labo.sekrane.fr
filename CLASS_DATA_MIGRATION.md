# Migration du champ `class_name` vers `class_data`

## Résumé

Cette migration transforme le stockage des informations de classe de `class_name` (string simple) vers `class_data` (objet JSON structuré) pour supporter des métadonnées enrichies.

## Structure des données

### Ancien format (class_name)
```typescript
class_name: string | null  // Ex: "L2 Chimie"
```

### Nouveau format (class_data)
```typescript
class_data: {
  id: string,        // Ex: "auto-a1b2c3d4e5f6..."
  name: string,      // Ex: "L2 Chimie"
  type: 'predefined' | 'custom' | 'auto'
} | null
```

## Types de classes

- **predefined**: Classes prédéfinies dans le système
- **custom**: Classes créées par les utilisateurs
- **auto**: Classes créées automatiquement lors de la migration

## Fichiers modifiés

### 1. Base de données

#### Migration SQL (`sql/migrate-class-name-to-class-data.sql`)
- Ajoute le champ `class_data` aux tables `calendar_chimie` et `calendar_physique`
- Migre les données existantes avec génération automatique d'ID
- Crée des index JSON pour optimiser les requêtes

### 2. Utilitaires (`lib/class-data-utils.ts`)

#### Fonctions principales:
- `convertClassNameToClassData()`: Convertit string vers objet ClassData
- `getClassNameFromClassData()`: Extrait le nom depuis ClassData
- `parseClassDataSafe()`: Parse JSON sécurisé
- `normalizeClassField()`: Gestion de compatibilité legacy/nouveau

### 3. Types TypeScript

#### Interfaces mises à jour:
- `CalendarEventWithTimeSlots` dans `lib/calendar-utils-timeslots.ts`
- `CalendarEvent` dans `lib/calendar-utils.ts`

### 4. APIs

#### Routes modifiées:
- `/app/api/calendrier/chimie/route.ts`
- `/app/api/calendrier/physique/route.ts`

#### Changements dans les APIs:
- **GET**: Retourne `class` (legacy) ET `classData` (nouveau)
- **POST**: Accepte `class`, `classData` ou `classes[]`
- **PUT**: Idem POST avec normalisation intelligente

## Compatibilité

### Frontend
Le système est **rétrocompatible**:
- Les clients peuvent continuer à utiliser `class` (string)
- Les nouveaux clients peuvent utiliser `classData` (objet)
- La propriété `classData` est prioritaire si fournie

### Réponses API
```json
{
  "id": "event-id",
  "title": "Mon événement",
  "class": "L2 Chimie",          // ← Legacy (pour compatibilité)
  "classData": {                 // ← Nouveau format
    "id": "auto-a1b2c3d4e5f6...",
    "name": "L2 Chimie",
    "type": "auto"
  }
}
```

## Migration des données existantes

### Stratégie
1. **Phase 1**: Ajout du nouveau champ `class_data`
2. **Phase 2**: Migration des données `class_name` → `class_data`
3. **Phase 3**: Support dual (legacy + nouveau)
4. **Phase 4**: Dépréciation graduelle de `class_name`

### Script de migration
```sql
-- Exécuter: sql/migrate-class-name-to-class-data.sql
ALTER TABLE calendar_chimie ADD COLUMN class_data TEXT AFTER class_name;
ALTER TABLE calendar_physique ADD COLUMN class_data TEXT AFTER class_name;

-- Migration automatique des données
UPDATE calendar_chimie 
SET class_data = JSON_OBJECT(
  'id', CONCAT('auto-', MD5(CONCAT(class_name, 'chimie'))),
  'name', class_name,
  'type', 'auto'
)
WHERE class_name IS NOT NULL AND class_name != '';
```

## Tests et validation

### Vérifications à effectuer
1. **Compilation TypeScript** ✅
   ```bash
   npx tsc --noEmit --skipLibCheck
   ```

2. **Test des APIs**
   - Création d'événement avec `class` (legacy)
   - Création d'événement avec `classData` (nouveau)
   - Récupération et vérification des deux formats

3. **Migration des données**
   - Backup de la base avant migration
   - Exécution du script SQL
   - Vérification que toutes les classes ont été migrées

## Utilisation dans les composants

### Ancien style (toujours supporté)
```typescript
const eventData = {
  title: "Mon TP",
  class: "L2 Chimie",  // String simple
  // ...
}
```

### Nouveau style (recommandé)
```typescript
const eventData = {
  title: "Mon TP",
  classData: {
    id: "class-id-123",
    name: "L2 Chimie",
    type: "predefined"
  },
  // ...
}
```

### Lecture des données
```typescript
// Utiliser la fonction utilitaire pour garantir la compatibilité
import { normalizeClassField, getClassNameFromClassData } from '@/lib/class-data-utils';

const classData = normalizeClassField(event.classData, event.class);
const className = getClassNameFromClassData(classData);
```

## Rollback

En cas de problème, possibilité de rollback:
1. Supprimer le champ `class_data` des tables
2. Restaurer les anciennes versions des APIs
3. Revenir aux types TypeScript originaux

```sql
-- Rollback SQL (si nécessaire)
ALTER TABLE calendar_chimie DROP COLUMN class_data;
ALTER TABLE calendar_physique DROP COLUMN class_data;
```

## Status de la migration

- [x] Types TypeScript mis à jour
- [x] Utilitaires créés (`class-data-utils.ts`)
- [x] API Chimie modifiée
- [x] API Physique modifiée
- [x] Fonctions de base de données mises à jour
- [x] Script de migration SQL créé
- [ ] **EN ATTENTE**: Migration manuelle de l'API move-event
- [ ] **EN ATTENTE**: Exécution du script SQL en production
- [ ] **EN ATTENTE**: Tests d'intégration complets
- [ ] **EN ATTENTE**: Mise à jour des composants frontend

## Prochaines étapes

1. **Finaliser l'API move-event**: Ajouter le support class_data
2. **Tester en développement**: Vérifier toutes les fonctionnalités
3. **Exécuter la migration SQL**: Appliquer les changements en base
4. **Mettre à jour les composants**: Adopter progressivement le nouveau format
5. **Monitorer**: S'assurer que tout fonctionne correctement
