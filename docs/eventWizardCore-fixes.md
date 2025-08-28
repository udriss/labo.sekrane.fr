# Fix: Erreur Maximum Update Depth et POST 400 EventWizardCore

## Problèmes Identifiés

### 1. Maximum Update Depth Exceeded
```
[Error] Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
EventWizardCore.tsx:2108
```

**Cause** : Boucle infinie dans le `useEffect` qui met à jour `meta` :
- Le `useEffect` dépendait de `[selectedFiles, updateMeta, meta]`
- À l'intérieur, il appelait `updateMeta({ ...currentMeta, uploads })`
- Cela mettait à jour `meta` → redéclenchait le `useEffect` → boucle infinie

### 2. POST 400 vers /api/event-presets

**Cause** : Tentative de sérialisation d'objets File en JSON
- `EventWizardCore` envoie maintenant des objets `{ isLocal: true, fileData: File }` dans `meta.uploads`
- `app/cahier/page.tsx` tentait de sérialiser ces objets File en JSON
- Les objets File ne peuvent pas être sérialisés → erreur 400

## Solutions Implémentées

### 1. Fix Boucle Infinie dans EventWizardCore.tsx

**Avant** :
```tsx
useEffect(() => {
  if (updateMeta) {
    const uploads = selectedFiles.map(/* ... */);
    const currentMeta = (meta || {}) as any;
    updateMeta({
      ...currentMeta,  // ⚠️ Utilise meta dans les dépendances
      uploads,
    });
  }
}, [selectedFiles, updateMeta, meta]); // ⚠️ meta cause la boucle
```

**Après** :
```tsx
// Mémoriser la conversion pour éviter les re-calculs
const convertedUploads = useMemo(() => {
  return selectedFiles.map(fileObj => {
    // ... logique de conversion
  });
}, [selectedFiles]);

// Référence stable pour éviter changements inutiles
const uploadsRef = useRef<any[]>([]);

useEffect(() => {
  if (updateMeta && convertedUploads) {
    // Vérifier si le contenu a réellement changé
    const uploadsChanged = JSON.stringify(convertedUploads) !== JSON.stringify(uploadsRef.current);
    
    if (uploadsChanged) {
      uploadsRef.current = convertedUploads;
      const currentMeta = (meta || {}) as any;
      updateMeta({
        ...currentMeta,
        uploads: convertedUploads,
      });
    }
  }
}, [convertedUploads, updateMeta, meta]); // ✅ Comparaison avant update
```

### 2. Fix POST 400 dans app/cahier/page.tsx

**Avant** :
```tsx
documents: (meta.uploads || []).map((u: any) => ({
  fileName: u.fileName || u.name || 'document',
  fileUrl: u.fileUrl || u.url || u,  // ⚠️ Peut être un objet File
  fileSize: u.fileSize,
  fileType: u.fileType,
}))
```

**Après** :
```tsx
documents: (meta.uploads || [])
  .filter((u: any) => !u.isLocal || u.fileUrl) // ✅ Exclure fichiers locaux non uploadés
  .map((u: any) => ({
    fileName: u.fileName || u.name || 'document',
    fileUrl: u.fileUrl || u.url || u,
    fileSize: u.fileSize,
    fileType: u.fileType,
  }))
```

**Logique du filtre** :
- `!u.isLocal` : Inclure tous les fichiers non-locaux (déjà uploadés)
- `u.fileUrl` : Inclure les fichiers locaux QUI ONT une URL (uploadés)
- Exclure les fichiers avec `isLocal: true` et pas de `fileUrl` (objets File non sérialisables)

## Fonctions Corrigées

### EventWizardCore.tsx
- `useEffect` pour mise à jour meta (lignes ~1363-1400)

### app/cahier/page.tsx
- `handleFinish()` - Ajout de preset (ligne ~974)
- `handleSave()` - Mise à jour de preset (ligne ~694)

## Résultats

### ✅ Fixes Appliqués
- Boucle infinie éliminée via `useMemo` + comparaison de contenu
- Erreur POST 400 éliminée via filtrage des objets File
- Compilation sans erreur TypeScript

### ✅ Tests Recommandés
1. **EventWizardCore** : Vérifier qu'il n'y a plus d'erreur "Maximum update depth"
2. **Ajout Preset** : Vérifier que POST `/api/event-presets` retourne 200/201 au lieu de 400
3. **Upload Fichiers** : Confirmer que les fichiers s'uploadent après ajout du preset

### 📋 Pattern pour Éviter le Problème

**À éviter** :
```tsx
useEffect(() => {
  updateState(prevState => ({ ...prevState, newValue }));
}, [updateState, prevState]); // ❌ prevState dans les dépendances
```

**Recommandé** :
```tsx
const memoizedValue = useMemo(() => computeValue(), [dependencies]);
const valueRef = useRef();

useEffect(() => {
  if (JSON.stringify(memoizedValue) !== JSON.stringify(valueRef.current)) {
    valueRef.current = memoizedValue;
    updateState(memoizedValue);
  }
}, [memoizedValue, updateState]); // ✅ Pas de référence circulaire
```
