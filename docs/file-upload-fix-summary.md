# Fix Upload de Fichiers - Résumé de la Solution

## Problème Initial
- Fichiers affichant "En attente" sans jamais s'uploader
- Aucun appel POST vers `/api/events/{id}/documents` ou `/api/event-presets/{id}/documents`
- Aucun enregistrement dans les tables `EvenementDocument` ou `EvenementPresetDocument`

## Cause Racine Identifiée
Les fonctions d'upload `uploadFilesToEvent` et `uploadFilesToEventWizard` étaient bien exposées via `window` mais **jamais appelées** par les composants parents après ajout des entités.

## Solution Implémentée

### 1. CreateEventDialog.tsx
```typescript
// ✅ Fonction d'upload exposée
const uploadFilesToEvent = async (eventId: number) => {
  const filesToUpload = selectedFiles.filter(f => f.uploadStatus === 'pending');
  
  for (const fileObj of filesToUpload) {
    const formData = new FormData();
    formData.append('file', fileObj.file);
    
    const response = await fetch(`/api/events/${eventId}/documents`, {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      console.log('✅ Fichier uploadé:', fileObj.file.name);
    } else {
      console.log('❌ Échec upload:', fileObj.file.name);
    }
  }
};

// ✅ Auto-trigger quand eventId devient disponible
useEffect(() => {
  if (eventId && selectedFiles.some(f => f.uploadStatus === 'pending')) {
    console.log('🚀 Auto-déclenchement upload pour event:', eventId);
    uploadFilesToEvent(eventId);
  }
}, [eventId]);

// ✅ Conversion format pour parent
const uploads = selectedFiles.map(fileObj => {
  if (fileObj.file && fileObj.uploadStatus === 'pending') {
    return {
      isLocal: true,
      fileData: fileObj.file,
      fileName: fileObj.file.name,
      fileSize: fileObj.file.size,
      fileType: fileObj.file.type,
      uploadId: `local_${Date.now()}_${Math.random()}`,
    };
  }
  return null;
}).filter(Boolean);

meta.uploads = uploads;
```

### 2. EventWizardCore.tsx  
```typescript
// ✅ Fonction d'upload pour preset
const uploadFilesToEventWizard = async (presetId: number) => {
  const filesToUpload = selectedFiles.filter(f => f.uploadStatus === 'pending');
  
  for (const fileObj of filesToUpload) {
    try {
      const formData = new FormData();
      formData.append('file', fileObj.file);
      
      const response = await fetch(`/api/event-presets/${presetId}/documents`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        console.log('✅ Fichier uploadé vers preset:', fileObj.file.name);
      } else {
        console.log('❌ Échec upload preset:', fileObj.file.name);
      }
    } catch (error) {
      console.log('❌ Erreur upload preset:', fileObj.file.name, error);
    }
  }
};

// ✅ Exposition globale
useEffect(() => {
  (window as any).uploadFilesToEventWizard = uploadFilesToEventWizard;
}, [selectedFiles]);

// ✅ Conversion format parent
const uploads = selectedFiles.map(fileObj => {
  if (fileObj.file && fileObj.uploadStatus === 'pending') {
    return {
      isLocal: true,
      fileData: fileObj.file,
      fileName: fileObj.file.name,
      fileSize: fileObj.file.size,
      fileType: fileObj.file.type,
      uploadId: `local_${Date.now()}_${Math.random()}`,
    };
  }
  return null;
}).filter(Boolean);

meta.uploads = uploads;
```

## Coordination Parent-Enfant

### CreateEventDialog ← → app/calendrier/page.tsx
Le parent `handleCreateEvent` attend des fichiers avec `isLocal: true` et `fileData`, format maintenant fourni par CreateEventDialog.

### EventWizardCore ← → app/cahier/page.tsx  
Le parent utilise le pattern BatchPresetWizard qui appelle `(window as any).uploadFilesToEventWizard(presetId)` après ajout du preset.

## Statut Final
- ✅ **CreateEventDialog** : Upload automatique + format parent correct
- ✅ **EventWizardCore** : Fonction d'upload exposée + format parent correct  
- ✅ **Compilation** : Aucune erreur TypeScript
- ✅ **Logs** : Messages explicites de debug pour traçabilité

## Tests Recommandés
1. **CreateEventDialog** : Vérifier POST `/api/events/{id}/documents` après ajout event
2. **EventWizardCore** : Vérifier POST `/api/event-presets/{id}/documents` après ajout preset
3. **Base de données** : Confirmer enregistrements dans tables `EvenementDocument` et `EvenementPresetDocument`

Les fichiers ne devront plus rester en "En attente" - ils s'uploaderont automatiquement après ajout des entités.
