# Améliorations de l'API move-event

## ✅ **Comportement implémenté**

### 1. **Proposition de nouveaux créneaux**
- L'utilisateur propose des créneaux via `handleMoveDate` dans `/app/calendrier/page.tsx`
- Les créneaux sont inscrits dans `/data/calendar.json`
- L'API est appelée uniquement depuis `handleMoveDate`

### 2. **Invalidation de tous les créneaux existants**
- **TOUS** les créneaux existants (validés ou non) sont marqués avec `status: 'invalid'`
- Ils ne sont plus affichés dans :
  - `DailyPlanning.tsx` (filtre `slot.status === 'active'`)
  - `EventActions.tsx` (filtre `slot.status === 'active'`)
  - `EventDetailsDialog.tsx` (filtre `slot.status === 'active'`)

### 3. **Affichage uniquement des nouvelles propositions**
- Seuls les créneaux avec `status: 'active'` sont affichés
- Les créneaux `invalid` sont complètement masqués de l'interface

### 4. **Préservation d'actuelTimeSlots**
- `actuelTimeSlots` reste inchangé et représente les créneaux en vigueur
- C'est la référence stable pour les comparaisons et validations

### 5. **Gestion de referentActuelTimeID**
- **Toujours présent** : Chaque nouveau créneau a ce champ (même si `null`)
- **Correspondance explicite** : Si l'utilisateur choisit de remplacer un créneau spécifique
- **Correspondance automatique** : Par index avec `actuelTimeSlots` si non spécifié
- **Nouveau créneau** : `null` pour les créneaux sans correspondance

### 6. **Pas de changement d'état**
- L'API `move-event` ne modifie **PAS** le `state` de l'événement
- Le changement d'état est géré par `/api/calendrier/state-change`
- Séparation claire des responsabilités

## 🔧 **Structure de l'API**

### **Endpoint**
```
PUT /api/calendrier/move-event?id={eventId}
```

### **Body de la requête**
```json
{
  "timeSlots": [
    {
      "date": "2025-01-30",
      "startTime": "09:00",
      "endTime": "11:00",
      "referentActuelTimeID": "TS_OLD_1" // Optionnel, pour correspondance explicite
    },
    {
      "date": "2025-01-30",
      "startTime": "14:00",
      "endTime": "16:00"
      // referentActuelTimeID sera déterminé automatiquement par index
    }
  ],
  "reason": "Changement de salle demandé"
}
```

### **Réponse**
```json
{
  "updatedEvent": { /* événement mis à jour */ },
  "message": "2 nouveau(x) créneau(x) proposé(s) avec succès",
  "invalidatedCount": 2,
  "newSlotsCount": 2
}
```

## 📋 **Logique de correspondance referentActuelTimeID**

### **Cas 1 : Correspondance explicite**
```javascript
{
  "date": "2025-01-30",
  "startTime": "09:00", 
  "endTime": "11:00",
  "referentActuelTimeID": "TS_SPECIFIC_ID" // Remplace explicitement ce créneau
}
```

### **Cas 2 : Correspondance automatique**
```javascript
{
  "date": "2025-01-30",
  "startTime": "09:00",
  "endTime": "11:00"
  // referentActuelTimeID sera l'ID du créneau à l'index correspondant dans actuelTimeSlots
}
```

### **Cas 3 : Nouveau créneau**
```javascript
{
  "date": "2025-01-30",
  "startTime": "09:00",
  "endTime": "11:00",
  "referentActuelTimeID": null // Explicitement nouveau
}
```

## 🔄 **Flux de données**

### **Avant la proposition**
```json
{
  "timeSlots": [
    { "id": "TS1", "status": "active", "startDate": "..." },
    { "id": "TS2", "status": "active", "startDate": "..." }
  ],
  "actuelTimeSlots": [
    { "id": "TS1", "status": "active", "startDate": "..." },
    { "id": "TS2", "status": "active", "startDate": "..." }
  ]
}
```

### **Après la proposition**
```json
{
  "timeSlots": [
    { "id": "TS1", "status": "invalid", "startDate": "..." },
    { "id": "TS2", "status": "invalid", "startDate": "..." },
    { "id": "TS3", "status": "active", "referentActuelTimeID": "TS1", "startDate": "..." },
    { "id": "TS4", "status": "active", "referentActuelTimeID": "TS2", "startDate": "..." }
  ],
  "actuelTimeSlots": [
    { "id": "TS1", "status": "active", "startDate": "..." },
    { "id": "TS2", "status": "active", "startDate": "..." }
  ]
}
```

### **Affichage dans l'UI**
- **Créneaux visibles** : Seulement TS3 et TS4 (status: 'active')
- **Créneaux de référence** : TS1 et TS2 dans actuelTimeSlots
- **Créneaux masqués** : TS1 et TS2 dans timeSlots (status: 'invalid')

## 🎯 **Avantages de cette approche**

### **1. Séparation claire**
- **timeSlots** : Historique complet + propositions actuelles
- **actuelTimeSlots** : Créneaux de référence stables
- **Filtrage UI** : Seuls les créneaux actifs sont visibles

### **2. Traçabilité complète**
- Tous les créneaux sont conservés avec leur historique
- Les créneaux invalidés restent pour l'audit
- Les correspondances sont explicites via `referentActuelTimeID`

### **3. Interface utilisateur claire**
- Pas de confusion avec d'anciens créneaux
- Seules les nouvelles propositions sont visibles
- Comparaison claire avec les créneaux de référence

### **4. Flexibilité**
- Correspondance explicite ou automatique
- Gestion des nouveaux créneaux sans correspondance
- Préservation de l'état de l'événement

## 🧪 **Tests recommandés**

1. **Proposition simple** : Remplacer tous les créneaux existants
2. **Correspondance explicite** : Spécifier `referentActuelTimeID`
3. **Nouveaux créneaux** : Ajouter des créneaux sans correspondance
4. **Validation UI** : Vérifier que seuls les créneaux actifs sont affichés
5. **Préservation** : Vérifier que `actuelTimeSlots` reste inchangé

Cette implémentation respecte parfaitement vos spécifications et fournit une base solide pour la gestion des propositions de créneaux.