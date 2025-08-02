# Migration Base de Données - Support TimeSlots

## Résumé des Modifications

Cette migration met à jour les tables de calendrier pour supporter le système TimeSlots complet avec gestion des états d'événements.

## Changements de Structure

### 1. Nouveau Champ `state`

```sql
-- Ajout du champ state aux tables calendar_chimie et calendar_physique
ALTER TABLE `calendar_chimie` 
ADD COLUMN `state` enum('PENDING','VALIDATED','CANCELLED','MOVED','IN_PROGRESS') 
COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING' AFTER `status`;

ALTER TABLE `calendar_physique` 
ADD COLUMN `state` enum('PENDING','VALIDATED','CANCELLED','MOVED','IN_PROGRESS') 
COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING' AFTER `status`;
```

### 2. Index de Performance

```sql
-- Index pour optimiser les requêtes sur le state
ALTER TABLE `calendar_chimie` ADD KEY `idx_state` (`state`);
ALTER TABLE `calendar_physique` ADD KEY `idx_state` (`state`);
```

### 3. Structure JSON dans le Champ `notes`

Le champ `notes` existant stocke maintenant une structure JSON complète :

```json
{
  "timeSlots": [
    {
      "id": "TS_timestamp_random",
      "startDate": "2025-08-02T14:00:00.000Z",
      "endDate": "2025-08-02T16:00:00.000Z",
      "status": "active|invalid|deleted",
      "createdBy": "user_id",
      "modifiedBy": [
        {
          "userId": "user_id",
          "date": "2025-08-02T12:00:00.000Z",
          "action": "created|modified|deleted"
        }
      ],
      "referentActuelTimeID": "reference_to_actual_slot_id"
    }
  ],
  "actuelTimeSlots": [
    {
      "id": "original_slot_id",
      "startDate": "2025-08-02T14:00:00.000Z",
      "endDate": "2025-08-02T16:00:00.000Z",
      "status": "active",
      "createdBy": "user_id"
    }
  ],
  "originalRemarks": "text_remarks",
  "stateChangeReason": "reason_for_state_change",
  "lastStateChange": {
    "from": "PENDING",
    "to": "VALIDATED",
    "date": "2025-08-02T12:00:00.000Z",
    "userId": "user_id",
    "reason": "validation_reason"
  }
}
```

## Migration des Données Existantes

### Initialisation Automatique des TimeSlots

La migration initialise automatiquement les TimeSlots pour tous les événements existants :

1. **Conversion des dates** : `start_date` et `end_date` → TimeSlots JSON
2. **Création d'historique** : Attribution du créateur et date de création
3. **Synchronisation** : `timeSlots` et `actuelTimeSlots` identiques initialement
4. **Préservation** : Remarques existantes sauvegardées dans `originalRemarks`

## États d'Événements

### Anciens États (champ `status`)
- `scheduled` → Événement programmé
- `in_progress` → En cours
- `completed` → Terminé
- `cancelled` → Annulé

### Nouveaux États (champ `state`)
- `PENDING` → En attente de validation (défaut)
- `VALIDATED` → Validé et confirmé
- `CANCELLED` → Annulé avec possibilité de reprogrammation
- `MOVED` → Déplacé avec nouveaux créneaux
- `IN_PROGRESS` → En préparation/en cours

## APIs Mises à Jour

### 1. State Change API

**Avant :**
```javascript
// Anciens états uniquement
const validStates = ['scheduled', 'confirmed', 'cancelled', 'completed']
```

**Après :**
```javascript
// Nouveaux états avec support TimeSlots
const validStates = ['PENDING', 'VALIDATED', 'CANCELLED', 'MOVED', 'IN_PROGRESS']

// Support des données additionnelles
const { newState, reason, timeSlots } = body
```

### 2. Nouvelles APIs TimeSlots

- `POST /api/calendrier/chimie/approve-single-timeslot`
- `POST /api/calendrier/chimie/approve-timeslots`
- `POST /api/calendrier/chimie/reject-single-timeslot`
- `POST /api/calendrier/chimie/reject-timeslots`
- `POST /api/calendrier/physique/approve-single-timeslot`
- `POST /api/calendrier/physique/approve-timeslots`
- `POST /api/calendrier/physique/reject-single-timeslot`
- `POST /api/calendrier/physique/reject-timeslots`

## Application de la Migration

### 1. Automatique
```bash
./apply-timeslots-migration.sh
```

### 2. Manuelle
```bash
# Sauvegarde
mysqldump -h$DB_HOST -u$DB_USERNAME -p$DB_PASSWORD $DB_NAME > backup.sql

# Application
mysql -h$DB_HOST -u$DB_USERNAME -p$DB_PASSWORD $DB_NAME < sql/timeslots-migration.sql
```

## Vérification Post-Migration

### 1. Structure des Tables
```sql
DESCRIBE calendar_chimie;
DESCRIBE calendar_physique;
```

### 2. Données TimeSlots
```sql
-- Vérifier les TimeSlots JSON
SELECT id, JSON_EXTRACT(notes, '$.timeSlots') as timeSlots 
FROM calendar_chimie 
WHERE JSON_VALID(notes) LIMIT 5;

-- Compter les événements migrés
SELECT COUNT(*) as migrated_events 
FROM calendar_chimie 
WHERE JSON_EXTRACT(notes, '$.timeSlots') IS NOT NULL;
```

### 3. États d'Événements
```sql
-- Distribution des états
SELECT state, COUNT(*) as count 
FROM calendar_chimie 
GROUP BY state;
```

## Compatibilité Descendante

### Champs Conservés
- `start_date` et `end_date` : maintenus pour compatibilité
- `status` : conservé pour les intégrations existantes
- `notes` : étendu avec structure JSON

### Fallback Automatique
Si le JSON des TimeSlots est invalide ou manquant, le système crée automatiquement des TimeSlots depuis `start_date`/`end_date`.

## Rollback (En cas de Problème)

### 1. Suppression des Nouveaux Champs
```sql
ALTER TABLE calendar_chimie DROP COLUMN state;
ALTER TABLE calendar_physique DROP COLUMN state;
```

### 2. Restauration des Notes
```sql
-- Restaurer les remarques originales
UPDATE calendar_chimie 
SET notes = JSON_UNQUOTE(JSON_EXTRACT(notes, '$.originalRemarks'))
WHERE JSON_VALID(notes) AND JSON_EXTRACT(notes, '$.originalRemarks') IS NOT NULL;
```

### 3. Restauration Complète
```bash
# Depuis la sauvegarde
mysql -h$DB_HOST -u$DB_USERNAME -p$DB_PASSWORD $DB_NAME < backup_before_timeslots_YYYYMMDD_HHMMSS.sql
```

## Tests de Validation

### 1. Fonctionnalités TimeSlots
- ✅ Approbation de créneaux uniques
- ✅ Approbation par lot
- ✅ Rejet de créneaux
- ✅ Synchronisation automatique
- ✅ Historique des modifications

### 2. Changements d'État
- ✅ PENDING → VALIDATED
- ✅ PENDING → CANCELLED  
- ✅ CANCELLED → MOVED (avec nouveaux créneaux)
- ✅ VALIDATED → IN_PROGRESS

### 3. Interface Utilisateur
- ✅ Affichage des créneaux proposés/actuels
- ✅ Boutons approve/reject pour créateurs
- ✅ Historique des changements
- ✅ Responsivité mobile/desktop

## Performance

### Index Ajoutés
- `idx_state` sur `calendar_chimie.state`
- `idx_state` sur `calendar_physique.state`

### Optimisations JSON
- Validation JSON automatique
- Fallback performant vers start_date/end_date
- Cache des TimeSlots parsés côté application

## Sécurité

### Validation d'Entrée
- Vérification des états valides
- Sanitisation des données JSON
- Authentification requise pour toutes les APIs

### Autorisation
- Seuls les créateurs peuvent approuver/rejeter
- Rôles LABORANTIN/ADMINLABO pour changements d'état
- Traçabilité complète des modifications

---

**Date de Migration :** 2 août 2025  
**Version :** 2.1.0  
**Compatibilité :** Descendante complète maintenue
