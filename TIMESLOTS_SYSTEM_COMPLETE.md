# Système TimeSlots Complet - Documentation

## Vue d'ensemble

Le système TimeSlots permet la gestion avancée des créneaux horaires avec support des propositions de déplacement et un système de validation propriétaire.

## Architecture

### 1. Types de base

#### TimeSlot Interface
```typescript
interface TimeSlot {
  id: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  status: 'active' | 'deleted' | 'invalid' | 'rejected';
  createdBy?: string;
  modifiedBy?: Array<{
    userId: string;
    date: string;
    action: 'created' | 'modified' | 'deleted' | 'invalidated' | 'approved' | 'rejected' | 'restored';
    note?: string;
  }>;
  actuelTimeSlotsReferent?: string;
  referentActuelTimeID?: string;
}
```

#### CalendarEvent TimeSlots
```typescript
interface CalendarEvent {
  // ... autres champs
  timeSlots: TimeSlot[];          // Créneaux proposés/en cours
  actuelTimeSlots?: TimeSlot[];   // Créneaux actuellement validés
}
```

### 2. Logique de fonctionnement

#### À la création d'un événement
- `timeSlots = actuelTimeSlots` (identiques)
- Le créateur est automatiquement propriétaire

#### Proposition de déplacement
- **Tout utilisateur** peut proposer de nouveaux créneaux
- Les anciens créneaux actifs dans `timeSlots` sont marqués `status: 'deleted'`
- Les nouveaux créneaux sont ajoutés avec `status: 'active'`
- `actuelTimeSlots` reste **inchangé** (sauf si propriétaire)

#### Validation (propriétaire uniquement)
- **Approuver** : `actuelTimeSlots = timeSlots.filter(slot => slot.status === 'active')`
- **Rejeter** : Restaurer les `actuelTimeSlots` dans `timeSlots` avec `status: 'active'`

## APIs

### 1. API de déplacement : `/api/calendrier/move-event`

#### POST - Proposer de nouveaux créneaux
```typescript
// Request
{
  eventId: string;
  discipline: 'chimie' | 'physique';
  newTimeSlots: Array<{
    date: string;        // YYYY-MM-DD
    startTime: string;   // HH:MM
    endTime: string;     // HH:MM
  }>;
  reason?: string;
}

// Response
{
  success: boolean;
  event: CalendarEvent;
  isOwner: boolean;
  message: string;
}
```

#### PUT - Valider/Rejeter les créneaux proposés
```typescript
// Request (propriétaire uniquement)
{
  eventId: string;
  discipline: 'chimie' | 'physique';
  action: 'approve' | 'reject';
  reason?: string;
}

// Response
{
  success: boolean;
  event: CalendarEvent;
  action: string;
  message: string;
}
```

### 2. APIs existantes améliorées

#### `/api/calendrier/chimie` et `/api/calendrier/physique`
- **POST** : Création avec support TimeSlots complet
- **PUT** : Mise à jour avec gestion des TimeSlots
- **GET** : Récupération avec TimeSlots parsés

## Composants UI

### 1. TimeSlotProposalBadge
Affiche les propositions de créneaux en attente :
- Badge avec nombre de propositions
- Dialog de comparaison actuel vs proposé  
- Boutons Approuver/Rejeter (propriétaire uniquement)

### 2. EditEventDialog amélioré
- Détection automatique du propriétaire
- Mode "proposition" pour non-propriétaires
- Mode "modification directe" pour propriétaires
- Utilisation de l'API appropriée selon le contexte

### 3. DailyPlanning intégré
- Affichage automatique des badges de proposition
- Support des mises à jour en temps réel
- Gestion de la discipline (chimie/physique)

## Utilitaires

### 1. `calendar-move-utils.ts`
- `proposeEventMove()` : Proposer un déplacement
- `handleTimeSlotProposal()` : Valider/rejeter
- `isEventOwner()` : Vérifier la propriété
- `hasPendingTimeSlotProposals()` : Détecter les propositions en attente
- `getTimeSlotProposalSummary()` : Résumé des différences

### 2. `useEventMove` Hook
Hook React pour simplifier l'utilisation de l'API de déplacement :
```typescript
const { moveEvent, loading, error } = useEventMove();
```

## Workflow complet

### Scénario 1 : Propriétaire modifie ses créneaux
1. EditEventDialog détecte que l'utilisateur est propriétaire
2. Utilise l'API standard (`PUT /api/calendrier/{discipline}`)
3. `timeSlots` et `actuelTimeSlots` sont synchronisés automatiquement

### Scénario 2 : Non-propriétaire propose un déplacement
1. EditEventDialog détecte que seuls les créneaux changent
2. Utilise l'API de déplacement (`POST /api/calendrier/move-event`)
3. `timeSlots` est mis à jour, `actuelTimeSlots` reste inchangé
4. TimeSlotProposalBadge s'affiche automatiquement

### Scénario 3 : Propriétaire valide une proposition
1. TimeSlotProposalBadge permet d'approuver/rejeter
2. Utilise l'API de validation (`PUT /api/calendrier/move-event`)
3. Selon l'action :
   - **Approuver** : `actuelTimeSlots` synchronisé avec `timeSlots`
   - **Rejeter** : `timeSlots` restauré avec `actuelTimeSlots`

## Avantages

1. **Séparation claire** : Créneaux proposés vs validés
2. **Traçabilité complète** : Historique dans `modifiedBy`
3. **Permissions granulaires** : Proposer vs valider
4. **UI intuitive** : Badges visuels et workflows clairs
5. **API robuste** : Validation stricte des données
6. **Compatibilité** : Fonctionne avec chimie et physique

## Migration

Les événements existants sont automatiquement compatibles :
- Si `actuelTimeSlots` est vide, il sera initialisé avec `timeSlots` actifs
- Les anciens événements conservent leur comportement normal
- Pas de rupture de compatibilité

## Tests recommandés

1. **Création d'événement** : Vérifier `timeSlots = actuelTimeSlots`
2. **Proposition de déplacement** : Vérifier que `actuelTimeSlots` ne change pas
3. **Validation propriétaire** : Vérifier la synchronisation
4. **Interface utilisateur** : Badges et dialogs fonctionnels
5. **Permissions** : Non-propriétaires ne peuvent que proposer
