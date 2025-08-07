# 🔄 Migration Composants vers API Centralisée - Phase 2.1

## 📋 Composants Identifiés Utilisant Encore l'Ancienne API

### Composants Utilisant `/api/calendrier/{discipline}` ⚠️

1. **`CreateTPDialog.tsx`** - Ligne 525
   - **Usage**: Création d'événements TP
   - **Endpoint actuel**: `/api/calendrier/physique` | `/api/calendrier/chimie`
   - **Migration vers**: Utiliser l'API centralisée `/api/timeslots` pour les créneaux

2. **`CreateLaborantinEventDialog.tsx`** - Ligne 175  
   - **Usage**: Création d'événements laborantin
   - **Endpoint actuel**: `/api/calendrier/physique` | `/api/calendrier/chimie`
   - **Migration vers**: Utiliser l'API centralisée `/api/timeslots` pour les créneaux

3. **`EventsList.tsx`** - Ligne 626
   - **Usage**: Gestion des événements dans la liste
   - **Endpoint actuel**: `/api/calendrier/physique` | `/api/calendrier/chimie`
   - **Migration vers**: Utiliser l'API centralisée `/api/timeslots` pour les créneaux

## 🎯 Stratégie de Migration

### Analyse de l'Impact

Ces composants utilisent l'ancienne API pour **créer** des événements, qui inclut automatiquement la création des créneaux. La nouvelle architecture sépare :

1. **Événement** → Reste dans `/api/calendrier/{discipline}` (informations de base)
2. **Créneaux** → Nouveau système `/api/timeslots` (gestion des horaires)

### Approche Recommandée

**Option 1: Migration Hybride (Recommandée)**
- Garder `/api/calendrier/{discipline}` pour les données d'événement
- Utiliser `/api/timeslots` uniquement pour les créneaux
- Appels séparés: créer événement → puis créer créneaux

**Option 2: Migration Complète**
- Migrer entièrement vers l'API centralisée
- Nécessite refactoring plus important des routes API existantes

## 📝 Plan d'Implémentation (Option 1)

### Étape 1: Modifier la Logique de Création
```typescript
// Ancien code (un seul appel)
const response = await fetch('/api/calendrier/chimie', {
  method: 'POST',
  body: JSON.stringify({ ...eventData, timeSlots })
})

// Nouveau code (deux appels séparés)
// 1. Créer l'événement sans timeSlots
const eventResponse = await fetch('/api/calendrier/chimie', {
  method: 'POST', 
  body: JSON.stringify({ ...eventData })
})

const event = await eventResponse.json()

// 2. Créer les créneaux via API centralisée
const timeslotsResponse = await fetch('/api/timeslots', {
  method: 'POST',
  body: JSON.stringify({
    event_id: event.id,
    discipline,
    proposals: timeSlots.map(slot => ({
      start_date: `${slot.date}T${slot.startTime}:00`,
      end_date: `${slot.date}T${slot.endTime}:00`,
      timeslot_date: slot.date,
      action: 'create'
    }))
  })
})
```

### Étape 2: Gestion d'Erreur Améliorée
```typescript
try {
  // Créer événement
  const event = await createEvent(eventData)
  
  try {
    // Créer créneaux
    const timeslots = await createTimeslots(event.id, timeSlots)
    return { event, timeslots }
  } catch (timeslotError) {
    // Rollback: supprimer l'événement si échec des créneaux
    await deleteEvent(event.id)
    throw timeslotError
  }
} catch (error) {
  throw error
}
```

### Étape 3: Mise à Jour Progressive
1. **CreateTPDialog.tsx** - Migration de la création d'événements TP
2. **CreateLaborantinEventDialog.tsx** - Migration des événements laborantin  
3. **EventsList.tsx** - Migration des actions sur les événements
4. Tests et validation

## 🔄 Alternative: Fonction Wrapper

Créer une fonction utilitaire qui encapsule la logique de création complète :

```typescript
// /lib/event-creation-utils.ts
export async function createEventWithTimeslots(
  eventData: Partial<CalendarEvent>,
  timeSlots: Array<{date: string, startTime: string, endTime: string}>,
  discipline: 'chimie' | 'physique'
): Promise<{event: CalendarEvent, timeslots: TimeslotData[]}> {
  // Logique de création event + timeslots avec gestion d'erreur
}
```

## 📊 Bénéfices Attendus

- ✅ **Cohérence**: Tous les créneaux gérés par l'API centralisée
- ✅ **Fiabilité**: Validation et traçabilité centralisées
- ✅ **Évolutivité**: Fonctionnalités avancées des créneaux disponibles
- ✅ **Maintenance**: Code unifié pour la gestion des créneaux

## 🎯 Priorité

**HAUTE** - Ces composants sont utilisés pour la création d'événements, fonctionnalité critique du système.

---

**Status**: 📋 **PLANIFIÉ**  
**Dépendances**: ✅ API centralisée `/api/timeslots` opérationnelle  
**Estimation**: 1-2 jours de développement  
**Impact**: Migration complète de la création d'événements
