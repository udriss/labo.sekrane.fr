# Documentation des Fonctions Utilitaires TimeSlots

## Synthèse des Modifications Centralisées

Ce fichier documente les nouvelles fonctions utilitaires créées dans `/lib/calendar-utils-timeslots.ts` qui centralisent toute la logique de gestion des TimeSlots développée lors de la correction des bugs.

## Fonctions Principales

### 1. `processTimeSlotEdition(timeSlots, originalEvent, userId, formData?)`

**Objectif :** Fonction centralisée pour traiter les TimeSlots en mode édition avec détection automatique du mode.

**Paramètres :**
- `timeSlots` : Array des TimeSlots actuels depuis l'interface
- `originalEvent` : Événement original de la base de données  
- `userId` : ID de l'utilisateur effectuant la modification
- `formData` : Données du formulaire (optionnel, pour fallback)

**Retourne :**
```typescript
{
  mode: 'single' | 'multiple';
  processedTimeSlots: TimeSlot[];
  logData: any;
}
```

**Fonctionnalités :**
- Détection automatique du mode basée sur le nombre de créneaux actifs réels
- Traitement différencié pour mode simple vs multiple
- Gestion complète de l'historique `modifiedBy`
- Logs détaillés pour debugging
- Correction du bug de date en mode créneau unique

### 2. `prepareEventDataForSave(formData, timeSlots, originalEvent, userId, files?, remarks?)`

**Objectif :** Préparer toutes les données d'un événement pour sauvegarde.

**Paramètres :**
- `formData` : Données du formulaire
- `timeSlots` : Array des TimeSlots
- `originalEvent` : Événement original
- `userId` : ID utilisateur
- `files` : Fichiers attachés (optionnel)
- `remarks` : Remarques (optionnel)

**Retourne :**
```typescript
{
  dataToSave: any;
  logData: {
    base: any;
    processing: any;
    final: any;
  };
}
```

### 3. `processEventEdition(params)`

**Objectif :** Fonction wrapper qui encapsule toute la logique d'édition d'événements.

**Paramètres :**
```typescript
{
  formData: any;
  timeSlots: any[];
  originalEvent: any;
  userId: string;
  files?: any[];
  remarks?: string;
}
```

**Retourne :**
```typescript
{
  dataToSave: any;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  isOnlyTimeSlotChange: boolean;
  moveApiData?: any[];
}
```

**Fonctionnalités :**
- Validation complète des TimeSlots
- Détection des modifications (déplacement vs édition complète)
- Préparation automatique des données pour l'API de déplacement
- Gestion des erreurs et avertissements

## Fonctions Utilitaires

### `validateTimeSlots(timeSlots)`
Valide les créneaux horaires avec vérification :
- Présence de tous les champs requis
- Heures d'ouverture (8h-19h)
- Cohérence début/fin
- Au moins un créneau actif

### `hasOnlyTimeSlotsChanged(formData, originalEvent)`
Détermine si seuls les créneaux horaires ont été modifiés (pour décider entre modification directe ou proposition de déplacement).

### `prepareTimeSlotsForMoveAPI(timeSlots)`
Convertit les TimeSlots au format attendu par l'API de déplacement.

### `initializeTimeSlotsFromEvent(event)`
Initialise les TimeSlots depuis un événement existant avec :
- Formatage des dates/heures
- Conservation de l'historique
- Détection du mode multi-créneaux

### `createNewTimeSlot(userId, baseDate?, startTime?, endTime?)`
Crée un nouveau TimeSlot vide avec valeurs par défaut.

### `updateTimeSlotWithTracking(timeSlot, field, value, userId)`
Met à jour un TimeSlot avec détection automatique des modifications significatives.

### `checkAndSwapTimes(timeSlot, onSwapCallback?)`
Vérifie et échange automatiquement les heures si nécessaire (fin avant début).

## Corrections Apportées

### 1. Bug de Date en Mode Créneau Unique
**Problème :** En mode créneau unique, le code utilisait `formData.startDate` au lieu des données du TimeSlot modifié.

**Solution :** La fonction `processTimeSlotEdition` utilise maintenant `activeTimeSlot.date` en mode créneau unique.

### 2. Détection de Mode Incorrecte
**Problème :** Le code se basait sur `showMultipleSlots` (état UI) au lieu du nombre réel de créneaux actifs.

**Solution :** Détection basée sur `activeTimeSlots.length > 1`.

### 3. Validation des Arrays
**Problème :** Erreurs "map is not a function" avec des données corrompues.

**Solution :** Vérifications `Array.isArray()` dans toutes les fonctions de transformation.

### 4. Logs de Debugging
**Problème :** Manque de visibilité sur le flux de données.

**Solution :** Système de logs numérotés 1-14 à travers tout le pipeline.

## Usage dans les Composants

### EditEventDialog.tsx
```typescript
import { processEventEdition } from '@/lib/calendar-utils-timeslots'

// Dans handleSubmit
const result = processEventEdition({
  formData,
  timeSlots,
  originalEvent: event,
  userId: session?.user?.id || 'INDISPONIBLE',
  files,
  remarks
})

if (!result.validation.isValid) {
  // Afficher les erreurs
  return
}

if (result.isOnlyTimeSlotChange && !isOwner) {
  // Utiliser l'API de déplacement
  await moveEvent(eventId, discipline, result.moveApiData, reason)
} else {
  // Utiliser l'API de modification standard
  await onSave(result.dataToSave)
}
```

### Initialisation d'Événement
```typescript
import { initializeTimeSlotsFromEvent } from '@/lib/calendar-utils-timeslots'

useEffect(() => {
  if (event) {
    const { timeSlots, showMultipleSlots, firstSlotData } = initializeTimeSlotsFromEvent(event)
    
    setTimeSlots(timeSlots)
    setShowMultipleSlots(showMultipleSlots)
    
    if (firstSlotData) {
      setFormData({
        ...formData,
        startDate: firstSlotData.startDate,
        endDate: firstSlotData.endDate,
        startTime: firstSlotData.startTime,
        endTime: firstSlotData.endTime
      })
    }
  }
}, [event])
```

## Tests et Validation

### Scénarios de Test
1. **Mode Créneau Unique :** Modification de date/heure d'un seul créneau
2. **Mode Multi-Créneaux :** Ajout/suppression/modification de plusieurs créneaux
3. **Détection de Propriétaire :** Modification directe vs proposition de déplacement
4. **Validation des Données :** Erreurs et avertissements
5. **Échange d'Heures :** Correction automatique fin < début

### Logs à Surveiller
- `LOG 1.1` : Détection du mode (SINGLE vs MULTIPLE)
- `LOG 1.5-1.7` : Traitement mode multi-créneaux
- `LOG 1.7.5-1.9` : Traitement mode créneau unique
- `LOG 2` : Données finales avant envoi API

## Migration

### Avant
```typescript
// Code dispersé dans EditEventDialog, page.tsx, API
// Logique de mode hardcodée avec showMultipleSlots
// Pas de validation centralisée
// Logs manuels non standardisés
```

### Après
```typescript
// Toute la logique centralisée dans calendar-utils-timeslots.ts
// Détection automatique du mode
// Validation et logs intégrés
// Réutilisable pour chimie, physique, autres disciplines
```

## Bénéfices

1. **Maintenabilité :** Logique centralisée et réutilisable
2. **Debuggabilité :** Logs standardisés et détaillés  
3. **Fiabilité :** Validation systématique et gestion d'erreurs
4. **Évolutivité :** Facilite l'ajout de nouvelles disciplines
5. **Performance :** Évite la duplication de code et optimise les traitements

Ces fonctions centralisent plus de 300 lignes de logique métier complexe en fonctions réutilisables et bien documentées.
