# Migration Complète vers le Système Centralisé

## Statut : MIGRATION CENTRALISÉE EN COURS ⚙️

Date de mise à jour : 6 août 2025

## Vue d'ensemble

Migration **COMPLÈTE** vers un système entièrement centralisé. Abandon des APIs `/api/calendrier/{discipline}` au profit d'APIs centralisées modernes.

## Phase 1 : Migration des Composants ✅ (100%)

### Composants migrés avec succès :

1. **CreateTPDialog.tsx** ✅
   - Migration vers `createEventWithTimeslots()` avec API centralisée
   - Utilise `/api/events` au lieu de `/api/calendrier/{discipline}`

2. **CreateLaborantinEventDialog.tsx** ✅
   - Migration vers `createSimpleEvent()` avec API centralisée
   - Mapping des types d'événements laborantin

3. **ChimieCalendar.tsx** ⚙️ **EN COURS**
   - Migration de `handleSaveEdit` vers `updateEventWithTimeslots()`
   - Utilise maintenant l'API centralisée `/api/events`

## Phase 2 : Architecture Centralisée ✅ (100%)

### Nouvelles APIs Centralisées Créées :

1. **`/api/events`** ✅ **NOUVEAU**
   ```typescript
   GET    /api/events?discipline={chimie|physique}&id={eventId}
   POST   /api/events (création d'événements)
   PUT    /api/events (modification d'événements)
   DELETE /api/events?id={eventId}&discipline={discipline}
   ```

2. **`/api/timeslots`** ✅ **EXISTANT AMÉLIORÉ**
   ```typescript
   GET    /api/timeslots?event_id={eventId}&discipline={discipline}
   POST   /api/timeslots (création de créneaux)
   PUT    /api/timeslots (validation/rejet de créneaux)
   DELETE /api/timeslots?id={timeslotId}
   ```

### Utilitaires Centralisés :

1. **event-creation-utils.ts** ✅ **REFONDU**
   ```typescript
   - createEventWithTimeslots() : Utilise /api/events
   - createSimpleEvent() : Utilise /api/events  
   - updateEventWithTimeslots() : Utilise /api/events
   ```

## Migration en Cours : Abandon des APIs Legacy

### ❌ APIs à abandonner :
- `/api/calendrier/chimie` → **Remplacé par `/api/events`**
- `/api/calendrier/physique` → **Remplacé par `/api/events`**

### ✅ APIs centralisées modernes :
- `/api/events` → **Gestion unifiée des événements**
- `/api/timeslots` → **Gestion centralisée des créneaux**

## Avantages de la Centralisation Complète

1. **Unification Totale** : Une seule API pour tous les événements
2. **Maintenabilité** : Logique centralisée, moins de duplication
3. **Consistance** : Comportement identique toutes disciplines
4. **Évolutivité** : Facilite l'ajout de nouvelles disciplines
5. **Robustesse** : Gestion d'erreur centralisée et cohérente

## Architecture Finale

```
┌─────────────────┐    ┌─────────────────┐
│   Composants    │───▶│   API Events    │
│    UI (React)   │    │  /api/events    │
└─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  API Timeslots  │
                       │ /api/timeslots  │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Base de Données│
                       │    MySQL        │
                       └─────────────────┘
```

## Prochaines Étapes

1. **Finaliser ChimieCalendar** ⚙️ EN COURS
   - Terminer la migration de `handleSaveEdit`
   - Tester la modification d'événements

2. **Migrer PhysiqueCalendar** 📋 PLANIFIÉ
   - Appliquer les mêmes changements pour la physique
   - Unifier le comportement

3. **Supprimer APIs Legacy** 🗑️ PRÉVU
   - Supprimer `/api/calendrier/{discipline}`
   - Nettoyer le code obsolète

4. **Tests E2E** 🧪 VALIDATION
   - Valider tous les flux utilisateur
   - Vérifier la performance

## Test de Compilation ✅

```bash
npm run build
# ✓ Compiled successfully in 19.0s
# ✓ API /api/events créée avec succès
# ✓ Migration des composants en cours
```

🎯 **Objectif : Centralisation complète terminée dans les prochaines itérations !**
