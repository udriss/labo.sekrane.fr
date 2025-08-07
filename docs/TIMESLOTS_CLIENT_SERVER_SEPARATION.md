// docs/TIMESLOTS_CLIENT_SERVER_SEPARATION.md
# Séparation Client/Serveur des Utilitaires TimeSlots

## Problème résolu

Le fichier `calendar-utils-timeslots.ts` contenait des fonctions qui utilisaient MySQL2 et la base de données, ce qui causait des erreurs lors de l'importation côté client :

```
Module not found: Can't resolve 'net'
```

## Solution

Nous avons créé deux fichiers séparés :

### 1. `/lib/calendar-utils-timeslots-client.ts` 
**Utilisation:** Composants client uniquement  
**Contenu:** Fonctions de traitement des TimeSlots sans accès base de données

### 2. `/lib/calendar-utils-timeslots.ts` 
**Utilisation:** APIs et composants serveur uniquement  
**Contenu:** Fonctions complètes avec accès MySQL et fonctions avancées

## Correspondance des fonctions

| Fonction Serveur | Fonction Client | Usage |
|------------------|-----------------|-------|
| `processEventEdition()` | `processEventEditionClient()` | Traitement complet événements |
| `createNewTimeSlot()` | `createNewTimeSlotClient()` | Création nouveaux créneaux |
| `updateTimeSlotWithTracking()` | `updateTimeSlotWithTrackingClient()` | Modification avec traçabilité |
| `checkAndSwapTimes()` | `checkAndSwapTimesClient()` | Échange automatique des heures |
| `isEventOwner()` | `isEventOwnerClient()` | Détection propriétaire |
| `validateTimeSlots()` | `validateTimeSlotsClient()` | Validation créneaux |
| `hasOnlyTimeSlotsChanged()` | `hasOnlyTimeSlotsChangedClient()` | Détection type modification |
| `prepareTimeSlotsForMoveAPI()` | `prepareTimeSlotsForMoveAPIClient()` | Format API déplacement |

## Exemples d'utilisation

### Dans un composant client (EditEventDialog.tsx)
```typescript
import { 
  processEventEditionClient as processEventEdition,
  createNewTimeSlotClient as createNewTimeSlot,
  updateTimeSlotWithTrackingClient as updateTimeSlotWithTracking,
  checkAndSwapTimesClient as checkAndSwapTimes,
  isEventOwnerClient as isEventOwner
} from '@/lib/calendar-utils-timeslots-client'
```

### Dans une API route (pages/api/calendrier/...)
```typescript
import { 
  processEventEdition,
  createNewTimeSlot,
  updateTimeSlotWithTracking,
  checkAndSwapTimes,
  isEventOwner,
  // + fonctions avec accès base de données
  getChemistryEventsWithTimeSlots,
  updateChemistryEventWithTimeSlots
} from '@/lib/calendar-utils-timeslots'
```

## Avantages

1. **Séparation claire** : Client vs Serveur
2. **Pas d'erreurs d'importation** : Pas de MySQL côté client
3. **Même interface** : Fonctions identiques mais adaptées
4. **Maintenance facilitée** : Logique centralisée avec adaptations
5. **Performance optimisée** : Bundles plus légers côté client

## Notes importantes

- **Toujours utiliser la version `*Client()` dans les composants**
- **Utiliser la version serveur dans les APIs uniquement**  
- **Les deux versions ont la même interface** pour faciliter la transition
- **Les fonctions client n'accèdent jamais à MySQL ou aux APIs serveur**
