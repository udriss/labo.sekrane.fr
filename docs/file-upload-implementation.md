# Upload de Fichiers pour Événements - Approche BatchPresetWizard

## Problème résolu

Les composants `CreateEventDialog` et `EventWizardCore` ont été refactorisés pour suivre l'approche éprouvée de `BatchPresetWizard` :

1. **Ajout d'abord de l'entité** (événement) dans la base de données
2. **Récupération de l'ID fraîchement ajouté**
3. **Upload des fichiers** en utilisant cet ID pour l'association

## Pourquoi cette approche

### ✅ **Avantages :**
- **Cohérence** : Suit exactement le même pattern que `BatchPresetWizard` qui fonctionne parfaitement
- **Pas de fichiers orphelins** : Les fichiers sont associés directement à l'entité ajoutée
- **Simplicité** : Plus de gestion de draft ou d'IDs temporaires
- **Fiabilité** : Pattern déjà testé et validé en production

### ❌ **Ancien système (problématique) :**
- Upload vers un draft avant ajout de l'événement
- Gestion complexe des fichiers temporaires
- Problèmes de persistence lors des changements d'étapes
- Nettoyage manuel nécessaire en cas d'annulation

## Nouvelle implémentation

### Architecture
```
1. Utilisateur sélectionne les fichiers → Stockage local (pas d'upload)
2. Utilisateur finalise le wizard → Ajout de l'événement en DB
3. Événement ajouté avec succès → Upload des fichiers vers event.id
4. Association directe → documents liés à l'événement
```

### CreateEventDialog & EventWizardCore

**Remplacement de FilePond par drag & drop simple :**
- Interface drag & drop personnalisée
- Stockage des fichiers en mémoire (pas d'upload immédiat)
- Persistence entre les étapes du wizard
- Upload uniquement après ajout de l'événement

**Fonctions exposées :**
- `(window as any).uploadFilesToEvent(eventId)` - Upload les fichiers vers un événement
- `(window as any).uploadFilesToEventWizard(eventId)` - Upload les fichiers depuis EventWizardCore

## Utilisation

### 1. Logique d'ajout (inspirée de BatchPresetWizard)

```typescript
const handleCreateEvent = async () => {
  try {
    // 1. Ajouter l'événement d'abord
    const eventResponse = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        discipline: form.discipline,
        materialsDetailed: meta.materialsDetailed,
        timeSlotsDrafts: meta.timeSlotsDrafts,
        // PAS de documents ici
      }),
    });
    
    const created = await eventResponse.json();
    const eventId = created?.event?.id;
    
    if (!eventId) throw new Error('ID événement manquant');
    
    // 2. Uploader les fichiers vers l'événement ajouté
    await (window as any).uploadFilesToEvent(eventId);
    
    // 3. Succès !
    onSuccess();
  } catch (error) {
    console.error('Erreur ajout:', error);
  }
};
```

### 2. API Endpoints utilisés

**Ajout d'événement :**
- `POST /api/events` - Crée l'événement, retourne l'ID

**Upload de documents :**
- `POST /api/events/{eventId}/documents` - Upload vers un événement existant
- `POST /api/event-presets/{presetId}/documents` - Upload vers un preset existant

### 3. Flux de données

```
[Wizard Steps] → [Local File Storage] → [Event Creation] → [File Upload] → [Success]
      ↓                    ↓                   ↓               ↓            ↓
  Sélection         Stockage mémoire      API creation     API upload   Association
  des fichiers      + persistence       + récup eventId   avec eventId   complète
```

## Comparaison avec BatchPresetWizard

| Aspect | BatchPresetWizard | CreateEventDialog (nouveau) |
|--------|-------------------|------------------------------|
| **Ajout entité** | ✅ POST /api/event-presets | ✅ POST /api/events |
| **Récup ID** | ✅ created.preset.id | ✅ created.event.id |
| **Upload fichiers** | ✅ POST /api/event-presets/{id}/documents | ✅ POST /api/events/{id}/documents |
| **Gestion erreurs** | ✅ Cleanup automatique | ✅ Même logique |
| **Pattern** | ✅ Testé et validé | ✅ Identique |

## Migration depuis l'ancien système

### Changements dans les composants :
1. **Suppression de FilePond** → Interface drag & drop personnalisée
2. **Suppression du système de draft** → Stockage local uniquement
3. **Suppression des draftId** → Utilisation directe de l'eventId
4. **Simplification des callbacks** → Upload différé après ajout

### Avantages de la migration :
- ✅ Plus de problèmes de persistence entre étapes
- ✅ Plus de fichiers orphelins à nettoyer
- ✅ Pattern cohérent avec le reste de l'application
- ✅ Code plus simple et maintenable
- ✅ Fiabilité éprouvée

## Exemple complet

Voir `docs/CreateEventExample.tsx` pour un exemple complet d'implémentation suivant cette approche.
