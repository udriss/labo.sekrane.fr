# Corrections API Physique - Champs `quantity` et `requestedQuantity`

## 📋 Problème Identifié

L'API physique (`/app/api/calendrier/physique/route.ts`) avait été mise à jour pour supporter les champs `quantity` et `requestedQuantity` pour les consommables, mais les réponses API (POST et PUT) ne renvoyaient que des objets simplifiés `{ id, name: id }` au lieu des objets complets avec toutes les propriétés.

## ✅ Corrections Apportées

### 1. **API Physique - Méthode POST** (`/app/api/calendrier/physique/route.ts`)

**Avant** (ligne ~277):
```typescript
materials: parseJsonSafe(createdEvent.equipment_used, []).map((id: any) => ({ id, name: id })),
consommables: parseJsonSafe(createdEvent.consommables_used, []).map((id: any) => ({ id, name: id })),
```

**Après**:
```typescript
materials: parseJsonSafe(createdEvent.equipment_used, []).map((item: any) => {
  if (typeof item === 'string') {
    return { id: item, name: item };
  }
  return {
    id: item.id || item,
    name: item.name || item.itemName || (typeof item === 'string' ? item : 'Matériel'),
    itemName: item.itemName || item.name,
    quantity: item.quantity || null,
    requestedQuantity: item.requestedQuantity || null,
    volume: item.volume,
    isCustom: item.isCustom || false
  };
}),
consommables: parseJsonSafe(createdEvent.consommables_used, []).map((item: any) => {
  if (typeof item === 'string') {
    return { id: item, name: item };
  }
  return {
    id: item.id || item,
    name: item.name || (typeof item === 'string' ? item : 'Consommable'),
    requestedQuantity: item.requestedQuantity || null,
    quantity: item.quantity || null,
    unit: item.unit,
    isCustom: item.isCustom || false
  };
}),
```

### 2. **API Physique - Méthode PUT** (`/app/api/calendrier/physique/route.ts`)

**Avant** (ligne ~440):
```typescript
materials: parseJsonSafe(updatedEvent.equipment_used, []).map((id: any) => ({ id, name: id })),
consommables: parseJsonSafe(updatedEvent.consommables_used, []).map((id: any) => ({ id, name: id })),
```

**Après**: Même transformation que pour POST avec tous les champs.

### 3. **API Chimie - Cohérence** (`/app/api/calendrier/chimie/route.ts`)

Pour maintenir la cohérence, j'ai aussi appliqué les mêmes corrections à l'API chimie :

**POST et PUT** - Transformation des `chemicals` et `materials` pour inclure tous les champs (`quantity`, `requestedQuantity`, `unit`, `isCustom`, etc.)

## 🔍 Vérification des Composants Frontend

### ✅ Composants Conformes

1. **`EditEventDialogPhysics.tsx`**
   - ✅ Envoie `quantity` et `requestedQuantity` dans les requêtes
   - ✅ Utilise `requestedQuantity` pour les champs de saisie
   - ✅ Affiche `quantity` pour le stock disponible

2. **`CreateTPDialog.tsx`**
   - ✅ Gère les deux champs pour physique et chimie
   - ✅ Envoie les deux champs dans la requête POST

3. **`EventDetailsDialogPhysics.tsx`**
   - ✅ Utilise `requestedQuantity` pour l'affichage

### 📋 Composants Analysés (sans modification nécessaire)

1. **`CreateLaborantinEventDialog.tsx`** 
   - Événements laborantin simples sans gestion de quantités détaillées

2. **`EventsList.tsx`** 
   - Utilise principalement l'API pour les fichiers

3. **`ImprovedEventBlock.tsx`**
   - Utilise principalement l'API pour les fichiers

## 📊 Structure des Données

### Consommables Physiques
```typescript
{
  id: string,
  name: string,
  quantity: number | null,        // Stock disponible dans l'inventaire
  requestedQuantity: number | null, // Quantité demandée par l'utilisateur
  unit: string,
  isCustom: boolean
}
```

### Chemicals (Chimie)
```typescript
{
  id: string,
  name: string,
  quantity: number,               // Stock disponible dans l'inventaire
  requestedQuantity: number,      // Quantité demandée par l'utilisateur
  unit: string,
  isCustom: boolean,
  formula?: string
}
```

## 🎯 Bénéfices

1. **Cohérence API**: Toutes les méthodes (GET, POST, PUT) renvoient maintenant les mêmes structures de données complètes
2. **Frontend Fonctionnel**: Les composants peuvent afficher et gérer correctement les stocks et quantités demandées
3. **Gestion Complète**: Support complet des consommables personnalisés avec toutes leurs propriétés
4. **Compatibilité**: Maintien de la compatibilité avec les anciens formats (strings) tout en supportant les nouveaux objets

## 🧪 Test Recommandé

1. Créer un événement physique avec des consommables
2. Modifier les quantités demandées
3. Vérifier que les deux champs sont bien sauvegardés et récupérés
4. Tester avec des consommables personnalisés

---

*Corrections effectuées le: $(date)*
*Problème: Réponses API incomplètes pour quantity/requestedQuantity*
*Solution: Harmonisation des réponses API avec les objets complets*
