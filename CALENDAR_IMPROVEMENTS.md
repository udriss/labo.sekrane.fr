# Améliorations de la gestion des créneaux horaires

## Résumé des améliorations implémentées

### 1. Statut "invalid" pour les anciens créneaux ✅

- **Types mis à jour** : Le type `TimeSlot` a été modifié pour inclure le statut `'invalid'` en plus de `'active'` et `'deleted'`
- **Données d'exemple** : Le fichier `calendar.json` contient maintenant des exemples avec des créneaux `invalid`
- **API** : Les routes API filtrent correctement les créneaux `invalid` dans les requêtes GET

### 2. Filtrage strict des créneaux invalides ✅

- **Utilitaires créés** : Nouveau fichier `/lib/calendar-slot-utils.ts` avec des fonctions utilitaires :
  - `getActiveTimeSlots()` : Filtre pour ne garder que les créneaux actifs
  - `findCorrespondingActualSlot()` : Trouve la correspondance directe via `referentActuelTimeID`
  - `hasPendingChanges()` : Détecte les changements en attente en excluant les créneaux invalid
  - `getSlotStatus()` : Détermine le statut d'un créneau (nouveau, en attente, approuvé)

### 3. Synchronisation de actuelTimeSlots ✅

- **API principale** : La route PUT `/api/calendrier` synchronise automatiquement `actuelTimeSlots` avec les nouveaux créneaux actifs quand le propriétaire modifie
- **Marquage invalid** : Les anciens créneaux sont marqués `invalid` lors des modifications du propriétaire

### 4. Robustesse de l'UI

#### Améliorations nécessaires dans les composants React :

**DailyPlanning.tsx** :
- ✅ Import des utilitaires ajouté
- ⚠️ Remplacement des fonctions locales par les utilitaires
- ⚠️ Mise à jour des commentaires pour mentionner l'exclusion des créneaux invalid

**EventActions.tsx** :
- ⚠️ Remplacement de la fonction `hasPendingChanges` locale par l'utilitaire
- ⚠️ Mise à jour de `findCorrespondingActualSlot` pour utiliser l'utilitaire

**EventDetailsDialog.tsx** :
- ⚠️ Import et utilisation des utilitaires
- ⚠️ Filtrage strict des créneaux invalid dans l'affichage

### 5. Exemple de données ✅

Le fichier `calendar.json` contient maintenant :
- Un événement avec des créneaux `invalid` (anciens créneaux invalidés)
- Des créneaux `active` (nouveaux créneaux)
- Utilisation correcte de `referentActuelTimeID` pour la correspondance

### 6. findCorrespondingActualSlot ✅

La fonction a été simplifiée et utilise maintenant :
1. Correspondance directe par `referentActuelTimeID` si présent
2. Correspondance par ID si identique
3. Retourne `null` si aucune correspondance (plus de matching heuristique)

## Actions restantes à effectuer

### Composants React à mettre à jour :

1. **DailyPlanning.tsx** :
   ```typescript
   // Remplacer les fonctions locales par :
   import { getActiveTimeSlots, findCorrespondingActualSlot, hasPendingChanges, getSlotStatus } from '@/lib/calendar-slot-utils'
   
   // Utiliser hasPendingChanges(event, currentUserId) au lieu de la fonction locale
   // Utiliser getSlotStatus(proposedSlot, event) au lieu de la fonction locale
   ```

2. **EventActions.tsx** :
   ```typescript
   // Remplacer la fonction hasPendingChanges locale par :
   import { hasPendingChanges } from '@/lib/calendar-slot-utils'
   
   // Dans le composant, utiliser :
   hasPendingChanges(event, currentUserId) // au lieu de hasPendingChanges(event)
   ```

3. **EventDetailsDialog.tsx** :
   ```typescript
   // Ajouter l'import :
   import { getActiveTimeSlots, hasPendingChanges } from '@/lib/calendar-slot-utils'
   
   // Filtrer les créneaux avec getActiveTimeSlots(event.timeSlots)
   ```

### Routes API à finaliser :

1. **approve-timeslots/route.ts** :
   - Ajouter commentaire sur l'exclusion des créneaux invalid
   
2. **reject-timeslots/route.ts** :
   - Modifier pour marquer les créneaux comme `invalid` au lieu de `deleted`

## Tests à effectuer

1. **Créer un événement** → Vérifier que `timeSlots` et `actuelTimeSlots` sont identiques
2. **Modifier les créneaux (propriétaire)** → Vérifier que les anciens sont marqués `invalid`
3. **Affichage UI** → Vérifier que les créneaux `invalid` n'apparaissent nulle part
4. **Propositions de modification** → Vérifier que seuls les créneaux actifs sont comparés
5. **Approbation/Rejet** → Vérifier la synchronisation correcte d'`actuelTimeSlots`

## Résultat attendu

- ✅ Les créneaux invalidés ne sont plus jamais proposés ni affichés
- ✅ Les modifications du propriétaire ne génèrent plus de propositions parasites  
- ✅ L'interface est claire et cohérente pour tous les utilisateurs
- ✅ La correspondance entre créneaux proposés et actuels est directe via `referentActuelTimeID`